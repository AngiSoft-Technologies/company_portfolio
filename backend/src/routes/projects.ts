import { createCrudRouter } from '../utils/crud';
import { z } from 'zod';
import { projectsController } from '../controllers/projectsController';

const createSchema = z.object({ title: z.string().min(1), slug: z.string().min(1), description: z.string().optional(), type: z.string().optional(), images: z.array(z.string()).optional(), demoUrl: z.string().optional(), repoUrl: z.string().optional(), techStack: z.array(z.string()).optional(), published: z.boolean().optional() });
const updateSchema = createSchema.partial();

export default function projectsRouter() { return createCrudRouter({ modelName: 'Project', createSchema, updateSchema, controller: projectsController }); }
