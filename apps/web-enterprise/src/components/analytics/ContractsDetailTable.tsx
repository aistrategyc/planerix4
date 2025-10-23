"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ExternalLink, Loader2 } from "lucide-react"

interface ContractDetail {
  sk_contract: string
  sk_lead: string
  contract_date: string
  platform: string
  campaign_id?: string
  campaign_name?: string
  ad_id?: string
  ad_name?: string
  ad_creative_id?: string
  creative_title?: string
  creative_body?: string
  creative_name?: string
  media_image_src?: string
  event_name?: string
  traffic_source?: string
  revenue: number
  product_name?: string
}

interface ContractsDetailTableProps {
  data: ContractDetail[]
  title: string
  platform: "facebook" | "instagram" | "event" | "google"
  loading?: boolean
}

export function ContractsDetailTable({
  data,
  title,
  platform,
  loading = false
}: ContractsDetailTableProps) {
  // Filter data by platform
  const filteredData = data.filter(contract => {
    if (platform === "event") {
      return contract.platform?.toLowerCase() === "event"
    }
    return contract.platform?.toLowerCase() === platform
  })

  // Sort by contract_date descending
  const sortedData = [...filteredData].sort((a, b) =>
    new Date(b.contract_date).getTime() - new Date(a.contract_date).getTime()
  )

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency: 'UAH',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Get platform badge color
  const getPlatformBadgeColor = (plat: string) => {
    const colors: Record<string, string> = {
      facebook: "bg-blue-100 text-blue-700 border-blue-300",
      instagram: "bg-pink-100 text-pink-700 border-pink-300",
      event: "bg-purple-100 text-purple-700 border-purple-300",
      google: "bg-red-100 text-red-700 border-red-300",
    }
    return colors[plat.toLowerCase()] || "bg-gray-100 text-gray-700"
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (sortedData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p>Контрактов по {platform} не найдено</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calculate totals
  const totalContracts = sortedData.length
  const totalRevenue = sortedData.reduce((sum, contract) => sum + contract.revenue, 0)
  const uniqueClients = new Set(sortedData.map(c => c.sk_lead)).size
  const uniqueCampaigns = platform === "event"
    ? new Set(sortedData.map(c => c.event_name).filter(Boolean)).size
    : new Set(sortedData.map(c => c.campaign_id).filter(Boolean)).size

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <div className="flex gap-3 text-sm font-normal">
            <Badge variant="outline" className="px-3">
              👥 {uniqueClients} клиентов
            </Badge>
            <Badge variant="outline" className="px-3">
              📄 {totalContracts} контрактов
            </Badge>
            <Badge variant="outline" className="px-3 bg-green-50 text-green-700">
              💰 {formatCurrency(totalRevenue)}
            </Badge>
            {platform !== "event" && (
              <Badge variant="outline" className="px-3">
                📢 {uniqueCampaigns} кампаний
              </Badge>
            )}
            {platform === "event" && (
              <Badge variant="outline" className="px-3">
                🎪 {uniqueCampaigns} мероприятий
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Дата</TableHead>
                <TableHead>
                  <Badge className={getPlatformBadgeColor(platform)}>
                    {platform === "facebook" && "📘 Facebook"}
                    {platform === "instagram" && "📸 Instagram"}
                    {platform === "event" && "🎪 Event"}
                    {platform === "google" && "🔴 Google"}
                  </Badge>
                </TableHead>
                {platform === "event" ? (
                  <>
                    <TableHead>Мероприятие</TableHead>
                    <TableHead>Источник</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead>Кампания</TableHead>
                    <TableHead>Объявление</TableHead>
                    <TableHead className="w-[300px]">Креатив</TableHead>
                  </>
                )}
                <TableHead>Продукт</TableHead>
                <TableHead className="text-right">Доход</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((contract, idx) => (
                <TableRow key={contract.sk_contract || idx} className="hover:bg-gray-50">
                  {/* Date */}
                  <TableCell className="font-mono text-xs">
                    {new Date(contract.contract_date).toLocaleDateString('ru-RU')}
                  </TableCell>

                  {/* Client ID */}
                  <TableCell className="font-mono text-xs text-gray-600">
                    {contract.sk_lead?.slice(-8)}
                  </TableCell>

                  {platform === "event" ? (
                    <>
                      {/* Event Name */}
                      <TableCell className="max-w-[200px]">
                        <div className="font-medium text-sm">
                          {contract.event_name || "Неизвестное мероприятие"}
                        </div>
                      </TableCell>

                      {/* Traffic Source */}
                      <TableCell className="text-sm text-gray-600">
                        {contract.traffic_source || "—"}
                      </TableCell>
                    </>
                  ) : (
                    <>
                      {/* Campaign */}
                      <TableCell className="max-w-[200px]">
                        <div className="font-medium text-sm truncate">
                          {contract.campaign_name || contract.campaign_id || "—"}
                        </div>
                        {contract.campaign_id && (
                          <div className="text-xs text-gray-500 font-mono">
                            {contract.campaign_id.slice(0, 15)}...
                          </div>
                        )}
                      </TableCell>

                      {/* Ad */}
                      <TableCell className="max-w-[200px]">
                        <div className="text-sm truncate">
                          {contract.ad_name || contract.ad_id || "—"}
                        </div>
                      </TableCell>

                      {/* Creative */}
                      <TableCell className="max-w-[300px]">
                        <div className="flex gap-2 items-start">
                          {/* Creative Image */}
                          {contract.media_image_src && (
                            <img
                              src={contract.media_image_src}
                              alt="Creative"
                              className="w-16 h-16 object-cover rounded border"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          )}

                          {/* Creative Details */}
                          <div className="flex-1 min-w-0">
                            {contract.creative_title && (
                              <div className="text-sm font-medium line-clamp-1">
                                {contract.creative_title}
                              </div>
                            )}
                            {contract.creative_body && (
                              <div className="text-xs text-gray-600 line-clamp-2 mt-1">
                                {contract.creative_body}
                              </div>
                            )}
                            {contract.creative_name && (
                              <div className="text-xs text-gray-500 mt-1">
                                {contract.creative_name}
                              </div>
                            )}
                            {!contract.creative_title && !contract.creative_body && !contract.creative_name && (
                              <div className="text-xs text-gray-400">
                                Нет данных о креативе
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </>
                  )}

                  {/* Product */}
                  <TableCell className="text-sm">
                    {contract.product_name || "—"}
                  </TableCell>

                  {/* Revenue */}
                  <TableCell className="text-right font-bold text-green-700">
                    {formatCurrency(contract.revenue)}
                  </TableCell>

                  {/* Link */}
                  <TableCell>
                    {contract.ad_creative_id && (
                      <a
                        href={`https://www.facebook.com/ads/library/?id=${contract.ad_creative_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Summary Footer */}
        <div className="mt-4 pt-4 border-t flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Показано контрактов: <span className="font-bold">{sortedData.length}</span>
          </div>
          <div className="flex gap-4">
            <div className="text-sm">
              Уникальных клиентов: <span className="font-bold text-blue-600">{uniqueClients}</span>
            </div>
            {platform !== "event" && (
              <div className="text-sm">
                Кампаний: <span className="font-bold text-purple-600">{uniqueCampaigns}</span>
              </div>
            )}
            {platform === "event" && (
              <div className="text-sm">
                Мероприятий: <span className="font-bold text-purple-600">{uniqueCampaigns}</span>
              </div>
            )}
            <div className="text-sm">
              Общий доход: <span className="font-bold text-green-600">{formatCurrency(totalRevenue)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
