import { Metadata } from "next"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  HelpCircle, 
  BookOpen, 
  MessageSquare, 
  Video, 
  Search,
  Users,
  Settings,
  BarChart3,
  Calendar,
  Target,
  FolderOpen
} from "lucide-react"

export const metadata: Metadata = {
  title: "Справочный центр | Liderix",
  description: "Найдите ответы на часто задаваемые вопросы и изучите возможности платформы Liderix для управления задачами и проектами.",
}

export default function HelpPage() {
  const categories = [
    {
      icon: <Users className="h-6 w-6" />,
      title: "Начало работы",
      description: "Основы использования платформы",
      articles: [
        "Создание первой организации",
        "Приглашение участников команды",
        "Настройка профиля пользователя",
        "Первые шаги в системе"
      ]
    },
    {
      icon: <FolderOpen className="h-6 w-6" />,
      title: "Управление задачами",
      description: "Создание и отслеживание задач",
      articles: [
        "Создание и редактирование задач",
        "Назначение исполнителей",
        "Работа со статусами задач",
        "Использование комментариев",
        "Прикрепление файлов"
      ]
    },
    {
      icon: <Target className="h-6 w-6" />,
      title: "Проекты и OKR",
      description: "Управление проектами и целями",
      articles: [
        "Создание проектов",
        "Настройка целей (OKR)",
        "Отслеживание прогресса",
        "Управление командой проекта"
      ]
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: "Аналитика и отчеты",
      description: "Анализ производительности команды",
      articles: [
        "Просмотр дашборда команды",
        "Анализ выполнения задач",
        "Экспорт данных",
        "Настройка KPI"
      ]
    },
    {
      icon: <Calendar className="h-6 w-6" />,
      title: "Календарь и планирование",
      description: "Планирование и временные рамки",
      articles: [
        "Использование календаря",
        "Настройка дедлайнов",
        "Планирование спринтов",
        "Управление временем"
      ]
    },
    {
      icon: <Settings className="h-6 w-6" />,
      title: "Настройки и администрирование",
      description: "Конфигурация системы",
      articles: [
        "Настройки организации",
        "Управление правами доступа",
        "Интеграции с внешними сервисами",
        "Безопасность аккаунта"
      ]
    }
  ]

  const faqs = [
    {
      question: "Как создать новую задачу?",
      answer: "Перейдите в раздел 'Задачи' и нажмите кнопку 'Создать задачу'. Заполните необходимые поля: название, описание, назначьте исполнителя и установите дедлайн."
    },
    {
      question: "Можно ли приглашать пользователей в организацию?",
      answer: "Да, администраторы и пользователи с соответствующими правами могут приглашать новых участников через раздел 'Организация' → 'Участники'."
    },
    {
      question: "Как настроить уведомления?",
      answer: "В настройках профиля вы можете выбрать типы уведомлений и способы их получения (email, в приложении)."
    },
    {
      question: "Поддерживается ли работа в офлайн режиме?",
      answer: "Приложение требует подключения к интернету для синхронизации данных, но некоторые функции доступны при временной потере связи."
    },
    {
      question: "Как экспортировать данные?",
      answer: "В разделе аналитики доступны функции экспорта отчетов в форматах PDF и Excel."
    }
  ]

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Справочный центр
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          Найдите ответы на ваши вопросы и изучите возможности платформы
        </p>
        
        {/* Search Bar */}
        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Поиск по справке..."
            className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <Card className="text-center hover:shadow-md transition-shadow">
          <CardHeader>
            <BookOpen className="h-8 w-8 mx-auto text-primary mb-2" />
            <CardTitle className="text-lg">Руководства</CardTitle>
            <CardDescription>
              Пошаговые инструкции по использованию функций
            </CardDescription>
          </CardHeader>
        </Card>
        
        <Card className="text-center hover:shadow-md transition-shadow">
          <CardHeader>
            <Video className="h-8 w-8 mx-auto text-primary mb-2" />
            <CardTitle className="text-lg">Видеоуроки</CardTitle>
            <CardDescription>
              Обучающие видео для быстрого старта
            </CardDescription>
          </CardHeader>
        </Card>
        
        <Card className="text-center hover:shadow-md transition-shadow">
          <CardHeader>
            <MessageSquare className="h-8 w-8 mx-auto text-primary mb-2" />
            <CardTitle className="text-lg">Поддержка</CardTitle>
            <CardDescription>
              Свяжитесь с нашей командой поддержки
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Categories */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Категории</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    {category.icon}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{category.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {category.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {category.articles.slice(0, 4).map((article, articleIndex) => (
                    <li key={articleIndex}>
                      <Link 
                        href="#" 
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        • {article}
                      </Link>
                    </li>
                  ))}
                  {category.articles.length > 4 && (
                    <li>
                      <Link href="#" className="text-sm text-primary hover:underline">
                        Показать все ({category.articles.length})
                      </Link>
                    </li>
                  )}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Часто задаваемые вопросы</h2>
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-primary" />
                  {faq.question}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{faq.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Contact Support */}
      <Card className="text-center bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-xl">Не нашли ответ?</CardTitle>
          <CardDescription className="text-base">
            Наша команда поддержки готова помочь вам
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild>
            <Link href="mailto:support@liderix.com">
              <MessageSquare className="mr-2 h-4 w-4" />
              Написать в поддержку
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">
              Вернуться в приложение
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Breadcrumbs */}
      <div className="mt-8 pt-8 border-t">
        <nav className="text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Главная</Link>
          <span className="mx-2">→</span>
          <span>Справочный центр</span>
        </nav>
      </div>
    </div>
  )
}