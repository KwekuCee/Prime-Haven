import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, CheckCheck, ExternalLink, X, Info, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNotifications, AppNotification } from '@/hooks/useNotifications';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';

const TYPE_ICONS: Record<string, React.ElementType> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

const TYPE_COLORS: Record<string, string> = {
  info: 'text-blue-400',
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  error: 'text-red-400',
};

const NotificationItem = ({ n, onRead }: { n: AppNotification; onRead: (id: string) => void }) => {
  const navigate = useNavigate();
  const Icon = TYPE_ICONS[n.type] || Info;

  const handleClick = () => {
    onRead(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      onClick={handleClick}
      className={`flex items-start gap-3 p-3 rounded-xl transition-colors cursor-pointer group
        ${n.read ? 'opacity-60 hover:opacity-100' : 'bg-primary/5 border border-primary/10'}
      `}
    >
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-muted/30`}>
        <Icon className={`w-3.5 h-3.5 ${TYPE_COLORS[n.type] || 'text-muted-foreground'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold leading-tight">{n.title}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">{format(new Date(n.created_at), 'MMM d, HH:mm')}</p>
      </div>
      {!n.read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
      {n.link && <ExternalLink className="w-3 h-3 text-muted-foreground/40 flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />}
    </motion.div>
  );
};

const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const ref = useRef<HTMLDivElement>(null);

  useOnClickOutside(ref, () => setOpen(false));

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="w-8 h-8 relative"
        onClick={() => setOpen(o => !o)}
        id="notification-bell-btn"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-[9px] text-primary-foreground flex items-center justify-center font-bold leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-10 w-80 z-50 rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl shadow-black/30 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-bold">Notifications</span>
                {unreadCount > 0 && (
                  <Badge className="h-4 min-w-[16px] px-1 text-[9px] font-bold rounded-full">{unreadCount}</Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 gap-1" onClick={markAllAsRead}>
                    <CheckCheck className="w-3 h-3" /> All read
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setOpen(false)}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[380px] overflow-y-auto p-2 space-y-1">
              <AnimatePresence initial={false}>
                {notifications.length === 0 ? (
                  <div className="py-10 text-center">
                    <BellOff className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <NotificationItem key={n.id} n={n} onRead={markAsRead} />
                  ))
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
