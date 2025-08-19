"use client";

import { useState, useEffect, useMemo } from "react";
import type { ComponentType } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/app/(auth)/hooks/useAuth";
import { useCompany, useCompanyTeam, useDepartments } from "@/app/company/hooks/useCompany";
import {
  Activity,
  ArrowUpRight,
  Calendar,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  Brain,
  AlertCircle,
  ChevronRight,
  FileText,
} from "lucide-react";

export default function DashboardHome() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  // company data
  const { company, stats, loading: companyLoading } = useCompany();
  const orgId = company?.id;
  const { teamMembers, loading: teamLoading } = useCompanyTeam(orgId);
  const { departments, loading: deptsLoading } = useDepartments(orgId);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const displayName = useMemo(() => {
    if (user?.full_name?.trim()) return user.full_name.split(" ")[0];
    if (user?.email) return user.email.split("@")[0];
    return "Коллега";
  }, [user]);

  const mainMetrics = useMemo(() => {
    // поддерживаем оба контракта статистики: snake_case и camelCase
    const s: any = stats ?? {};

    const projectsCount = Number(s.projects_count ?? s.projectsCount ?? 0);
    const tasksCount = Number(s.tasks_count ?? s.tasksCount ?? 0);
    const teamCount = Number((teamMembers?.length ?? s.team_count ?? s.teamCount ?? 0));
    const deptCount = Number(departments?.length ?? 0);

    const projectsChange = Number(s.projects_change ?? s.projectsChange ?? 0);
    const tasksChange = Number(s.tasks_change ?? s.tasksChange ?? 0);
    const teamChange = Number(s.team_change ?? s.teamChange ?? 0);

    type Metric = {
      title: string;
      value: string;
      change: number;
      icon: ComponentType<{ className?: string }>;
      color: string;
      bgColor: string;
    };

    const arr: Metric[] = [
      { title: "Проекты", value: String(projectsCount), change: projectsChange, icon: FileText, color: "text-indigo-600", bgColor: "bg-indigo-50" },
      { title: "Задачи", value: String(tasksCount), change: tasksChange, icon: Activity, color: "text-blue-600", bgColor: "bg-blue-50" },
      { title: "Команда", value: String(teamCount), change: teamChange, icon: Users, color: "text-sky-600", bgColor: "bg-sky-50" },
      { title: "Отделы", value: String(deptCount), change: 0, icon: Users, color: "text-cyan-600", bgColor: "bg-cyan-50" },
    ];

    return arr;
  }, [stats, teamMembers, departments]);

  // временные демо-данные (позже привяжем к API целей/активности/календаря)
  const activeGoals = [
    { id: 1, title: "Увеличить выручку на 25%", progress: 68, deadline: "2025-12-31", priority: "high", team: ["АС", "ПК", "МП"] },
    { id: 2, title: "Запустить новую кампанию", progress: 45, deadline: "2025-09-15", priority: "medium", team: ["ДС", "ЕП"] },
    { id: 3, title: "Оптимизировать процессы", progress: 82, deadline: "2025-08-30", priority: "low", team: ["НВ", "ТК", "РМ"] },
  ];

  const recentActivity = [
    { id: 1, type: "goal_update", title: "Обновлён прогресс цели «Увеличить выручку»", time: "2 часа назад", user: "Анна Смирнова", icon: Target },
    { id: 2, type: "project_created", title: "Создан новый проект «Летняя кампания»", time: "4 часа назад", user: "Петр Кузнецов", icon: FileText },
    { id: 3, type: "team_join", title: "Мария Петрова присоединилась к команде", time: "1 день назад", user: "HR отдел", icon: Users },
    { id: 4, type: "achievement", title: "Достигнута цель «Обучение команды»", time: "2 дня назад", user: "Команда разработки", icon: Activity },
  ];

  const upcomingEvents = [
    { id: 1, title: "Планёрка команды", time: "10:00", date: "Сегодня", type: "meeting", participants: 8 },
    { id: 2, title: "Ревью проекта X", time: "14:30", date: "Сегодня", type: "review", participants: 5 },
    { id: 3, title: "Презентация Q3", time: "09:00", date: "Завтра", type: "presentation", participants: 12 },
  ];

  const aiInsights = [
    { id: 1, title: "Оптимизация бюджета", description: "Перераспределите 15% бюджета из канала A в канал B — ожидаемый рост ROI на 23%.", impact: "high", icon: Brain },
    { id: 2, title: "Риск по проекту", description: "«Летняя кампания» может задержаться. Рекомендуем добавить 2 ресурса.", impact: "medium", icon: AlertCircle },
  ];

  const getTimeGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Доброе утро";
    if (hour < 17) return "Добрый день";
    return "Добрый вечер";
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-50 text-red-700 border-red-200";
      case "medium":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "low":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high":
        return "border-l-red-500";
      case "medium":
        return "border-l-amber-500";
      case "low":
        return "border-l-emerald-500";
      default:
        return "border-l-gray-300";
    }
  };

  const busy = companyLoading || teamLoading || deptsLoading;

  return (
    <ProtectedRoute>
      <div className="p-6 space-y-6 min-h-screen bg-white">
        {/* Верхний блок */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              {getTimeGreeting()}, {displayName}! 👋
            </h1>
            <p className="text-gray-600">
              {company?.name ? `Компания: ${company.name}. ` : ""}
              Ваш рабочий обзор: ключевые показатели и события.
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="outline" size="sm" className="bg-white">
              <Calendar className="w-4 h-4 mr-2" />
              {currentTime.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
            </Button>
            {/* Быстрые действия (desktop) */}
            <div className="hidden sm:flex gap-2">
              <Button onClick={() => router.push("/projects/new")} className="bg-indigo-600 hover:bg-indigo-700">
                Новый проект
              </Button>
              <Button onClick={() => router.push("/tasks/new")} variant="secondary">
                Новая задача
              </Button>
              <Button onClick={() => router.push("/goals/new")} variant="outline">
                Новая цель
              </Button>
            </div>
          </div>
        </div>

        {/* Метрики */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {mainMetrics.map((m, i) => {
            const Icon = m.icon as any;
            return (
              <Card key={i} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-600">{m.title}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-2xl font-bold">{busy ? "—" : m.value}</p>
                        {!busy && (
                          <div
                            className={`flex items-center text-xs ${
                              Number(m.change) > 0
                                ? "text-emerald-600"
                                : Number(m.change) < 0
                                ? "text-rose-600"
                                : "text-gray-500"
                            }`}
                          >
                            {Number(m.change) > 0 ? (
                              <TrendingUp className="w-3 h-3 mr-1" />
                            ) : Number(m.change) < 0 ? (
                              <TrendingDown className="w-3 h-3 mr-1" />
                            ) : null}
                            {Number(m.change) !== 0 ? Math.abs(Number(m.change)) + "%" : "0%"}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={`${m.bgColor} p-3 rounded-lg`}>
                      <Icon className={`w-6 h-6 ${m.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Левая колонка */}
          <div className="lg:col-span-2 space-y-6">
            {/* Цели */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    Активные цели
                  </CardTitle>
                  <CardDescription>Ваши текущие OKR и их прогресс</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => router.push("/goals")}>
                  Все цели
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeGoals.map((goal) => (
                  <div key={goal.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm mb-1">{goal.title}</h4>
                        <div className="flex items-center gap-2">
                          <Badge className={getPriorityColor(goal.priority)} variant="outline">
                            {goal.priority === "high" ? "Высокий" : goal.priority === "medium" ? "Средний" : "Низкий"}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            До {new Date(goal.deadline).toLocaleDateString("ru-RU")}
                          </span>
                        </div>
                      </div>
                      <div className="flex -space-x-2">
                        {goal.team.map((abbr, idx) => (
                          <Avatar key={idx} className="w-6 h-6 border-2 border-white">
                            <AvatarFallback className="text-[10px]">{abbr}</AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Прогресс</span>
                        <span className="font-medium">{goal.progress}%</span>
                      </div>
                      <Progress value={goal.progress} className="h-2" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* AI Рекомендации */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-indigo-600" />
                  AI Рекомендации
                </CardTitle>
                <CardDescription>Умные подсказки для оптимизации</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {aiInsights.map((insight) => {
                  const Icon = insight.icon as any;
                  return (
                    <div key={insight.id} className={`p-4 border-l-4 bg-gray-50 rounded-r-lg ${getImpactColor(insight.impact)}`}>
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 p-2 bg-white rounded-lg shadow-sm">
                          <Icon className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-sm mb-1">{insight.title}</h4>
                          <p className="text-sm text-gray-600 leading-relaxed">{insight.description}</p>
                          <div className="flex items-center gap-2 mt-3">
                            <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700">
                              Применить
                            </Button>
                            <Button size="sm" variant="outline" className="h-8">
                              Подробнее
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Правая колонка */}
          <div className="space-y-6">
            {/* Расписание */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-sky-600" />
                  Расписание
                </CardTitle>
                <CardDescription>Ближайшие события</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex-shrink-0 w-12 text-center">
                      <div className="text-sm font-medium">{event.time}</div>
                      <div className="text-xs text-gray-500">{event.date}</div>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium">{event.title}</h4>
                      <p className="text-xs text-gray-600">{event.participants} участников</p>
                    </div>
                    <Button size="icon" variant="ghost" className="w-8 h-8">
                      <ArrowUpRight className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full">
                  Добавить событие
                </Button>
              </CardContent>
            </Card>

            {/* Активность */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-600" />
                  Активность
                </CardTitle>
                <CardDescription>Последние обновления</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentActivity.map((a) => {
                  const Icon = a.icon as any;
                  return (
                    <div key={a.id} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <Icon className="w-4 h-4 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{a.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">{a.user}</span>
                          <span className="w-1 h-1 bg-gray-300 rounded-full" />
                          <span className="text-xs text-gray-500">{a.time}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Быстрые действия (mobile) */}
            <Card className="sm:hidden">
              <CardHeader>
                <CardTitle className="text-base">Быстрые действия</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-auto p-3 flex flex-col gap-1"
                  onClick={() => router.push("/goals/new")}
                >
                  <Target className="w-4 h-4" />
                  <span className="text-xs">Новая цель</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-auto p-3 flex flex-col gap-1"
                  onClick={() => router.push("/teams")}
                >
                  <Users className="w-4 h-4" />
                  <span className="text-xs">Команда</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-auto p-3 flex flex-col gap-1"
                  onClick={() => router.push("/projects")}
                >
                  <FileText className="w-4 h-4" />
                  <span className="text-xs">Проекты</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-auto p-3 flex flex-col gap-1"
                  onClick={() => router.push("/tasks")}
                >
                  <Activity className="w-4 h-4" />
                  <span className="text-xs">Задачи</span>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}