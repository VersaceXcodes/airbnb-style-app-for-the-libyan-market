#!/bin/bash

# Production startup script
set -e

echo "🚀 Starting production deployment..."

# Set production environment
export NODE_ENV=production
export PORT=${PORT:-3000}

# Build backend
echo "📦 Building backend..."
cd backend
npm run build

# Copy frontend build to backend public directory
echo "📁 Setting up frontend..."
cd ../vitereact
npm run build
cd ..

# Ensure backend public directory exists
mkdir -p backend/public

# Copy built frontend files to backend public directory
cp -r vitereact/public/* backend/public/

echo "✅ Frontend files copied to backend/public"

# Start backend server
echo "🚀 Starting backend server on port $PORT..."
cd backend
exec npm run prod