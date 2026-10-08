/**
 * MedVoice AI - Express Backend Server Listener
 */
import app from './app.js';

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
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
