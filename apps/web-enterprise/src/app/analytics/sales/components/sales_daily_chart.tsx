import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts"
import { format } from "date-fns"
import uk from "date-fns/locale/uk"

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
  const formattedData = data.map(row => ({
    ...row,
    formattedDate: format(new Date(row.date), "dd.MM.yyyy", { locale: uk }),
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
          <p className="text-sm font-medium">{label}</p>
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
        <LineChart data={formattedData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="formattedDate" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => value.toLocaleString("uk-UA")} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="contract_count"
            name="Контракти"
            stroke="#3b82f6"
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="total_revenue"
            name="Виручка"
            stroke="#10b981"
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="total_first_sum"
            name="Перший платіж"
            stroke="#f59e0b"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}