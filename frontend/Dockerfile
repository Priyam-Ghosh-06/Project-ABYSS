# Stage 1: Build static assets using Bun (Fast & lightweight)
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Copy package descriptors and lockfile
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Copy application source code and compile production build
COPY . .
RUN bun run build

# Stage 2: Serve static files with production Nginx
FROM nginx:alpine

# Copy custom Nginx configuration with API reverse proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
