/**
 * MedVoice AI - Automated Retell Agent Setup Script
 * Run with: npm run setup:retell
 * Automatically creates or updates the "MedVoice Appointment Assistant" on Retell AI.
 */
import Retell from 'retell-sdk';
import dotenv from 'dotenv';
import { MEDVOICE_SYSTEM_PROMPT } from './agentPrompt.js';
import { RETELL_TOOLS } from './toolDefinitions.js';

dotenv.config();

const apiKey = process.env.RETELL_API_KEY;
const backendUrl = process.env.BACKEND_PUBLIC_URL || 'https://your-backend-host.com';

if (!apiKey || apiKey.includes('your_retell')) {
  console.error('\n❌ ERROR: RETELL_API_KEY is not defined in your .env file.');
  console.log('Please get your API key from https://beta.retellai.com/dashboard and update .env.\n');
  process.exit(1);
}

const client = new Retell({ apiKey });

async function setupAgent() {
  console.log('====================================================');
  console.log(' MedVoice AI - Retell Agent Provisioning');
  console.log('====================================================');
  console.log(`Using Backend Webhook URL: ${backendUrl}/api/retell/webhook`);

  try {
    // 1. Create or configure Retell LLM with custom tools
    console.log('\n1. Creating LLM instance with tools & system prompt...');
    
    // Format custom tools with the backend webhook endpoint
    const customTools = RETELL_TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
      url: `${backendUrl}/api/retell/tools/${t.name}`,
    }));

    const llm = await client.llm.create({
      model: 'gpt-4o-mini',
      general_prompt: MEDVOICE_SYSTEM_PROMPT,
      general_tools: customTools,
      begin_message: 'Hello, thank you for calling MedVoice Clinic. How can I help you today?',
    });

    console.log(`✅ LLM created successfully! ID: ${llm.llm_id}`);

    // 2. Create the Voice Agent
    console.log('\n2. Creating MedVoice Voice Agent...');
    const agent = await client.agent.create({
      agent_name: 'MedVoice Appointment Assistant',
      response_engine: {
        type: 'retell-llm',
        llm_id: llm.llm_id,
      },
      voice_id: '11labs-Adrian', // Professional, warm medical tone
      language: 'en-US',
      ambient_sound: 'call-center',
      enable_backchannel: true,
      responsiveness: 1.0,
      interruption_sensitivity: 0.8,
    });

    console.log(`✅ Agent created successfully!`);
    console.log(`----------------------------------------------------`);
    console.log(`Agent ID:   ${agent.agent_id}`);
    console.log(`Agent Name: ${agent.agent_name}`);
    console.log(`LLM ID:     ${llm.llm_id}`);
    console.log(`----------------------------------------------------`);
    console.log(`\n🎉 Setup Complete! Add this to your backend/.env:\n`);
    console.log(`RETELL_AGENT_ID=${agent.agent_id}\n`);
  } catch (error) {
    console.error('❌ Failed to set up Retell agent:', error.message);
    if (error.response?.data) {
      console.error('API Error Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

setupAgent();
