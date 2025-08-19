// components/organization/OrganizationSettings.tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  Shield,
  CheckCircle,
  AlertCircle,
  Edit,
  Settings,
  Activity,
  Copy
} from "lucide-react";
import { EditOrganizationDialog } from "./EditOrganizationDialog";
import type { Organization, Member, OrganizationStats } from "../hooks/useOrganization";

interface OrganizationSettingsProps {
  organization: Organization;
  members: Member[];
  stats: OrganizationStats;
  onOrganizationUpdated: (data: Partial<Organization>) => Promise<Organization>;
  copyOrgUrl: () => void;
}

export function OrganizationSettings({ 
  organization, 
  members, 
  stats, 
  onOrganizationUpdated,
  copyOrgUrl 
}: OrganizationSettingsProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Основные настройки */}
      <Card>
        <CardHeader>
          <CardTitle>Основные настройки</CardTitle>
          <CardDescription>
            Базовая информация об организации
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Название организации</Label>
            <p className="text-sm text-gray-600 mt-1">{organization.name}</p>
          </div>
          
          <div>
            <Label className="text-sm font-medium">URL организации</Label>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                /{organization.slug}
              </code>
              <Button variant="ghost" size="sm" onClick={copyOrgUrl}>
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {organization.preferences && (
            <>
              <div>
                <Label className="text-sm font-medium">Часовой пояс</Label>
                <p className="text-sm text-gray-600 mt-1">
                  {organization.preferences.timezone || 'Не установлен'}
                </p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Валюта</Label>
                <p className="text-sm text-gray-600 mt-1">
                  {organization.preferences.currency || 'Не установлена'}
                </p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Язык</Label>
                <p className="text-sm text-gray-600 mt-1">
                  {organization.preferences.locale === 'ru-RU' ? 'Русский' :
                   organization.preferences.locale === 'en-US' ? 'English' :
                   organization.preferences.locale === 'pl-PL' ? 'Polski' : 
                   'Не установлен'}
                </p>
              </div>
            </>
          )}

          <EditOrganizationDialog
            organization={organization}
            onOrganizationUpdated={onOrganizationUpdated}
            trigger={
              <Button variant="outline" className="w-full">
                <Edit className="w-4 h-4 mr-2" />
                Редактировать настройки
              </Button>
            }
          />
        </CardContent>
      </Card>

      {/* Безопасность */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-500" />
            Безопасность
          </CardTitle>
          <CardDescription>
            Управление доступом и безопасностью
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Двухфакторная аутентификация</span>
            </div>
            <p className="text-xs text-green-700">Включена для всех администраторов</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Приватная организация</span>
              <Badge className="bg-blue-100 text-blue-800">Включено</Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Одобрение приглашений</span>
              <Badge className="bg-yellow-100 text-yellow-800">Требуется</Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Аудит действий</span>
              <Badge className="bg-green-100 text-green-800">Активен</Badge>
            </div>
          </div>

          <Button variant="outline" className="w-full">
            <Settings className="w-4 h-4 mr-2" />
            Настройки безопасности
          </Button>
        </CardContent>
      </Card>

      {/* Статистика */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-500" />
            Активность
          </CardTitle>
          <CardDescription>
            Статистика использования
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Всего участников</span>
              <span className="text-sm font-medium">{stats.totalMembers}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Активных участников</span>
              <span className="text-sm font-medium">{stats.activeMembers}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Приглашений отправлено</span>
              <span className="text-sm font-medium">{stats.pendingMembers}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Отделов создано</span>
              <span className="text-sm font-medium">{stats.totalDepartments}</span>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-xs text-gray-500">
              Последнее обновление: {new Date(organization.updated_at).toLocaleString('ru-RU')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Опасная зона */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            Опасная зона
          </CardTitle>
          <CardDescription>
            Необратимые действия с организацией
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <h4 className="text-sm font-medium text-red-800 mb-2">Удаление организации</h4>
            <p className="text-xs text-red-700 mb-3">
              Это действие нельзя отменить. Будут удалены все данные организации,
              участники, отделы и проекты.
            </p>
            <Button variant="destructive" size="sm">
              Удалить организацию
            </Button>
          </div>

          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h4 className="text-sm font-medium text-yellow-800 mb-2">Передача владения</h4>
            <p className="text-xs text-yellow-700 mb-3">
              Передать права владельца другому участнику организации.
            </p>
            <Button variant="outline" size="sm">
              Передать владение
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}