"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
import ProtectedRoute from "@/components/auth/ProtectedRoute"
  BarChart3, 
  Target, 
  Users, 
  Brain, 
  ArrowRight, 
  TrendingUp,
  TrendingDown,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  Bell,
  Zap,
  Award,
  Activity,
  PieChart,
  DollarSign,
  UserPlus,
  FileText,
  Settings,
  ArrowUpRight,
  ChevronRight,
  Star
} from "lucide-react";

function DashboardHomeContentContent() {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Обновление времени каждую минуту
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Данные пользователя
  const user = {
    name: "Иван Иванов",
    role: "Руководитель отдела маркетинга",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=ИИ",
    department: "Маркетинг"
  };

  // Основные метрики
  const mainMetrics = [
    {
      title: "Выручка",
      value: "$2.4M",
      change: 12.5,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Проекты",
      value: "24",
      change: 8.2,
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Команда",
      value: "48",
      change: -2.1,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      title: "Конверсия",
      value: "18.4%",
      change: 5.7,
      icon: TrendingUp,
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    }
  ];

  // Активные цели
  const activeGoals = [
    {
      id: 1,
      title: "Увеличить выручку на 25%",
      progress: 68,
      deadline: "2025-12-31",
      priority: "high",
      team: ["АС", "ПК", "МП"]
    },
    {
      id: 2,
      title: "Запустить новую кампанию",
      progress: 45,
      deadline: "2025-09-15",
      priority: "medium",
      team: ["ДС", "ЕП"]
    },
    {
      id: 3,
      title: "Оптимизировать процессы",
      progress: 82,
      deadline: "2025-08-30",
      priority: "low",
      team: ["НВ", "ТК", "РМ"]
    }
  ];

  // Недавняя активность
  const recentActivity = [
    {
      id: 1,
      type: "goal_update",
      title: "Обновлен прогресс цели «Увеличить выручку»",
      time: "2 часа назад",
      user: "Анна Смирнова",
      icon: Target
    },
    {
      id: 2,
      type: "project_created",
      title: "Создан новый проект «Летняя кампания»",
      time: "4 часа назад",
      user: "Петр Кузнецов",
      icon: Plus
    },
    {
      id: 3,
      type: "team_join",
      title: "Мария Петрова присоединилась к команде",
      time: "1 день назад",
      user: "HR отдел",
      icon: UserPlus
    },
    {
      id: 4,
      type: "achievement",
      title: "Достигнута цель «Обучение команды»",
      time: "2 дня назад",
      user: "Команда разработки",
      icon: Award
    }
  ];

  // Предстоящие события
  const upcomingEvents = [
    {
      id: 1,
      title: "Планерка команды",
      time: "10:00",
      date: "Сегодня",
      type: "meeting",
      participants: 8
    },
    {
      id: 2,
      title: "Ревью проекта X",
      time: "14:30",
      date: "Сегодня",
      type: "review",
      participants: 5
    },
    {
      id: 3,
      title: "Презентация Q3",
      time: "09:00",
      date: "Завтра",
      type: "presentation",
      participants: 12
    }
  ];

  // AI рекомендации
  const aiInsights = [
    {
      id: 1,
      title: "Оптимизация бюджета",
      description: "Рекомендуем перераспределить 15% бюджета из канала A в канал B для увеличения ROI на 23%",
      impact: "high",
      icon: Brain
    },
    {
      id: 2,
      title: "Риск по проекту",
      description: "Проект «Летняя кампания» может задержаться. Рекомендуем добавить 2 ресурса",
      impact: "medium",
      icon: AlertCircle
    }
  ];

  const getTimeGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Доброе утро";
    if (hour < 17) return "Добрый день";
    return "Добрый вечер";
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'border-l-red-500';
      case 'medium': return 'border-l-yellow-500';
      case 'low': return 'border-l-green-500';
      default: return 'border-l-gray-500';
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen">
      {/* Приветствие */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            {getTimeGreeting()}, {user.name.split(' ')[0]}! 👋
          </h1>
          <p className="text-gray-600">
            Вот что происходит в вашем {user.department.toLowerCase()} отделе сегодня
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Calendar className="w-4 h-4 mr-2" />
            {currentTime.toLocaleDateString('ru-RU', { 
              day: 'numeric', 
              month: 'long' 
            })}
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Создать цель
          </Button>
        </div>
      </div>

      {/* Основные метрики */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {mainMetrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold">{metric.value}</p>
                      <div className={`flex items-center text-xs ${
                        metric.change > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {metric.change > 0 ? (
                          <TrendingUp className="w-3 h-3 mr-1" />
                        ) : (
                          <TrendingDown className="w-3 h-3 mr-1" />
                        )}
                        {Math.abs(metric.change)}%
                      </div>
                    </div>
                  </div>
                  <div className={`${metric.bgColor} p-3 rounded-lg`}>
                    <Icon className={`w-6 h-6 ${metric.color}`} />
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
          {/* Активные цели */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  Активные цели
                </CardTitle>
                <CardDescription>
                  Ваши текущие OKR и их прогресс
                </CardDescription>
              </div>
              <Button variant="outline" size="sm">
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
                          {goal.priority === 'high' ? 'Высокий' : 
                           goal.priority === 'medium' ? 'Средний' : 'Низкий'}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          До {new Date(goal.deadline).toLocaleDateString('ru-RU')}
                        </span>
                      </div>
                    </div>
                    <div className="flex -space-x-2">
                      {goal.team.map((member, idx) => (
                        <Avatar key={idx} className="w-6 h-6 border-2 border-white">
                          <AvatarFallback className="text-xs">{member}</AvatarFallback>
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

          {/* AI Инсайты */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-600" />
                AI Рекомендации
              </CardTitle>
              <CardDescription>
                Умные предложения для оптимизации работы
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {aiInsights.map((insight) => {
                const Icon = insight.icon;
                return (
                  <div key={insight.id} className={`p-4 border-l-4 bg-gray-50 rounded-r-lg ${getImpactColor(insight.impact)}`}>
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 p-2 bg-white rounded-lg shadow-sm">
                        <Icon className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm mb-1">{insight.title}</h4>
                        <p className="text-sm text-gray-600 leading-relaxed">{insight.description}</p>
                        <div className="flex items-center gap-2 mt-3">
                          <Button size="sm" variant="outline" className="h-7 text-xs">
                            Применить
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs">
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
          {/* Предстоящие события */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-green-600" />
                Расписание
              </CardTitle>
              <CardDescription>
                Ближайшие события
              </CardDescription>
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
                  <Button size="sm" variant="ghost" className="w-8 h-8 p-0">
                    <ArrowUpRight className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Добавить событие
              </Button>
            </CardContent>
          </Card>

          {/* Активность команды */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-orange-600" />
                Активность
              </CardTitle>
              <CardDescription>
                Последние обновления
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentActivity.map((activity) => {
                const Icon = activity.icon;
                return (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <Icon className="w-4 h-4 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">{activity.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">{activity.user}</span>
                        <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                        <span className="text-xs text-gray-500">{activity.time}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Быстрые действия */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Быстрые действия</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="h-auto p-3 flex flex-col gap-1">
                <Target className="w-4 h-4" />
                <span className="text-xs">Новая цель</span>
              </Button>
              <Button variant="outline" size="sm" className="h-auto p-3 flex flex-col gap-1">
                <Users className="w-4 h-4" />
                <span className="text-xs">Команда</span>
              </Button>
              <Button variant="outline" size="sm" className="h-auto p-3 flex flex-col gap-1">
                <BarChart3 className="w-4 h-4" />
                <span className="text-xs">Отчеты</span>
              </Button>
              <Button variant="outline" size="sm" className="h-auto p-3 flex flex-col gap-1">
                <Settings className="w-4 h-4" />
                <span className="text-xs">Настройки</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Wrap with authentication protection
export default function DashboardHomeContent() {
  return (
    <ProtectedRoute requireAuth={true}>
      <DashboardHomeContentContent />
    </ProtectedRoute>
  )
}
