

"use client";

import React, { useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

import { useOrganizationData } from "../../hooks/useOrganization";
import { OrganizationSettings } from "../../components/OrganizationSettings";

export default function OrganizationSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const {
    organization,
    members,
    stats,
    loading,
    error,
    actions,
  } = useOrganizationData(id);

  const copyOrgUrl = useCallback(async () => {
    if (!organization) return;
    const url = `${window.location.origin}/organization/${organization.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Скопировано", description: "Ссылка на организацию скопирована" });
    } catch (e) {
      toast({
        title: "Не удалось скопировать",
        description: `Скопируйте вручную: ${url}`,
        variant: "destructive",
      });
    }
  }, [organization, toast]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Настройки организации</CardTitle>
            <CardDescription>Загрузка…</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
              Пожалуйста, подождите
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !organization) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Настройки организации</CardTitle>
            <CardDescription>Ошибка загрузки</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-red-600">
                {(error as any)?.message || "Не удалось загрузить данные организации"}
              </p>
              <Button variant="outline" onClick={() => router.refresh()}>Повторить</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleOrganizationUpdated = async (data: Partial<typeof organization>) => {
    try {
      await actions.updateOrganization(data as any);
      toast({ title: "Сохранено", description: "Организация обновлена" });
    } catch (e: any) {
      toast({ title: "Ошибка", description: e?.message ?? "Не удалось обновить", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold leading-tight">{organization.name}</h1>
          <p className="text-sm text-muted-foreground">Настройки организации</p>
        </div>
        <Button variant="ghost" onClick={() => router.push(`/organization/${organization.id}`)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          К организации
        </Button>
      </div>

      <OrganizationSettings
        organization={organization}
        members={members}
        stats={stats}
        onOrganizationUpdated={handleOrganizationUpdated as any}
        copyOrgUrl={copyOrgUrl}
      />
    </div>
  );
}