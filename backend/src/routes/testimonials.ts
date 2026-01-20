import { createCrudRouter } from '../utils/crud';
import { z } from 'zod';
import { testimonialsController } from '../controllers/testimonialsController';

const createSchema = z.object({
    name: z.string().min(1),
    company: z.string().optional(),
    role: z.string().optional(),
    text: z.string().min(10),
    rating: z.number().min(1).max(5).optional(),
    imageUrl: z.string().optional(),
    confirmed: z.boolean().optional(),
});

const updateSchema = createSchema.partial();

export default function testimonialsRouter() {
    return createCrudRouter({
        modelName: 'Testimonial',
        createSchema,
        updateSchema,
        controller: testimonialsController,
    });
}
