"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface Toast {
  id: string
  title?: string
  description?: string
  variant?: "default" | "destructive"
  duration?: number
}

interface ToastContextType {
  toast: (options: Omit<Toast, "id">) => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = ({ title, description, variant = "default", duration = 5000 }: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substr(2, 9)
    setToasts((prev) => [...prev, { id, title, description, variant, duration }])
  }

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} {...toast} onDismiss={() => dismissToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

interface ToastItemProps extends Toast {
  onDismiss: () => void
}

function ToastItem({ id, title, description, variant = "default", duration, onDismiss }: ToastItemProps) {
  useEffect(() => {
    if (duration) {
      const timer = setTimeout(() => onDismiss(), duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onDismiss])

  return (
    <div
      className={cn(
        "relative flex min-w-[300px] max-w-[400px] flex-col rounded-md border p-4 shadow-lg transition-all",
        variant === "destructive" ? "border-red-500 bg-red-50 text-red-900" : "border-gray-200 bg-white text-gray-900",
        "animate-in slide-in-from-right duration-300"
      )}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {title && <h3 className="text-sm font-semibold">{title}</h3>}
          {description && <p className="mt-1 text-sm">{description}</p>}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onDismiss}
          aria-label="Закрыть уведомление"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export function Toaster() {
  return <ToastProvider />
}