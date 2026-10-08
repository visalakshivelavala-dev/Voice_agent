/**
 * MedVoice AI - Express Backend Server Listener
 * Production-ready listener binding to 0.0.0.0 on process.env.PORT.
 */
import app from './app.js';

const PORT = parseInt(process.env.PORT, 10) || 5000;
const HOST = '0.0.0.0';

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, HOST, () => {
    console.log(`\n======================================================`);
    console.log(`🏥 MedVoice AI - Backend Server Running on ${HOST}:${PORT}`);
    console.log(`📡 Health Check:  http://${HOST}:${PORT}/health`);
    console.log(`📡 API Health:    http://${HOST}:${PORT}/api/health`);
    console.log(`👨‍⚕️ Doctors API:   http://${HOST}:${PORT}/api/doctors`);
    console.log(`📅 Appointments:  http://${HOST}:${PORT}/api/appointments`);
    console.log(`🎙️ Retell Tools:  http://${HOST}:${PORT}/api/retell/webhook`);
    console.log(`======================================================\n`);
  });
}

export default app;
