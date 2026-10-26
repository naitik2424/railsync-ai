import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://railsync:railsync_pass@localhost:5432/railsync_ai?schema=public',
  pythonMlServiceUrl: process.env.PYTHON_ML_SERVICE_URL || 'http://127.0.0.1:8000',
  corsOrigins: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    '*',
  ],
};
