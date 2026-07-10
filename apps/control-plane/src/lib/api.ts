import { DashboardStats, ProviderInfo, RequestLog, CostStats, CacheStats, SecurityEvent } from './types';
import toast from 'react-hot-toast';

const BASE_URL = typeof window !== 'undefined'
  ? (window as any).__API_URL || process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:8080`
  : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

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
    ...((options?.headers as any) || {}),
  };

  if (options?.body) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

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
    let errorMessage = `API Error ${response.status}: ${errorText || response.statusText}`;
    
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.error && parsed.error.message) {
        errorMessage = parsed.error.message;
        const err = new Error(errorMessage);
        (err as any).code = parsed.error.code;
        (err as any).recoveryHint = parsed.error.recoveryHint;
        toast.error(errorMessage);
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

  getHealth(): Promise<any> {
    return fetchJson<any>('/health');
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

  uploadFile(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    // Using fetch directly because we cannot set Content-Type: application/json for FormData
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    return fetch(`${BASE_URL}/v1/files/upload`, {
      method: 'POST',
      headers,
      body: formData
    }).then(res => res.json());
  },

  // Admin
  getDashboardStats(): Promise<DashboardStats> {
    return fetchJson<DashboardStats>('/v1/admin/dashboard');
  },

  getProviders(): Promise<ProviderInfo[]> {
    return fetchJson<ProviderInfo[]>('/v1/admin/providers');
  },

  addProvider(data: any): Promise<any> {
    return fetchJson<any>('/v1/admin/providers', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  deleteProvider(id: string): Promise<any> {
    return fetchJson<any>(`/v1/admin/providers/${id}`, {
      method: 'DELETE'
    });
  },

  testProvider(data: any): Promise<any> {
    return fetchJson<any>('/v1/admin/providers/test', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  discoverModels(data: any): Promise<any> {
    return fetchJson<any>('/v1/admin/providers/discover', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  getAdminUsers(): Promise<any[]> {
    return fetchJson<any[]>('/v1/admin/users');
  },

  getOrganizations(): Promise<any[]> {
    return fetchJson<any[]>('/v1/admin/orgs');
  },

  updateOrganization(id: string, data: any): Promise<any> {
    return fetchJson<any>(`/v1/admin/orgs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  inviteUser(email: string): Promise<any> {
    return fetchJson<any>('/v1/admin/users/invite', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  deactivateUser(id: string): Promise<any> {
    return fetchJson<any>(`/v1/admin/users/${id}/deactivate`, { method: 'POST' });
  },

  changeUserRole(id: string, role: string): Promise<any> {
    return fetchJson<any>(`/v1/admin/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role })
    });
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
  },

  // Policies
  getPolicies(): Promise<any[]> {
    return fetchJson<any[]>('/v1/admin/policies');
  },
  createPolicy(data: any): Promise<any> {
    return fetchJson<any>('/v1/admin/policies', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updatePolicy(id: string, data: any): Promise<any> {
    return fetchJson<any>(`/v1/admin/policies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },
  deletePolicy(id: string): Promise<any> {
    return fetchJson<any>(`/v1/admin/policies/${id}`, {
      method: 'DELETE'
    });
  },

  // Users
  getUsers(): Promise<any[]> {
    return fetchJson<any[]>('/v1/admin/users');
  },

  createUser(data: any): Promise<any> {
    return fetchJson<any>('/v1/admin/users', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  updateUser(id: string, data: any): Promise<any> {
    return fetchJson<any>(`/v1/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  deleteUser(id: string): Promise<any> {
    return fetchJson<any>(`/v1/admin/users/${id}`, {
      method: 'DELETE'
    });
  },

  // API Keys
  getApiKeys(): Promise<any[]> {
    return fetchJson<any[]>('/v1/admin/api-keys');
  },

  createApiKey(name: string): Promise<any> {
    return fetchJson<any>('/v1/admin/api-keys', {
      method: 'POST',
      body: JSON.stringify({ name })
    });
  },

  revokeApiKey(id: string): Promise<any> {
    return fetchJson<any>(`/v1/admin/api-keys/${id}`, {
      method: 'DELETE'
    });
  },

  // Departments
  getDepartments(): Promise<any[]> {
    return fetchJson<any[]>('/v1/admin/departments');
  },

  createDepartment(name: string): Promise<any> {
    return fetchJson<any>('/v1/admin/departments', {
      method: 'POST',
      body: JSON.stringify({ name })
    });
  },

  deleteDepartment(id: string): Promise<any> {
    return fetchJson<any>(`/v1/admin/departments/${id}`, {
      method: 'DELETE'
    });
  },

  // Conversations
  renameConversation(id: string, title: string): Promise<any> {
    return fetchJson<any>(`/v1/portal/conversations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title })
    });
  },

  pinConversation(id: string, isPinned: boolean): Promise<any> {
    return fetchJson<any>(`/v1/portal/conversations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isPinned })
    });
  },

  // Folders
  createFolder(name: string): Promise<any> {
    return fetchJson<any>('/v1/portal/folders', {
      method: 'POST',
      body: JSON.stringify({ name })
    });
  },

  deleteFolder(id: string): Promise<any> {
    return fetchJson<any>(`/v1/portal/folders/${id}`, {
      method: 'DELETE'
    });
  },

  // Prompt Templates
  getPromptTemplates(): Promise<any[]> {
    return fetchJson<any[]>('/v1/admin/prompt-templates');
  },

  createPromptTemplate(data: any): Promise<any> {
    return fetchJson<any>('/v1/admin/prompt-templates', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  updatePromptTemplate(id: string, data: any): Promise<any> {
    return fetchJson<any>(`/v1/admin/prompt-templates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  deletePromptTemplate(id: string): Promise<any> {
    return fetchJson<any>(`/v1/admin/prompt-templates/${id}`, {
      method: 'DELETE'
    });
  },

  // Audit Logs
  getAuditLogs(params?: { page?: number; limit?: number }): Promise<any> {
    const query = params ? `?${new URLSearchParams(params as any).toString()}` : '';
    return fetchJson<any>(`/v1/admin/audit-logs${query}`);
  },

  // Budget
  getBudget(): Promise<any> {
    return fetchJson<any>('/v1/admin/budget');
  },

  updateBudget(data: any): Promise<any> {
    return fetchJson<any>('/v1/admin/budget', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // Settings
  getSettings(): Promise<any> {
    return fetchJson<any>('/v1/admin/settings');
  },

  updateSettings(data: any): Promise<any> {
    return fetchJson<any>('/v1/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
};
