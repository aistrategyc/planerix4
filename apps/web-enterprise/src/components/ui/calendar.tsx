"use client"

import * as React from "react"
import { Calendar as BaseCalendar } from "react-date-range"
import "react-date-range/dist/styles.css"
import "react-date-range/dist/theme/default.css"

interface CalendarProps {
  mode?: "single" | "range"
  value?: Date | { from?: Date; to?: Date }
  onChange?: (value: Date | { from?: Date; to?: Date }) => void
}

export function Calendar({ mode = "single", value, onChange }: CalendarProps) {
  const handleChange = (item: any) => {
    if (mode === "range") {
      const range = item.selection
      onChange?.({ from: range.startDate, to: range.endDate })
    } else {
      onChange?.(item)
    }
  }

  const getSelectedRange = () => {
    return {
      startDate: (value as any)?.from || new Date(),
      endDate: (value as any)?.to || (value as any)?.from || new Date(),
      key: "selection",
    }
  }

  return (
    <div className="rounded-md border shadow-sm p-2 bg-white">
      <BaseCalendar
        showDateDisplay={false}
        editableDateInputs={true}
        onChange={handleChange}
        moveRangeOnFirstSelection={false}
        months={1}
        direction="horizontal"
        rangeColors={["#3b82f6"]}
        {...(mode === "range"
          ? {
              ranges: [
                {
                  ...getSelectedRange(),
                  color: "#3b82f6", // ✅ ключевое исправление
                },
              ],
            }
          : {
              date: value instanceof Date ? value : new Date(),
            })}
      />
    </div>
  )
}