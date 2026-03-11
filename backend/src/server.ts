import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth.js';
import { predictionsRouter } from './routes/predictions.js';
import { authenticate } from './middleware/auth-middleware.js';
import { logger } from './utils/logger.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ 
  origin: process.env.FRONTEND_URL || 'http://localhost:5173', 
  credentials: true 
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/predictions', authenticate, predictionsRouter);

// Alias for Dashboard compatibility
app.get('/api/stats', authenticate, async (req: any, res) => {
  // This will be handled by the predictions router
  // Just redirect internally
  res.redirect(301, '/api/predictions/stats');
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'Backend running',
    timestamp: new Date(),
    environment: process.env.NODE_ENV 
  });
});

// Error handling middleware (at the end)
app.use((err: any, req: any, res: any, next: any) => {
  logger.error('Unhandled error', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
  });
});

function startServer() {
  app.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV}`);
  });
}

startServer();