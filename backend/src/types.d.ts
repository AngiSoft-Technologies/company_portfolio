import { Prisma } from '@prisma/client';

declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}

declare module '@prisma/client' {
    interface PrismaClient {
        faq: Prisma.FaqDelegate<Prisma.DefaultArgs>;
        subscriber: Prisma.SubscriberDelegate<Prisma.DefaultArgs>;
    }
}

export {};
