// lib/api/onboarding.ts

import { api } from './config'
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
    try {
      const response = await api.post('/orgs', payload)
      return response.data
    } catch (error: any) {
      console.error('Create organization error:', error)
      throw error
    }
  }

  /**
   * Создать департамент
   */
  static async createDepartment(
    orgId: string, 
    payload: DepartmentCreatePayload
  ): Promise<DepartmentResponse> {
    try {
      const response = await api.post(`/orgs/${orgId}/departments`, payload)
      return response.data
    } catch (error: any) {
      console.error('Create department error:', error)
      throw error
    }
  }

  /**
   * Массовое приглашение пользователей (через invitations)
   * Используем правильный endpoint для приглашений по email
   */
  static async bulkInvite(
    orgId: string, 
    invites: InviteItem[]
  ): Promise<BulkInviteResponse> {
    try {
      // Используем отдельные приглашения через invitations endpoint
      const results = {
        created: [] as any[],
        errors: [] as any[],
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
          
          const response = await api.post(`/orgs/${orgId}/memberships/bulk-invite`, payload)
          results.created.push({
            invitation_id: response.data.id,
            email: invite.email,
            role: invite.role || 'member'
          })
        } catch (error: any) {
          results.errors.push({
            index: i,
            email: invite.email,
            error: error.response?.data?.detail || error.message
          })
        }
      }
      
      return results
    } catch (error: any) {
      console.error('Bulk invite error:', error)
      throw error
    }
  }

  /**
   * Создать отдельное приглашение
   */
  static async createInvite(
    orgId: string, 
    invite: InviteItem
  ): Promise<any> {
    try {
      const payload = {
        invited_email: invite.email,
        role: invite.role || 'member',
        department_id: invite.department_id || null
      }
      
      const response = await api.post(`/orgs/${orgId}/memberships/bulk-invite`, payload)
      return response.data
    } catch (error: any) {
      console.error('Create invite error:', error)
      throw error
    }
  }

  /**
   * Получить список организаций пользователя
   */
  static async getUserOrganizations(): Promise<OrganizationResponse[]> {
    try {
      const response = await api.get('/orgs')
      return response.data.items || response.data
    } catch (error: any) {
      console.error('Get user organizations error:', error)
      throw error
    }
  }

  /**
   * Проверить доступность slug
   */
  static async checkSlugAvailability(slug: string): Promise<{ available: boolean }> {
    try {
      const response = await api.get(`/orgs/check-slug/${slug}`)
      return response.data
    } catch (error: any) {
      // Если эндпоинт не существует, считаем доступным
      if (error.response?.status === 404) {
        return { available: true }
      }
      console.error('Check slug availability error:', error)
      throw error
    }
  }

  /**
   * Получить организацию по ID
   */
  static async getOrganization(orgId: string): Promise<OrganizationResponse> {
    try {
      const response = await api.get(`/orgs/${orgId}`)
      return response.data
    } catch (error: any) {
      console.error('Get organization error:', error)
      throw error
    }
  }

  /**
   * Обновить организацию
   */
  static async updateOrganization(
    orgId: string, 
    payload: Partial<OrganizationCreatePayload>
  ): Promise<OrganizationResponse> {
    try {
      const response = await api.patch(`/orgs/${orgId}`, payload)
      return response.data
    } catch (error: any) {
      console.error('Update organization error:', error)
      throw error
    }
  }

  /**
   * Получить департаменты организации
   */
  static async getDepartments(orgId: string): Promise<DepartmentResponse[]> {
    try {
      const response = await api.get(`/orgs/${orgId}/departments`)
      return response.data.items || response.data
    } catch (error: any) {
      console.error('Get departments error:', error)
      throw error
    }
  }

  /**
   * Получить участников организации
   */
  static async getMembers(orgId: string): Promise<any[]> {
    try {
      const response = await api.get(`/orgs/${orgId}/memberships`)
      return response.data.items || response.data
    } catch (error: any) {
      console.error('Get members error:', error)
      throw error
    }
  }

  /**
   * Получить приглашения организации
   */
  static async getInvitations(orgId: string): Promise<any[]> {
    try {
      const response = await api.get(`/orgs/${orgId}/memberships/bulk-invite`)
      return response.data.items || response.data
    } catch (error: any) {
      console.error('Get invitations error:', error)
      throw error
    }
  }
}

export default OnboardingAPI
