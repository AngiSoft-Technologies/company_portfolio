import { createCrudRouter } from '../utils/crud';
import { z } from 'zod';
import { servicesController } from '../controllers/servicesController';

const createSchema = z.object({ title: z.string().min(1), slug: z.string().min(1), description: z.string().optional(), priceFrom: z.number().optional(), images: z.array(z.string()).optional(), published: z.boolean().optional() });
const updateSchema = createSchema.partial();

export default function servicesRouter() {
    return createCrudRouter({ modelName: 'Service', createSchema, updateSchema, controller: servicesController });
}
