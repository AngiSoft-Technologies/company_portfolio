import { createCrudRouter } from '../../../shared/utils/crud';
import { z } from 'zod';
import { settingsService } from '../services/settingsService';

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
        controller: settingsService,
    });
}
