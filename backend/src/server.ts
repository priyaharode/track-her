import express, { Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { predictionsRouter } from './routes/predictions';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running! ✅' });
});

// Routes
app.use('/api', predictionsRouter);

// Start server
export function startServer() {
  app.listen(PORT, () => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🌸 trackHER Backend Server`);
    console.log(`${'='.repeat(60)}`);
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(`📍 API: http://localhost:${PORT}/api/predict`);
    console.log(`${'='.repeat(60)}\n`);
  });
}