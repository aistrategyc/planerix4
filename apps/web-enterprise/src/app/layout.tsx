import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { cn } from "@/lib/utils"
import { Providers } from "./providers"
import { Header } from "@/components/ui/header"
import { Sidebar } from "@/components/ui/sidebar"
import { ToastProvider } from "@/components/ui/use-toast" // Adjust path if necessary

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "Liderix — Business Intelligence",
  description: "AI-powered business analytics and management platform.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background text-foreground font-sans antialiased transition-colors duration-300",
          geistSans.variable,
          geistMono.variable
        )}
      >
        <Providers>
          <ToastProvider> {/* Added ToastProvider to provide context for useToast */}
            <div className="relative flex flex-col min-h-screen">
              <Header />
              <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <main className="flex-1 overflow-y-auto px-6 py-6 md:px-10 md:py-8 bg-background/80 backdrop-blur-md">
                  {children}
                </main>
              </div>
            </div>
          </ToastProvider>
        </Providers>
      </body>
    </html>
  )
}