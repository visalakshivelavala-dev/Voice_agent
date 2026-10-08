/**
 * MedVoice AI - System Health & Database Seeding Routes
 */
import { Router } from 'express';
import { db } from '../db/database.js';
import { isSupabaseConfigured } from '../db/supabaseClient.js';
import { isRetellConfigured } from '../../voice-agent/retellAgent.js';
import { getTodayKolkataDate, getTomorrowKolkataDate, TIMEZONE } from '../services/dateService.js';

const router = Router();

// GET /api/health - System and integration health status
router.get('/health', (req, res) => {
  const dbStatus = db.getStatus();
  res.json({
    status: 'online',
    appName: 'MedVoice AI',
    subtitle: 'AI-Powered Doctor Appointment Assistant',
    timezone: TIMEZONE,
    serverDate: getTodayKolkataDate(),
    tomorrowDate: getTomorrowKolkataDate(),
    database: {
      isSupabase: isSupabaseConfigured,
      type: dbStatus.type,
      activeDoctors: dbStatus.activeDoctors,
      appointmentsCount: dbStatus.appointmentsCount,
    },
    voice: {
      isRetellConfigured,
      agentId: process.env.RETELL_AGENT_ID ? 'Configured' : 'Missing',
    },
  });
});

// POST /api/seed/reset - Reset slots and test appointments
router.post('/reset', async (req, res, next) => {
  try {
    const result = await db.reseed();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
