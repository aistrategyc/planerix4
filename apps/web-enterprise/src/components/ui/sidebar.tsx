// components/ui/sidebar.tsx
"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "./button"
import {
  Home,
  Target,
  ListChecks,
  BarChart,
  Megaphone,
  Users,
  PieChart,
  Calendar,
  BrainCircuit,
  Settings,
  HelpCircle,
} from "lucide-react"

export function Sidebar() {
  const router = useRouter()
  const [isHovered, setIsHovered] = useState(false)

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 border-r border-border bg-white/60 backdrop-blur-lg shadow-md flex flex-col overflow-hidden ${
        isHovered ? "w-64 px-4 py-6" : "w-[56px] items-center py-4"
      }`}
    >
      <nav className={`flex flex-col gap-1 ${isHovered ? "items-start" : "items-center"}`}>
        <SidebarButton icon={<Home size={18} />} label="На главную" path="/" showLabel={isHovered} />
        <SidebarButton icon={<Target size={18} />} label="Стратегия" path="/strategy" showLabel={isHovered} />
        <SidebarButton icon={<ListChecks size={18} />} label="Задачи" path="/tasks" showLabel={isHovered} />
        <SidebarButton icon={<BarChart size={18} />} label="CRM" path="/crm" showLabel={isHovered} />
        <SidebarButton icon={<BarChart size={18} className="text-black bg-lime-300 rounded-sm p-[1px]" />} label="Маркетинг" path="/marketing" showLabel={isHovered} />
        <SidebarButton icon={<Megaphone size={18} />} label="Реклама" path="/ads" showLabel={isHovered} />
        <SidebarButton icon={<Users size={18} />} label="Команды" path="/teams" showLabel={isHovered} />
        <SidebarButton icon={<PieChart size={18} />} label="Аналитика" path="/analytics" showLabel={isHovered} />
        <SidebarButton icon={<Calendar size={18} />} label="Календарь" path="/calendar" showLabel={isHovered} />
        <SidebarButton icon={<BrainCircuit size={18} />} label="AI" path="/ai" showLabel={isHovered} />
      </nav>

      <div className={`mt-auto pt-6 flex flex-col gap-1 ${isHovered ? "items-start" : "items-center"}`}>
        <SidebarButton icon={<Settings size={18} />} label="Настройки" path="/settings" showLabel={isHovered} />
        <SidebarButton icon={<HelpCircle size={18} />} label="Помощь" path="/help" showLabel={isHovered} />
      </div>
    </aside>
  )
}

function SidebarButton({ icon, label, path, showLabel = true }: { icon: React.ReactNode, label: string, path: string, showLabel?: boolean }) {
  const router = useRouter()
  return (
    <Button
      variant="ghost"
      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 hover:bg-muted/30 hover:shadow-sm"
      onClick={() => router.push(path)}
    >
      {icon}
      {showLabel && <span className="text-sm truncate">{label}</span>}
    </Button>
  )
}