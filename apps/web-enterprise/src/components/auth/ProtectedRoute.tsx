"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { CompanyAPI } from "@/lib/api/company"
import { Loader2 } from "lucide-react"

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAuth?: boolean
  requireVerified?: boolean
  requireOrganization?: boolean
  redirectTo?: string
}

export default function ProtectedRoute({
  children,
  requireAuth = true,
  requireVerified = false,
  requireOrganization = false,
  redirectTo = "/login",
}: ProtectedRouteProps) {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [orgLoading, setOrgLoading] = useState(false)
  const [hasOrganization, setHasOrganization] = useState<boolean | null>(null)

  // TEMPORARY DEV MODE: Skip all checks for analytics development
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 DEV MODE: Skipping auth checks for development')
    return <>{children}</>
  }

  // ✅ Проверка организации если требуется
  useEffect(() => {
    const checkOrganization = async () => {
      if (!user || !requireOrganization || hasOrganization !== null) return
      
      setOrgLoading(true)
      try {
        const org = await CompanyAPI.getCurrentCompany()
        setHasOrganization(!!org?.id)
      } catch {
        setHasOrganization(false)
      } finally {
        setOrgLoading(false)
      }
    }
    
    checkOrganization()
  }, [user, requireOrganization, hasOrganization])

  useEffect(() => {
    if (isLoading || orgLoading) return
    
    // Проверка аутентификации
    if (requireAuth && !user) {
      router.push(redirectTo)
      return
    }
    
    // Проверка верификации email
    if (requireVerified && user && !user.is_verified) {
      router.push(`/verify-email?email=${encodeURIComponent(user.email)}`)
      return
    }
    
    // Проверка наличия организации
    if (requireOrganization && user && hasOrganization === false) {
      router.push('/onboarding')
      return
    }
  }, [user, isLoading, orgLoading, requireAuth, requireVerified, requireOrganization, hasOrganization, router, redirectTo])

  // Loading states
  if (isLoading || orgLoading || (requireAuth && !user) || (requireOrganization && hasOrganization === null)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">
            {isLoading ? 'Checking authentication...' :
             orgLoading ? 'Checking organization...' :
             'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
