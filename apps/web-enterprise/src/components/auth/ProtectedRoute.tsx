"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/app/(auth)/hooks/useAuth"
import { Loader2 } from "lucide-react"

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAuth?: boolean
  redirectTo?: string
}

export default function ProtectedRoute({
  children,
  requireAuth = true,
  redirectTo = "/login",
}: ProtectedRouteProps) {
  const router = useRouter()
  const { user, loading, checkAuth } = useAuth()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (!loading && requireAuth && !user) {
      router.push(redirectTo)
    }
  }, [user, loading, requireAuth, router, redirectTo])

  if (loading || (requireAuth && !user)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
