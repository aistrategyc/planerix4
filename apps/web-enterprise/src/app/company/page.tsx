"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"

export default function CompanyPage() {
  const [companyName, setCompanyName] = useState("ООО 'ТехИнновации'")
  const [industry, setIndustry] = useState("EdTech")
  const [size, setSize] = useState("50–100 сотрудников")
  const [description, setDescription] = useState("Наша миссия — автоматизировать обучение в IT")

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">🏢 Профиль компании</h1>
      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Название компании</Label>
          <Input value={companyName} onChange={e => setCompanyName(e.target.value)} />
        </div>
        <div>
          <Label>Отрасль</Label>
          <Input value={industry} onChange={e => setIndustry(e.target.value)} />
        </div>
        <div>
          <Label>Размер команды</Label>
          <Input value={size} onChange={e => setSize(e.target.value)} />
        </div>
      </div>

      <div>
        <Label>Описание</Label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} />
      </div>

      <Button className="mt-4">💾 Сохранить профиль</Button>
    </div>
  )
}