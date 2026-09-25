import type { Db } from '../../db';

// The Faq and Subscriber models live in the emitted Prisma 8 contract
// (src/prisma/contract.json / contract.d.ts). These aliases keep the language
// server honest about their presence on the shared client — the replacement
// for the old `declare module '@prisma/client'` delegate augmentation.
type FaqModel = Db['orm']['public']['Faq'];
type SubscriberModel = Db['orm']['public']['Subscriber'];

// Referenced so the aliases cannot be elided as unused.
export type { FaqModel, SubscriberModel };
