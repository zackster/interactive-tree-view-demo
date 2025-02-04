# Build stage for Vite frontend
FROM node:20 AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Use production env file during build
COPY .env.production .env
RUN npm run build

# Production stage
FROM node:20-slim
WORKDIR /app

# Copy backend dependencies
COPY package*.json ./
COPY server.js ./
RUN npm install --production

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/dist ./dist

EXPOSE 3000
EXPOSE 3001

CMD ["node", "server.js"]