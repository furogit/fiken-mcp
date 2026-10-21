import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

type Handler = (params: unknown) => Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
}>;

export function createMockServer() {
    const handlers = new Map<string, Handler>();
    const tools = new Map<string, unknown>();
    const server = {
        registerTool(name: string, config: unknown, handler: Handler) {
            handlers.set(name, handler);
            tools.set(name, config);
        },
        getHandler(name: string): Handler {
            const h = handlers.get(name);
            if (!h) throw new Error(`No handler registered for tool: ${name}`);
            return h;
        },
        getTool(name: string): unknown {
            const tool = tools.get(name);
            if (!tool) throw new Error(`No tool registered: ${name}`);
            return tool;
        },
    };
    return server as unknown as McpServer & {
        getHandler(name: string): Handler;
        getTool(name: string): unknown;
    };
}
