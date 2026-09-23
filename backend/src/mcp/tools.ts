// Read-only MCP tool registry. Exposes the public content catalog (services,
// projects, products, blog posts, testimonials) over the Model Context
// Protocol so AI tools/agents can query published site content without any
// write access to the database.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import z from 'zod';
import prisma from '../db';

// The SDK's registerTool generics recurse with zod 3.25 — wrap with runtime-typed
// loose signatures; args are still validated by the SDK from `inputSchema`.
type ToolArgs = Record<string, unknown>;
type ToolResult = Promise<{ content: { type: 'text'; text: string }[] }>;

function tool(
    server: McpServer,
    name: string,
    config: { title?: string; description?: string; inputSchema?: Record<string, ReturnType<typeof z.string>> },
    cb: (args: ToolArgs) => ToolResult
) {
    (server.registerTool as unknown as (
        n: string,
        c: { title?: string; description?: string; inputSchema?: unknown },
        h: (a: ToolArgs) => ToolResult
    ) => void)(name, config, cb);
}

const json = (data: unknown) => ({
    content: [{ type: 'text' as const, text: JSON.stringify(data) }],
});

export function registerReadOnlyTools(server: McpServer) {
    tool(
        server,
        'list_services',
        { title: 'List services', description: 'List published services and service categories.' },
        async () => {
            const services = await prisma.service.findMany({
                where: { published: true },
                orderBy: { createdAt: 'desc' },
                take: 100,
            });
            const categories = await prisma.serviceCategory.findMany({
                where: { published: true },
                orderBy: { name: 'asc' },
            });
            return json({ services, categories });
        }
    );

    tool(
        server,
        'get_service',
        {
            title: 'Get service',
            description: 'Fetch a single published service by slug.',
            inputSchema: { slug: z.string() },
        },
        async ({ slug }) => {
            const service = await prisma.service.findUnique({
                where: { slug: String(slug) },
            });
            if (!service || !service.published) return json({ error: `No published service for slug "${slug}"` });
            return json(service);
        }
    );

    tool(
        server,
        'list_projects',
        { title: 'List projects', description: 'List published portfolio projects.' },
        async () => {
            const projects = await prisma.project.findMany({
                where: { published: true },
                orderBy: { createdAt: 'desc' },
                take: 100,
            });
            return json(projects);
        }
    );

    tool(
        server,
        'get_project',
        {
            title: 'Get project',
            description: 'Fetch a single published project by slug.',
            inputSchema: { slug: z.string() },
        },
        async ({ slug }) => {
            const project = await prisma.project.findUnique({ where: { slug: String(slug) } });
            if (!project || !project.published) return json({ error: `No published project for slug "${slug}"` });
            return json(project);
        }
    );

    tool(
        server,
        'list_products',
        { title: 'List products', description: 'List published products.' },
        async () => {
            const products = await prisma.product.findMany({
                where: { published: true },
                orderBy: { createdAt: 'desc' },
                take: 100,
            });
            return json(products);
        }
    );

    tool(
        server,
        'list_blog_posts',
        { title: 'List blog posts', description: 'List published blog posts.' },
        async () => {
            const posts = await prisma.blogPost.findMany({
                where: { published: true },
                orderBy: { publishedAt: 'desc' },
                take: 100,
                select: {
                    id: true,
                    title: true,
                    slug: true,
                    subtitle: true,
                    publishedAt: true,
                },
            });
            return json(posts);
        }
    );

    tool(
        server,
        'list_testimonials',
        { title: 'List testimonials', description: 'List published testimonials.' },
        async () => {
            const testimonials = await prisma.testimonial.findMany({
                orderBy: { createdAt: 'desc' },
                take: 100,
            });
            return json(testimonials);
        }
    );
}