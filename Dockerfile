FROM node:20-alpine 
WORKDIR /app/dist
COPY dist/* ./

WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
COPY server/index.js ./
WORKDIR /app/server/node_modules
COPY server/node_modules ./

# Install pm2 globally
RUN yarn global add pm2

# Expose port
EXPOSE 12312

# Start 
CMD ["./docker_start.sh"]   