// Prime Haven Web Push API & Device Notifications Utility
import { supabase } from '@/integrations/supabase/client';

export const VAPID_PUBLIC_KEY =
  'BHZozIpQIh0Xspl-iFX2xptG7G7wXJ7l5KDtkn17tTIkgHJL3tOHlZRC6CK_KYRncG3-2_etKbvb8QXHTfsXRtU';

export interface PushStatus {
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
  isSubscribed: boolean;
}

export type PlatformNotificationEvent =
  | {
      event: 'project_posted';
      projectId: string;
      title: string;
      clientName: string;
      category?: string;
      budget?: string;
    }
  | {
      event: 'job_accepted';
      jobId: string;
      title: string;
      talentName?: string;
      talentId?: string;
    }
  | {
      event: 'client_job_status';
      submissionId?: string;
      projectId?: string;
      clientEmail?: string;
      clientId?: string;
      clientUserId?: string;
      status: 'approved' | 'rejected' | 'correction_requested';
      title: string;
      reason?: string;
    }
  | {
      event: 'test_push';
      userId?: string;
      email?: string;
      role?: string;
    };

/**
 * Converts a base64 URL-safe string to a Uint8Array for PushManager subscription.
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check whether Web Push and Service Workers are supported in the current environment.
 */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Get current browser notification permission.
 */
export function getNotificationPermissionState(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Register or get the current Service Worker registration.
 */
export async function getOrRegisterServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;

  try {
    const existing = await navigator.serviceWorker.getRegistration('/');
    if (existing) {
      return existing;
    }
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    return reg;
  } catch (err) {
    console.warn('Service worker registration error:', err);
    return null;
  }
}

/**
 * Play a gentle notification sound effect for audible alert on device.
 */
export function playNotificationSound(): void {
  try {
    if (typeof window === 'undefined' || !window.AudioContext) return;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5

    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.36);
  } catch {
    // Ignore audio autoplay restrictions
  }
}

/**
 * Request permission from the user for notifications.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  const perm = await Notification.requestPermission();
  return perm;
}

/**
 * Subscribe user's current device to Web Push and save subscription on backend.
 */
export async function subscribeUserToPush(opts?: {
  userId?: string;
  email?: string;
  role?: string;
}): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    return null;
  }

  const reg = await getOrRegisterServiceWorker();
  if (!reg) return null;

  try {
    let sub = await reg.pushManager.getSubscription();

    if (!sub) {
      const appServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey,
      });
    }

    if (sub) {
      // Send subscription to backend server
      const payload = {
        subscription: sub.toJSON(),
        userId: opts?.userId || null,
        email: opts?.email || null,
        role: opts?.role || 'talent',
        userAgent: navigator.userAgent,
        createdAt: new Date().toISOString(),
      };

      await fetch('/api/push-subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch((e) => console.warn('Failed saving push subscription to /api/push-subscriptions:', e));

      localStorage.setItem('ph_push_notifications_enabled', 'true');
      if (opts?.userId) {
        localStorage.setItem(`ph_device_alerts_${opts.userId}`, 'true');
      }
    }

    return sub;
  } catch (err) {
    console.error('Error subscribing to Web Push:', err);
    return null;
  }
}

/**
 * Unsubscribe user from Web Push on this device.
 */
export async function unsubscribeUserFromPush(userId?: string): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const reg = await navigator.serviceWorker.getRegistration('/');
    if (reg) {
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe().catch(() => {});
        await fetch('/api/push-unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint, userId }),
        }).catch(() => {});
      }
    }
    localStorage.setItem('ph_push_notifications_enabled', 'false');
    if (userId) {
      localStorage.setItem(`ph_device_alerts_${userId}`, 'false');
    }
    return true;
  } catch (err) {
    console.error('Error unsubscribing from Web Push:', err);
    return false;
  }
}

/**
 * Check if the user is currently subscribed on this device.
 */
export async function checkPushSubscriptionStatus(userId?: string): Promise<PushStatus> {
  if (!isPushSupported()) {
    return { supported: false, permission: 'unsupported', isSubscribed: false };
  }

  const permission = Notification.permission;
  if (permission !== 'granted') {
    return { supported: true, permission, isSubscribed: false };
  }

  try {
    const reg = await navigator.serviceWorker.getRegistration('/');
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (!sub) {
      return { supported: true, permission, isSubscribed: false };
    }

    if (userId && localStorage.getItem(`ph_device_alerts_${userId}`) === 'false') {
      return { supported: true, permission, isSubscribed: false };
    }

    if (localStorage.getItem('ph_push_notifications_enabled') === 'false') {
      return { supported: true, permission, isSubscribed: false };
    }

    return {
      supported: true,
      permission,
      isSubscribed: true,
    };
  } catch {
    return { supported: true, permission, isSubscribed: false };
  }
}

/**
 * Trigger an immediate native device notification (via Service Worker or Notification API).
 */
export async function triggerLocalNotification(
  title: string,
  options?: NotificationOptions & { url?: string; sound?: boolean }
): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  if (options?.sound !== false) {
    playNotificationSound();
  }

  const notificationOptions: NotificationOptions = {
    body: options?.body || '',
    icon: options?.icon || '/logo-512.png',
    badge: options?.badge || '/favicon.png',
    vibrate: options?.vibrate || [200, 100, 200],
    tag: options?.tag || `ph-alert-${Date.now()}`,
    data: { url: options?.url || '/' },
    ...options,
  };

  try {
    const reg = await navigator.serviceWorker.getRegistration('/');
    if (reg && 'showNotification' in reg) {
      await reg.showNotification(title, notificationOptions);
      return;
    }
  } catch {
    // Fall back to window Notification
  }

  try {
    const n = new Notification(title, notificationOptions);
    n.onclick = () => {
      n.close();
      if (options?.url) {
        window.focus();
        window.location.href = options.url;
      }
    };
  } catch {
    // Ignore Notification constructor error on some mobile browsers
  }
}

/**
 * Central event dispatcher to alert Super Admins, Talents, or Clients via backend Web Push and database records.
 */
export async function dispatchPlatformNotification(
  payload: PlatformNotificationEvent
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/notify-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      // Fallback direct invocation via supabase functions
      await supabase.functions.invoke('notify-event', { body: payload }).catch(() => {});
    }

    return { success: true };
  } catch (err: any) {
    console.error('Failed dispatching platform notification:', err);
    return { success: false, error: err?.message || 'Dispatch error' };
  }
}
