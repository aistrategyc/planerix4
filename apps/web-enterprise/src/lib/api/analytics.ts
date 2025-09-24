// apps/web-enterprise/src/lib/api/analytics.ts
// Unified analytics API client using standardized axios instance

import { api } from "./config"

export interface AnalyticsData {
  [key: string]: any
}

export class AnalyticsAPI {
  /**
   * Универсальный метод для получения аналитики
   */
  static async fetchAnalytics<T = AnalyticsData>(endpoint: string): Promise<T> {
    try {
      const response = await api.get(endpoint)
      return response.data
    } catch (error: any) {
      console.error("Analytics fetch error:", error)
      throw new Error(error.response?.data?.message || error.message || "Failed to fetch analytics")
    }
  }

  /**
   * Получить аналитику продаж
   */
  static async getSalesAnalytics(): Promise<any> {
    return this.fetchAnalytics("/analytics/sales")
  }

  /**
   * Получить аналитику задач
   */
  static async getTasksAnalytics(): Promise<any> {
    return this.fetchAnalytics("/analytics/tasks")
  }

  /**
   * Получить аналитику проектов
   */
  static async getProjectsAnalytics(): Promise<any> {
    return this.fetchAnalytics("/analytics/projects")
  }

  /**
   * Получить общую аналитику организации
   */
  static async getOrganizationAnalytics(orgId: string): Promise<any> {
    return this.fetchAnalytics(`/orgs/${orgId}/analytics`)
  }

  /**
   * Получить аналитику членства в организации
   */
  static async getMembershipStats(orgId: string): Promise<any> {
    return this.fetchAnalytics(`/orgs/${orgId}/memberships/stats`)
  }

  /**
   * Получить AI инсайты по продажам
   */
  static async getSalesInsights(): Promise<any> {
    return this.fetchAnalytics("/insights/sales")
  }
}

// Backward compatibility
export const fetchAnalytics = AnalyticsAPI.fetchAnalytics
export default AnalyticsAPI
