import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDeviceNotifications } from '@/hooks/useDeviceNotifications';
import { getOrRegisterServiceWorker, isPushSupported } from '@/lib/webPush';

/**
 * Global background sync component for device notifications and Web Push.
 * Maintains real-time Supabase subscriptions and ensures Service Worker registration
 * across all client and admin views. Respects the user's explicit on/off preferences.
 */
export const DeviceNotificationSync: React.FC = () => {
  const { user } = useAuth();
  const { isSubscribed, enableNotifications } = useDeviceNotifications();

  useEffect(() => {
    if (!isPushSupported()) return;

    // Register service worker early so incoming Web Push messages can be received
    getOrRegisterServiceWorker().catch(() => {});

    // Only auto-sync push subscription if user explicitly turned on alerts for their account
    if (user && !isSubscribed && Notification.permission === 'granted') {
      const isExplicitlyDisabled = localStorage.getItem(`ph_device_alerts_${user.id}`) === 'false';
      const isExplicitlyEnabled = localStorage.getItem(`ph_device_alerts_${user.id}`) === 'true';

      if (isExplicitlyEnabled && !isExplicitlyDisabled) {
        enableNotifications().catch(() => {});
      }
    }
  }, [user, isSubscribed, enableNotifications]);

  return null;
};

export default DeviceNotificationSync;
