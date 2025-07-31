import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { MetricCard } from "./metric_card"

interface ServiceRow {
  service_id: number
  service_name: string
  contract_count: number
  total_revenue: number
  total_first_sum: number
}

interface SalesByServiceTableProps {
  data: ServiceRow[]
}

export function SalesByServiceTable({ data }: SalesByServiceTableProps) {
  const aggregatedMetrics = {
    totalRevenue: data.reduce((acc, row) => acc + (row.total_revenue ?? 0), 0),
    totalContracts: data.reduce((acc, row) => acc + (row.contract_count ?? 0), 0),
    totalFirstSum: data.reduce((acc, row) => acc + (row.total_first_sum ?? 0), 0),
    avgRevenuePerContract: data.reduce((acc, row) => acc + (row.contract_count ?? 0), 0) > 0 
      ? Math.round(data.reduce((acc, row) => acc + (row.total_revenue ?? 0), 0) / data.reduce((acc, row) => acc + (row.contract_count ?? 0), 0)) 
      : 0,
  }

  const conversionRate = aggregatedMetrics.totalRevenue > 0 ? ((aggregatedMetrics.totalFirstSum / aggregatedMetrics.totalRevenue) * 100).toFixed(1) : "0.0"
  const revenueShareData = data.map(row => ({
    ...row,
    revenueShare: aggregatedMetrics.totalRevenue > 0 ? ((row.total_revenue / aggregatedMetrics.totalRevenue) * 100).toFixed(1) : "0.0",
  }))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Середня конверсія"
          value={`${conversionRate}%`}
          subtitle="(перший платіж / виручка)"
        />
        <MetricCard
          title="Загальна виручка"
          value={`${aggregatedMetrics.totalRevenue.toLocaleString("uk-UA")} ₴`}
        />
        <MetricCard
          title="Усього контрактів"
          value={`${aggregatedMetrics.totalContracts.toLocaleString("uk-UA")}`}
        />
        <MetricCard
          title="Середній чек"
          value={`${aggregatedMetrics.avgRevenuePerContract.toLocaleString("uk-UA")} ₴`}
        />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Послуга</TableHead>
            <TableHead>Контракти</TableHead>
            <TableHead>Виручка</TableHead>
            <TableHead>Перший платіж</TableHead>
            <TableHead>Доля виручки</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {revenueShareData.length > 0 ? (
            revenueShareData.map((row) => (
              <TableRow key={row.service_id} className="hover:bg-muted/50 transition-colors">
                <TableCell>{row.service_name}</TableCell>
                <TableCell>{row.contract_count.toLocaleString("uk-UA")}</TableCell>
                <TableCell>{row.total_revenue?.toLocaleString("uk-UA")} ₴</TableCell>
                <TableCell>{row.total_first_sum?.toLocaleString("uk-UA")} ₴</TableCell>
                <TableCell>{row.revenueShare}%</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground italic">
                Немає даних за послугами за вибраний період.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}