import { Request, Response, NextFunction, RequestHandler } from 'express';

export interface AppError extends Error {
    statusCode?: number;
    code?: string;
}

// Helper to check Prisma errors without relying on Prisma namespace
function isPrismaKnownError(err: any): err is { code: string; message: string } {
    return err && typeof err.code === 'string' && err.code.startsWith('P');
}

export function errorHandler(err: AppError, req: Request, res: Response, next: NextFunction) {
    console.error('Error:', err);

    // Prisma errors
    if (isPrismaKnownError(err)) {
        if (err.code === 'P2002') {
            return res.status(409).json({
                error: 'Duplicate entry',
                message: 'A record with this value already exists'
            });
        }
        if (err.code === 'P2025') {
            return res.status(404).json({
                error: 'Not found',
                message: 'The requested record was not found'
            });
        }
        return res.status(400).json({
            error: 'Database error',
            message: 'The request could not be completed'
        });
    }

    // Validation errors
    if (err.name === 'ZodError') {
        return res.status(400).json({
            error: 'Validation error',
            message: err.message
        });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return res.status(401).json({
            error: 'Authentication error',
            message: 'Invalid or expired token'
        });
    }

    // Custom application errors. Never echo internal error text for a 5xx.
    const statusCode = err.statusCode || 500;
    const message = statusCode >= 500
        ? 'Internal server error'
        : (err.message || 'Request failed');

    const isDevelopment = process.env.NODE_ENV === 'development';

    res.status(statusCode).json({
        error: message,
        ...(isDevelopment && { stack: err.stack, details: err })
    });
}

export const asyncHandler = (handler: RequestHandler): RequestHandler => (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
};

export function notFoundHandler(_req: Request, res: Response, _next: NextFunction) {
    res.status(404).json({ error: 'Not found' });
}

