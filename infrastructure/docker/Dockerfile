FROM node:22-alpine

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Copy package files first (better caching)
COPY package*.json ./

# Install dependencies (include dev deps for build)
RUN npm ci --include=dev

# Copy prisma schema
COPY prisma ./prisma
COPY migrations ./migrations

# Copy Prisma 8 CLI config (supplies the contract path + db connection for
# migrate/seed commands)
COPY prisma.config.ts ./

# NOTE: no `prisma contract emit` here. The P8 contract artifacts
# (src/prisma/contract.json + contract.d.ts) are committed to the repo and are
# copied into the image with `COPY src ./src` below; the TypeScript build
# consumes them directly. Emitting inside Docker would require the contract
# source (src/prisma/contract.prisma) before this point and would risk
# re-emitting artifacts with a CLI version skewed from the pinned
# @prisma/orm-postgres runtime — the committed artifacts are the safer source
# of truth and emit failing must never break the image build.

# Copy source code
COPY tsconfig.json ./
COPY src ./src
COPY uploads ./uploads


# Build TypeScript and verify output
RUN npm run build && echo "=== BUILD OUTPUT ===" && ls -la dist/ && cat dist/index.js | head -20

# Ensure production defaults in container
ENV NODE_ENV=production
ENV PORT=5000

# Expose port
EXPOSE 5000

CMD ["npm", "start"]
