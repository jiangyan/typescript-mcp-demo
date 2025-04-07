import express from 'express';
import cors from 'cors';
import { Anthropic } from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const mcpServerUrl = process.env.MCP_SERVER_URL || "http://localhost:8000";

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

// Initialize MCP client
const mcpClient = new Client(
  { name: "mcp-client-web", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// Initialize tools array
let mcpTools: MCPTool[] = [];

// Connect to MCP server
async function connectToMCP() {
  try {
    const url = new URL(mcpServerUrl);
    const transport = new SSEClientTransport(url);
    await mcpClient.connect(transport);
    
    // Get available tools
    const toolsResult = await mcpClient.listTools();
    mcpTools = toolsResult.tools.map(tool => ({
      name: tool.name,
      description: tool.description || `Tool: ${tool.name}`,
      input_schema: tool.inputSchema
    }));
    
    console.log('Connected to MCP server with tools:', mcpTools.map(t => t.name));
  } catch (error) {
    console.error('Failed to connect to MCP server:', error);
  }
}

// Connect to MCP server on startup
connectToMCP();

// Endpoint to list available tools
app.get('/api/tools', (req, res) => {
  res.json({ tools: mcpTools });
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
    let toolDescriptions = mcpTools.map(tool => 
      `- ${tool.name}: ${tool.description || `Tool: ${tool.name}`}`
    ).join('\n');
    
    const systemContent = `You have access to the following tools:\n${toolDescriptions}\n\nWhen responding to user queries, use these tools as needed to provide complete answers. If a task requires multiple tools, use them in sequence without waiting for additional prompting. Always analyze tool results and use them to guide further tool choices when necessary.

For example, if a user asks about their plan and todos, you should:
1. First call the get-plan tool to find out their plan
2. Analyze the plan result to determine which category it belongs to
3. Then call the get-todo tool with the appropriate category
4. Present a complete answer using both results

Always provide thoughtful, complete responses that utilize all available tools when appropriate.`;
    
    // Filter out any existing system messages (they're not supported in messages array)
    messages = messages.filter((msg: any) => msg.role !== 'system');
    
    // Claude API with tools - using any to bypass TypeScript constraints
    // as this is using a newer version of the API 
    const response = await (anthropic.messages.create as any)({
      model: "claude-3-5-sonnet-20241022",
      system: systemContent,
      max_tokens: 1024,
      messages,
      tools: mcpTools,
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
    
    const result = await mcpClient.callTool({
      name,
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