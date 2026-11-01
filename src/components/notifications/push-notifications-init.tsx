'use client';

import { useEffect } from 'react';
import { initPushNotifications, cleanupPushNotifications } from '@/lib/notifications';

interface PushNotificationsInitProps {
  userId: string;
}

export function PushNotificationsInit({ userId }: PushNotificationsInitProps) {
  useEffect(() => {
    initPushNotifications(userId);
    return () => {
      cleanupPushNotifications();
    };
  }, [userId]);

  return null;
}
