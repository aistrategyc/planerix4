"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/(auth)/hooks/useAuth";
import { CompanyAPI } from "@/lib/api/company";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return; // Ждем загрузки состояния аутентификации

    if (!user) {
      // Пользователь не аутентифицирован - перенаправляем на лендинг
      router.replace('/landing');
      return;
    }

    // Пользователь аутентифицирован - проверяем есть ли организация
    const checkOrganization = async () => {
      try {
        const org = await CompanyAPI.getCurrentCompany();
        if (org?.id) {
          router.replace('/dashboard');
        } else {
          router.replace('/onboarding');
        }
      } catch (error) {
        // Ошибка получения организации - перенаправляем на onboarding
        router.replace('/onboarding');
      }
    };

    checkOrganization();
  }, [user, loading, router]);

  // Показываем индикатор загрузки пока определяемся с перенаправлением
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Загрузка...</p>
      </div>
    </div>
  );
}