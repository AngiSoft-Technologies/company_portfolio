// Minimal read-only MCP endpoints for the AngiSoft API.
//
// Two surfaces on the same tool registry:
//   1. HTTP (Streamable HTTP, stateless) — POST /mcp, opt-in via MCP_HTTP_ENABLED.
//   2. stdio — `npm run mcp:stdio`, useful for local AI clients/desktop apps.
//
// Both are read-only (see tools.ts); gRPC is intentionally documented instead
// of implemented (see docs/ROADMAP.md §3.6).

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { IncomingMessage, ServerResponse } from 'node:http';
import { registerReadOnlyTools } from './tools';

const MCP_NAME = 'angisoft-api';
const MCP_VERSION = '1.0.0';

function buildServer(): McpServer {
    const server = new McpServer({ name: MCP_NAME, version: MCP_VERSION });
    registerReadOnlyTools(server);
    return server;
}

/**
 * Stateless Streamable HTTP handler for POST /mcp. A fresh server/transport is
 * created per request so concurrent callers never share transport state.
 */
export async function handleMcpHttpRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    const server = buildServer();
    res.on('close', () => {
        transport.close().catch(() => {});
        server.close().catch(() => {});
    });
    await server.connect(transport);
    await transport.handleRequest(req, res);
}

/** stdio entrypoint — `node dist/mcp/index.js`. */
async function stdioMain() {
    const server = buildServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(`MCP server "${MCP_NAME}" ready (stdio)`);
}

if (require.main === module) {
    stdioMain().catch((err) => {
        console.error('MCP stdio failed:', err);
        process.exit(1);
    });
}