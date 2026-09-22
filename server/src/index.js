import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import prisma from './db/prisma.js';

const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    // Verify database connection
    await prisma.$connect();
    console.log('📦 Connected to PostgreSQL database successfully.');

    app.listen(PORT, () => {
      console.log(`🚀 BBG Server running on http://localhost:${PORT}`);
      console.log(`📡 API Base: http://localhost:${PORT}/api/v1`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
