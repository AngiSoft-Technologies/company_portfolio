import { createCrudRouter } from '../utils/crud';
import { z } from 'zod';
import { blogController } from '../controllers/blogController';

const createSchema = z.object({ title: z.string().min(1), slug: z.string().min(1), content: z.string().min(1), authorId: z.string().min(1), tags: z.array(z.string()).optional(), published: z.boolean().optional() });
const updateSchema = createSchema.partial();

export default function blogsRouter() { return createCrudRouter({ modelName: 'BlogPost', createSchema, updateSchema, controller: blogController }); }
