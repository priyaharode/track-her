import express, { Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import { predictionsRouter } from './routes/predictions.js';

dotenv.config(); // Load .env file

const app: Express = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/predictions', predictionsRouter);

app.get('/api/stats', async (req, res) => {
  // This will be handled by predictions router
  res.redirect('/api/predictions/stats');
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend running', timestamp: new Date() });
});

export function startServer() {
  app.listen(PORT, () => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ TrackHER Backend with Auth + ML Predictions`);
    console.log(`${'='.repeat(60)}`);
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`\n📍 Auth routes:`);
    console.log(`   POST /api/auth/signup`);
    console.log(`   POST /api/auth/login`);
    console.log(`\n🤖 Prediction routes:`);
    console.log(`   POST /api/predictions/full`);
    console.log(`   POST /api/predictions/cycle`);
    console.log(`   POST /api/predictions/ovulation`);
    console.log(`   POST /api/predictions/risk`);
    console.log(`   POST /api/predictions/health-check`);
    console.log(`\n💚 Health check:`);
    console.log(`   GET /api/health`);
    console.log(`${'='.repeat(60)}\n`);
  });
}

startServer();