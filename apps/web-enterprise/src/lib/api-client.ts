// Production-ready API client with memory-based auth and interceptors

import { useAuth } from '@/contexts/auth-context';

class APIClient {
  private baseURL: string;
  private refreshPromise: Promise<boolean> | null = null;
  private isRefreshing: boolean = false;
  private requestQueue: Array<{ resolve: Function; reject: Function; request: () => Promise<any> }> = [];

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'https://api.planerix.com/api';
  }

  private async processQueue(token: string | null) {
    const queue = [...this.requestQueue];
    this.requestQueue = [];
    
    for (const { resolve, reject, request } of queue) {
      try {
        const result = await request();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }
  }

  private async refresh(): Promise<boolean> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this._performRefresh();
    
    try {
      const result = await this.refreshPromise;
      this.processQueue(result ? 'refreshed' : null);
      return result;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async _performRefresh(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.access_token) {
          // Update token in auth context if available
          if (typeof window !== 'undefined' && (window as any).__authContext) {
            (window as any).__authContext.setAccessToken(data.access_token);
          }
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  async request<T = any>(
    endpoint: string,
    options: RequestInit & { accessToken?: string } = {}
  ): Promise<T> {
    const { accessToken, ...requestOptions } = options;
    
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;
    
    const headers = new Headers(requestOptions.headers);
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }
    headers.set('Content-Type', 'application/json');

    const config: RequestInit = {
      ...requestOptions,
      headers,
      credentials: 'include',
    };

    try {
      const response = await fetch(url, config);
      
      // Handle 401 - attempt refresh
      if (response.status === 401 && accessToken) {
        // Don't retry refresh endpoint
        if (endpoint.includes('/auth/refresh')) {
          throw new Error('Unauthorized');
        }

        // If already refreshing, queue this request
        if (this.isRefreshing) {
          return new Promise((resolve, reject) => {
            this.requestQueue.push({
              resolve,
              reject,
              request: () => this.request(endpoint, options)
            });
          });
        }

        // Attempt refresh
        const refreshed = await this.refresh();
        if (refreshed) {
          // Retry original request with new token
          return this.request(endpoint, options);
        } else {
          // Clear auth state on refresh failure
          if (typeof window !== 'undefined' && (window as any).__authContext) {
            (window as any).__authContext.logout();
          }
          throw new Error('Session expired');
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}`);
      }

      return response.json();
    } catch (error) {
      throw error;
    }
  }

  // Convenience methods
  get<T = any>(endpoint: string, options: RequestInit & { accessToken?: string } = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T = any>(endpoint: string, data?: any, options: RequestInit & { accessToken?: string } = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  put<T = any>(endpoint: string, data?: any, options: RequestInit & { accessToken?: string } = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  delete<T = any>(endpoint: string, options: RequestInit & { accessToken?: string } = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  patch<T = any>(endpoint: string, data?: any, options: RequestInit & { accessToken?: string } = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

// Export singleton instance
export const apiClient = new APIClient();

// Hook for using API client with auth context
export function useAPIClient() {
  const auth = useAuth();
  
  // Expose auth context to window for interceptor access
  if (typeof window !== 'undefined') {
    (window as any).__authContext = auth;
  }

  return {
    get: <T = any>(endpoint: string, options?: RequestInit) =>
      apiClient.get<T>(endpoint, { ...options, accessToken: auth.accessToken || undefined }),
    
    post: <T = any>(endpoint: string, data?: any, options?: RequestInit) =>
      apiClient.post<T>(endpoint, data, { ...options, accessToken: auth.accessToken || undefined }),
    
    put: <T = any>(endpoint: string, data?: any, options?: RequestInit) =>
      apiClient.put<T>(endpoint, data, { ...options, accessToken: auth.accessToken || undefined }),
    
    delete: <T = any>(endpoint: string, options?: RequestInit) =>
      apiClient.delete<T>(endpoint, { ...options, accessToken: auth.accessToken || undefined }),
    
    patch: <T = any>(endpoint: string, data?: any, options?: RequestInit) =>
      apiClient.patch<T>(endpoint, data, { ...options, accessToken: auth.accessToken || undefined }),
  };
}
