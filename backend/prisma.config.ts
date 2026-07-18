import type { PrismaConfig } from 'prisma';
import { resolveDatabaseUrl } from './src/connectionUrl';

const config: PrismaConfig = {
  datasource: {
    url: resolveDatabaseUrl(),
  },
};

export default config;
