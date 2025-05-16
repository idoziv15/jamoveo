# client/Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first
COPY client/package*.json ./

# Install dependencies
RUN npm install

COPY client/ .

# Build
RUN npm run build

# Serve
EXPOSE 4173
CMD ["npm", "run", "preview"]
