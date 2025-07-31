import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface Props {
  data: Array<{
    date: string // Изменено с dt на date для соответствия AdsAnalyticsPage
    spend?: number | null
    clicks?: number | null
    conversions?: number | null
    conv_rate?: number
    trend_spend?: string
    trend_clicks?: string
  }>
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border rounded shadow-md" role="tooltip" aria-label="Деталі графіка">
        <p className="font-semibold">{`Дата: ${label}`}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.stroke }}>
            {entry.name === "Витрати" && entry.value != null
              ? `${entry.name}: ${entry.value.toLocaleString("uk-UA", { style: "currency", currency: "UAH" })}`
              : `${entry.name}: ${entry.value != null ? entry.value.toLocaleString("uk-UA") : "–"}`}
          </p>
        ))}
        {payload[0]?.payload?.trend_spend && (
          <p className="text-sm text-muted-foreground">{`Тренд витрат: ${payload[0].payload.trend_spend}%`}</p>
        )}
        {payload[0]?.payload?.trend_clicks && (
          <p className="text-sm text-muted-foreground">{`Тренд кліків: ${payload[0].payload.trend_clicks}%`}</p>
        )}
      </div>
    )
  }
  return null
}

export function AdsDailyChart({ data }: Props) {
  return (
    <div className="h-[300px] w-full" role="region" aria-label="Графік динаміки рекламних метрик за днями">
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          Немає даних для відображення
        </div>
      ) : (
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              label={{ value: "Дата", position: "bottom", offset: 0 }}
              aria-label="Вісь X: Дата"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value, name) =>
                name === "spend"
                  ? value.toLocaleString("uk-UA", { style: "currency", currency: "UAH", maximumFractionDigits: 0 })
                  : name === "conv_rate"
                  ? (value * 100).toFixed(1) + "%"
                  : value.toLocaleString("uk-UA", { maximumFractionDigits: 0 })
              }
              aria-label="Вісь Y: Значення метрик"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend formatter={(value) => (value === "spend" ? "Витрати" : value === "clicks" ? "Кліки" : value === "conversions" ? "Конверсії" : "CR")} />
            <Line
              type="monotone"
              dataKey="spend"
              stroke="#3b82f6"
              name="Витрати"
              strokeWidth={2}
              dot={false}
              aria-label="Лінія витрат"
            />
            <Line
              type="monotone"
              dataKey="clicks"
              stroke="#22c55e"
              name="Кліки"
              strokeWidth={2}
              dot={false}
              aria-label="Лінія кліків"
            />
            <Line
              type="monotone"
              dataKey="conversions"
              stroke="#f97316"
              name="Конверсії"
              strokeWidth={2}
              dot={false}
              aria-label="Лінія конверсій"
            />
            <Line
              type="monotone"
              dataKey="conv_rate"
              stroke="#a855f7"
              name="CR"
              strokeWidth={2}
              dot={false}
              aria-label="Лінія коефіцієнта конверсії"
              yAxisId="percentage"
            />
            <YAxis
              yAxisId="percentage"
              orientation="right"
              tickFormatter={(value) => (value * 100).toFixed(1) + "%"}
              tick={{ fontSize: 12 }}
              aria-label="Вісь Y: Коефіцієнт конверсії"
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}