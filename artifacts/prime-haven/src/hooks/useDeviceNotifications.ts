import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  checkPushSubscriptionStatus,
  subscribeUserToPush,
  unsubscribeUserFromPush,
  triggerLocalNotification,
  isPushSupported,
  getNotificationPermissionState,
} from '@/lib/webPush';

export interface UseDeviceNotificationsReturn {
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
  isSubscribed: boolean;
  loading: boolean;
  enableNotifications: () => Promise<boolean>;
  disableNotifications: () => Promise<boolean>;
  sendTestNotification: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

export function useDeviceNotifications(): UseDeviceNotificationsReturn {
  const { user } = useAuth();
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'superadmin' | 'talent' | 'client'>('talent');

  const userRoleRef = useRef(userRole);
  userRoleRef.current = userRole;

  const refreshStatus = useCallback(async () => {
    const isSupp = isPushSupported();
    setSupported(isSupp);
    if (!isSupp) {
      setPermission('unsupported');
      setIsSubscribed(false);
      setLoading(false);
      return;
    }

    const perm = getNotificationPermissionState();
    setPermission(perm);

    const status = await checkPushSubscriptionStatus(user?.id);
    setIsSubscribed(status.isSubscribed);
    setLoading(false);
  }, [user?.id]);

  // Determine user role (superadmin, talent, client)
  useEffect(() => {
    let mounted = true;
    const fetchRole = async () => {
      if (!user) {
        setUserRole('talent');
        return;
      }
      try {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!mounted) return;

        const role = String(roleData?.role || '').toLowerCase();
        if (role === 'superadmin' || role === 'masteradmin') {
          setUserRole('superadmin');
        } else if (role === 'client') {
          setUserRole('client');
        } else {
          // Check if client in clients table
          const { data: clientData } = await supabase
            .from('clients')
            .select('id')
            .eq('email', user.email || '')
            .maybeSingle();
          if (clientData) {
            setUserRole('client');
          } else {
            setUserRole('talent');
          }
        }
      } catch {
        if (mounted) setUserRole('talent');
      }
    };

    fetchRole();
    return () => {
      mounted = false;
    };
  }, [user]);

  // Initial check & register service worker
  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  // Enable Notifications
  const enableNotifications = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    try {
      const sub = await subscribeUserToPush({
        userId: user?.id,
        email: user?.email,
        role: userRole,
      });

      await refreshStatus();

      if (sub) {
        await triggerLocalNotification('Notifications Active! 🔔', {
          body: `You will now receive instant alerts for new jobs, status updates, and claims on this device.`,
          url: userRole === 'superadmin' ? '/superadmin' : '/dashboard',
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed enabling notifications:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, userRole, refreshStatus]);

  // Disable Notifications
  const disableNotifications = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    try {
      const ok = await unsubscribeUserFromPush(user?.id);
      await refreshStatus();
      return ok;
    } finally {
      setLoading(false);
    }
  }, [user, refreshStatus]);

  // Send Test Notification
  const sendTestNotification = useCallback(async () => {
    await triggerLocalNotification('Prime Haven Test Alert 🚀', {
      body: 'Your device notifications are properly configured and working!',
      url: userRole === 'superadmin' ? '/superadmin' : '/dashboard',
    });
  }, [userRole]);

