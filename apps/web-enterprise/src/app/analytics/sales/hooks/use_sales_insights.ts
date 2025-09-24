import { useEffect, useState } from "react"

interface Recommendation {
  text: string
  priority: "low" | "medium" | "high"
}

interface Insight {
  topic: string
  summary: string
  insights: string[]
  recommendations: Recommendation[]
}

export function useSalesInsights(dateRange: { from?: Date; to?: Date }) {
  const [insights, setInsights] = useState<Insight[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!dateRange.from || !dateRange.to) return

    const client_id = "3a174c50-9d4e-4fef-8d1c-ec2d03f49f5c"
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.planerix.com/api"

    const fetchInsights = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const res = await fetch(`${baseUrl}/insights/sales?client_id=${client_id}`)
        if (!res.ok) {
          const text = await res.text()
          throw new Error(`API error: ${res.status} – ${text}`)
        }

        const data = await res.json()
        if (!Array.isArray(data)) throw new Error("Expected array from API")

        setInsights(data)
      } catch (err: any) {
        console.error("❌ Failed to fetch insights:", err)
        setError(err.message || "Unknown error")
        setInsights([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchInsights()
  }, [dateRange])

  return { insights, isLoading, error }
}