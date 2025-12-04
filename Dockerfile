
# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package.json yarn.lock ./
COPY src/ ./src
COPY index.html ./
COPY vite.config.js ./
COPY public/ ./public
RUN yarn install --frozen-lockfile && yarn build

# Stage 2: Build backend
FROM node:20-alpine AS backend-builder
WORKDIR /app/server
COPY server/package.json server/yarn.lock ./
COPY server/index.js ./
RUN yarn install --frozen-lockfile

# Stage 3: Production image
FROM node:20-alpine
WORKDIR /app
COPY --from=frontend-builder /app/dist ./dist
COPY --from=backend-builder /app/server ./server

# Install pm2 globally
RUN yarn global add pm2

# Expose port
EXPOSE 12312

# Start backend with pm2
CMD ["pm2-runtime", "server/index.js"]