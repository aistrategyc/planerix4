import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { MetricCard } from "./metric_card"

interface BranchRow {
  branch_sk: number
  branch_name: string
  contract_count: number
  total_revenue: number
  total_first_sum: number
}

interface SalesByBranchTableProps {
  data: BranchRow[]
}

export function SalesByBranchTable({ data }: SalesByBranchTableProps) {
  const aggregatedMetrics = {
    totalRevenue: data.reduce((acc, row) => acc + (row.total_revenue ?? 0), 0),
    totalContracts: data.reduce((acc, row) => acc + (row.contract_count ?? 0), 0),
    totalFirstSum: data.reduce((acc, row) => acc + (row.total_first_sum ?? 0), 0),
    totalBranches: data.length,
    avgRevenuePerContract: data.reduce((acc, row) => acc + (row.contract_count ?? 0), 0) > 0 
      ? Math.round(data.reduce((acc, row) => acc + (row.total_revenue ?? 0), 0) / data.reduce((acc, row) => acc + (row.contract_count ?? 0), 0)) 
      : 0,
    avgRevenuePerBranch: data.length > 0 ? Math.round(data.reduce((acc, row) => acc + (row.total_revenue ?? 0), 0) / data.length) : 0,
  }

  const conversionRate = aggregatedMetrics.totalRevenue > 0 ? ((aggregatedMetrics.totalFirstSum / aggregatedMetrics.totalRevenue) * 100).toFixed(1) : "0.0"

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
          subtitle={`Виручка на філію: ${aggregatedMetrics.avgRevenuePerBranch.toLocaleString("uk-UA")} ₴`}
        />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Філія</TableHead>
            <TableHead>Контракти</TableHead>
            <TableHead>Виручка</TableHead>
            <TableHead>Перший платіж</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.map((row) => (
              <TableRow key={row.branch_sk} className="hover:bg-muted/50 transition-colors">
                <TableCell>{row.branch_name || "–"}</TableCell>
                <TableCell>{row.contract_count.toLocaleString("uk-UA")}</TableCell>
                <TableCell>{row.total_revenue?.toLocaleString("uk-UA")} ₴</TableCell>
                <TableCell>{row.total_first_sum?.toLocaleString("uk-UA")} ₴</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground italic">
                Немає даних за філіями за вибраний період.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}