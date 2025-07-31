"use client"

import Link from "next/link"

export default function AnalyticsPage() {
  const sections = [
    {
      title: "📊 Продажи",
      description: "Контракты, выручка, филиалы, источники — полная картина за период",
      href: "/analytics/sales",
    },
    {
      title: "🛍 Продукты",
      description: "Какие услуги и товары приносят выручку. Статистика по продуктам",
      href: "/analytics/product",
    },
    {
      title: "📢 Реклама",
      description: "Показатели по кампаниям, CPC, CTR, ROAS и расходы на рекламу",
      href: "/analytics/ads",
    },
    {
      title: "🎨 Креативы",
      description: "Анализ эффективности рекламных креативов, баннеров и видео",
      href: "/analytics/creatives",
    },
    {
      title: "📈 Каналы",
      description: "Разбивка трафика и продаж по каналам привлечения и источникам",
      href: "/analytics/channels",
    },
  ]

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 min-h-[calc(100vh-80px)]">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">📈 Аналитика</h1>
        <p className="text-muted-foreground mt-1">
          Выберите интересующий раздел, чтобы погрузиться в аналитику
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {sections.map(({ title, description, href }) => (
          <Link
            key={href}
            href={href}
            className="block p-6 rounded-xl border border-border bg-background hover:bg-muted transition-colors shadow-sm"
          >
            <h2 className="text-xl font-semibold mb-1">{title}</h2>
            <p className="text-muted-foreground text-sm">{description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}