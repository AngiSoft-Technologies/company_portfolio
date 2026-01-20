import { createCrudRouter } from '../utils/crud';
import { z } from 'zod';
import { settingsController } from '../controllers/settingsController';

const createSchema = z.object({
    key: z.string().min(1),
    value: z.any(),
});

const updateSchema = createSchema.partial();

export default function settingsRouter() {
    return createCrudRouter({
        modelName: 'Setting',
        createSchema,
        updateSchema,
        controller: settingsController,
    });
}
