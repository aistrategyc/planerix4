"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { DateRangePicker } from "@/components/ui/date_range_picker"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import { TrophyIcon } from "@heroicons/react/24/outline"

import { MetricCard } from "@/app/analytics/ads/components/metric_card"
import { AdsDailyChart } from "@/app/analytics/ads/components/ads_daily_chart"
import { AdsByCampaignTable } from "@/app/analytics/ads/components/ads_by_campaign_table"
import { AdsByAdGroupTable } from "@/app/analytics/ads/components/ads_by_adgroup_table"
import { AdsByPlatformTable } from "@/app/analytics/ads/components/ads_by_platform_table"
import { AdsByUtmTable } from "@/app/analytics/ads/components/ads_by_utm_table"
import { InsightBlock } from "@/app/analytics/ads/components/insight_block"

import { useAdsData } from "@/app/analytics/ads/hooks/use_ads_data"
import { useAdsInsights } from "@/app/analytics/ads/hooks/use_ads_insights"

// Типизация данных
interface AdGroup {
  ad_group_id: string
  ad_group_name: string
  spend: number | null
  clicks: number | null
  conversions: number | null
  ctr: number | null
  cpc: number | null
  cpa: number | null
  platform?: string
  campaign_id?: string
}

interface Campaign {
  campaign_id: string
  platform?: string
  spend: number | null
  clicks: number | null
  ctr: number | null
  cpc: number | null
  cpa: number | null
  conversions: number | null
}

interface PlatformRow {
  platform: string
  spend: number | null
  impressions: number | null
  clicks: number | null
  conversions: number | null
  ctr: number | null
  cpc: number | null
  cpa: number | null
}

interface UtmRow {
  date: string
  utm_source: string
  utm_medium: string
  utm_campaign: string
  sessions: number
  conversions: number
  spend: number
  conv_rate: number
  cpa: number | null
  cps: number | null
  platform?: string
}

interface AdsDailyData {
  date: string
  spend: number | null
  clicks: number | null
  ctr: number | null
  conversions?: number | null
  platform?: string
}

interface AdsData {
  isLoading: boolean
  daily: AdsDailyData[]
  campaigns: Campaign[]
  adGroups: AdGroup[]
  platforms: PlatformRow[]
  utm: UtmRow[]
}

// Компонент для отображения метрик
const MetricsGrid = ({
  totalSpend,
  totalClicks,
  avgCTR,
  avgCPC,
  avgConvRate,
  isLoading,
}: {
  totalSpend: number
  totalClicks: number
  avgCTR: number
  avgCPC: number
  avgConvRate: number
  isLoading: boolean
}) => (
  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-4">
    {isLoading ? (
      <>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </>
    ) : (
      <>
        <div role="group" aria-describedby="spend-desc">
          <MetricCard
            title="Витрати"
            value={totalSpend.toLocaleString("uk-UA", { style: "currency", currency: "UAH" })}
            subtitle="+5% порівняно з попереднім періодом"
            trend="up"
            isLoading={isLoading}
          />
          <p id="spend-desc" className="text-xs text-muted-foreground">
            Загальна сума витрат на рекламу
          </p>
        </div>
        <div role="group" aria-describedby="clicks-desc">
          <MetricCard
            title="Кліки"
            value={totalClicks.toLocaleString("uk-UA")}
            subtitle="Без змін"
            trend="neutral"
            isLoading={isLoading}
          />
          <p id="clicks-desc" className="text-xs text-muted-foreground">
            Загальна кількість кліків
          </p>
        </div>
        <div role="group" aria-describedby="ctr-desc">
          <MetricCard
            title="CTR"
            value={(avgCTR * 100).toFixed(2) + "%"}
            subtitle="-2% порівняно з попереднім періодом"
            trend="down"
            isLoading={isLoading}
          />
          <p id="ctr-desc" className="text-xs text-muted-foreground">
            Відсоток кліків від показів
          </p>
        </div>
        <div role="group" aria-describedby="cpc-desc">
          <MetricCard
            title="CPC"
            value={avgCPC.toLocaleString("uk-UA", { style: "currency", currency: "UAH" })}
            subtitle="+10% порівняно з попереднім періодом"
            trend="up"
            isLoading={isLoading}
          />
          <p id="cpc-desc" className="text-xs text-muted-foreground">
            Середня вартість одного кліка
          </p>
        </div>
        <div role="group" aria-describedby="conv-rate-desc">
          <MetricCard
            title="CR"
            value={(avgConvRate * 100).toFixed(2) + "%"}
            subtitle="Середній коефіцієнт конверсії"
            trend="neutral"
            isLoading={isLoading}
          />
          <p id="conv-rate-desc" className="text-xs text-muted-foreground">
            Середній відсоток конверсій
          </p>
        </div>
      </>
    )}
  </div>
)

