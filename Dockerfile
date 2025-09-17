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

# Verify critical dependencies are installed
RUN ls -la node_modules/@radix-ui/ || echo "Radix UI not found"
RUN test -d node_modules/@radix-ui/react-label || npm install @radix-ui/react-label

COPY frontend/src ./src
COPY frontend/public ./public
COPY frontend/index.html ./
COPY frontend/vite.config.ts ./
COPY frontend/tsconfig.json ./
COPY frontend/tsconfig.*.json ./
COPY frontend/tailwind.config.js ./
COPY frontend/postcss.config.js ./
COPY frontend/eslint.config.js ./
RUN npm run build

# Back to app root
WORKDIR /app

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "start"]