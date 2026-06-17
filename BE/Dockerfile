# Use a stable Node.js LTS version on Alpine Linux
FROM node:20-alpine

# Set working directory inside the container
WORKDIR /usr/src/app

# Install build dependencies for compiling native node modules (like bcrypt)
RUN apk add --no-cache python3 make g++

# Copy package descriptors first to leverage Docker layer caching
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy the rest of the application source code
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["node", "src/server.js"]
