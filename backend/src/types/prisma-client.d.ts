import { Prisma } from '@prisma/client';

// Ensure PrismaClient typing includes the Faq model delegate in case
// the language server is using stale generated types.
declare module '@prisma/client' {
  interface PrismaClient {
    faq: Prisma.FaqDelegate<Prisma.DefaultArgs>;
    subscriber: Prisma.SubscriberDelegate<Prisma.DefaultArgs>;
  }
}
