# Single-stage build
FROM oven/bun:latest

WORKDIR /app

# Copy all files
COPY . .

# Install dependencies
RUN bun install --frozen-lockfile

# Build client
RUN bun run build:client

# Create data directory for persistent storage
RUN mkdir -p /app/data

# Set port environment variable
ENV PORT=32123

# Expose port 32123
EXPOSE 32123

# Start the application
CMD ["bun", "run", "src/index.ts"]
