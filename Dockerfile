# Build stage
FROM oven/bun:latest as builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build client
RUN bun run build:client

# Runtime stage
FROM oven/bun:latest

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies (production only)
RUN bun install --frozen-lockfile --production

# Copy source code directly
COPY src ./src

# Copy built client assets from builder
COPY --from=builder /app/dist ./dist

# Set port environment variable
ENV PORT=32123

# Expose port 32123
EXPOSE 32123

# Start the application
CMD ["bun", "src/index.ts"]
