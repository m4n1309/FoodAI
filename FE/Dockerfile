# Stage 1: Build the React SPA
FROM node:20-alpine AS builder

WORKDIR /app

# Declare Build Arguments for Vite
ARG VITE_API_URL=/api
ARG VITE_APP_NAME=m4nFood
ARG VITE_SEPAY_ACCOUNT_NO
ARG VITE_SEPAY_BANK

# Expose arguments as environment variables for Vite compiler
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_SEPAY_ACCOUNT_NO=$VITE_SEPAY_ACCOUNT_NO
ENV VITE_SEPAY_BANK=$VITE_SEPAY_BANK

# Copy dependency definitions
COPY package*.json yarn.lock ./

# Install dependencies using Yarn (since yarn.lock is present)
RUN yarn install --frozen-lockfile

# Copy the rest of the frontend source code
COPY . .

# Build the frontend assets for production
RUN yarn build

# Stage 2: Serve the build output via Nginx
FROM nginx:stable-alpine

# Copy custom reverse proxy config for routing and SPA support
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from the build stage to Nginx web root
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80 for Nginx
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
