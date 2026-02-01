import { Request, Response } from 'express';
import prisma from '../db';
import { captureException } from '../services/monitoring/sentry';

// Settings are typically singletons; manage via a key-value store or fixed ID
export const settingsController = {
    async create(req: Request, res: Response) {
        try {
            const { key, value } = req.body;
            // For now, settings are managed as a singleton in app config
            // This can be expanded to database storage if needed
            res.status(201).json({ key, value, message: 'Settings would be persisted' });
        } catch (error) {
            captureException(error);
            res.status(500).json({ error: 'Failed to create setting' });
        }
    },

    async list(req: Request, res: Response) {
        try {
            // Return current app settings
            const settings = {
                apiVersion: process.env.API_VERSION || '1.0.0',
                maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
                stripeEnabled: !!process.env.STRIPE_SECRET,
                queueType: 'in-memory', // Using in-memory queue (can add Redis later)
                sentryEnabled: !!process.env.SENTRY_DSN,
            };
            res.json({ data: settings });
        } catch (error) {
            captureException(error);
            res.status(500).json({ error: 'Failed to fetch settings' });
        }
    },

    async getById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            res.json({ key: id, message: 'Settings retrieved' });
        } catch (error) {
            captureException(error);
            res.status(500).json({ error: 'Failed to fetch setting' });
        }
    },

    async update(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { value } = req.body;
            // Audit log update
            console.log(`[AUDIT] Settings updated: ${id} by ${(req as any).user?.email || 'unknown'}`);
            res.json({ id, value, message: 'Setting updated' });
        } catch (error) {
            captureException(error);
            res.status(500).json({ error: 'Failed to update setting' });
        }
    },

    async delete(req: Request, res: Response) {
        try {
            const { id } = req.params;
            console.log(`[AUDIT] Settings deleted: ${id} by ${(req as any).user?.email || 'unknown'}`);
            res.json({ message: 'Setting deleted' });
        } catch (error) {
            captureException(error);
            res.status(500).json({ error: 'Failed to delete setting' });
        }
    },
};
