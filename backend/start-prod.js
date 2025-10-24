#!/usr/bin/env node

// Production startup script
import { app, server, pool } from './dist/server.js';

const port = process.env.PORT || 3000;

console.log('🚀 Production server starting...');
console.log(`📡 Server will run on port ${port}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`);

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    pool.end();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    pool.end();
    process.exit(0);
  });
});