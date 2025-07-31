"use client";

import { useRouter } from "next/navigation";
import { Button } from "./button";
import {
  Bell,
  Calendar,
  MessageSquare,
  Sun,
  User,
  LogOut,
  Search,
} from "lucide-react";
import Image from "next/image";

export function Header() {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-50 w-full bg-white/60 dark:bg-background/60 backdrop-blur-lg border-b border-border shadow-sm transition-colors">
      <div className="flex items-center justify-between px-4 md:px-6 py-3 gap-4">
        {/* Логотип и раздел */}
        <div
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 cursor-pointer select-none"
        >
          <Image
            src="/logo.svg"
            alt="Liderix"
            width={32}
            height={32}
            className="rounded-md shadow-sm"
          />
          <span className="text-lg font-semibold tracking-tight">LIDERIX</span>
        </div>

        <h1 className="text-base font-medium text-muted-foreground hidden sm:block">
          Маркетинг
        </h1>

        {/* Центр — поиск */}
        <div className="flex-1 max-w-md hidden md:flex">
          <div className="flex items-center w-full bg-muted/40 border border-border px-3 py-2 rounded-md">
            <Search size={16} className="text-muted-foreground mr-2" />
            <input
              type="text"
              placeholder="Поиск..."
              className="w-full bg-transparent outline-none text-sm"
            />
          </div>
        </div>

        {/* Правый блок */}
        <div className="flex items-center gap-3">
          {/* Календарь */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/calendar")}
            aria-label="Календарь"
          >
            <Calendar size={18} className="text-muted-foreground" />
          </Button>

          {/* Чат с ИИ-агентом */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/ai/chat")}
            aria-label="Чат с ИИ"
          >
            <MessageSquare size={18} className="text-muted-foreground" />
          </Button>

          <div className="relative">
            <Button variant="ghost" size="icon">
              <Bell size={18} className="text-muted-foreground" />
            </Button>
            <span className="absolute -top-1 -right-1 bg-lime-400 text-xs font-bold rounded-full px-[6px] text-black">
              5
            </span>
          </div>

          {/* Профиль пользователя */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/profile")}
            aria-label="Профиль"
          >
            <User size={18} className="text-muted-foreground" />
          </Button>

          <Button variant="ghost" size="icon">
            <Sun size={18} className="text-muted-foreground" />
          </Button>

          <div className="w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center text-xs font-medium text-muted-foreground">
            ИП
          </div>
        </div>
      </div>
    </header>
  );
}