import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

// Simple test route
app.get('/api/ping', (req, res) => {
  res.send('pong');
});

export default app;
