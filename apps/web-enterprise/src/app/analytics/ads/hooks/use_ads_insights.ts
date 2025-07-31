import { useEffect, useState } from "react"

interface Recommendation {
  text: string
  priority: "high" | "medium" | "low"
}

interface Insight {
  topic: string
  summary: string
  recommendations: Recommendation[]
}

export function useAdsInsights(dateRange: { from?: Date; to?: Date }) {
  const [insights, setInsights] = useState<Insight[]>([])

  useEffect(() => {
    if (!dateRange.from || !dateRange.to) return

    // Заглушка
    setInsights([
      {
        topic: "campaigns",
        summary: "Некоторые кампании показывают низкий CTR по сравнению с остальными.",
        recommendations: [
          { text: "Пересмотрите креативы и тексты для низкоэффективных кампаний.", priority: "high" },
          { text: "Попробуйте A/B тестирование для улучшения кликабельности.", priority: "medium" }
        ]
      },
      {
        topic: "platforms",
        summary: "Одна из платформ имеет высокий CPC и низкую конверсию.",
        recommendations: [
          { text: "Рассмотрите снижение бюджета на этой платформе.", priority: "high" },
          { text: "Сравните поведение пользователей с другими платформами.", priority: "low" }
        ]
      }
    ])
  }, [dateRange])

  return { insights }
}