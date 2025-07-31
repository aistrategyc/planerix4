import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown } from "lucide-react"

interface MetricCardProps {
  title: string
  value: string
  subtitle?: string
  isLoading?: boolean
  trend?: "up" | "down" | null
  trendValue?: string
}

export function MetricCard({ title, value, subtitle, isLoading, trend, trendValue }: MetricCardProps) {
  return (
    <Card className="w-full transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-32" />
        ) : (
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold leading-tight">{value}</div>
            {trend && trendValue && (
              <div className={cn("flex items-center gap-1 text-sm", trend === "up" ? "text-green-600" : "text-red-600")}>
                {trend === "up" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {trendValue}
              </div>
            )}
          </div>
        )}
        {subtitle && <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>}
      </CardContent>
    </Card>
  )
}