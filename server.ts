import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import { app } from './server/index.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const distPath = path.resolve(process.cwd(), 'dist');

// If built client assets exist, serve them
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.resolve(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Waqar Earn.pk server running on http://0.0.0.0:${PORT}`);
});
