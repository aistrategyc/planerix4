// lib/onboarding.ts

import { api } from './config'
import { apiCall } from './utils'
import type {
  OrganizationCreatePayload,
  OrganizationResponse,
  DepartmentCreatePayload,
  DepartmentResponse,
  InviteItem,
  BulkInviteResponse
} from '@/types/onboarding'

export class OnboardingAPI {
  /**
   * Создать организацию
   */
  static async createOrganization(payload: OrganizationCreatePayload): Promise<OrganizationResponse> {
    return apiCall<OrganizationResponse>(
      api.post('/orgs', payload),
      { extractType: 'single', errorContext: 'Create organization' }
    )
  }

  /**
   * Создать департамент
   */
  static async createDepartment(
    orgId: string,
    payload: DepartmentCreatePayload
  ): Promise<DepartmentResponse> {
    return apiCall<DepartmentResponse>(
      api.post(`/orgs/${orgId}/departments`, payload),
      { extractType: 'single', errorContext: 'Create department' }
    )
  }

  /**
   * Массовое приглашение пользователей (через invitations)
   * Используем правильный endpoint для приглашений по email
   */
  static async bulkInvite(
    orgId: string,
    invites: InviteItem[]
  ): Promise<BulkInviteResponse> {
    const results = {
      created: [] as any[],
      errors: [] as any[],
      updated: [] as any[],
      total: invites.length
    }

    for (let i = 0; i < invites.length; i++) {
      const invite = invites[i]
      try {
        const payload = {
          email: invite.email,
          role: invite.role || 'member',
          department_id: invite.department_id || null
        }

        const response = await apiCall<any>(
          api.post(`/orgs/${orgId}/memberships/bulk-invite`, payload),
          { extractType: 'single', errorContext: 'Create invitation' }
        )

        results.created.push({
          invitation_id: response.id,
          email: invite.email,
          role: invite.role || 'member'
        })
      } catch (error: any) {
        results.errors.push({
          index: i,
          email: invite.email,
          error: error.message || 'Unknown error'
        })
      }
    }

    return results
  }

  /**
   * Создать отдельное приглашение
   */
  static async createInvite(
    orgId: string,
    invite: InviteItem
  ): Promise<any> {
    const payload = {
      invited_email: invite.email,
      role: invite.role || 'member',
      department_id: invite.department_id || null
    }

    return apiCall<any>(
      api.post(`/orgs/${orgId}/memberships/bulk-invite`, payload),
      { extractType: 'single', errorContext: 'Create invite' }
    )
  }

  /**
   * Получить список организаций пользователя
   */
  static async getUserOrganizations(): Promise<OrganizationResponse[]> {
    return apiCall<OrganizationResponse[]>(
      api.get('/orgs'),
      { extractType: 'list', errorContext: 'Get user organizations' }
    )
  }

  /**
   * Проверить доступность slug
   */
  static async checkSlugAvailability(slug: string): Promise<{ available: boolean }> {
    try {
      return await apiCall<{ available: boolean }>(
        api.get(`/orgs/check-slug/${slug}`),
        { extractType: 'single', errorContext: 'Check slug availability' }
      )
    } catch (error: any) {
      // Если эндпоинт не существует, считаем доступным
      if (error.message?.includes('404') || error.response?.status === 404) {
        return { available: true }
      }
      throw error
    }
  }

  /**
   * Получить организацию по ID
   */
  static async getOrganization(orgId: string): Promise<OrganizationResponse> {
    return apiCall<OrganizationResponse>(
      api.get(`/orgs/${orgId}`),
      { extractType: 'single', errorContext: 'Get organization' }
    )
  }

  /**
   * Обновить организацию
   */
  static async updateOrganization(
    orgId: string,
    payload: Partial<OrganizationCreatePayload>
  ): Promise<OrganizationResponse> {
    return apiCall<OrganizationResponse>(
      api.patch(`/orgs/${orgId}`, payload),
      { extractType: 'single', errorContext: 'Update organization' }
    )
  }

  /**
   * Получить департаменты организации
   */
  static async getDepartments(orgId: string): Promise<DepartmentResponse[]> {
    return apiCall<DepartmentResponse[]>(
      api.get(`/orgs/${orgId}/departments`),
      { extractType: 'list', errorContext: 'Get departments' }
    )
  }

  /**
   * Получить участников организации
   */
  static async getMembers(orgId: string): Promise<any[]> {
    return apiCall<any[]>(
      api.get(`/orgs/${orgId}/memberships`),
      { extractType: 'list', errorContext: 'Get members' }
    )
  }

  /**
   * Получить приглашения организации
   */
  static async getInvitations(orgId: string): Promise<any[]> {
    return apiCall<any[]>(
      api.get(`/orgs/${orgId}/memberships/bulk-invite`),
      { extractType: 'list', errorContext: 'Get invitations' }
    )
  }
}

export default OnboardingAPI