// src/components/layouts/AuthLayout.tsx

import { ReactNode } from "react"

interface AuthLayoutProps {
  children: ReactNode
  title?: string
  subtitle?: string
}

export default function AuthLayout({
  children,
  title = "Liderix",
  subtitle = "Добро пожаловать! Войдите в аккаунт.",
}: AuthLayoutProps) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f0f4ff] to-[#e0ecff] px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-200">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
          <p className="text-gray-500 text-sm mt-1">{subtitle}</p>
        </div>
        {children}
        <div className="mt-6 text-center text-xs text-gray-400">
          © 2025 Liderix. All rights reserved.
        </div>
      </div>
    </main>
  )
}