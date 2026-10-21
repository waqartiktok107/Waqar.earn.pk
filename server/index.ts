import express from 'express';
import { apiRouter } from './routes.js';
import { initDatabase } from './db.js';

// Initialize the database on startup
initDatabase();

export const app = express();

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', platform: 'Waqar Earn.pk', time: new Date().toISOString() });
});

// Mount main API
app.use('/api', apiRouter);
