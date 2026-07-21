/**
 * Browser Web Push Notifications & Audience Filtering Utility
 * Handles HTML5 Notification API permissions, native push popups, and audience filtering.
 */

export const isPushSupported = () => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

export const getNotificationPermission = () => {
  if (!isPushSupported()) return 'denied';
  return Notification.permission;
};

export const requestNotificationPermission = async () => {
  if (!isPushSupported()) return 'denied';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return 'denied';
  }
};

export const sendPushNotification = (title, options = {}) => {
  if (!isPushSupported() || Notification.permission !== 'granted') return null;

  try {
    const defaultOptions = {
      icon: '/madrasa-pwa-icon.png',
      badge: '/rms-madrasa-favicon.png',
      vibrate: [200, 100, 200],
      ...options,
    };
    return new Notification(title, defaultOptions);
  } catch (err) {
    console.error('Error triggering push notification:', err);
    return null;
  }
};

/**
 * Filters announcements for a parent based on their children's assigned class levels.
 * Returns items where target_class === 'All' OR target_class matches one of parent's children classes.
 */
export const filterAnnouncementsForParent = (allAnnouncements = [], childClasses = []) => {
  if (!allAnnouncements || allAnnouncements.length === 0) return [];
  
  const normalizedChildClasses = childClasses.map(c => (c || '').trim().toLowerCase());

  return allAnnouncements.filter(item => {
    const target = (item.target_class || 'All').trim().toLowerCase();
    if (target === 'all' || target === 'general') return true;
    return normalizedChildClasses.includes(target);
  });
};
