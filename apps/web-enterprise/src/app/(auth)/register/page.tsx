"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { z } from "zod"
import axios from "axios"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

// 🧠 Валидация формы
const registerSchema = z.object({
  email: z.string().email({ message: "Введите корректный email" }),
  password: z.string().min(6, { message: "Минимум 6 символов" }),
  username: z.string().min(3, { message: "Введите имя пользователя" }),
})

type RegisterForm = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterForm) => {
    const payload = {
      ...data,
      client_id: "6de4bcfd-0c3e-4dd9-83f2-cb6df0a4f95b", // 🧩 актуальный client_id
    }

    try {
      setLoading(true)
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, payload)
      router.push("/dashboard")
    } catch (error: any) {
      console.error("Ошибка регистрации:", error?.response?.data || error)
      alert(error?.response?.data?.detail || "Не удалось зарегистрироваться")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="username">Имя пользователя</Label>
        <Input id="username" placeholder="Ваше имя" {...register("username")} />
        {errors.username && (
          <p className="text-xs text-red-500">{errors.username.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="Введите email" {...register("email")} />
        {errors.email && (
          <p className="text-xs text-red-500">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Пароль</Label>
        <Input
          id="password"
          type="password"
          placeholder="Введите пароль"
          {...register("password")}
        />
        {errors.password && (
          <p className="text-xs text-red-500">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Регистрация..." : "Зарегистрироваться"}
      </Button>
    </form>
  )
}