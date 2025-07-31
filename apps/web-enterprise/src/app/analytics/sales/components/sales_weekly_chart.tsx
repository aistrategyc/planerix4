import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts"
import { format } from "date-fns"
import uk from "date-fns/locale/uk"

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
  const formattedData = data.map(row => ({
    ...row,
    formattedWeek: format(new Date(row.week_start), "dd.MM.yyyy", { locale: uk }),
  }))

  const aggregatedMetrics = {
    totalRevenue: data.reduce((acc, row) => acc + (row.total_revenue ?? 0), 0),
    totalContracts: data.reduce((acc, row) => acc + (row.contract_count ?? 0), 0),
    totalFirstSum: data.reduce((acc, row) => acc + (row.total_first_sum ?? 0), 0),
    avgRevenuePerContract: data.reduce((acc, row) => acc + (row.contract_count ?? 0), 0) > 0 
      ? Math.round(data.reduce((acc, row) => acc + (row.total_revenue ?? 0), 0) / data.reduce((acc, row) => acc + (row.contract_count ?? 0), 0)) 
      : 0,
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-md shadow-md">
          <p className="text-sm font-medium">Тиждень з {label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toLocaleString("uk-UA")} {entry.name === "Контракти" ? "" : "₴"}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between text-sm text-muted-foreground">
        <div>Загальна виручка: {aggregatedMetrics.totalRevenue.toLocaleString("uk-UA")} ₴</div>
        <div>Усього контрактів: {aggregatedMetrics.totalContracts.toLocaleString("uk-UA")}</div>
        <div>Середній чек: {aggregatedMetrics.avgRevenuePerContract.toLocaleString("uk-UA")} ₴</div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={formattedData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="formattedWeek" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => value.toLocaleString("uk-UA")} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="total_revenue" name="Виручка" fill="#3b82f6" />
          <Bar dataKey="total_first_sum" name="Перший платіж" fill="#10b981" />
          <Bar dataKey="contract_count" name="Контракти" fill="#f59e0b" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}