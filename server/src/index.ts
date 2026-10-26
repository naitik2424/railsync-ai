import { createApp } from './app.js';
import { config } from './config/index.js';
import { db } from './db/index.js';

const startServer = async () => {
  console.log('====================================================');
  console.log('🚄 Starting RailSync AI - Express Main Backend Server');
  console.log('====================================================');

  // Initialize DB Connection (PostgreSQL or local fallback)
  await db.initialize();

  const app = createApp();

  app.listen(config.port, () => {
    console.log(`🚀 Express server running at: http://localhost:${config.port}`);
    console.log(`🔗 Python ML microservice expected at: ${config.pythonMlServiceUrl}`);
    console.log(`📡 Health Check: http://localhost:${config.port}/health`);
    console.log('====================================================');
  });
};

startServer().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
