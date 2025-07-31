// app/(auth)/layout.tsx

import AuthLayout from "@/components/layouts/authlayout"

export default function AuthRootLayout({ children }: { children: React.ReactNode }) {
  return <AuthLayout>{children}</AuthLayout>
}