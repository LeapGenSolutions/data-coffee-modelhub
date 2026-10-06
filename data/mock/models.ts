import { AIModel } from '../../types';

export const MOCK_MODELS: AIModel[] = [
  { id: 'ms-foundry',       name: 'Microsoft Foundry RAG', provider: 'Azure',   color: '#0078D4', desc: 'Enterprise RAG Orchestrator' },
  { id: 'gemini-2.5-flash', name: 'Gemini 3.5 Flash', provider: 'Google',    color: '#6E8EF7', desc: 'Next-gen ultra fast intelligence' },
  { id: 'gemini-2.5-pro',   name: 'Gemini Pro Latest', provider: 'Google',    color: '#6E8EF7', desc: 'Deepest reasoning & 2M context' },
  { id: 'gemini-flash',     name: 'Gemini Flash',     provider: 'Google',    color: '#6E8EF7', desc: 'Lowest latency everyday option' },
  { id: 'gemini-pro',       name: 'Gemini Pro',       provider: 'Google',    color: '#6E8EF7', desc: 'Strong multimodal model' },
  { id: 'gpt-5',            name: 'GPT-5 (4o)',       provider: 'OpenAI',    color: '#74AA9C', desc: 'General purpose flagship' },
  { id: 'gpt-5-mini',       name: 'GPT-5 mini',       provider: 'OpenAI',    color: '#74AA9C', desc: 'Quick and lightweight' },
  { id: 'claude-sonnet',    name: 'Claude 3.5 Sonnet', provider: 'Anthropic', color: '#D97757', desc: 'Fast, balanced coding model' },
  { id: 'claude-opus',      name: 'Claude 3 Opus',     provider: 'Anthropic', color: '#D97757', desc: 'Deep reasoning and analysis' },
];
