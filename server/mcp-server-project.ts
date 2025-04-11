import express, { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";

const server = new McpServer({
  name: "project-mcp-server",
  version: "1.0.0"
});

// Defining tools based on SDK examples
server.tool("get-project-details", 
  // Schema
  { 
    project_name: z.string().describe("Name of the project to retrieve details") 
  }, 
  // Handler
  async (args) => {
    const project_name = args.project_name;
    let content;
    switch (project_name) {
      case "Earth":
        content = "Project A is a project to build a website for a client";
        break;
      case "Jupiter":
        content = "Project B is a project to build a mobile app for a client";
        break;
      case "Saturn":
        content = "Project C is a project to build a desktop app for a client";
        break;
      case "Uranus":
        content = "Project D is a project to build a robot for a client";
        break;
      default:
        content = "no todo available";
    }
    return {
      content: [{ type: "text", text: content }]
    };
  }
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

const port = process.env.MCP_SERVER_PROJECT_PORT || 8001;
app.listen(port, () => {
  console.log(`Mcp Server is running on port ${port}`);
});