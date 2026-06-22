import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import menuRouter from './routes/menu.js';
import ordersRouter, { orders } from './routes/orders.js';
import paymentRouter, { setOrdersStore } from './routes/payment.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──
app.use(cors());
app.use(express.json());

// ── Routes ──
app.use('/api/menu', menuRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/payment', paymentRouter);

// ── Share the in-memory orders store with the payment module ──
setOrdersStore(orders);

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 404 fallback ──
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Global error handler ──
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🥡  Food ordering server running on http://localhost:${PORT}`);
});
