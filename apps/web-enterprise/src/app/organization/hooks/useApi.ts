// src/app/organization/hooks/useApi.ts
import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';

// Базовая конфигурация API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// Типы для API
interface ApiError {
  message: string;
  status: number;
  details?: any;
}

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  successMessage?: string;
}

// Define local User interface for current user
interface User {
  id: string;
  email: string;
  username?: string;
  [key: string]: any;
}

// Утилитарная функция для запросов
async function apiRequest<T>(
  endpoint: string, 
  options: ApiOptions = {}
): Promise<T> {
  const {
    method = 'GET',
    headers = {},
    body,
  } = options;

  const url = `${API_BASE_URL}${endpoint}`;
  
  // Получаем токен авторизации
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  
  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...headers,
    },
  };

  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(url, config);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: ApiError = {
      message: errorData.detail || errorData.message || 'Произошла ошибка',
      status: response.status,
      details: errorData
    };
    throw error;
  }

  return response.json();
}

// Основной хук для API вызовов
export function useApi<T extends any[], R>(
  apiFunction: (...args: T) => Promise<R>,
  options: {
    showSuccessToast?: boolean;
    showErrorToast?: boolean;
    successMessage?: string;
  } = {}
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const {
    showSuccessToast = false,
    showErrorToast = true,
    successMessage = 'Операция выполнена успешно'
  } = options;

  const execute = useCallback(async (...args: T): Promise<R> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await apiFunction(...args);
      
      if (showSuccessToast) {
        toast({
          title: "Успешно",
          description: successMessage
        });
      }
      
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Произошла неизвестная ошибка';
      setError(errorMessage);
      
      if (showErrorToast) {
        toast({
          title: "Ошибка",
          description: errorMessage,
          variant: "destructive"
        });
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiFunction, showSuccessToast, showErrorToast, successMessage, toast]);

  return {
    execute,
    loading,
    error,
    clearError: useCallback(() => setError(null), [])
  };
}

// Специализированные хуки для организаций
export function useOrganizationApi() {
  // Получение организации
  const getOrganization = useCallback(async (orgId: string) => {
    return apiRequest(`/orgs/${orgId}`);
  }, []);

  // Обновление организации
  const updateOrganization = useCallback(async (orgId: string, data: any) => {
    return apiRequest(`/orgs/${orgId}`, {
      method: 'PATCH',
      body: data
    });
  }, []);

  // Получение участников
  const getMembers = useCallback(async (orgId: string) => {
    return apiRequest(`/orgs/${orgId}/members`);
  }, []);

  // Создание приглашения
  const createInvite = useCallback(async (orgId: string, data: any) => {
    return apiRequest(`/orgs/${orgId}/invites`, {
      method: 'POST',
      body: data
    });
  }, []);

  // Получение отделов
  const getDepartments = useCallback(async (orgId: string) => {
    return apiRequest(`/orgs/${orgId}/departments`);
  }, []);

  // Создание отдела
  const createDepartment = useCallback(async (orgId: string, data: any) => {
    return apiRequest(`/orgs/${orgId}/departments`, {
      method: 'POST',
      body: data
    });
  }, []);

  // Обновление отдела
  const updateDepartment = useCallback(async (orgId: string, departmentId: string, data: any) => {
    return apiRequest(`/orgs/${orgId}/departments/${departmentId}`, {
      method: 'PATCH',
      body: data
    });
  }, []);

  // Удаление отдела
  const deleteDepartment = useCallback(async (orgId: string, departmentId: string) => {
    return apiRequest(`/orgs/${orgId}/departments/${departmentId}`, {
      method: 'DELETE'
    });
  }, []);

  // Удаление участника
  const removeMember = useCallback(async (orgId: string, memberId: string) => {
    return apiRequest(`/orgs/${orgId}/members/${memberId}`, {
      method: 'DELETE'
    });
  }, []);

  // Обновление роли участника
  const updateMemberRole = useCallback(async (orgId: string, memberId: string, role: string) => {
    return apiRequest(`/orgs/${orgId}/members/${memberId}`, {
      method: 'PATCH',
      body: { role }
    });
  }, []);

  // Получение статистики
  const getStats = useCallback(async (orgId: string) => {
    return apiRequest(`/orgs/${orgId}/stats`);
  }, []);

  // Получение аналитики
  const getAnalytics = useCallback(async (orgId: string, timeRange: string = '30d') => {
    return apiRequest(`/orgs/${orgId}/analytics?time_range=${timeRange}`);
  }, []);

  return {
    getOrganization,
    updateOrganization,
    getMembers,
    createInvite,
    getDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    removeMember,
    updateMemberRole,
    getStats,
    getAnalytics
  };
}

// Хук для работы с файлами
export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const uploadFile = useCallback(async (file: File, orgId?: string) => {
    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);
      
      if (orgId) {
        formData.append('organization_id', orgId);
      }

      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Ошибка загрузки файла');
      }

      const result = await response.json();
      
      toast({
        title: "Файл загружен",
        description: "Файл успешно загружен на сервер"
      });

      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Ошибка загрузки файла';
      setError(errorMessage);
      
      toast({
        title: "Ошибка",
        description: errorMessage,
        variant: "destructive"
      });
      
      throw err;
    } finally {
      setUploading(false);
    }
  }, [toast]);

  return {
    uploadFile,
    uploading,
    error,
    clearError: useCallback(() => setError(null), [])
  };
}

// Хук для работы с пользователем
export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const getCurrentUser = useCallback(async () => {
    try {
      setLoading(true);
      const userData = await apiRequest<User>('/users/me');
      setUser(userData);
      return userData;
    } catch (error) {
      console.error('Error getting current user:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    setUser(null);
    window.location.href = '/login';
  }, []);

  return {
    user,
    loading,
    getCurrentUser,
    logout,
    isAuthenticated: !!user
  };
}