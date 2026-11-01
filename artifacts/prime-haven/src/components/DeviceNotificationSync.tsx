import React, { useEffect } from 'react';
import { useDeviceNotifications } from '@/hooks/useDeviceNotifications';
import { getOrRegisterServiceWorker, isPushSupported } from '@/lib/webPush';

/**
 * Global background sync component for device notifications and Web Push.
 * Maintains real-time Supabase subscriptions and ensures Service Worker registration
 * across all client and admin views.
 */
export const DeviceNotificationSync: React.FC = () => {
  // Mount the real-time Supabase listeners across the entire session
  const { supported, permission, isSubscribed, enableNotifications } = useDeviceNotifications();

  useEffect(() => {
    if (!isPushSupported()) return;

    // Register service worker early so incoming Web Push messages can be received
    getOrRegisterServiceWorker().catch(() => {});

    // If browser already granted permission but subscription is not yet registered on backend,
    // automatically sync push subscription
    if (permission === 'granted' && !isSubscribed) {
      enableNotifications().catch(() => {});
    }
  }, [permission, isSubscribed, enableNotifications]);

  return null;
};

export default DeviceNotificationSync;
