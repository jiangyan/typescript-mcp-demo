import express from 'express';
import cors from 'cors';
import { Anthropic } from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Configure MCP servers
const mcpServers = [
  {
    name: "todoplan-server",
    url: process.env.MCP_SERVER_TODOPLAN_URL || "http://localhost:8000/sse",
    client: null as Client | null,
    tools: [] as MCPTool[]
  },
  {
    name: "project-server",
    url: process.env.MCP_SERVER_PROJECT_URL || "http://localhost:8001/sse",
    client: null as Client | null,
    tools: [] as MCPTool[]
  }
];

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('./'));

// Check for API key
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY not found in environment variables');
  process.exit(1);
}

// Define tool interface
interface MCPTool {
  name: string;
  description: string;
  input_schema: any;
  server?: string; // Track which server this tool belongs to
}

// For tools sent to Anthropic API
interface AnthropicTool {
  name: string;
  description: string;
  input_schema: any;
}

// Helper function to generate a unique ID
function generateUniqueId(): string {
  return 'tool_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Ensure tool_use messages have IDs
function ensureToolUseIds(messages: any[]): any[] {
  return messages.map(message => {
    if (message.role === 'assistant' && Array.isArray(message.content)) {
      return {
        ...message,
        content: message.content.map((item: any) => {
          if (item.type === 'tool_use' && !item.id) {
            return {
              ...item,
              id: generateUniqueId()
            };
          }
          return item;
        })
      };
    }
    return message;
  });
}

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
});

// Combined tools from all servers
let allMcpTools: MCPTool[] = [];

// Connect to an MCP server
async function connectToMCPServer(server: typeof mcpServers[0]) {
  try {
    const url = new URL(server.url);
    const transport = new SSEClientTransport(url);
    
    // Create a new client for this server
    const client = new Client(
      { name: `mcp-client-${server.name}`, version: "1.0.0" },
      { capabilities: { tools: {} } }
    );
    
    await client.connect(transport);
    server.client = client;
    
    // Get available tools
    const toolsResult = await client.listTools();
    server.tools = toolsResult.tools.map(tool => ({
      name: tool.name,
      description: tool.description || `Tool: ${tool.name}`,
      input_schema: tool.inputSchema,
      server: server.name // Mark which server this tool belongs to
    }));
    
    // Add server-specific prefix to tool names to avoid conflicts
    server.tools = server.tools.map(tool => ({
      ...tool,
      name: `${server.name}_${tool.name}`, // Use underscore instead of colon
      description: `[${server.name}] ${tool.description || `Tool: ${tool.name}`}`
    }));
    
    // Add tools to the combined list
    allMcpTools = [...allMcpTools, ...server.tools];
    
    console.log(`Connected to ${server.name} with tools:`, server.tools.map(t => t.name));
    return true;
  } catch (error) {
    console.error(`Failed to connect to ${server.name}:`, error);
    return false;
  }
}

// Connect to all MCP servers on startup
async function connectToAllMCPServers() {
  for (const server of mcpServers) {
    await connectToMCPServer(server);
  }
}

// Connect to MCP servers on startup
connectToAllMCPServers();

// Endpoint to list available tools
app.get('/api/tools', (req, res) => {
  res.json({ tools: allMcpTools });
});

// Endpoint to process messages with Claude
app.post('/api/chat', async (req, res) => {
  try {
    let { messages } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages format' });
    }
    
    // Ensure tool_use messages have IDs
    messages = ensureToolUseIds(messages);
    
    // Create a dynamic system message based on available tools
    let toolDescriptions = allMcpTools.map(tool => 
      `- ${tool.name}: ${tool.description}`
    ).join('\n');
    
    const systemContent = `You have access to the following tools from multiple servers:\n${toolDescriptions}\n\nWhen responding to user queries, use these tools as needed to provide complete answers. If a task requires multiple tools, use them in sequence without waiting for additional prompting. Always analyze tool results and use them to guide further tool choices when necessary.

Important: Tools are prefixed with the server name they belong to (e.g., "todoplan-server_get-todo", "project-server_get-project").

For example, if a user asks about their todo in a specific project category:
1. Use the "project-server_get-project" tool to get project details
2. Then use the "todoplan-server_get-todo" tool with the appropriate category
3. Present a complete answer using both results

Always provide thoughtful, complete responses that utilize all available tools when appropriate.`;
    
    // Filter out any existing system messages (they're not supported in messages array)
    messages = messages.filter((msg: any) => msg.role !== 'system');
    
    // Create a version of the tools without the 'server' field for Anthropic API
    const toolsForAnthropicApi = allMcpTools.map(({ server, ...rest }) => rest);
    
    // Claude API with tools - using any to bypass TypeScript constraints
    // as this is using a newer version of the API 
    const response = await (anthropic.messages.create as any)({
      model: "claude-3-5-sonnet-20241022",
      system: systemContent,
      max_tokens: 1024,
      messages,
      tools: toolsForAnthropicApi,
    });
    
    res.json({ response });
  } catch (error) {
    console.error('Error calling Anthropic API:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// Endpoint to call MCP tools
app.post('/api/tool', async (req, res) => {
  try {
    const { name, input } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Tool name is required' });
    }
    
    // Parse the server prefix and tool name
    const [serverPrefix, ...toolNameParts] = name.split('_');
    const toolName = toolNameParts.join('_');
    
    // Find the appropriate server for this tool
    const server = mcpServers.find(s => s.name === serverPrefix);
    
    if (!server || !server.client) {
      return res.status(400).json({ error: `Server "${serverPrefix}" not found or not connected` });
    }
    
    // Call the tool on the appropriate server client
    const result = await server.client.callTool({
      name: toolName, // Use the original tool name without prefix
      arguments: input || {}
    });
    
    res.json({ result });
  } catch (error) {
    console.error('Error calling MCP tool:', error);
    res.status(500).json({ error: 'Failed to call tool' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
}); 