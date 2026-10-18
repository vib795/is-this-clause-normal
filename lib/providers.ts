import { anthropic, createAnthropic } from '@ai-sdk/anthropic';
import { openai, createOpenAI } from '@ai-sdk/openai';
import { google, createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOllama } from 'ollama-ai-provider-v2';
import type { LanguageModel } from 'ai';

export type ProviderId = 'anthropic' | 'openai' | 'google' | 'ollama';

export interface ProviderInfo {
  id: ProviderId;
  label: string;
  default_model: string;
  models: string[];
  capabilities: {
    vision: boolean;
    native_pdf: boolean;
  };
  configured: boolean;
}

const ANTHROPIC_MODELS = [
  'claude-sonnet-4-6',
  'claude-opus-4-8',
  'claude-opus-4-7',
  'claude-haiku-4-5',
];

const OPENAI_MODELS = [
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4.1',
  'gpt-4.1-mini',
  'o3-mini',
];

const GOOGLE_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
];

function ollamaConfigured(): boolean {
  // If user sets the URL explicitly, treat Ollama as available. We do not probe
  // the endpoint here to keep this synchronous and cheap.
  return !!process.env.OLLAMA_BASE_URL;
}

export function listProviders(): ProviderInfo[] {
  const ollamaModelsEnv = (process.env.OLLAMA_MODELS || 'llama3.2,llama3.1,qwen2.5,mistral')
    .split(',')
    .map(m => m.trim())
    .filter(Boolean);

  return [
    {
      id: 'anthropic',
      label: 'Anthropic (Claude)',
      default_model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
      models: ANTHROPIC_MODELS,
      capabilities: { vision: true, native_pdf: true },
      configured: !!process.env.ANTHROPIC_API_KEY,
    },
    {
      id: 'openai',
      label: 'OpenAI',
      default_model: process.env.OPENAI_MODEL || 'gpt-4o',
      models: OPENAI_MODELS,
      capabilities: { vision: true, native_pdf: false },
      configured: !!process.env.OPENAI_API_KEY,
    },
    {
      id: 'google',
      label: 'Google (Gemini)',
      default_model: process.env.GOOGLE_MODEL || 'gemini-2.0-flash',
      models: GOOGLE_MODELS,
      capabilities: { vision: true, native_pdf: true },
      configured: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    },
    {
      id: 'ollama',
      label: 'Ollama (local)',
      default_model: process.env.OLLAMA_MODEL || ollamaModelsEnv[0] || 'llama3.2',
      models: ollamaModelsEnv,
      capabilities: { vision: false, native_pdf: false },
      configured: ollamaConfigured(),
    },
  ];
}

export function getProvider(id: ProviderId): ProviderInfo {
  const info = listProviders().find(p => p.id === id);
  if (!info) throw new Error(`Unknown provider: ${id}`);
  return info;
}

export function resolveProviderAndModel(
  providerId?: string | null,
  modelId?: string | null
): { provider: ProviderInfo; model: string } {
  const all = listProviders();
  const configured = all.filter(p => p.configured);
  const fallback = configured[0] || all[0];

  const provider = providerId
    ? all.find(p => p.id === providerId) || fallback
    : fallback;

  const model = modelId && modelId.trim() ? modelId.trim() : provider.default_model;
  return { provider, model };
}

/**
 * Build a LanguageModel for the chosen provider + model.
 *
 * `apiKeyOverride` lets a caller pass a user's BYOK key — when present it
 * takes precedence over the operator's env var, so the scan is billed to
 * the user's provider account. Ollama ignores it (local, no API key).
 */
export function getModel(
  providerId: ProviderId,
  modelId: string,
  apiKeyOverride?: string
): LanguageModel {
  switch (providerId) {
    case 'anthropic': {
      const key = apiKeyOverride || process.env.ANTHROPIC_API_KEY;
      const client = key ? createAnthropic({ apiKey: key }) : anthropic;
      return client(modelId);
    }
    case 'openai': {
      const key = apiKeyOverride || process.env.OPENAI_API_KEY;
      const client = key ? createOpenAI({ apiKey: key }) : openai;
      return client(modelId);
    }
    case 'google': {
      const key = apiKeyOverride || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      const client = key ? createGoogleGenerativeAI({ apiKey: key }) : google;
      return client(modelId);
    }
    case 'ollama': {
      const baseURL = process.env.OLLAMA_BASE_URL
        ? `${process.env.OLLAMA_BASE_URL.replace(/\/$/, '')}/api`
        : 'http://localhost:11434/api';
      const client = createOllama({ baseURL });
      return client(modelId);
    }
  }
}
