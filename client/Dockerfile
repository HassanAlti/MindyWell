# Client Dockerfile

# Use the official Node.js 18 image as a parent image
FROM node:18

# Set the working directory in the Docker container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available) to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Bundle app source
COPY . .

# Build the React app
RUN npm run build

# Use nginx to serve the React app
FROM nginx:alpine
COPY --from=0 /usr/src/app/build /usr/share/nginx/html
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]