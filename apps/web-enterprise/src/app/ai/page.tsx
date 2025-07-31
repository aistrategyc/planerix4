"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  BarChart3,
  Megaphone,
  MessageCircle,
  Sparkles,
  ShoppingCart,
  Search,
} from "lucide-react"

export default function AIHomePage() {
  const [search, setSearch] = useState("")

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">
      <h1 className="text-3xl font-bold tracking-tight">🤖 AI Центр аналитики</h1>

      {/* 🔍 Фильтр и поиск */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Input
          placeholder="🔍 Поиск по инсайтам..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full sm:w-96"
        />
        <select className="border rounded px-3 py-2 text-sm">
          <option value="">Все агенты</option>
          <option value="sales">Продажи</option>
          <option value="marketing">Маркетинг</option>
          <option value="ads">Реклама</option>
        </select>
        <input
          type="date"
          className="border rounded px-3 py-2 text-sm"
        />
      </div>

      {/* Быстрые действия */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/ai/chat">
          <Card className="hover:shadow-md transition">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-md font-medium">Открыть чат</CardTitle>
              <MessageCircle size={20} />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Пообщайся с аналитическим AI-агентом</p>
            </CardContent>
          </Card>
        </Link>

        <AgentCard icon={<BarChart3 />} label="Аналитик по продажам" path="/ai/chat?sales" />
        <AgentCard icon={<Megaphone />} label="Маркетинговый агент" path="/ai/chat?marketing" />
        <AgentCard icon={<ShoppingCart />} label="Рекламный агент" path="/ai/chat?ads" />
      </div>

      {/* 🧠 AI-команда дня */}
      <Card className="border-l-4 border-yellow-400">
        <CardHeader>
          <CardTitle className="text-base font-medium">🧠 Команда дня</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Попробуй спросить: <strong>Какой канал дал лучший ROAS на прошлой неделе?</strong></p>
        </CardContent>
      </Card>

      {/* 📊 Граф активности (заглушка) */}
      <div>
        <h2 className="text-xl font-semibold mb-4">📈 Активность инсайтов</h2>
        <div className="h-40 bg-muted rounded-lg flex items-center justify-center text-sm text-muted-foreground">
          [Будущий график активности AI-инсайтов]
        </div>
      </div>

      {/* 🧵 История запросов */}
      <div>
        <h2 className="text-xl font-semibold mb-4">🧵 История запросов</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>Сколько было сессий вчера?</li>
          <li>Что повлияло на рост заявок?</li>
          <li>Какая конверсия у Instagram рекламы?</li>
        </ul>
      </div>

      {/* 🧬 Поиск по embedding (заглушка) */}
      <div>
        <h2 className="text-xl font-semibold mb-4">🧬 Ближайшие инсайты</h2>
        <div className="h-24 bg-muted rounded-lg flex items-center justify-center text-sm text-muted-foreground">
          [Embedding-поиск: в будущем — вывод похожих инсайтов]
        </div>
      </div>

      {/* 🧠 Последние инсайты */}
      <div>
        <h2 className="text-xl font-semibold mb-4">🧠 Последние инсайты</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border-l-4 border-lime-400">
              <CardHeader>
                <CardTitle className="text-base font-medium">Инсайт #{i + 1}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Продажи выросли на 12% в сравнении с прошлой неделей. Основной вклад — канал Facebook.
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 💡 Рекомендации */}
      <div>
        <h2 className="text-xl font-semibold mb-4">💡 Рекомендации</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border-l-4 border-blue-400">
              <CardHeader>
                <CardTitle className="text-base font-medium">Рекомендация #{i + 1}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Увеличьте бюджет на Facebook Ads в регионе Киев на 20% — высокий ROAS и CR.
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

function AgentCard({
  icon,
  label,
  path,
}: {
  icon: React.ReactNode
  label: string
  path: string
}) {
  return (
    <Link href={path}>
      <Card className="hover:shadow-md transition">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-md font-medium">{label}</CardTitle>
          {icon}
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Открыть диалог</p>
        </CardContent>
      </Card>
    </Link>
  )
}