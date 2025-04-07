# MCP Chat with Claude

A full-stack application demonstrating the integration of Model Context Protocol (MCP) with Anthropic's Claude LLM, providing an interactive chat interface that leverages MCP tools.
![image](https://github.com/user-attachments/assets/eed2ac7a-9c5f-46c0-8a42-ae950416569b)

## Project Overview

This project consists of two main components:

1. **MCP Server**: A Node.js server implementing the Model Context Protocol that provides various tools for the LLM to use.
2. **Host App**: A web application that serves as a chat interface and acts as the intermediary between the user, Claude AI, and the MCP server.

## Features

- Interactive chat interface with Claude AI
- Two-panel UI showing conversation and tool execution details
- Dynamic tool discovery from MCP server
- Support for multiple tools with different parameters
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
├── server/                 # MCP server
│   ├── dist/               # Compiled TypeScript
│   ├── mcp-server.ts       # MCP server implementation
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
   git clone https://github.com/yourusername/mcp-chat-with-claude.git
   cd mcp-chat-with-claude
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
   MCP_SERVER_HOST=localhost
   MCP_SERVER_PORT=8000
   MCP_SERVER_PATH=/sse
   ```

## Setup and Running

### Step 1: Start the MCP server

```bash
cd server
npm run build
npm start
```

The MCP server will start on port 8000 by default.

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

The MCP server provides the following tools that Claude can use:

1. **get-todo**: Get a todo item for a specific category
   - Parameters:
     - `category`: String (e.g., "life", "work", "family", "friends")

2. **get-plan**: Get the overall plan
   - Parameters: None

## Additional Example

The project includes a standalone MCP client example (`mcp-client-example.ts`) that demonstrates how to connect to the MCP server programmatically without the web interface.

To run this example:
```bash
cd client
npm run client
```

## Development

### MCP Server Development

To add a new tool to the MCP server:

1. Open `server/mcp-server.ts`
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

- Backend (`host-app.ts`): Express server that communicates with both Claude and the MCP server
- Frontend (`chat.js`, `index.html`, `styles.css`): Chat interface that communicates with the backend

## Architecture

```
┌─────────────┐       ┌────────────────┐       ┌───────────────┐
│             │       │                │       │               │
│  Web UI     │◄─────►│  Host App      │◄─────►│  MCP Server   │
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

## Troubleshooting

1. **Connection issues**: Ensure both servers are running and check the console for error messages.

2. **Tool not found**: Make sure the MCP server is running and the tool names match exactly.

3. **API key errors**: Verify your Anthropic API key is correctly set in the `.env` file.

4. **Tool use errors**: Check the response panel for detailed error information.

## License

[MIT](LICENSE)

## Acknowledgments

- [Model Context Protocol](https://github.com/modelcontextprotocol/typescript-sdk)
- [Anthropic Claude API](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)
