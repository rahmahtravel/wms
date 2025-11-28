# Use an official Node runtime as a parent image
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install dependencies
# Copy package files first for better caching
COPY package.json package-lock.json* ./

# Prefer npm ci when lockfile present, otherwise fallback to npm install
RUN npm ci --production --silent || npm install --production --silent

# Copy the rest of the application
COPY . .

# Create upload directory and set permissions (if used by the app)
RUN mkdir -p ./public/uploads \
    && chown -R node:node /usr/src/app

# Use non-root user
USER node

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Start the app
CMD ["node", "server.js"]
