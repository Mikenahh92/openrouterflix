# ---- Stage 1: Build frontend with Vite ----
FROM node:24-alpine AS build

WORKDIR /app

# Install dependencies first (layer cache)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source files
COPY src/ src/
COPY public/ public/
COPY index.html index.html
COPY vite.config.js vite.config.js
COPY eslint.config.js eslint.config.js

# Build production bundle
RUN npm run build

# ---- Stage 2: Serve with Nginx ----
FROM nginx:alpine

# Copy custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
