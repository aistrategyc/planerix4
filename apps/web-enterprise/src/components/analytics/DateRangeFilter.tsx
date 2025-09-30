"use client"

import { Button } from "@/components/ui/button"
import { CalendarIcon } from "lucide-react"

export interface DateRangeValue {
  from: Date
  to: Date
}

interface DateRangeFilterProps {
  value: DateRangeValue
  onChange: (range: DateRangeValue) => void
  className?: string
}

const PRESET_RANGES = [
  {
    label: "7 дней",
    getValue: () => {
      const to = new Date()
      const from = new Date()
      from.setDate(from.getDate() - 6)
      return { from, to }
    }
  },
  {
    label: "30 дней",
    getValue: () => {
      const to = new Date()
      const from = new Date()
      from.setDate(from.getDate() - 29)
      return { from, to }
    }
  },
  {
    label: "90 дней",
    getValue: () => {
      const to = new Date()
      const from = new Date()
      from.setDate(from.getDate() - 89)
      return { from, to }
    }
  }
]

export function DateRangeFilter({ value, onChange, className }: DateRangeFilterProps) {
  const handlePresetClick = (preset: typeof PRESET_RANGES[0]) => {
    const range = preset.getValue()
    onChange(range)
  }

  const formatDateRange = (range: DateRangeValue) => {
    const fromStr = range.from.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })
    const toStr = range.to.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })

    if (range.from.getTime() === range.to.getTime()) {
      return fromStr
    }

    return `${fromStr} - ${toStr}`
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <CalendarIcon className="h-4 w-4 text-gray-500" />
      <span className="text-sm font-medium mr-2">{formatDateRange(value)}</span>
      <div className="flex gap-1">
        {PRESET_RANGES.map((preset) => (
          <Button
            key={preset.label}
            variant="outline"
            size="sm"
            className="text-xs h-7"
            onClick={() => handlePresetClick(preset)}
          >
            {preset.label}
          </Button>
        ))}
      </div>
    </div>
  )
}