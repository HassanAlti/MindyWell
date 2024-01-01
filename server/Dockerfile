# Server Dockerfile

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

# Expose the port the server listens on
EXPOSE 4242

# Define the command to run your app
CMD ["npm", "run", "dev"]