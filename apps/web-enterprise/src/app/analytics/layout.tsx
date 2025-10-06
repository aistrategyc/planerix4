"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, BarChart3, PieChart, Target, Eye, Activity, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format, subDays } from "date-fns"
import { cn } from "@/lib/utils"

interface AnalyticsLayoutProps {
  children: React.ReactNode
}

// Глобальные фильтры для всех аналитических страниц
export default function AnalyticsLayout({ children }: AnalyticsLayoutProps) {
  const pathname = usePathname()

  const [dateRange, setDateRange] = useState<{
    from?: Date
    to?: Date
  }>({
    from: subDays(new Date(), 7),
    to: new Date()
  })
  const [platform, setPlatform] = useState<string>("")

  const navigation = [
    {
      name: "📊 Обзор",
      href: "/analytics",
      icon: BarChart3,
      description: "Общий обзор KPI и трендов"
    },
    {
      name: "📈 Каналы",
      href: "/analytics/channels",
      icon: PieChart,
      description: "Анализ источников трафика"
    },
    {
      name: "🎯 Кампании",
      href: "/analytics/campaigns",
      icon: Target,
      description: "Эффективность кампаний"
    },
    {
      name: "🎨 Креативы",
      href: "/analytics/creatives",
      icon: Eye,
      description: "Анализ креативных материалов"
    },
    {
      name: "🤝 CRM 360",
      href: "/analytics/crm",
      icon: Activity,
      description: "Полная воронка CRM"
    },
    {
      name: "⚡ Качество",
      href: "/analytics/quality",
      icon: Filter,
      description: "Контроль качества данных"
    },
    {
      name: "📦 Продукты",
      href: "/analytics/products",
      icon: Target,
      description: "Анализ продуктов и форм"
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📈 Маркетинг & CRM Аналитика</h1>
              <p className="mt-1 text-sm text-gray-500">
                Комплексный анализ эффективности маркетинговых каналов и CRM процессов
              </p>
            </div>

            {/* Global Filters */}
            <div className="flex items-center space-x-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[280px] justify-start text-left font-normal",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "dd.MM.yy")} - {format(dateRange.to, "dd.MM.yy")}
                        </>
                      ) : (
                        format(dateRange.from, "dd.MM.yy")
                      )
                    ) : (
                      <span>Выберите период</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="p-3 space-y-2">
                    <div className="flex gap-2 mb-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDateRange({
                          from: subDays(new Date(), 7),
                          to: new Date()
                        })}
                      >
                        7 дней
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDateRange({
                          from: subDays(new Date(), 30),
                          to: new Date()
                        })}
                      >
                        30 дней
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDateRange({
                          from: subDays(new Date(), 90),
                          to: new Date()
                        })}
                      >
                        90 дней
                      </Button>
                    </div>
                    <Calendar
                      mode="range"
                      value={dateRange}
                      onChange={(value) => {
                        if (value && typeof value === 'object' && 'from' in value) {
                          setDateRange(value as { from?: Date; to?: Date })
                        }
                      }}
                      numberOfMonths={2}
                    />
                  </div>
                </PopoverContent>
              </Popover>

              <Select value={platform || "all"} onValueChange={(value) => setPlatform(value === "all" ? "" : value)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Платформа" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">📊 Все платформы</SelectItem>
                  <SelectItem value="facebook">📘 Facebook</SelectItem>
                  <SelectItem value="google_ads">🔍 Google Ads</SelectItem>
                  <SelectItem value="other">🔗 Другие</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group relative rounded-lg p-4 transition-all hover:shadow-lg",
                  isActive
                    ? "bg-blue-50 border-2 border-blue-200 shadow-md"
                    : "bg-white border border-gray-200 hover:border-gray-300"
                )}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={cn(
                    "h-6 w-6 transition-colors",
                    isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-500"
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium truncate",
                      isActive ? "text-blue-900" : "text-gray-900"
                    )}>
                      {item.name}
                    </p>
                    <p className={cn(
                      "text-xs truncate",
                      isActive ? "text-blue-600" : "text-gray-500"
                    )}>
                      {item.description}
                    </p>
                  </div>
                </div>

                {isActive && (
                  <div className="absolute inset-x-0 -bottom-px h-1 bg-blue-600 rounded-b-lg" />
                )}
              </Link>
            )
          })}
        </div>

        {/* Active filters indicator */}
        {(platform || dateRange?.from) && (
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
            <span>Активные фильтры:</span>
            {platform && (
              <Badge variant="secondary">
                Платформа: {platform}
              </Badge>
            )}
            {dateRange?.from && (
              <Badge variant="outline">
                Период: {format(dateRange.from, "dd.MM.yy")} - {dateRange?.to ? format(dateRange.to, "dd.MM.yy") : '...'}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setPlatform('')
                setDateRange({
                  from: subDays(new Date(), 7),
                  to: new Date()
                })
              }}
              className="text-xs h-6 px-2"
            >
              🔄 Сбросить
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {children}
      </div>
    </div>
  )
}