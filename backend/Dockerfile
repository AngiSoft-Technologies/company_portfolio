# Multi-stage Dockerfile to build TypeScript sources with devDependencies
# and produce a slim production image

FROM node:20-alpine AS builder
WORKDIR /app
# Install all dependencies (including dev) for the build
COPY package*.json ./
RUN npm ci
COPY . .
# Build the TypeScript project
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
# Install only production dependencies for the final image
COPY package*.json ./
RUN npm ci --only=production
# Copy built artifacts from the builder stage
COPY --from=builder /app/dist ./dist
# Environment
ENV NODE_ENV=production
EXPOSE 5000
# Use the production start script which runs migrations then starts the app
CMD ["npm", "run", "start:prod"]
