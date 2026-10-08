/**
 * MedVoice AI - Express Backend App Configuration
 * Production-ready Express application with CORS, security headers,
 * Retell AI tool integration, and Supabase / in-memory database support.
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import doctorsRouter from './routes/doctors.js';
import availabilityRouter from './routes/availability.js';
import appointmentsRouter from './routes/appointments.js';
import voiceRouter from './routes/voice.js';
import retellRouter from './routes/retell.js';
import seedRouter from './routes/seed.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();

// Security Headers
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

// CORS Configuration - Allows production Vercel frontend, preview branches, and local dev
const allowedOrigins = [
  'https://voice-agent-vink4.vercel.app',
  'https://voice-agent-tcqo.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5000',
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/+$/, ''));
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. curl, Retell webhooks, health checks)
    if (!origin) return callback(null, true);

    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      process.env.NODE_ENV !== 'production'
    ) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Root Health Check Endpoint (Required by Render & uptime monitors)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'MedVoice AI Backend',
  });
});

// Route Mounts
app.use('/api', seedRouter);
app.use('/api/doctors', doctorsRouter);
app.use('/api/availability', availabilityRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/voice', voiceRouter);
app.use('/api/retell', retellRouter);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'NotFound',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Central Error Handler
app.use(errorHandler);

export default app;
