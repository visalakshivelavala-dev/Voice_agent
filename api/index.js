/**
 * Vercel Serverless Function Entrypoint
 * Forwards all /api/* requests to the Express backend application.
 */
import app from '../backend/app.js';

export default app;
