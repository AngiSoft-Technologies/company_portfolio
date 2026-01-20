import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

export interface FileValidationOptions {
    maxSize?: number; // in bytes
    allowedMimeTypes?: string[];
    allowedExtensions?: string[];
}

export function validateFile(options: FileValidationOptions = {}) {
    const {
        maxSize = 10 * 1024 * 1024, // 10MB default
        allowedMimeTypes = [],
        allowedExtensions = []
    } = options;

    return (req: Request, res: Response, next: NextFunction) => {
        const file = (req as any).file;
        if (!file) {
            return next();
        }

        // Check file size
        if (file.size > maxSize) {
            return res.status(400).json({
                error: 'File too large',
                message: `File size exceeds ${maxSize / (1024 * 1024)}MB limit`
            });
        }

        // Check MIME type
        if (allowedMimeTypes.length > 0) {
            const isValidMime = allowedMimeTypes.some(type => {
                if (type.endsWith('/*')) {
                    return file.mimetype.startsWith(type.slice(0, -2));
                }
                return file.mimetype === type;
            });

            if (!isValidMime) {
                return res.status(400).json({
                    error: 'Invalid file type',
                    message: `Allowed types: ${allowedMimeTypes.join(', ')}`
                });
            }
        }

        // Check file extension
        if (allowedExtensions.length > 0) {
            const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
            const isValidExt = allowedExtensions.some(ext => {
                const normalizedExt = ext.startsWith('.') ? ext.slice(1) : ext;
                return fileExtension === normalizedExt.toLowerCase();
            });

            if (!isValidExt) {
                return res.status(400).json({
                    error: 'Invalid file extension',
                    message: `Allowed extensions: ${allowedExtensions.join(', ')}`
                });
            }
        }

        next();
    };
}

// Common file validation presets
export const fileValidators = {
    image: validateFile({
        maxSize: 5 * 1024 * 1024, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    }),
    document: validateFile({
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedMimeTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ],
        allowedExtensions: ['.pdf', '.doc', '.docx']
    }),
    avatar: validateFile({
        maxSize: 2 * 1024 * 1024, // 2MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp']
    })
};

