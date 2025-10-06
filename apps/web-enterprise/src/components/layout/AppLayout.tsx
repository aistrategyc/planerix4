"use client"

import { usePathname } from 'next/navigation'
import Header from '@/components/ui/header'
import Sidebar from '@/components/ui/sidebar'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname()

  // Pages that should not show the header/sidebar (none - show header on all pages)
  const authPages: string[] = []
  const isAuthPage = authPages.includes(pathname)

  if (isAuthPage) {
    return <>{children}</>
  }

  return (
    <>
      <Header />
      <div className="relative flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-y-auto px-6 py-6 md:px-10 md:py-8 pt-20 bg-white/80 backdrop-blur-sm">
          {children}
        </main>
      </div>
    </>
  )
}