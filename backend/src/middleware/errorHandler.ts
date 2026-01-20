import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

export interface AppError extends Error {
    statusCode?: number;
    code?: string;
}

export function errorHandler(err: AppError, req: Request, res: Response, next: NextFunction) {
    console.error('Error:', err);

    // Prisma errors
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
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
            message: err.message
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

    // Custom application errors
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal server error';

    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';

    res.status(statusCode).json({
        error: message,
        ...(isDevelopment && { stack: err.stack, details: err })
    });
}

export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
    res.status(404).json({
        error: 'Not found',
        message: `Route ${req.method} ${req.path} not found`
    });
}

