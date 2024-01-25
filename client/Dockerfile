# Client Dockerfile

# Stage 1: Build the React application
# Use the official Node.js 18 image as a parent image
FROM node:18 AS build-stage

# Set the working directory in the Docker container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available) to the working directory
COPY package*.json ./

# Install dependencies
RUN NODE_OPTIONS=--max-old-space-size=4096 npm install

# Bundle app source
COPY . .

# Build the React app
RUN npm run build

# Stage 2: Build a custom Caddy with plugins
FROM caddy:2-builder-alpine AS caddy-builder

# Build Caddy with additional plugins
RUN xcaddy build \
    --with github.com/RussellLuo/caddy-ext/ratelimit

# Stage 3: Set up the final image
FROM caddy:2-alpine

# Copy the custom built Caddy from the builder stage
COPY --from=caddy-builder /usr/bin/caddy /usr/bin/caddy

# Copy the built files from the build-stage
COPY --from=build-stage /usr/src/app/build /usr/share/caddy

# Set the Caddyfile
COPY Caddyfile /etc/caddy/Caddyfile

# Expose ports 80 and 443 for HTTP and HTTPS traffic
EXPOSE 80 443

# Start Caddy
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]

