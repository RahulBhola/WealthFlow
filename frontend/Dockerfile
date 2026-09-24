# Stage 1: Build React PWA with Node 22 Alpine
FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy sources and build production bundle
COPY . .
RUN npm run build

# Stage 2: Serve static files with unprivileged non-root NGINX Alpine
FROM nginx:alpine AS final

# Remove default configuration and static files
RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf

# Copy custom non-root NGINX configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy build artifacts
COPY --from=build /app/dist /usr/share/nginx/html

# Prepare temporary directories and ownership for non-root nginx execution
RUN mkdir -p /tmp/client_temp /tmp/proxy_temp_path /tmp/fastcgi_temp /tmp/uwsgi_temp /tmp/scgi_temp \
    && chown -R nginx:nginx /tmp /usr/share/nginx/html /var/cache/nginx /var/log/nginx

# Switch to unprivileged non-root user
USER nginx

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
