import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import operationsRoutes from './routes/operations-safe.js';
import callControlRoutes from './routes/call-control.js';
import roleGuard from './middlewares/role-guard-v2.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.get('/health', (_, res) => res.json({ ok: true, name: 'SCORE Discador' }));

app.use('/api', roleGuard);
app.use('/api', callControlRoutes);
app.use('/api', operationsRoutes);
app.use('/api', routes);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err instanceof Error ? err.message : 'Erro inesperado';
  res.status(400).json({ message });
});

app.listen(Number(process.env.API_PORT || 4000), () => console.log(`API on :${process.env.API_PORT || 4000}`));
