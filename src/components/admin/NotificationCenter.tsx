import { useState, useEffect } from 'react';
import { Bell, FileCheck, DollarSign, ShoppingCart, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface Notification {
  id: string;
  type: 'submission' | 'payment' | 'order';
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
}

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const loadRecentActivity = async () => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [{ data: subs }, { data: payments }, { data: orders }] = await Promise.all([
      supabase.from('submissions').select('id, project_name, designer_id, created_at, status').gte('created_at', since).order('created_at', { ascending: false }).limit(10),
      supabase.from('payments').select('id, amount, type, status, created_at').gte('created_at', since).order('created_at', { ascending: false }).limit(10),
      supabase.from('client_orders').select('id, client_name, service_type, created_at').gte('created_at', since).order('created_at', { ascending: false }).limit(10),
    ]);

    const readIds = JSON.parse(localStorage.getItem('admin_read_notifications') || '[]');

    const notifs: Notification[] = [
      ...(subs || []).map(s => ({
        id: `sub_${s.id}`,
        type: 'submission' as const,
        title: 'New Submission',
        description: `${s.project_name} — ${s.status}`,
        timestamp: s.created_at,
        read: readIds.includes(`sub_${s.id}`),
      })),
      ...(payments || []).map(p => ({
        id: `pay_${p.id}`,
        type: 'payment' as const,
        title: 'Payment Received',
        description: `GH₵${Number(p.amount).toFixed(2)} — ${p.type} (${p.status})`,
        timestamp: p.created_at,
        read: readIds.includes(`pay_${p.id}`),
      })),
      ...(orders || []).map(o => ({
        id: `order_${o.id}`,
        type: 'order' as const,
        title: 'New Client Order',
        description: `${o.client_name} — ${o.service_type}`,
        timestamp: o.created_at,
        read: readIds.includes(`order_${o.id}`),
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    setNotifications(notifs);
  };

  useEffect(() => {
    loadRecentActivity();

    // Realtime subscriptions
    const channel = supabase
      .channel('admin-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'submissions' }, () => loadRecentActivity())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'payments' }, () => loadRecentActivity())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'client_orders' }, () => loadRecentActivity())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const markAllRead = () => {
    const allIds = notifications.map(n => n.id);
    localStorage.setItem('admin_read_notifications', JSON.stringify(allIds));
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const getIcon = (type: string) => {
    if (type === 'submission') return <FileCheck className="w-3.5 h-3.5 text-blue-500" />;
    if (type === 'payment') return <DollarSign className="w-3.5 h-3.5 text-emerald-500" />;
    return <ShoppingCart className="w-3.5 h-3.5 text-purple-500" />;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative h-9 w-9 p-0">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
        <div className="flex items-center justify-between p-3 border-b border-border/50">
          <h3 className="text-sm font-bold">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-6 text-[10px] text-primary" onClick={markAllRead}>
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length > 0 ? (
            <div className="divide-y divide-border/30">
              {notifications.slice(0, 20).map((notif) => (
                <div key={notif.id} className={`p-3 flex items-start gap-2.5 transition-colors ${!notif.read ? 'bg-primary/5' : ''}`}>
                  <div className="mt-0.5">{getIcon(notif.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium ${!notif.read ? 'text-foreground' : 'text-muted-foreground'}`}>{notif.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{notif.description}</p>
                    <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1 mt-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {format(new Date(notif.timestamp), 'MMM d, HH:mm')}
                    </p>
                  </div>
                  {!notif.read && <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No recent notifications
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationCenter;
