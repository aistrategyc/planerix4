'use client';
// Production-ready React auth context with in-memory token storage

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface User {
  id: string;
  email: string;
  username?: string | null;
  full_name?: string | null;
  is_active?: boolean;
  is_verified?: boolean;
  avatar_url?: string | null;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  terms_accepted: boolean;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<boolean>;
  resendVerification: (email: string) => Promise<void>;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper to check if we're authenticated
  const isAuthenticated = Boolean(accessToken && user);

  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Login function
  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data?.detail || 'Login failed';
        setError(errorMessage);
        setAccessToken(null);
        setUser(null);
        return; // Don't throw, just return
      }

      // Success - store token
      if (data.access_token) {
        setAccessToken(data.access_token);
        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', data.access_token);
        }
      }

    } catch (networkError) {
      console.error('Network error:', networkError);
      setError('Network error occurred');
      setAccessToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Register function
  const register = useCallback(async (data: RegisterData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail?.detail || errorData.detail || errorData.message || 'Registration failed';
        setError(errorMessage);
        throw new Error(errorMessage);
      }

      // Registration successful - user will receive verification email
      // Don't auto-login, let them verify email first
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Resend verification email
  const resendVerification = useCallback(async (email: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail?.detail || errorData.detail || errorData.message || 'Failed to resend verification email';
        throw new Error(errorMessage);
      }
    } catch (error) {
      throw error;
    }
  }, []);

  // Fetch current user
  const fetchUser = useCallback(async () => {
    if (!accessToken) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        setUser(null);
        setAccessToken(null);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      setUser(null);
      setAccessToken(null);
    }
  }, [accessToken]);

  // Refresh authentication
  const refreshAuth = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include', // Includes httpOnly refresh cookie
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.access_token) {
          setAccessToken(data.access_token);
          await fetchUser();
          return true;
        }
      }
      
      setAccessToken(null);
      setUser(null);
      return false;
    } catch (error) {
      console.error('Refresh failed:', error);
      setAccessToken(null);
      setUser(null);
      return false;
    }
  }, [fetchUser]);

  // Logout function
  const logout = useCallback(async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      // Clear state regardless of server response
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);

      // TEMPORARY DEV MODE: Auto-login as ITstep user for analytics development
      if (process.env.NODE_ENV === 'development') {
        try {
          // Auto-login with ITstep credentials
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              email: 'itstep@itstep.com',
              password: 'ITstep2025!'
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.access_token) {
              setAccessToken(data.access_token);

              // Mock ITstep user data for development
              setUser({
                id: 'dev-itstep-user',
                email: 'itstep@itstep.com',
                username: 'itstep_admin',
                full_name: 'ITstep Admin',
                is_active: true,
                is_verified: true,
              });

              console.log('🔧 DEV MODE: Auto-logged in as ITstep user');
              setIsLoading(false);
              return;
            }
          }
        } catch (error) {
          console.warn('🔧 DEV MODE: Auto-login failed, trying normal flow');
        }
      }

      // Normal production flow
      // First try to refresh using httpOnly cookie
      const refreshed = await refreshAuth();

      // If refresh failed but we have localStorage token (dev mode), try that
      if (!refreshed && typeof window !== 'undefined') {
        const savedToken = localStorage.getItem('access_token');
        if (savedToken) {
          setAccessToken(savedToken);
          await fetchUser();
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, []); // Run only on mount

  // Sync user data when token changes
  useEffect(() => {
    if (accessToken && !user) {
      fetchUser();
    }
  }, [accessToken, user, fetchUser]);

  const value: AuthContextType = {
    user,
    accessToken,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    refreshAuth,
    resendVerification,
    setUser,
    setAccessToken,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
