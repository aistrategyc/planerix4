// components/organization/OrganizationNotifications.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Bell, 
  X, 
  UserPlus, 
  Users, 
  AlertCircle, 
  CheckCircle,
  Clock
} from "lucide-react";

interface Notification {
  id: string;
  type: 'invite_pending' | 'member_joined' | 'department_created' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

interface OrganizationNotificationsProps {
  orgId: string;
  limit?: number;
}

export function OrganizationNotifications({ orgId, limit = 5 }: OrganizationNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // TODO: Заменить на реальные данные из API
  useEffect(() => {
    const mockNotifications = [
      {
        id: '1',
        type: 'invite_pending',
        title: 'Ожидающие приглашения',
        message: '3 приглашения ожидают ответа',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        read: false
      },
      {
        id: '2',
        type: 'member_joined',
        title: 'Новый участник',
        message: 'Анна Петрова присоединилась к организации',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        read: false
      },
      {
        id: '3',
        type: 'department_created',
        title: 'Создан отдел',
        message: 'Отдел "Разработка" успешно создан',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        read: true
      }
    ] as Notification[];
    const slicedNotifications = mockNotifications.slice(0, limit);

    setTimeout(() => {
      setNotifications(slicedNotifications);
      setLoading(false);
    }, 500);
  }, [orgId, limit]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'invite_pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'member_joined':
        return <UserPlus className="w-4 h-4 text-green-500" />;
      case 'department_created':
        return <Users className="w-4 h-4 text-blue-500" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'info':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'только что';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}м назад`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}ч назад`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days}д назад`;
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  };

  const dismissNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="w-5 h-5" />
            Уведомления
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (notifications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="w-5 h-5" />
            Уведомления
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Bell className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Нет новых уведомлений</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="w-5 h-5" />
            Уведомления
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
            >
              Прочитать все
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div 
              key={notification.id} 
              className={`p-3 rounded-lg border transition-colors ${
                notification.read ? 'bg-gray-50' : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className={`text-sm font-medium ${!notification.read ? 'text-blue-900' : 'text-gray-900'}`}>
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                    <p className="text-xs text-gray-600">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatTimeAgo(notification.timestamp)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!notification.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsRead(notification.id)}
                      className="h-6 w-6 p-0"
                    >
                      <CheckCircle className="w-3 h-3" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => dismissNotification(notification.id)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {notifications.length >= limit && (
          <div className="mt-4 text-center">
            <Button variant="ghost" size="sm">
              Показать все уведомления
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
