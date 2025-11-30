import { useState } from 'react';
import { router } from '@inertiajs/react';
import { ArrowLeft, Bell, CheckCheck, Coins } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import DefaultAvatar from '../components/DefaultAvatar';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  transaction_id?: number | null;
}

interface NotificationsProps {
  notifications: Notification[];
  unread_count: number;
}

function Notifications({ notifications = [], unread_count = 0 }: NotificationsProps) {
  const [localNotifications, setLocalNotifications] = useState(notifications);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'À l\'instant';
    } else if (diffMins < 60) {
      return `Il y a ${diffMins} min`;
    } else if (diffHours < 24) {
      return `Il y a ${diffHours}h`;
    } else if (diffDays === 1) {
      return 'Hier';
    } else if (diffDays < 7) {
      return `Il y a ${diffDays} jours`;
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }
  };

  const handleMarkAsRead = async (id: number) => {
    router.post(`/notifications/${id}/read`, {}, {
      onSuccess: () => {
        setLocalNotifications(prev => 
          prev.map(notif => 
            notif.id === id ? { ...notif, is_read: true } : notif
          )
        );
      },
    });
  };

  const handleMarkAllAsRead = async () => {
    router.post('/notifications/read-all', {}, {
      onSuccess: () => {
        setLocalNotifications(prev => 
          prev.map(notif => ({ ...notif, is_read: true }))
        );
      },
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'money_received':
        return <Coins className="w-5 h-5 text-green-500" />;
      case 'money_sent':
        return <Coins className="w-5 h-5 text-orange-500" />;
      default:
        return <Bell className="w-5 h-5 text-blue-500" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'money_received':
        return 'bg-green-50';
      case 'money_sent':
        return 'bg-orange-50';
      default:
        return 'bg-blue-50';
    }
  };

  const unreadNotifications = localNotifications.filter(n => !n.is_read);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.visit('/dashboard')}
              className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Notifications</h1>
              {unreadNotifications.length > 0 && (
                <p className="text-xs text-gray-500">
                  {unreadNotifications.length} non lue{unreadNotifications.length > 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
          {unreadNotifications.length > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-2 px-3 py-2 text-sm text-[#FF8C00] hover:bg-gray-100 rounded-lg transition-colors"
              title="Tout marquer comme lu"
            >
              <CheckCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Tout lire</span>
            </button>
          )}
        </div>
      </header>

      {/* Notifications List */}
      <div className="flex justify-center items-center space-y-3">
        {localNotifications.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium mb-2">Aucune notification</p>
            <p className="text-sm text-gray-400">
              Vous recevrez des notifications lorsque vous recevrez de l'argent ou pour d'autres activités importantes.
            </p>
          </div>
        ) : (
          localNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-white rounded-2xl p-2 transition-all ${
                notification.is_read 
                  ? 'opacity-75' 
                  : `${getNotificationColor(notification.type)} font-semibold`
              }`}
              onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
            >
              <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                  notification.type === 'money_received' ? 'bg-green-100' :
                  notification.type === 'money_sent' ? 'bg-orange-100' :
                  'bg-blue-100'
                }`}>
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className={`text-base font-semibold mb-1 ${
                        notification.is_read ? 'text-gray-700' : 'text-gray-900'
                      }`}>
                        {notification.title}
                      </h3>
                      <p className={`text-sm mb-2 ${
                        notification.is_read ? 'text-gray-600' : 'text-gray-800'
                      }`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDate(notification.created_at)}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <div className="w-2 h-2 bg-[#FF8C00] rounded-full flex-shrink-0 mt-2"></div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}

export default Notifications;

