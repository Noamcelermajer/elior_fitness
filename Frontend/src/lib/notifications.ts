/**
 * Push notification utilities
 */

/**
 * Request notification permission from the user
 * @returns Promise<NotificationPermission>
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  // Request permission
  const permission = await Notification.requestPermission();
  return permission;
};

/**
 * Check if notification permission is granted
 * @returns boolean
 */
export const hasNotificationPermission = (): boolean => {
  return 'Notification' in window && Notification.permission === 'granted';
};

/**
 * Show a browser notification
 * @param title - Notification title
 * @param options - Notification options
 */
export const showNotification = (
  title: string,
  options: NotificationOptions = {}
): void => {
  if (!hasNotificationPermission()) {
    return;
  }

  const notification = new Notification(title, {
    icon: '/favicon/android-chrome-192x192.png',
    badge: '/favicon/android-chrome-192x192.png',
    ...options
  });

  // Auto-close after 5 seconds
  setTimeout(() => {
    notification.close();
  }, 5000);

  // Handle click to focus window
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
};

/**
 * Show a chat message notification
 * @param senderName - Name of the message sender
 * @param message - Message content
 */
export const showChatNotification = (senderName: string, message: string): void => {
  showNotification(`הודעה חדשה מ-${senderName}`, {
    body: message.length > 100 ? message.substring(0, 100) + '...' : message,
    tag: 'chat-message',
    requireInteraction: false
  });
};

