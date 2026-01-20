import { Router } from 'express';
import { z } from 'zod';

export function createCrudRouter({ modelName, createSchema, updateSchema, listSelect, idKey = 'id', controller }: any) {
    const router = Router();
    router.post('/', async (req, res) => {
        const parsed = createSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        try {
            const created = await controller.create(parsed.data, req.user);
            res.status(201).json(created);
        } catch (err: any) { res.status(500).json({ error: err.message }); }
    });
    router.get('/', async (req, res) => {
        try { const list = await controller.list(); res.json(list); } catch (err: any) { res.status(500).json({ error: err.message }); }
    });
    router.get(`/:${idKey}`, async (req, res) => {
        try { const one = await controller.get(req.params[idKey]); if (!one) return res.status(404).json({ error: 'Not found' }); res.json(one); } catch (err: any) { res.status(500).json({ error: err.message }); }
    });
    router.put(`/:${idKey}`, async (req, res) => {
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
        try { const updated = await controller.update(req.params[idKey], parsed.data, req.user); res.json(updated); } catch (err: any) { res.status(500).json({ error: err.message }); }
    });
    router.delete(`/:${idKey}`, async (req, res) => {
        try { await controller.delete(req.params[idKey], req.user); res.json({ ok: true }); } catch (err: any) { res.status(500).json({ error: err.message }); }
    });
    return router;
}
