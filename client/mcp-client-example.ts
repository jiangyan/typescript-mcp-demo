import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

async function main() {
  // Create the URL for SSE endpoint
  const url = new URL("http://localhost:3001/sse");
  
  // Create the transport pointing to our server
  const transport = new SSEClientTransport(url);

  // Create the client
  const client = new Client(
    {
      name: "example-client",
      version: "1.0.0"
    },
    {
      capabilities: {
        prompts: {},
        resources: {},
        tools: {}
      }
    }
  );

  try {
    
    await client.connect(transport);
    console.log("Calling get-todos tool...");
    const result = await client.callTool({
      name: "get-todos",
      arguments: {}
    });
    
    console.log("Tool result:", result);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await transport.close();
  }
}

main().catch(console.error); 