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
            const services = await prisma.orm.public.Service
                .where({ published: true })
                .orderBy((s) => s.createdAt.desc())
                .limit(100)
                .all();
            const categories = await prisma.orm.public.ServiceCategory
                .where({ published: true })
                .orderBy((c) => c.name.asc())
                .all();
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
            const service = await prisma.orm.public.Service
                .where({ slug: String(slug) })
                .first();
            if (!service || !service.published) return json({ error: `No published service for slug "${slug}"` });
            return json(service);
        }
    );

    tool(
        server,
        'list_projects',
        { title: 'List projects', description: 'List published portfolio projects.' },
        async () => {
            const projects = await prisma.orm.public.Project
                .where({ published: true })
                .orderBy((p) => p.createdAt.desc())
                .limit(100)
                .all();
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
            const project = await prisma.orm.public.Project
                .where({ slug: String(slug) })
                .first();
            if (!project || !project.published) return json({ error: `No published project for slug "${slug}"` });
            return json(project);
        }
    );

    tool(
        server,
        'list_products',
        { title: 'List products', description: 'List published products.' },
        async () => {
            const products = await prisma.orm.public.Product
                .where({ published: true })
                .orderBy((p) => p.createdAt.desc())
                .limit(100)
                .all();
            return json(products);
        }
    );

    tool(
        server,
        'list_blog_posts',
        { title: 'List blog posts', description: 'List published blog posts.' },
        async () => {
            const posts = await prisma.orm.public.BlogPost
                .where({ published: true })
                .orderBy((p) => p.publishedAt.desc())
                .limit(100)
                .select('id', 'title', 'slug', 'subtitle', 'publishedAt')
                .all();
            return json(posts);
        }
    );

    tool(
        server,
        'list_testimonials',
        { title: 'List testimonials', description: 'List published testimonials.' },
        async () => {
            const testimonials = await prisma.orm.public.Testimonial
                .orderBy((t) => t.createdAt.desc())
                .limit(100)
                .all();
            return json(testimonials);
        }
    );
}