# MCP Chat with Claude

A full-stack application demonstrating the integration of Model Context Protocol (MCP) with Anthropic's Claude LLM, providing an interactive chat interface that leverages MCP tools.
![image](https://github.com/user-attachments/assets/83349723-c85c-4b4c-93c7-2f7dabc59f2d)

## Project Overview

This project consists of three main components:

1. **Multiple MCP Servers**: Node.js servers implementing the Model Context Protocol that provide various specialized tools for the LLM to use.
2. **Host App**: An Express server that acts as the intermediary between the user, Claude AI, and the MCP servers.
3. **Web Client**: A browser-based chat interface that communicates with the Host App.

## Features

- Interactive chat interface with Claude AI
- Two-panel UI showing conversation and tool execution details
- Dynamic tool discovery from multiple MCP servers
- Support for specialized tools with different parameters from each server
- Proper handling of Claude's tool use via MCP

## Project Structure

```
├── client/                 # Host app & web client
│   ├── dist/               # Compiled TypeScript
│   ├── host-app.ts         # Host application server
│   ├── chat.js             # Frontend chat interface logic
│   ├── index.html          # Main web interface
│   ├── styles.css          # Styling for web interface
│   ├── package.json        # Client dependencies
│   └── mcp-client-example.ts # Example MCP client for testing
│
├── server/                 # MCP servers
│   ├── dist/               # Compiled TypeScript
│   ├── mcp-server-todoplan.ts # TodoPlan MCP server implementation
│   ├── mcp-server-project.ts  # Project MCP server implementation
│   └── package.json        # Server dependencies
│
├── .gitignore              # Git ignore file
└── README.md               # Project documentation
```

## Prerequisites

- Node.js 17 or higher
- npm or yarn
- Anthropic API key

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/jiangyan/typescript-mcp-demo.git
   cd typescript-mcp-demo
   ```

2. Install dependencies for both client and server:
   ```
   cd server
   npm install
   cd ../client
   npm install
   ```

3. Create `.env` file in the client directory with your Anthropic API key:
   ```
   ANTHROPIC_API_KEY=your-api-key-here
   MCP_SERVER_TODOPLAN_URL=http://localhost:8000/sse
   MCP_SERVER_PROJECT_URL=http://localhost:8001/sse
   PORT=3000
   ```

4. Create `.env` file in the server directory:
   ```
   MCP_SERVER_TODOPLAN_PORT=8000
   MCP_SERVER_PROJECT_PORT=8001
   ```

## Setup and Running

### Step 1: Start the MCP servers

```bash
# Terminal 1: Start the TodoPlan MCP server
cd server
npm run build:todoplan
npm run start:todoplan

# Terminal 2: Start the Project MCP server
cd server
npm run build:project
npm run start:project
```

The TodoPlan MCP server will start on port 8000 and the Project MCP server will start on port 8001 by default.

### Step 2: Start the host app (web server)

```bash
cd client
npm run build
npm start
```

The web server will start on port 3000 by default.

### Step 3: Access the chat interface

Open your browser and navigate to:
```
http://localhost:3000
```

## Available MCP Tools

The MCP servers provide the following tools that Claude can use:

1. **todoplan-server_get-todo**: Get a todo item for a specific category
   - Parameters:
     - `category`: String (e.g., "life", "work", "family", "friends")

2. **todoplan-server_get-plan**: Get the overall plan
   - Parameters: None

3. **project-server_get-project-details**: Get details for a specific project
   - Parameters:
     - `project_name`: String (e.g., "Earth", "Mars", "Jupiter", "Saturn")

## Additional Example

The project includes a standalone MCP client example (`mcp-client-example.ts`) that demonstrates how to connect to the MCP server programmatically without the web interface.

To run this example:
```bash
cd client
npm run client
```

## Development

### MCP Server Development

To add a new tool to an MCP server:

1. Open the server file (e.g., `server/mcp-server-todoplan.ts`)
2. Add a new tool definition following the existing pattern:
   ```typescript
   server.tool("tool-name",
     { param1: z.string() },
     async ({ param1 }) => {
       // Tool implementation
       return {
         content: [{ type: "text", text: "Result" }]
       };
     }
   );
   ```
3. Rebuild and restart the server

### Host App Development

The host app consists of:

- Backend (`host-app.ts`): Express server that communicates with Claude and multiple MCP servers
- Frontend (`chat.js`, `index.html`, `styles.css`): Chat interface that communicates with the backend

## Architecture

```
┌─────────────┐       ┌────────────────┐       ┌───────────────┐
│             │       │                │       │               │
│  Web UI     │◄─────►│  Host App      │◄─────►│  MCP Servers  │
│  (Browser)  │       │  (Express)     │       │  (Node.js)    │
│             │       │                │       │               │
└─────────────┘       └───────┬────────┘       └───────────────┘
                              │
                              ▼
                      ┌───────────────┐
                      │               │
                      │  Claude API   │
                      │  (Anthropic)  │
                      │               │
                      └───────────────┘
```

## Multiple MCP Servers Implementation

This project implements a multi-server MCP architecture, allowing Claude to access tools from different specialized servers.

### Server Configuration

The project includes two distinct MCP servers:

1. **TodoPlan MCP Server** (`server/mcp-server-todoplan.ts`): Provides tools for managing todos and plans
   - `get-todo`: Get a todo item for a specific category
   - `get-plan`: Get the overall plan

2. **Project MCP Server** (`server/mcp-server-project.ts`): Provides tools for accessing project information
   - `get-project-details`: Get details for a specific project

### Host App Integration

The host app (`client/host-app.ts`) has been implemented to:

1. Connect to multiple MCP servers simultaneously
2. Prefix tool names with their server name using underscores to avoid conflicts (e.g., `todoplan-server_get-todo`)
3. Route tool calls to the appropriate server based on the prefix
4. Present a unified set of tools to the LLM

### Example Queries

Try the following queries to test the integration of multiple servers:

- "Tell me about project Earth"
- "What's my todo for the work category?"
- "Find my todo in the work category and tell me what projects are related to it"
- "What's my plan?"

## Troubleshooting

1. **Connection issues**: Ensure both MCP servers and the host app are running and check the console for error messages.

2. **Tool not found**: Make sure the MCP servers are running and the tool names match exactly.

3. **API key errors**: Verify your Anthropic API key is correctly set in the client's `.env` file.

4. **Tool use errors**: Check the response panel for detailed error information.

5. **Invalid tool name format**: Ensure tool names follow Anthropic's required format (alphanumeric characters, underscores, and hyphens only).

## License

[MIT](LICENSE)

## Acknowledgments

- [Model Context Protocol](https://github.com/modelcontextprotocol/typescript-sdk)
- [Anthropic Claude API](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)
