import express, { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";

const server = new McpServer({
  name: "example-server",
  version: "1.0.0"
});

server.tool("get-todo",
  { category: z.string() },
  async ({ category }) => {
    let todoText;
    switch (category) {
      case "life":
        todoText = "go to the gym";
        break;
      case "work":
        todoText = "finish the project report";
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
  { },
  async () => ({
    content: [{ type: "text", 
      text: "buy stocks" }]
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

const port = process.env.PORT || 8000;
app.listen(port, () => {
  console.log(`Mcp Server is running on port ${port}`);
});