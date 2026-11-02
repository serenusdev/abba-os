'use client';

import { useEffect } from 'react';
import { initPushNotifications, cleanupPushNotifications } from '@/lib/notifications';
import { touchPresenceAction } from '@/modules/people/actions';

interface PushNotificationsInitProps {
  userId: string;
}

export function PushNotificationsInit({ userId }: PushNotificationsInitProps) {
  useEffect(() => {
    initPushNotifications(userId);
    void touchPresenceAction();
    const heartbeat = window.setInterval(() => {
      void touchPresenceAction();
    }, 5 * 60 * 1000);
    return () => {
      window.clearInterval(heartbeat);
      cleanupPushNotifications();
    };
  }, [userId]);

  return null;
}
