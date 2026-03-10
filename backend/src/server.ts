import express, { Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import { predictionsRouter } from './routes/predictions.js';

dotenv.config();

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
app.use('/api', predictionsRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Backend running ✅', timestamp: new Date() });
});

export function startServer() {
  app.listen(PORT, () => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🌸 FemSync Backend with Auth + Database`);
    console.log(`${'='.repeat(60)}`);
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`📍 Auth routes:`);
    console.log(`   - POST /api/auth/signup`);
    console.log(`   - POST /api/auth/login`);
    console.log(`📍 Prediction routes:`);
    console.log(`   - POST /api/predict`);
    console.log(`   - GET /api/predictions`);
    console.log(`   - GET /api/predictions/latest`);
    console.log(`   - GET /api/stats`);
    console.log(`${'='.repeat(60)}\n`);
  });
}

startServer();