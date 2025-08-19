import * as React from "react"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts"
import { format } from "date-fns"
import { uk } from "date-fns/locale"

interface DailyRow {
  date: string
  contract_count: number
  total_revenue: number
  total_first_sum: number
}

interface SalesDailyChartProps {
  data: DailyRow[]
}

export function SalesDailyChart({ data }: SalesDailyChartProps) {
  const formattedData = React.useMemo(
    () =>
      (data ?? []).map((row) => ({
        ...row,
        formattedDate: format(new Date(row.date), "dd.MM.yyyy", { locale: uk }),
      })),
    [data]
  )

  const aggregated = React.useMemo(() => {
    const totalRevenue = (data ?? []).reduce((acc, r) => acc + (r.total_revenue ?? 0), 0)
    const totalContracts = (data ?? []).reduce((acc, r) => acc + (r.contract_count ?? 0), 0)
    const totalFirstSum = (data ?? []).reduce((acc, r) => acc + (r.total_first_sum ?? 0), 0)
    const avgRevenuePerContract = totalContracts > 0 ? Math.round(totalRevenue / totalContracts) : 0
    return { totalRevenue, totalContracts, totalFirstSum, avgRevenuePerContract }
  }, [data])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="rounded-md border border-gray-200 bg-white/95 px-3 py-2 shadow-md">
        <p className="text-xs font-medium text-gray-700">{label}</p>
        <div className="mt-1 space-y-0.5">
          {payload.map((entry: any, idx: number) => (
            <p key={idx} className="text-xs tabular-nums" style={{ color: entry.color }}>
              {entry.name}:{" "}
              {entry.value?.toLocaleString("uk-UA")}
              {entry.dataKey === "contract_count" ? "" : " ₴"}
            </p>
          ))}
        </div>
      </div>
    )
  }

  if (!data?.length) {
    return (
      <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
        Дані відсутні за обраний період.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Верхние мини-метрики */}
      <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-3">
        <div className="inline-flex items-center justify-between rounded-md border bg-white/70 px-3 py-2">
          <span>Загальна виручка</span>
          <span className="tabular-nums font-semibold text-gray-900">
            {aggregated.totalRevenue.toLocaleString("uk-UA")} ₴
          </span>
        </div>
        <div className="inline-flex items-center justify-between rounded-md border bg-white/70 px-3 py-2">
          <span>Усього контрактів</span>
          <span className="tabular-nums font-semibold text-gray-900">
            {aggregated.totalContracts.toLocaleString("uk-UA")}
          </span>
        </div>
        <div className="inline-flex items-center justify-between rounded-md border bg-white/70 px-3 py-2">
          <span>Середній чек</span>
          <span className="tabular-nums font-semibold text-gray-900">
            {aggregated.avgRevenuePerContract.toLocaleString("uk-UA")} ₴
          </span>
        </div>
      </div>

      {/* Линейный график */}
      <div className="rounded-lg border p-2 sm:p-3">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart
            data={formattedData}
            margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="formattedDate"
              tick={{ fontSize: 11, fill: "#6B7280" }}
              tickLine={false}
              axisLine={{ stroke: "#E5E7EB" }}
              minTickGap={24}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#6B7280" }}
              tickLine={false}
              axisLine={{ stroke: "#E5E7EB" }}
              tickFormatter={(v) => v.toLocaleString("uk-UA")}
              width={70}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              iconSize={10}
              wrapperStyle={{ fontSize: 12, paddingBottom: 8, color: "#6B7280" }}
            />

            <Line
              type="monotone"
              dataKey="contract_count"
              name="Контракти"
              stroke="#2563EB"          // синий
              strokeWidth={2}
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="total_revenue"
              name="Виручка"
              stroke="#10B981"          // зелёный
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="total_first_sum"
              name="Перший платіж"
              stroke="#F59E0B"          // оранжевый
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}