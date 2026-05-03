FROM node:20-alpine

WORKDIR /app

# Install production dependencies first (layer cache)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy server source
COPY index.js index.js
COPY middleware/ middleware/
COPY services/ services/

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

CMD ["node", "index.js"]
