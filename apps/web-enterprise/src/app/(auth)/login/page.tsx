"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData?.detail || "Ошибка входа")
      }

      const data = await response.json()
      const token = data.access_token
      if (!token) throw new Error("Токен не получен. Проверьте сервер.")

      localStorage.setItem("token", token)
      router.push("/dashboard")
    } catch (err: any) {
      setError(err.message || "Ошибка входа. Попробуйте ещё раз.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex justify-center mb-6">
        <Image src="/logo.svg" alt="Liderix Logo" width={56} height={56} />
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            placeholder="Введите email"
            className="w-full p-2 border rounded"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Пароль</label>
          <input
            type="password"
            placeholder="Введите пароль"
            className="w-full p-2 border rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-2 rounded hover:bg-gray-900 transition"
        >
          {loading ? "Входим..." : "Войти"}
        </button>
        {error && <p className="text-red-500 text-center text-sm">{error}</p>}
      </form>
    </div>
  )
}