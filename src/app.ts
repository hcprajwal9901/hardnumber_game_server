import express, { Request, Response } from 'express';

const app = express();

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ ok: true, ts: Date.now() });
});

export default app;
