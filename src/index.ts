import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Define our MCP agent with tools
export class MyMCP extends McpAgent {
	server = new McpServer({
		name: "Authenticated Calculator",
		version: "1.0.0",
	});

	// Validate auth token
	private validateToken(token: string): boolean {
		// Replace this with your actual token validation logic
		return token === process.env.AUTH_TOKEN;
	}

	async init() {
		// Simple addition tool with auth
		this.server.tool(
			"add",
			{ a: z.number(), b: z.number() },
			async ({ a, b }, extra) => {
				// Get auth token from environment since MCP doesn't expose headers directly
				const authToken = process.env.AUTH_TOKEN;
				
				if (!authToken || !this.validateToken(authToken)) {
					return {
						content: [{
							type: "text" as const,
							text: "Unauthorized: Invalid or missing token"
						}]
					};
				}
				
				return {
					content: [{
						type: "text" as const,
						text: String(a + b)
					}]
				};
			}
		);

		// Calculator tool with multiple operations and auth
		this.server.tool(
			"calculate",
			{
				operation: z.enum(["add", "subtract", "multiply", "divide"]),
				a: z.number(),
				b: z.number(),
			},
			async ({ operation, a, b }, extra) => {
				// Get auth token from environment since MCP doesn't expose headers directly
				const authToken = process.env.AUTH_TOKEN;
				
				if (!authToken || !this.validateToken(authToken)) {
					return {
						content: [{
							type: "text" as const,
							text: "Unauthorized: Invalid or missing token"
						}]
					};
				}

				let result: number;
				switch (operation) {
					case "add":
						result = a + b;
						break;
					case "subtract":
						result = a - b;
						break;
					case "multiply":
						result = a * b;
						break;
					case "divide":
						if (b === 0) {
							return {
								content: [{
									type: "text" as const,
									text: "Error: Cannot divide by zero"
								}]
							};
						}
						result = a / b;
						break;
				}
				
				return {
					content: [{
						type: "text" as const,
						text: String(result)
					}]
				};
			}
		);
	}
}

interface Env {
	AUTH_TOKEN: string;
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		if (url.pathname === "/sse" || url.pathname === "/sse/message") {
			return MyMCP.serveSSE("/sse").fetch(request, env, ctx);
		}

		if (url.pathname === "/mcp") {
			return MyMCP.serve("/mcp").fetch(request, env, ctx);
		}

		return new Response("Not found", { status: 404 });
	},
};

