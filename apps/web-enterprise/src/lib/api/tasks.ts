import { Task } from "@/types/tasks"

export async function getTasks(): Promise<Task[]> {
  const res = await fetch("/api/tasks", {
    method: "GET",
    credentials: "include",
  })

  if (!res.ok) throw new Error("Failed to fetch tasks")

  return await res.json()
}