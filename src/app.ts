import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import paymentsRoutes from './modules/payments/payments.routes';
import messagesRoutes from './modules/messages/messages.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import { globalErrorHandler, notFoundHandler } from './middleware/errorHandler';

const app = express();

// ============================================================
// Security & Parsing Middleware
// ============================================================
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ============================================================
// Health Check
// ============================================================
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'dTopMate API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    // TODO [Solana]: Add Solana RPC health check here
  });
});

// ============================================================
// API Routes
// ============================================================
const API_PREFIX = '/api/v1';

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, usersRoutes);
app.use(`${API_PREFIX}/payments`, paymentsRoutes);
app.use(`${API_PREFIX}/messages`, messagesRoutes);
app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);

// ============================================================
// Error Handling
// ============================================================
app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