  // Supabase Real-Time Subscriptions for device alerts
  useEffect(() => {
    if (!user) return;

    const channelName = `ph-device-alerts-${user.id}-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase.channel(channelName);

    // 1. Direct user notifications from database
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      },
      (payload) => {
        const notif = payload.new as any;
        if (notif) {
          triggerLocalNotification(notif.title || 'Prime Haven Update', {
            body: notif.message || 'You have a new notification.',
            url: notif.link || '/dashboard',
            tag: `ph-user-${notif.id}`,
          });
        }
      }
    );

    // 2. New client projects posted
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'client_projects',
      },
      (payload) => {
        const proj = payload.new as any;
        if (!proj) return;
        const currentRole = userRoleRef.current;

        if (currentRole === 'superadmin') {
          // Super admin alert
          triggerLocalNotification('New Job Posted 💼', {
            body: `Client ${proj.client_name || 'Anonymous'} posted: "${proj.title}"`,
            url: '/superadmin/manage-client-projects',
            tag: `ph-job-${proj.id}`,
          });
        } else if (currentRole === 'talent') {
          // Talent alert
          triggerLocalNotification('New Job Available! ✨', {
            body: `A new ${proj.category || 'creative'} project is available to claim: "${proj.title}"`,
            url: '/marketplace',
            tag: `ph-job-${proj.id}`,
          });
        }
      }
    );

    // 3. New job contracts posted
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'job_contracts',
      },
      (payload) => {
        const contract = payload.new as any;
        if (!contract) return;
        const currentRole = userRoleRef.current;

        if (currentRole === 'superadmin') {
          triggerLocalNotification('New Job Contract Posted 💼', {
            body: `New contract: "${contract.title}" (Budget: ${contract.budget || 'Custom'})`,
            url: '/superadmin/contracts',
            tag: `ph-contract-${contract.id}`,
          });
        } else if (currentRole === 'talent') {
          triggerLocalNotification('New Job Available! ✨', {
            body: `New contract available in marketplace: "${contract.title}"`,
            url: '/marketplace',
            tag: `ph-contract-${contract.id}`,
          });
        }
      }
    );

    // 4. Job accepted / claimed (ONLY super admin should be alerted)
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'job_contract_claims',
      },
      (payload) => {
        const claim = payload.new as any;
        if (!claim) return;
        const currentRole = userRoleRef.current;

        // ONLY super admin is alerted when a job is accepted
        if (currentRole === 'superadmin') {
          triggerLocalNotification('Job Accepted! 🎯', {
            body: `A talent has accepted the job contract.`,
            url: '/superadmin/contracts',
            tag: `ph-claim-${claim.id}`,
          });
        }
      }
    );

    // Also monitor client_projects updates when claimed_by is assigned
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'client_projects',
      },
      (payload) => {
        const newRecord = payload.new as any;
        const oldRecord = payload.old as any;
        if (!newRecord) return;
        const currentRole = userRoleRef.current;

        // Check if project was just claimed/accepted
        const wasClaimed =
          (!oldRecord?.claimed_by && !!newRecord.claimed_by) ||
          (!oldRecord?.accepted_designer_id && !!newRecord.accepted_designer_id);

        if (wasClaimed && currentRole === 'superadmin') {
          triggerLocalNotification('Job Accepted! 🎯', {
            body: `Project "${newRecord.title}" was accepted by a designer.`,
            url: '/superadmin/manage-client-projects',
            tag: `ph-claimed-${newRecord.id}`,
          });
        }
      }
    );

    // 5. Submissions status updates for clients (Approved, Rejected, Correction Requested)
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'submissions',
      },
      (payload) => {
        const sub = payload.new as any;
        const oldSub = payload.old as any;
        if (!sub) return;
        const currentRole = userRoleRef.current;

        if (currentRole === 'client') {
          // Check status transition
          const status = sub.status;
          const oldStatus = oldSub?.status;

          if (status !== oldStatus) {
            if (status === 'approved' || sub.ph_approved || sub.client_accepted) {
              triggerLocalNotification('Project Approved! 🎉', {
                body: `Your project "${sub.project_name || 'Design'}" has been approved and completed.`,
                url: '/client/projects-review',
                tag: `ph-sub-appr-${sub.id}`,
              });
            } else if (status === 'rejected' || status === 'client_rejected') {
              triggerLocalNotification('Project Submission Update ⚠️', {
                body: `Submission for "${sub.project_name || 'Project'}" was rejected. ${sub.rejection_reason || ''}`,
                url: '/client/projects-review',
                tag: `ph-sub-rej-${sub.id}`,
              });
            } else if (status === 'correction_requested') {
              triggerLocalNotification('Correction Requested 📝', {
                body: `Corrections requested for "${sub.project_name || 'Project'}": ${sub.rejection_reason || 'Please review notes.'}`,
                url: '/client/projects-review',
                tag: `ph-sub-corr-${sub.id}`,
              });
            }
          }
        }
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    supported,
    permission,
    isSubscribed,
    loading,
    enableNotifications,
    disableNotifications,
    sendTestNotification,
    refreshStatus,
  };
}
