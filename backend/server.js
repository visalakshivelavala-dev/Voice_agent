/**
 * MedVoice AI - Express Backend Server
 * Production-ready server with CORS, security headers,
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
const PORT = process.env.PORT || 5000;

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

// Start server if not in test suite
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🏥 MedVoice AI - Backend Server Running on port ${PORT}`);
    console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`👨‍⚕️ Doctors API:  http://localhost:${PORT}/api/doctors`);
    console.log(`📅 Appointments: http://localhost:${PORT}/api/appointments`);
    console.log(`🎙️ Retell Tools: http://localhost:${PORT}/api/retell/webhook`);
    console.log(`======================================================\n`);
  });
}

export default app;
