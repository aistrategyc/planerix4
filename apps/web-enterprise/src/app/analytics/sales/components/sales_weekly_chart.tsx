import * as React from "react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts"
import { format } from "date-fns"
import { uk } from "date-fns/locale"

interface WeeklyRow {
  week_start: string
  total_revenue: number
  total_first_sum: number
  contract_count: number
}

interface SalesWeeklyChartProps {
  data: WeeklyRow[]
}

export function SalesWeeklyChart({ data }: SalesWeeklyChartProps) {
  const formattedData = React.useMemo(
    () =>
      (data ?? []).map((row) => ({
        ...row,
        formattedWeek: format(new Date(row.week_start), "dd.MM.yyyy", { locale: uk }),
      })),
    [data]
  )

  const aggregated = React.useMemo(() => {
    const totalRevenue = (data ?? []).reduce((a, r) => a + (r.total_revenue ?? 0), 0)
    const totalContracts = (data ?? []).reduce((a, r) => a + (r.contract_count ?? 0), 0)
    const totalFirstSum = (data ?? []).reduce((a, r) => a + (r.total_first_sum ?? 0), 0)
    const avgRevenuePerContract = totalContracts > 0 ? Math.round(totalRevenue / totalContracts) : 0
    return { totalRevenue, totalContracts, totalFirstSum, avgRevenuePerContract }
  }, [data])

  // Локальное управление видимостью серий (API компонента не меняем)
  const [visible, setVisible] = React.useState({
    total_revenue: true,
    total_first_sum: true,
    contract_count: true,
  })

  const toggleSeries = (key: keyof typeof visible) =>
    setVisible((v) => ({ ...v, [key]: !v[key] }))

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="rounded-md border border-gray-200 bg-white/95 px-3 py-2 shadow-md">
        <p className="text-xs font-medium text-gray-700">Тиждень з {label}</p>
        <div className="mt-1 space-y-0.5">
          {payload.map((entry: any, idx: number) => (
            <p key={idx} className="text-xs tabular-nums" style={{ color: entry.color }}>
              {entry.name}: {entry.value?.toLocaleString("uk-UA")}
              {entry.dataKey === "contract_count" ? "" : " ₴"}
            </p>
          ))}
        </div>
      </div>
    )
  }

  const CustomLegend = (props: any) => {
    const items = [
      { key: "total_revenue", name: "Виручка", color: "#2563EB" },
      { key: "total_first_sum", name: "Перший платіж", color: "#10B981" },
      { key: "contract_count", name: "Контракти", color: "#F59E0B" },
    ] as const
    return (
      <div className="flex flex-wrap items-center justify-end gap-3 px-2 pb-1 text-xs text-gray-600">
        {items.map((it) => (
          <button
            key={it.key}
            type="button"
            onClick={() => toggleSeries(it.key as any)}
            className={`inline-flex items-center gap-2 rounded-md border px-2 py-1 transition-colors ${
              visible[it.key as keyof typeof visible]
                ? "bg-white hover:bg-gray-50"
                : "bg-gray-100 text-gray-400 line-through"
            }`}
            aria-pressed={visible[it.key as keyof typeof visible]}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: it.color }}
            />
            {it.name}
          </button>
        ))}
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

      {/* Столбчатый график */}
      <div className="rounded-lg border p-2 sm:p-3">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            data={formattedData}
            margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
            barCategoryGap={18}
            barGap={6}
          >
            <defs>
              <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563EB" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#2563EB" stopOpacity={0.65} />
              </linearGradient>
              <linearGradient id="gradFirst" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#10B981" stopOpacity={0.65} />
              </linearGradient>
              <linearGradient id="gradContracts" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.65} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="formattedWeek"
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
            <Legend content={<CustomLegend />} />

            {visible.total_revenue && (
              <Bar
                dataKey="total_revenue"
                name="Виручка"
                fill="url(#gradRevenue)"
                radius={[6, 6, 0, 0]}
              />
            )}
            {visible.total_first_sum && (
              <Bar
                dataKey="total_first_sum"
                name="Перший платіж"
                fill="url(#gradFirst)"
                radius={[6, 6, 0, 0]}
              />
            )}
            {visible.contract_count && (
              <Bar
                dataKey="contract_count"
                name="Контракти"
                fill="url(#gradContracts)"
                radius={[6, 6, 0, 0]}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}