// Компонент для отображения топ-3 рейтингов
const TopPerformers = ({
  campaigns,
  adGroups,
  platforms,
  utm,
}: {
  campaigns: Campaign[]
  adGroups: AdGroup[]
  platforms: PlatformRow[]
  utm: UtmRow[]
}) => {
  // Логирование для диагностики
  if (process.env.NODE_ENV === "development") {
    const undefinedPlatforms = campaigns.filter(c => c.platform === undefined)
    if (undefinedPlatforms.length > 0) {
      console.warn("Campaigns with undefined platform:", undefinedPlatforms)
    }
    const notSetUtms = utm.filter(u => u.utm_source === "(not set)" || u.utm_campaign === "(not set)")
    if (notSetUtms.length > 0) {
      console.warn("UTM entries with '(not set)':", notSetUtms)
    }
    const platformCounts = platforms.reduce((acc, p) => {
      acc[p.platform] = (acc[p.platform] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    const duplicatePlatforms = Object.entries(platformCounts).filter(([_, count]) => count > 1)
    if (duplicatePlatforms.length > 0) {
      console.warn("Duplicate platforms:", duplicatePlatforms)
      console.log("Platforms array:", platforms)
    }
  }

  const topCampaignsBySpend = [...campaigns]
    .sort((a, b) => (b.spend ?? 0) - (a.spend ?? 0))
    .slice(0, 3)
  const topAdGroupsByCTR = [...adGroups]
    .sort((a, b) => (b.ctr ?? 0) - (a.ctr ?? 0))
    .slice(0, 3)
  const topPlatformsByConversions = [...platforms]
    .sort((a, b) => (b.conversions ?? 0) - (a.conversions ?? 0))
    .slice(0, 3)
  const topUtmByConvRate = [...utm]
    .sort((a, b) => b.conv_rate - a.conv_rate)
    .slice(0, 3)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2" aria-label="Топ-виконавці">
          <TrophyIcon className="h-6 w-6" /> Топ-виконавці
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Топ-3 кампанії за витратами</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
            {topCampaignsBySpend.map((c, i) => (
              <MetricCard
                key={`${c.campaign_id}-${c.platform ?? "unknown"}-${i}`}
                title={`#${i + 1} ${c.campaign_id}`}
                value={(c.spend ?? 0).toLocaleString("uk-UA", { style: "currency", currency: "UAH" })}
                subtitle={`Платформа: ${c.platform ?? "Невідомо"}`}
              />
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Топ-3 групи оголошень за CTR</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
            {topAdGroupsByCTR.map((g, i) => (
              <MetricCard
                key={g.ad_group_id}
                title={`#${i + 1} ${g.ad_group_name}`}
                value={(g.ctr ?? 0 * 100).toFixed(2) + "%"}
                subtitle={`Конверсії: ${g.conversions ?? 0}`}
              />
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Топ-3 платформи за конверсіями</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
            {topPlatformsByConversions.map((p, i) => (
              <MetricCard
                key={`${p.platform}-${i}`} // Добавлен индекс для уникальности
                title={`#${i + 1} ${p.platform}`}
                value={(p.conversions ?? 0).toLocaleString("uk-UA")}
                subtitle={`Витрати: ${(p.spend ?? 0).toLocaleString("uk-UA", { style: "currency", currency: "UAH" })}`}
              />
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Топ-3 UTM за коефіцієнтом конверсії</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
            {topUtmByConvRate.map((u, i) => (
              <MetricCard
                key={`${u.utm_source}-${u.utm_campaign}-${i}`}
                title={`#${i + 1} ${u.utm_campaign === "(not set)" ? "Невідома кампанія" : u.utm_campaign}`}
                value={(u.conv_rate * 100).toFixed(2) + "%"}
                subtitle={`Джерело: ${u.utm_source === "(not set)" ? "Невідомо" : u.utm_source}`}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AdsAnalyticsPage() {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const weekAgo = new Date(yesterday)
  weekAgo.setDate(yesterday.getDate() - 7)

  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: weekAgo,
    to: yesterday,
  })
  const [platformFilter, setPlatformFilter] = useState<string>("all")
  const [campaignFilter, setCampaignFilter] = useState<string>("all")

  const { isLoading, daily, campaigns, adGroups, platforms, utm } = useAdsData(dateRange) as AdsData
  const { insights } = useAdsInsights(dateRange)

  // Фильтрация данных
  const filteredDaily = useMemo(
    () => (platformFilter === "all" ? daily : daily.filter(d => d.platform === platformFilter)),
    [daily, platformFilter]
  )
  const filteredCampaigns = useMemo(
    () => (platformFilter === "all" ? campaigns : campaigns.filter(c => c.platform === platformFilter)),
    [campaigns, platformFilter]
  )
  const filteredAdGroups = useMemo(
    () =>
      platformFilter === "all" && campaignFilter === "all"
        ? adGroups
        : adGroups.filter(
            g =>
              (platformFilter === "all" || g.platform === platformFilter) &&
              (campaignFilter === "all" || `${g.campaign_id}-${g.platform ?? "unknown"}` === campaignFilter)
          ),
    [adGroups, platformFilter, campaignFilter]
  )
  const filteredUtm = useMemo(
    () =>
      platformFilter === "all" && campaignFilter === "all"
        ? utm
        : utm.filter(
            u =>
              (platformFilter === "all" || u.platform === platformFilter) &&
              (campaignFilter === "all" || `${u.utm_campaign}-${u.platform ?? "unknown"}` === campaignFilter)
          ),
    [utm, platformFilter, campaignFilter]
  )

  // Мемоизация метрик
  const totalSpend = useMemo(() => filteredDaily.reduce((sum, d) => sum + (d.spend ?? 0), 0), [filteredDaily])
  const totalClicks = useMemo(() => filteredDaily.reduce((sum, d) => sum + (d.clicks ?? 0), 0), [filteredDaily])
  const totalConversions = useMemo(() => filteredDaily.reduce((sum, d) => sum + (d.conversions ?? 0), 0), [filteredDaily])
  const avgCTR = useMemo(
    () => (filteredDaily.length > 0 ? filteredDaily.reduce((sum, d) => sum + (d.ctr ?? 0), 0) / filteredDaily.length : 0),
    [filteredDaily]
  )
  const avgCPC = useMemo(() => (totalClicks > 0 ? totalSpend / totalClicks : 0), [totalSpend, totalClicks])
  const avgConvRate = useMemo(() => (totalClicks > 0 ? totalConversions / totalClicks : 0), [totalConversions, totalClicks])

  // Дополнительные вычисления для графика
  const chartData = useMemo(() => {
    const sortedDaily = [...filteredDaily].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    return sortedDaily.map((d, i) => {
      const prev = i > 0 ? sortedDaily[i - 1] : null
      const trendSpend = prev && d.spend && prev.spend ? ((d.spend - prev.spend) / prev.spend * 100).toFixed(1) : "0"
      const trendClicks = prev && d.clicks && prev.clicks ? ((d.clicks - prev.clicks) / prev.clicks * 100).toFixed(1) : "0"
      return {
        ...d,
        conv_rate: d.clicks && d.conversions ? d.conversions / d.clicks : 0,
        trend_spend: trendSpend,
        trend_clicks: trendClicks,
      }
    })
  }, [filteredDaily])

  // Опции для фильтров
  const platformOptions = useMemo(
    () => [
      { value: "all", label: "Усі платформи" },
      { value: "google", label: "Google" },
      { value: "facebook", label: "Facebook" },
    ],
    []
  )
  const campaignOptions = useMemo(() => {
    const uniqueCampaigns = Array.from(
      new Map(
        campaigns.map((c, i) => [
          `${c.campaign_id}-${c.platform ?? "unknown"}`,
          { value: `${c.campaign_id}-${c.platform ?? "unknown"}`, label: `${c.campaign_id} (${c.platform ?? "Невідомо"})` },
        ])
      ).values()
    )
    return [
      { value: "all", label: "Усі кампанії" },
      ...uniqueCampaigns,
    ]
  }, [campaigns])

  return (
    <div className="space-y-10 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" aria-label="Заголовок сторінки рекламної аналітики">
            📊 Рекламна аналітика
          </h1>
          <p className="text-muted-foreground text-sm">
            Ефективність кампаній, груп оголошень, платформ та джерел UTM
          </p>
        </div>
        <div className="flex gap-2">
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            aria-label="Вибір діапазону дат для рекламної аналітики"
          />
          <Button
            variant="outline"
            onClick={() => setDateRange({ from: weekAgo, to: yesterday })}
            aria-label="Скинути діапазон дат"
          >
            Скинути
          </Button>
        </div>
      </div>

      <Separator />

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-full sm:w-48" aria-label="Фільтр за платформою">
            <SelectValue placeholder="Виберіть платформу" />
          </SelectTrigger>
          <SelectContent>
            {platformOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={campaignFilter} onValueChange={setCampaignFilter}>
          <SelectTrigger className="w-full sm:w-48" aria-label="Фільтр за кампанією">
            <SelectValue placeholder="Виберіть кампанію" />
          </SelectTrigger>
          <SelectContent>
            {platformOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={() => {
            setPlatformFilter("all")
            setCampaignFilter("all")
          }}
          aria-label="Скинути фільтри"
        >
          Скинути
        </Button>
      </div>

      <MetricsGrid
        totalSpend={totalSpend}
        totalClicks={totalClicks}
        avgCTR={avgCTR}
        avgCPC={avgCPC}
        avgConvRate={avgConvRate}
        isLoading={isLoading}
      />

      <TopPerformers campaigns={filteredCampaigns} adGroups={filteredAdGroups} platforms={platforms} utm={filteredUtm} />

      <Card>
        <CardHeader>
          <CardTitle aria-label="Графік динаміки за днями">📅 Динаміка за днями</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-64 w-full" /> : <AdsDailyChart data={chartData} />}
          <InsightBlock topic="daily" insights={insights} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle aria-label="Таблиця кампаній">🎯 Кампанії</CardTitle>
        </CardHeader>
        <CardContent>
          <AdsByCampaignTable data={filteredCampaigns} isLoading={isLoading} />
          <InsightBlock topic="campaigns" insights={insights} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle aria-label="Таблиця груп оголошень">🧩 Групи оголошень</CardTitle>
        </CardHeader>
        <CardContent>
          <AdsByAdGroupTable data={filteredAdGroups} isLoading={isLoading} />
          <InsightBlock topic="adgroups" insights={insights} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle aria-label="Таблиця платформ">🛰 Платформи</CardTitle>
        </CardHeader>
        <CardContent>
          <AdsByPlatformTable data={platforms} isLoading={isLoading} />
          <InsightBlock topic="platforms" insights={insights} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle aria-label="Таблиця джерел за UTM">🔗 Джерела за UTM</CardTitle>
        </CardHeader>
        <CardContent>
          <AdsByUtmTable data={filteredUtm} isLoading={isLoading} />
          <InsightBlock topic="utm" insights={insights} />
        </CardContent>
      </Card>
    </div>
  )
}