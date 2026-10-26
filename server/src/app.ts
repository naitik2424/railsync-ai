import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import taskRoutes from './routes/taskRoutes.js';
import predictionRoutes from './routes/predictionRoutes.js';
import optimizationRoutes from './routes/optimizationRoutes.js';
import coordinationRoutes from './routes/coordinationRoutes.js';
import simulationRoutes from './routes/simulationRoutes.js';

export const createApp = (): express.Application => {
  const app = express();

  // Middleware
  app.use(
    cors({
      origin: config.corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  app.use(express.json());

  // Root & Health Checks
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      system: 'RailSync AI - Express Main Backend',
      architecture: 'MERN Stack + Python AI/ML Microservice',
      version: '1.0.0',
      status: 'Operational',
      timestamp: new Date().toISOString(),
      endpoints: [
        '/api/tasks',
        '/api/predictions',
        '/api/optimization',
        '/api/coordination',
        '/api/simulation',
      ],
    });
  });

  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      server: 'Express.js',
      timestamp: new Date().toISOString(),
    });
  });

  // Mount API routers under /api
  app.use('/api/tasks', taskRoutes);
  app.use('/api/predictions', predictionRoutes);
  app.use('/api/optimization', optimizationRoutes);
  app.use('/api/coordination', coordinationRoutes);
  app.use('/api/simulation', simulationRoutes);

  // 404 Handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({ detail: `Endpoint ${req.method} ${req.originalUrl} not found` });
  });

  // Global Error Handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[Express Global Error]:', err);
    res.status(err.status || 500).json({
      detail: err.message || 'Internal server error',
    });
  });

  return app;
};
