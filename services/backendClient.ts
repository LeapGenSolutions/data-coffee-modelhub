/**
 * Centralized API client connecting Data Coffee Model Hub (Next.js)
 * to Data Coffee Backend Middleware (Express + Azure Cosmos DB).
 */

const LIVE_AZURE_MIDDLEWARE_URL =
  'https://datacoffee-middleware-dev-aebyfffrb6dsfjga.centralus-01.azurewebsites.net';

const BACKEND_URL =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_API_URL ||
  LIVE_AZURE_MIDDLEWARE_URL;

const MIDDLEWARE_SECRET =
  process.env.MIDDLEWARE_API_SECRET ||
  '';

interface RequestOptions extends RequestInit {
  timeoutMs?: number;
}

// Map slug identifiers to valid Cosmos DB UUIDs
const MODEL_UUID_MAP: Record<string, string> = {
  'claude-sonnet': 'c22f47e3-6a17-41d0-8ba9-22bb6e1e3c5d',
  'claude-opus': 'c22f47e3-6a17-41d0-8ba9-22bb6e1e3c5d',
  'gpt-5': 'c22f47e3-6a17-41d0-8ba9-22bb6e1e3c5d',
  'gpt-5-mini': 'c22f47e3-6a17-41d0-8ba9-22bb6e1e3c5d',
  'gemini-flash': 'c22f47e3-6a17-41d0-8ba9-22bb6e1e3c5d',
  'gemini-pro': 'c22f47e3-6a17-41d0-8ba9-22bb6e1e3c5d',
  'gemini-2.5-flash': 'c22f47e3-6a17-41d0-8ba9-22bb6e1e3c5d',
  'gemini-2.5-pro': 'c22f47e3-6a17-41d0-8ba9-22bb6e1e3c5d',
  'ms-foundry': 'c22f47e3-6a17-41d0-8ba9-22bb6e1e3c5d',
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function backendFetch<T = any>(path: string, options: RequestOptions = {}): Promise<T | null> {
  const { timeoutMs = 8000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(MIDDLEWARE_SECRET ? { 'x-middleware-secret': MIDDLEWARE_SECRET } : {}),
        ...(fetchOptions.headers || {}),
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[BackendClient] ${path} returned status ${res.status}`);
      return null;
    }

    const data = await res.json();
    return (data.data || data) as T;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      console.warn(`[BackendClient] Request timed out for ${path}`);
    } else {
      console.warn(`[BackendClient] Connection to middleware failed (${path}):`, err.message);
    }
    return null;
  }
}

export interface BackendAIModel {
  id: string;
  model_name: string;
  description?: string;
  provider: string;
  scope: string;
  owner_id: string;
  input_cost_per_token: number;
  output_cost_per_token: number;
  status: string;
  created_at: string;
}

export interface BackendUserHistoryRecord {
  id?: string;
  user_id: string;
  workspace_id?: string;
  timestamp?: string;
  model_id: string;
  input_tokens: number;
  output_tokens: number;
  credits_used: number;
  status: 'SUCCESS' | 'FAILED';
}

export interface BackendBillingRecord {
  id: string;
  user_id: string;
  credits: number;
  credits_used: number;
  billing_cycle: 'MONTHLY' | 'YEARLY';
  billing_cycle_start: string;
  billing_cycle_end: string;
  status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
}

export const BackendClient = {
  /**
   * Fetch registered AI models catalog from Cosmos DB
   */
  async getAIModels(userId = 'user_alex'): Promise<BackendAIModel[] | null> {
    return await backendFetch<BackendAIModel[]>(`/api/ai-models?user_id=${encodeURIComponent(userId)}`);
  },

  /**
   * Fetch user credit balance and billing cycle from Cosmos DB
   */
  async getBilling(userId = 'user_alex'): Promise<BackendBillingRecord[] | null> {
    return await backendFetch<BackendBillingRecord[]>(`/api/billing/user/${encodeURIComponent(userId)}`);
  },

  /**
   * Fetch user token usage history from Cosmos DB
   */
  async getUserHistory(userId = 'user_alex'): Promise<BackendUserHistoryRecord[] | null> {
    return await backendFetch<BackendUserHistoryRecord[]>(`/api/user-history/user/${encodeURIComponent(userId)}`);
  },

  /**
   * Log an inference usage event asynchronously to Azure Cosmos DB
   */
  async logInference(record: Partial<BackendUserHistoryRecord> & { user_id: string; model_id: string; input_tokens: number; credits_used: number }): Promise<boolean> {
    try {
      const validModelId = UUID_REGEX.test(record.model_id)
        ? record.model_id
        : MODEL_UUID_MAP[record.model_id] || 'c22f47e3-6a17-41d0-8ba9-22bb6e1e3c5d';

      const payload = {
        user_id: record.user_id || 'user_alex',
        timestamp: record.timestamp || new Date().toISOString(),
        model_id: validModelId,
        input_tokens: Number(record.input_tokens) || 0,
        output_tokens: Number(record.output_tokens) || 0,
        credits_used: Number(record.credits_used) || 0,
        status: record.status === 'FAILED' ? 'FAILED' : 'SUCCESS',
      };

      const res = await backendFetch('/api/user-history', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      return Boolean(res);
    } catch (err: any) {
      console.warn('[BackendClient] logInference skipped:', err.message);
      return false;
    }
  },

  /**
   * Fetch workspaces list from Cosmos DB
   */
  async getWorkspaces(ownerId = 'user_alex'): Promise<any[] | null> {
    const query = ownerId ? `?owner_id=${encodeURIComponent(ownerId)}` : '';
    return await backendFetch<any[]>(`/api/workspaces${query}`);
  },

  /**
   * Fetch user profile from Cosmos DB
   */
  async getUserByEmail(email: string): Promise<any | null> {
    return await backendFetch<any>(`/api/users/${encodeURIComponent(email)}`);
  },
};
