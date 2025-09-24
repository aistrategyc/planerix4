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

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<boolean>;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper to check if we're authenticated
  const isAuthenticated = Boolean(accessToken && user);

  // Login function
  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Important for httpOnly cookies
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Login failed');
      }

      const data = await response.json();
      
      // Store access token in memory
      if (data.access_token) {
        setAccessToken(data.access_token);
      }

      // Get user info
      await fetchUser();
      
    } catch (error) {
      setAccessToken(null);
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch current user
  const fetchUser = useCallback(async () => {
    if (!accessToken) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me`, {
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
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
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout`, {
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
    login,
    logout,
    refreshAuth,
    setUser,
    setAccessToken,
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
