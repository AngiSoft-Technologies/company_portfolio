FROM node:22-alpine

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Copy package files first (better caching)
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy prisma schema
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Copy source code - cache bust 20260128
COPY . .

# Build TypeScript and verify output exists
RUN npm run build && ls -la dist/

# Expose port
EXPOSE 5000

# Start the app
CMD ["node", "dist/index.js"]
