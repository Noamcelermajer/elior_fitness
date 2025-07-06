import React, { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { ScrollArea } from './ui/scroll-area';
import { NotificationToast } from './NotificationToast';

export const NotificationBell: React.FC = () => {
  const { notifications, removeNotification, clearAll } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.length;

  const handleClearAll = () => {
    clearAll();
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear all
            </Button>
          )}
        </div>
        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No notifications</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {notifications.map((notification) => (
                <div key={notification.id} className="border rounded-lg">
                  <NotificationToast
                    notification={notification}
                    onRemove={removeNotification}
                  />
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}; 