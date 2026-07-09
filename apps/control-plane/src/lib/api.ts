import { DashboardStats, ProviderInfo, RequestLog, CostStats, CacheStats, SecurityEvent } from './types';

const BASE_URL = typeof window !== 'undefined'
  ? (window as any).__GATEWAY_URL || process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3000'
  : process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3000';

const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options?.headers as any) || {}),
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('token');
    window.location.href = '/en'; // Redirect to login
  }

  if (!response.ok) {
    const errorText = await response.text();
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.error && parsed.error.message) {
        const err = new Error(parsed.error.message);
        (err as any).code = parsed.error.code;
        (err as any).recoveryHint = parsed.error.recoveryHint;
        throw err;
      }
    } catch (e: any) {
      if (e.code) throw e; // Re-throw our parsed error
    }
    throw new Error(`API Error ${response.status}: ${errorText || response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  getBaseUrl() {
    return BASE_URL;
  },

  // Auth
  checkSetup(): Promise<{ needsSetup: boolean }> {
    return fetchJson<{ needsSetup: boolean }>('/v1/auth/check-setup');
  },

  register(data: any): Promise<any> {
    return fetchJson<any>('/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  login(email: string, password: string): Promise<any> {
    return fetchJson<any>('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  getMe(): Promise<any> {
    return fetchJson<any>('/v1/auth/me');
  },

  // Portal
  getConversations(): Promise<any[]> {
    return fetchJson<any[]>('/v1/portal/conversations');
  },

  getConversation(id: string): Promise<any> {
    return fetchJson<any>(`/v1/portal/conversations/${id}`);
  },

  deleteConversation(id: string): Promise<any> {
    return fetchJson<any>(`/v1/portal/conversations/${id}`, { method: 'DELETE' });
  },

  getFolders(): Promise<any[]> {
    return fetchJson<any[]>('/v1/portal/folders');
  },

  chatCompletion(messages: any[], model: string, strategy: string, conversationId?: string): Promise<any> {
    return fetchJson<any>('/v1/chat/completions', {
      method: 'POST',
      headers: {
        'x-routing-strategy': strategy,
      },
      body: JSON.stringify({
        model,
        messages,
        conversationId
      }),
    });
  },

  // Admin
  getDashboardStats(): Promise<DashboardStats> {
    return fetchJson<DashboardStats>('/v1/admin/dashboard');
  },

  getProviders(): Promise<ProviderInfo[]> {
    return fetchJson<ProviderInfo[]>('/v1/admin/providers');
  },

  updateProvider(id: string, status: 'enabled' | 'disabled', priority?: number): Promise<any> {
    return fetchJson<any>(`/v1/admin/providers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isEnabled: status === 'enabled', priority }),
    });
  },

  getRequests(): Promise<RequestLog[]> {
    return fetchJson<RequestLog[]>('/v1/admin/requests');
  },

  getCosts(): Promise<CostStats> {
    return fetchJson<CostStats>('/v1/admin/costs');
  },

  getCacheStats(): Promise<CacheStats> {
    return fetchJson<CacheStats>('/v1/admin/cache/stats');
  },

  getSecurityEvents(): Promise<SecurityEvent[]> {
    return fetchJson<SecurityEvent[]>('/v1/admin/security/events');
  },

  getRoutingConfig(): Promise<{ strategy: string }> {
    return fetchJson<{ strategy: string }>('/v1/admin/routing/config');
  },

  updateRoutingConfig(strategy: string): Promise<any> {
    return fetchJson<any>('/v1/admin/routing/config', {
      method: 'PUT',
      body: JSON.stringify({ strategy }),
    });
  },

  getHardwareInfo(): Promise<any> {
    return fetchJson<any>('/v1/admin/hardware');
  }
};
