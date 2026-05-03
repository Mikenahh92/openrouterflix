/**
 * OpenRouterFlix Backend — Express server bootstrap.
 * Starts the API proxy on the configured port (default 3001).
 */
import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler.js';
import modelsRouter from './routes/models.js';
import categoriesRouter from './routes/categories.js';
import playgroundRouter from './routes/playground.js';

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

// Models API
app.use('/api/models', modelsRouter);

// Categories API
app.use('/api/categories', categoriesRouter);

// Playground API
app.use('/api/playground', playgroundRouter);

// Centralized error middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`OpenRouterFlix API server running on port ${PORT}`);
});
