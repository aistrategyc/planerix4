// src/app/organization/[id]/page.tsx
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { 
  Building2, 
  Users, 
  Briefcase,
  Target,
  UserPlus,
  Edit,
  Copy,
  CheckCircle,
  Crown,
  Shield,
  Eye
} from "lucide-react";

// Импорты под вашу структуру
import { EmptyState } from "@/components/ui/empty-state";
import { useOrganizationData } from "../hooks/useOrganization";

// Импорты компонентов организации
import { CreateDepartmentDialog } from "../components/CreateDepartmentDialog";
import { EditOrganizationDialog } from "../components/EditOrganizationDialog";
import { InviteMemberDialog } from "../components/InviteMemberDialog";
import { OrganizationOverview } from "../components/OrganizationOverview";
import { MembersList } from "../components/MembersList";
import { DepartmentsList } from "../components/DepartmentsList";
import { OrganizationSettings } from "../components/OrganizationSettings";
import { QuickActions } from "../components/QuickActions";
import { RecentActivity } from "../components/RecentActivity";
import { OrganizationMetrics } from "../components/OrganizationMetrics";

export default function OrganizationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const orgId = id;

  // Главный хук для всех данных организации
  const {
    organization,
    members,
    departments,
    stats,
    loading,
    error,
    actions
  } = useOrganizationData(orgId);

  const [activeTab, setActiveTab] = useState("overview");

  // Утилитарные функции
  const copyOrgUrl = async () => {
    if (!organization) return;
    
    const url = `${window.location.origin}/organization/${organization.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Скопировано",
        description: "Ссылка на организацию скопирована в буфер обмена",
      });
    } catch (e) {
      toast({
        title: "Не удалось скопировать",
        description: "Скопируйте ссылку вручную: " + url,
        variant: "destructive",
      });
    }
  };

  const handleOrganizationUpdated = async (update: any) => {
    try {
      await actions.updateOrganization(update);
      toast({
        title: "Сохранено",
        description: "Организация обновлена",
      });
    } catch (e: any) {
      toast({
        title: "Ошибка",
        description: e?.message ?? "Не удалось обновить организацию",
        variant: "destructive",
      });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'admin': return <Shield className="w-4 h-4 text-red-500" />;
      case 'member': return <Users className="w-4 h-4 text-blue-500" />;
      case 'viewer': return <Eye className="w-4 h-4 text-gray-500" />;
      default: return <Users className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleName = (role: string) => {
    const roleMap = {
      'owner': 'Владелец',
      'admin': 'Администратор', 
      'member': 'Участник',
      'viewer': 'Наблюдатель'
    };
    return roleMap[role as keyof typeof roleMap] || role;
  };

  // Обработчики действий
  const handleMemberAction = (memberId: string, action: string) => {
    console.log('Member action:', memberId, action);
  };

  const handleDepartmentAction = (departmentId: string, action: string) => {
    console.log('Department action:', departmentId, action);
  };

  const handleExportData = () => {
    toast({
      title: "Экспорт данных",
      description: "Функция экспорта данных будет доступна в ближайшее время"
    });
  };

  const handleViewAnalytics = () => {
    router.push(`/organization/${orgId}/analytics`);
  };

  // Состояния загрузки
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Обработка ошибок
  if (error) {
    return (
      <div className="p-6">
        <EmptyState
          title="Произошла ошибка"
          description={error}
          action={{
            label: "Повторить",
            onClick: actions.refetchAll
          }}
        />
      </div>
    );
  }

  // Организация не найдена
  if (!organization) {
    return (
      <div className="p-6">
        <EmptyState
          title="Организация не найдена"
          description="Возможно, она была удалена или у вас нет доступа"
          action={{
            label: "Вернуться на главную",
            onClick: () => router.push('/dashboard'),
            variant: "outline"
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="p-6 space-y-6">
        {/* Заголовок организации */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  {organization.name}
                </h1>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>/{organization.slug}</span>
                  <button 
                    className="p-1 hover:bg-gray-100 rounded"
                    onClick={copyOrgUrl}
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
            {organization.description && (
              <p className="text-gray-600 max-w-2xl">{organization.description}</p>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <InviteMemberDialog
              orgId={orgId}
              departments={departments}
              onMemberInvited={() => actions.smartRefetch(['members'])}
              trigger={
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Пригласить
                </button>
              }
            />

            <EditOrganizationDialog
              organization={organization}
              onOrganizationUpdated={handleOrganizationUpdated as any}
              trigger={
                <button className="border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg flex items-center gap-2">
                  <Edit className="w-4 h-4" />
                  Редактировать
                </button>
              }
            />
          </div>
        </div>

        {/* Основной контент */}
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Главный контент */}
          <div className="lg:col-span-3 space-y-6">
            {/* Статистические карточки */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Участники</p>
                    <p className="text-2xl font-bold">{stats.totalMembers}</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Отделы</p>
                    <p className="text-2xl font-bold">{stats.totalDepartments}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <Briefcase className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Активные</p>
                    <p className="text-2xl font-bold">{stats.activeMembers}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Проекты</p>
                    <p className="text-2xl font-bold">{stats.activeProjects}</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <Target className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Табы */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid grid-cols-4 w-full max-w-md">
                <TabsTrigger value="overview">Обзор</TabsTrigger>
                <TabsTrigger value="members">
                  Участники
                  {stats.totalMembers > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {stats.totalMembers}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="departments">
                  Отделы
                  {stats.totalDepartments > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {stats.totalDepartments}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="settings">Настройки</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <OrganizationOverview
                  organization={organization}
                  members={members}
                  departments={departments}
                  onTabChange={setActiveTab}
                  getRoleIcon={getRoleIcon}
                />
              </TabsContent>

              <TabsContent value="members">
                <MembersList
                  members={members}
                  getRoleIcon={getRoleIcon}
                  getRoleName={getRoleName}
                  onMemberAction={handleMemberAction}
                />
              </TabsContent>

              <TabsContent value="departments">
                <DepartmentsList
                  orgId={orgId}
                  departments={departments}
                  members={members}
                  onDepartmentCreated={() => actions.smartRefetch(['departments'])}
                  onDepartmentAction={handleDepartmentAction}
                />
              </TabsContent>

              <TabsContent value="settings">
                <OrganizationSettings
                  organization={organization}
                  members={members}
                  stats={stats}
                  onOrganizationUpdated={handleOrganizationUpdated as any}
                  copyOrgUrl={copyOrgUrl}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Боковая панель */}
          <div className="space-y-6">
            <QuickActions
              orgId={orgId}
              onInviteMember={() => setActiveTab('members')}
              onCreateDepartment={() => setActiveTab('departments')}
              onExportData={handleExportData}
              onViewAnalytics={handleViewAnalytics}
            />

            <OrganizationMetrics stats={stats} />

            <RecentActivity orgId={orgId} limit={8} />
          </div>
        </div>
      </div>
    </div>
  );
}