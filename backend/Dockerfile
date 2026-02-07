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

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript and verify output
RUN npm run build && echo "=== BUILD OUTPUT ===" && ls -la dist/ && cat dist/index.js | head -20

# Ensure production defaults in container
ENV NODE_ENV=production
ENV PORT=5000

# Expose port
EXPOSE 5000

# Start the app (runs migrations then starts server)
CMD ["npm", "run", "start:prod"]
