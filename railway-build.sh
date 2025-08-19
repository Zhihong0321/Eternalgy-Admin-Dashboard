#!/bin/bash
set -e

echo "=== Railway Build Script ==="
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

echo "=== Installing root dependencies ==="
npm install --production=false

echo "=== Installing backend dependencies ==="
cd backend
npm install
echo "=== Building backend (Prisma client) ==="
npm run build
cd ..

echo "=== Cleaning frontend dependencies ==="
cd frontend
rm -rf node_modules package-lock.json

echo "=== Installing frontend dependencies ==="
npm install

echo "=== Building frontend ==="
npm run build
cd ..

echo "=== Build complete ==="