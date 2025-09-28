import express from 'express';
import cors from 'cors';
import { Logger } from '@gitvibe/core';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Basic routes
app.get('/', (req, res) => {
  res.json({ message: 'GitVibe Server API', version: '1.0.0' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(port, () => {
  Logger.info(`Server running on port ${port}`);
});

export default app;