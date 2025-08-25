import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { DatabaseService } from './services/database';
import planRoutes from './routes/planRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:7777', 'http://localhost:8080'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/plans', planRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  const dbService = DatabaseService.getInstance();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbService.isDbConnected() ? 'connected' : 'disconnected'
  });
});

// Root endpoint with API info
app.get('/', (req, res) => {
  res.json({
    name: 'Jarvis Planning App API',
    version: '1.0.0',
    description: 'Daily and weekly planning API for Jarvis assistant',
    endpoints: {
      health: '/health',
      plans: '/api/plans',
      today: '/api/plans/today'
    }
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Start server
async function startServer() {
  try {
    // Connect to database
    const dbService = DatabaseService.getInstance();
    await dbService.connect();

    // Start HTTP server
    app.listen(PORT, () => {
      console.log(`🚀 Planning App server running on port ${PORT}`);
      console.log(`📊 API available at: http://localhost:${PORT}/api/plans`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();