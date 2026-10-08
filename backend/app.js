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

// Security & Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false,
}));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

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
