import express, { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";

const server = new McpServer({
  name: "todoplan-server",
  version: "1.0.0"
});

// Defining tools based on SDK examples
server.tool("get-todo", 
  // Schema
  { 
    category: z.string().describe("Category of todo to retrieve (life, work, family, friends)") 
  }, 
  // Handler
  async (args) => {
    const category = args.category;
    let todoText;
    switch (category) {
      case "life":
        todoText = "go to the gym";
        break;
      case "work":
        todoText = "finish the project Jupiter report";
        break;
      case "family":
        todoText = "trip to disneyland";
        break;
      case "friends":
        todoText = "drink at the pub";
        break;
      default:
        todoText = "no todo available";
    }
    return {
      content: [{ type: "text", text: todoText }]
    };
  }
);

server.tool("get-plan", 
  // Empty schema - no parameters  
  {}, 
  // Handler
  async () => ({
    content: [{ type: "text", text: "meet my friends" }]
  })
);

const app = express();

// to support multiple simultaneous connections we have a lookup object from
// sessionId to transport
const transports: {[sessionId: string]: SSEServerTransport} = {};

app.get("/sse", async (_: Request, res: Response) => {
  const transport = new SSEServerTransport('/messages', res);
  transports[transport.sessionId] = transport;
  res.on("close", () => {
    delete transports[transport.sessionId];
  });
  await server.connect(transport);
});

app.post("/messages", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports[sessionId];
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send('No transport found for sessionId');
  }
});

const port = process.env.MCP_SERVER_TODOPLAN_PORT || 8000;
app.listen(port, () => {
  console.log(`Mcp Server is running on port ${port}`);
});