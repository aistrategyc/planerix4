export async function getTrafficSummary() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/analytics/marketing/traffic`)
  if (!res.ok) throw new Error("Failed to fetch traffic summary")
  return res.json()
}