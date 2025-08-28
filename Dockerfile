# Use Node.js 20 Alpine for smaller image size
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install backend dependencies
RUN npm install

# Copy backend source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Back to app root
WORKDIR /app

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "start"]