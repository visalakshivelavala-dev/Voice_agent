/**
 * MedVoice AI - Retell AI SDK Client Wrapper
 * Handles Retell AI agent initialization and web call generation.
 */
import Retell from 'retell-sdk';
import dotenv from 'dotenv';
import { MEDVOICE_SYSTEM_PROMPT } from './agentPrompt.js';
import { RETELL_TOOLS } from './toolDefinitions.js';

dotenv.config();

const retellApiKey = process.env.RETELL_API_KEY;
const defaultAgentId = process.env.RETELL_AGENT_ID;

export const isRetellConfigured = Boolean(
  retellApiKey && 
  retellApiKey.startsWith('key_') && 
  !retellApiKey.includes('your_retell')
);

export const retellClient = isRetellConfigured
  ? new Retell({
      apiKey: retellApiKey,
    })
  : null;

/**
 * Creates a browser web call token via Retell AI SDK
 */
export async function createWebCallSession(agentIdOverride = null) {
  const agentId = agentIdOverride || defaultAgentId;

  if (!isRetellConfigured) {
    return {
      success: false,
      isSimulated: true,
      message: 'RETELL_API_KEY is not configured in .env. Switched to Interactive Browser Simulation mode.',
    };
  }

  if (!agentId || agentId === 'agent_placeholder') {
    return {
      success: false,
      error: 'RETELL_AGENT_ID_MISSING',
      message: 'RETELL_AGENT_ID is not configured. Please run `npm run setup:retell` or set RETELL_AGENT_ID in .env.',
    };
  }

  try {
    const webCallResponse = await retellClient.call.createWebCall({
      agent_id: agentId,
    });

    return {
      success: true,
      access_token: webCallResponse.access_token,
      call_id: webCallResponse.call_id,
    };
  } catch (error) {
    console.error('[Retell] Failed to create web call:', error.message);
    return {
      success: false,
      error: error.name || 'RetellCallCreationError',
      message: error.message,
    };
  }
}
