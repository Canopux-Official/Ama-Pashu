# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copy package descriptors for dependency installation
COPY package*.json ./

# Install dependencies (including devDependencies for TypeScript build)
RUN npm install

# Copy application source code
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# Stage 2: Create the production image
FROM node:20-alpine

WORKDIR /usr/src/app

# Copy package descriptors and install only production dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy built artifacts from the builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Create uploads directory (used locally by webhook logic)
RUN mkdir -p uploads && chown -R node:node uploads

# Expose the API port
EXPOSE 5000

# Set Node environment
ENV NODE_ENV=production

# Drop privileges to standard node user
USER node

# Start the application
CMD ["npm", "start"]
