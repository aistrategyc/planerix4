// src/app/organization/components/RecentActivity.tsx
"use client";

import { useState, useEffect } from "react";
import { 
  Activity,
  UserPlus,
  Plus,
  Edit,
  Settings,
  Users
} from "lucide-react";

interface ActivityItem {
  id: string;
  type: 'member_joined' | 'department_created' | 'organization_updated' | 'member_invited';
  user?: {
    name: string;
    avatar?: string;
  };
  description: string;
  timestamp: string;
}

interface RecentActivityProps {
  orgId: string;
  limit?: number;
}

export function RecentActivity({ orgId, limit = 10 }: RecentActivityProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  // TODO: Заменить на реальные данные из API
  useEffect(() => {
    const mockActivities = [
      {
        id: '1',
        type: 'member_joined',
        user: { name: 'Анна Петрова' },
        description: 'присоединилась к организации',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '2',
        type: 'department_created',
        user: { name: 'Михаил Иванов' },
        description: 'создал отдел "Разработка"',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '3',
        type: 'member_invited',
        user: { name: 'Елена Сидорова' },
        description: 'пригласила нового участника',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '4',
        type: 'organization_updated',
        user: { name: 'Дмитрий Козлов' },
        description: 'обновил настройки организации',
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()
      }
    ] as ActivityItem[]; // type assertion
    const slicedActivities = mockActivities.slice(0, limit);

    setTimeout(() => {
      setActivities(slicedActivities);
      setLoading(false);
    }, 500);
  }, [orgId, limit]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'member_joined':
        return <UserPlus className="w-4 h-4 text-green-600" />;
      case 'department_created':
        return <Plus className="w-4 h-4 text-blue-600" />;
      case 'organization_updated':
        return <Edit className="w-4 h-4 text-orange-600" />;
      case 'member_invited':
        return <Users className="w-4 h-4 text-purple-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'только что';
    } else if (diffInHours < 24) {
      return `${diffInHours}ч назад`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}д назад`;
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-base font-medium mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-500" />
          Последняя активность
        </h3>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h3 className="text-base font-medium mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-purple-500" />
        Последняя активность
      </h3>
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
              {getActivityIcon(activity.type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <span className="font-medium">{activity.user?.name}</span>
                {' '}
                <span className="text-gray-600">{activity.description}</span>
              </p>
              <p className="text-xs text-gray-500">
                {formatTimeAgo(activity.timestamp)}
              </p>
            </div>
          </div>
        ))}
        
        {activities.length === 0 && (
          <div className="text-center py-6">
            <Activity className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Нет активности</p>
          </div>
        )}
      </div>
    </div>
  );
}