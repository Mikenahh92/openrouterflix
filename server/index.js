/**
 * OpenRouterFlix Backend — Express server bootstrap.
 * Starts the API proxy on the configured port (default 3001).
 */
import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS — restricted to frontend dev origin
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
app.use(cors(corsOptions));

// Parse JSON request bodies
app.use(express.json());

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Centralized error middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`OpenRouterFlix API server running on port ${PORT}`);
});
