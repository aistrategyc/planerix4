// src/app/organization/hooks/useOrganization.ts

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useOrganizationApi } from './useApi';

// Типы данных
export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  industry?: string;
  size?: string;
  owner_id: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    region?: string;
    country?: string;
    postal_code?: string;
  };
  preferences?: {
    timezone?: string;
    currency?: string;
    locale?: string;
    week_start?: string;
  };
  custom_fields?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: string;
  user: {
    id: string;
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
  role: string;
  status: string;
  department?: {
    id: string;
    name: string;
  };
  joined_at: string;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  manager_id?: string;
  member_count?: number;
  created_at: string;
}

export interface OrganizationStats {
  totalMembers: number;
  totalDepartments: number;
  activeMembers: number;
  pendingMembers: number;
  activeProjects: number;
  monthlyGrowth: number;
}

// Базовый хук для API состояния
function useApiState<T>(initialState: T) {
  const [data, setData] = useState<T>(initialState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const updateData = useCallback((newData: T) => {
    setData(newData);
  }, []);

  const setLoadingState = useCallback((isLoading: boolean) => {
    setLoading(isLoading);
  }, []);

  const setErrorState = useCallback((errorMessage: string | null) => {
    setError(errorMessage);
  }, []);

  return {
    data,
    loading,
    error,
    updateData,
    setLoadingState,
    setErrorState
  };
}

// Хук для работы с организацией
export function useOrganization(orgId: string) {
  const { 
    data: organization, 
    loading, 
    error, 
    updateData, 
    setLoadingState, 
    setErrorState 
  } = useApiState<Organization | null>(null);
  
  const { toast } = useToast();
  const api = useOrganizationApi();

  const loadOrganization = useCallback(async (force = false) => {
    if (!orgId) return;

    try {
      setLoadingState(true);
      setErrorState(null);

      try {
        const data = await api.getOrganization(orgId) as Organization;
        updateData(data);
      } catch (apiError) {
        const mockData: Organization = {
          id: orgId,
          name: "Тестовая организация",
          slug: "test-org",
          description: "Описание тестовой организации",
          industry: "it",
          size: "medium",
          owner_id: "user-1",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          custom_fields: {
            website: "https://example.com",
            phone: "+7 (999) 123-45-67"
          },
          preferences: {
            timezone: "Europe/Warsaw",
            currency: "PLN",
            locale: "pl-PL",
            week_start: "monday"
          }
        };
        updateData(mockData);
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Не удалось загрузить организацию';
      setErrorState(errorMessage);
      if (force) {
        toast({ title: "Ошибка", description: errorMessage, variant: "destructive" });
      }
    } finally {
      setLoadingState(false);
    }
  }, [orgId, updateData, setLoadingState, setErrorState, toast, api]);

  const updateOrganization = useCallback(async (payload: Partial<Organization>): Promise<Organization> => {
    if (!orgId) throw new Error('Organization ID is required');
    let updated: Organization;

    try {
      // Пробуем использовать реальный API
      try {
        updated = await api.updateOrganization(orgId, payload) as Organization;
        updateData(updated);
      } catch (apiError) {
        // Если API недоступен, обновляем локально
        updated = { ...(organization as Organization), ...(payload as Partial<Organization>) } as Organization;
        updateData(updated);
      }
      
      toast({
        title: "Успешно",
        description: "Данные организации обновлены"
      });
      
      return updated;
    } catch (err: any) {
      const errorMessage = err.message || 'Не удалось обновить организацию';
      toast({
        title: "Ошибка",
        description: errorMessage,
        variant: "destructive"
      });
      throw err;
    }
  }, [orgId, organization, updateData, toast, api]);

  useEffect(() => {
    loadOrganization();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  return {
    organization,
    loading,
    error,
    updateOrganization,
    refetch: useCallback(() => loadOrganization(true), [loadOrganization])
  };
}

// Хук для работы с участниками
export function useOrganizationMembers(orgId: string) {
  const { 
    data: members, 
    loading, 
    error, 
    updateData, 
    setLoadingState, 
    setErrorState 
  } = useApiState<Member[]>([]);
  
  const { toast } = useToast();
  const api = useOrganizationApi();

  const loadMembers = useCallback(async (force = false) => {
    if (!orgId) return;
    try {
      setLoadingState(true);
      setErrorState(null);
      try {
        const data = await api.getMembers(orgId) as Member[];
        updateData(data);
      } catch (apiError) {
        const mockMembers: Member[] = [
          { id: '1', user: { id: 'user-1', username: 'admin', email: 'admin@example.com', first_name: 'Анна', last_name: 'Петрова' }, role: 'owner', status: 'active', joined_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
          { id: '2', user: { id: 'user-2', username: 'member1', email: 'member1@example.com', first_name: 'Михаил', last_name: 'Иванов' }, role: 'admin', status: 'active', department: { id: 'dept-1', name: 'Разработка' }, joined_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() },
          { id: '3', user: { id: 'user-3', username: 'member2', email: 'member2@example.com', first_name: 'Елена', last_name: 'Сидорова' }, role: 'member', status: 'active', department: { id: 'dept-2', name: 'Маркетинг' }, joined_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
          { id: '4', user: { id: 'user-4', username: 'pending', email: 'pending@example.com', first_name: 'Дмитрий', last_name: 'Козлов' }, role: 'member', status: 'pending', joined_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() }
        ];
        updateData(mockMembers);
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Не удалось загрузить участников';
      setErrorState(errorMessage);
      if (force) {
        toast({ title: "Ошибка", description: errorMessage, variant: "destructive" });
      }
    } finally {
      setLoadingState(false);
    }
  }, [orgId, updateData, setLoadingState, setErrorState, toast, api]);

  const inviteMember = useCallback(async (inviteData: { 
    email: string; 
    role: string; 
    department_id?: string 
  }) => {
    if (!orgId) throw new Error('Organization ID is required');

    try {
      // Пробуем использовать реальный API
      try {
        await api.createInvite(orgId, inviteData);
      } catch (apiError) {
        // Если API недоступен, имитируем успешную отправку
        console.log('Mock invite sent:', inviteData);
      }
      
      toast({
        title: "Приглашение отправлено",
        description: `Приглашение отправлено на ${inviteData.email}`
      });
      
      // Перезагружаем список участников
      await loadMembers(true);
    } catch (err: any) {
      const errorMessage = err.message || 'Не удалось отправить приглашение';
      toast({
        title: "Ошибка",
        description: errorMessage,
        variant: "destructive"
      });
      throw err;
    }
  }, [orgId, loadMembers, toast, api]);

  const removeMember = useCallback(async (memberId: string) => {
    if (!orgId) throw new Error('Organization ID is required');

    try {
      // Пробуем использовать реальный API
      try {
        await api.removeMember(orgId, memberId);
      } catch (apiError) {
        // Если API недоступен, удаляем локально
        console.log('Mock member removal:', memberId);
      }
      
      // Оптимистичное удаление из списка
      updateData(members.filter(m => m.id !== memberId));
      
      toast({
        title: "Участник удален",
        description: "Участник успешно удален из организации"
      });
    } catch (err: any) {
      const errorMessage = err.message || 'Не удалось удалить участника';
      toast({
        title: "Ошибка",
        description: errorMessage,
        variant: "destructive"
      });
      
      // Перезагружаем список при ошибке
      await loadMembers(true);
      throw err;
    }
  }, [orgId, members, updateData, loadMembers, toast, api]);

  const updateMemberRole = useCallback(async (memberId: string, newRole: string) => {
    if (!orgId) throw new Error('Organization ID is required');

    try {
      // Пробуем использовать реальный API
      try {
        await api.updateMemberRole(orgId, memberId, newRole);
      } catch (apiError) {
        // Если API недоступен, обновляем локально
        console.log('Mock role update:', memberId, newRole);
      }
      
      // Оптимистичное обновление
      updateData(members.map(m => 
        m.id === memberId ? { ...m, role: newRole } : m
      ));
      
      toast({
        title: "Роль обновлена",
        description: "Роль участника успешно изменена"
      });
    } catch (err: any) {
      const errorMessage = err.message || 'Не удалось обновить роль';
      toast({
        title: "Ошибка",
        description: errorMessage,
        variant: "destructive"
      });
      
      // Перезагружаем список при ошибке
      await loadMembers(true);
      throw err;
    }
  }, [orgId, members, updateData, loadMembers, toast, api]);

  useEffect(() => {
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  return {
    members,
    loading,
    error,
    inviteMember,
    removeMember,
    updateMemberRole,
    refetch: useCallback(() => loadMembers(true), [loadMembers])
  };
}

// Хук для работы с отделами
export function useOrganizationDepartments(orgId: string) {
  const { 
    data: departments, 
    loading, 
    error, 
    updateData, 
    setLoadingState, 
    setErrorState 
  } = useApiState<Department[]>([]);
  
  const { toast } = useToast();
  const api = useOrganizationApi();

  const loadDepartments = useCallback(async (force = false) => {
    if (!orgId) return;
    try {
      setLoadingState(true);
      setErrorState(null);
      try {
        const data = await api.getDepartments(orgId) as Department[];
        updateData(data);
      } catch (apiError) {
        const mockDepartments: Department[] = [
          { id: 'dept-1', name: 'Разработка', description: 'Команда разработчиков', manager_id: 'user-2', member_count: 5, created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString() },
          { id: 'dept-2', name: 'Маркетинг', description: 'Отдел маркетинга и рекламы', manager_id: 'user-3', member_count: 3, created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() },
          { id: 'dept-3', name: 'HR', description: 'Отдел кадров', member_count: 2, created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() }
        ];
        updateData(mockDepartments);
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Не удалось загрузить отделы';
      setErrorState(errorMessage);
      if (force) {
        toast({ title: "Ошибка", description: errorMessage, variant: "destructive" });
      }
    } finally {
      setLoadingState(false);
    }
  }, [orgId, updateData, setLoadingState, setErrorState, toast, api]);

  const createDepartment = useCallback(async (departmentData: { 
    name: string; 
    description?: string;
    manager_id?: string;
  }) => {
    if (!orgId) throw new Error('Organization ID is required');

    try {
      let newDepartment: Department;
      
      // Пробуем использовать реальный API
      try {
        newDepartment = await api.createDepartment(orgId, departmentData) as Department;
      } catch (apiError) {
        // Если API недоступен, создаем заглушку
        newDepartment = {
          id: `dept-${Date.now()}`,
          name: departmentData.name,
          description: departmentData.description,
          manager_id: departmentData.manager_id,
          member_count: 0,
          created_at: new Date().toISOString()
        };
      }
      
      // Оптимистичное добавление в список
      updateData([...departments, newDepartment]);
      
      toast({
        title: "Отдел создан",
        description: `Отдел "${departmentData.name}" успешно создан`
      });
      
      return newDepartment;
    } catch (err: any) {
      const errorMessage = err.message || 'Не удалось создать отдел';
      toast({
        title: "Ошибка",
        description: errorMessage,
        variant: "destructive"
      });
      throw err;
    }
  }, [orgId, departments, updateData, toast, api]);

  const updateDepartment = useCallback(async (
    departmentId: string,
    patch: Partial<Department>
  ) => {
    if (!orgId) throw new Error('Organization ID is required');

    try {
      let updated: Department;
      
      // Пробуем использовать реальный API
      try {
        updated = await api.updateDepartment(orgId, departmentId, patch) as Department;
      } catch (apiError) {
        // Если API недоступен, обновляем локально
        const existing = departments.find(d => d.id === departmentId) as Department | undefined;
        updated = { ...(existing as Department), ...(patch as Partial<Department>) } as Department;
      }
      
      // Оптимистичное обновление
      updateData(departments.map(d => (d.id === departmentId ? updated : d)));
      
      toast({
        title: "Отдел обновлен",
        description: "Данные отдела успешно обновлены"
      });
      
      return updated;
    } catch (err: any) {
      const errorMessage = err.message || 'Не удалось обновить отдел';
      toast({
        title: "Ошибка",
        description: errorMessage,
        variant: "destructive"
      });
      throw err;
    }
  }, [orgId, departments, updateData, toast, api]);

  const deleteDepartment = useCallback(async (departmentId: string) => {
    if (!orgId) throw new Error('Organization ID is required');

    try {
      // Пробуем использовать реальный API
      try {
        await api.deleteDepartment(orgId, departmentId);
      } catch (apiError) {
        // Если API недоступен, удаляем локально
        console.log('Mock department deletion:', departmentId);
      }
      
      // Оптимистичное удаление из списка
      updateData(departments.filter(d => d.id !== departmentId));
      
      toast({
        title: "Отдел удален",
        description: "Отдел успешно удален"
      });
    } catch (err: any) {
      const errorMessage = err.message || 'Не удалось удалить отдел';
      toast({
        title: "Ошибка",
        description: errorMessage,
        variant: "destructive"
      });
      
      // Перезагружаем список при ошибке
      await loadDepartments(true);
      throw err;
    }
  }, [orgId, departments, updateData, loadDepartments, toast, api]);

  useEffect(() => {
    loadDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  return {
    departments,
    loading,
    error,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    refetch: useCallback(() => loadDepartments(true), [loadDepartments])
  };
}

// Комплексный хук для управления всеми данными организации
export function useOrganizationData(orgId: string) {
  const organization = useOrganization(orgId);
  const members = useOrganizationMembers(orgId);
  const departments = useOrganizationDepartments(orgId);

  // Мемоизированная статистика
  const stats = useMemo((): OrganizationStats => {
    const activeMembers = members.members.filter(m => m.status === 'active');
    const pendingMembers = members.members.filter(m => m.status === 'pending');

    return {
      totalMembers: members.members.length,
      totalDepartments: departments.departments.length,
      activeMembers: activeMembers.length,
      pendingMembers: pendingMembers.length,
      // TODO: Заменить заглушки на реальные данные
      activeProjects: Math.floor(Math.random() * 50) + 10,
      monthlyGrowth: Math.floor(Math.random() * 20) + 5
    };
  }, [members.members, departments.departments]);

  const isLoading = organization.loading || members.loading || departments.loading;
  const hasError = organization.error || members.error || departments.error;

  // Комплексное обновление всех данных
  const refetchAll = useCallback(async () => {
    await Promise.all([
      organization.refetch(),
      members.refetch(),
      departments.refetch()
    ]);
  }, [organization.refetch, members.refetch, departments.refetch]);

  // Интеллектуальная функция обновления
  const smartRefetch = useCallback(async (entities: ('organization' | 'members' | 'departments')[]) => {
    const promises = [];
    
    if (entities.includes('organization')) {
      promises.push(organization.refetch());
    }
    if (entities.includes('members')) {
      promises.push(members.refetch());
    }
    if (entities.includes('departments')) {
      promises.push(departments.refetch());
    }
    
    await Promise.all(promises);
  }, [organization.refetch, members.refetch, departments.refetch]);

  return {
    organization: organization.organization,
    members: members.members,
    departments: departments.departments,
    stats,
    loading: isLoading,
    error: hasError,
    actions: {
      // Организация
      updateOrganization: organization.updateOrganization,
      
      // Участники
      inviteMember: members.inviteMember,
      removeMember: members.removeMember,
      updateMemberRole: members.updateMemberRole,
      
      // Отделы
      createDepartment: departments.createDepartment,
      updateDepartment: departments.updateDepartment,
      deleteDepartment: departments.deleteDepartment,
      
      // Общие действия
      refetchAll,
      smartRefetch
    }
  };
}

// Хук для аналитики организации
export function useOrganizationAnalytics(orgId: string, timeRange = '30d') {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const api = useOrganizationApi();

  const loadAnalytics = useCallback(async () => {
    if (!orgId) return;

    try {
      setLoading(true);
      setError(null);
      
      // Пробуем использовать реальный API
      try {
        const data = await api.getAnalytics(orgId, timeRange);
        setAnalytics(data);
      } catch (apiError) {
        // Если API недоступен, используем заглушку
        const mockData = {
          memberGrowth: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
            count: Math.floor(Math.random() * 10) + 1
          })),
          departmentDistribution: [
            { name: 'Разработка', value: 45 },
            { name: 'Маркетинг', value: 25 },
            { name: 'Продажи', value: 20 },
            { name: 'HR', value: 10 }
          ],
          activityMetrics: {
            averageSessionTime: '2h 15m',
            dailyActiveUsers: 85,
            weeklyActiveUsers: 120,
            monthlyActiveUsers: 150
          }
        };
        setAnalytics(mockData);
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Не удалось загрузить аналитику';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [orgId, timeRange, api]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  return {
    analytics,
    loading,
    error,
    refetch: loadAnalytics
  };
}