import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Upload, Wallet, Settings, LogOut, Menu, X, User,
  MessageSquare, Download, Shield, ChevronLeft, PlusCircle, CheckCircle, LifeBuoy, Users, Presentation, ArrowLeft, TrendingUp, ShoppingBag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import BrandLogo from '@/components/BrandLogo';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import NotificationBell from '@/components/NotificationBell';
import { useNotifications } from '@/hooks/useNotifications';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

// navItems logic moved inside component

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string; professional_title: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const unreadMessages = useUnreadMessages();
  const { unreadCount: unreadNotifications } = useNotifications();

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      const { data: clientOrder } = await supabase.from('client_orders').select('id').eq('client_email', user.email ?? '').limit(1).maybeSingle();
      const { data: clientRecord } = await supabase.from('clients').select('id').eq('email', user.email ?? '').limit(1).maybeSingle();
      if (clientOrder || clientRecord) {
        setIsClient(true);
      }

      const [profileResult, designerResult, roleResult] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
        supabase.from('designer_details').select('professional_title').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle()
      ]);
      if (profileResult.data || designerResult.data) {
        setProfile({
          full_name: profileResult.data?.full_name || user.email?.split('@')[0] || 'Designer',
          professional_title: designerResult.data?.professional_title || 'Designer'
        });
      }
      if (roleResult.data && (roleResult.data.role === 'superadmin' || roleResult.data.role === 'masteradmin')) {
        setIsAdmin(true);
      }
    };
    loadProfile();
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const effectiveIsClient = isClient || location.pathname.startsWith('/client');
  const isAffiliateMode = location.pathname.startsWith('/affiliate');

  let navItems = [];
  if (isAffiliateMode) {
    navItems = [
      { label: 'Overview', icon: LayoutDashboard, path: '/affiliate/dashboard' },
      { label: 'Referrals', icon: Users, path: '/affiliate/dashboard#referrals' },
      { label: 'Payouts', icon: Wallet, path: '/affiliate/dashboard#payouts' },
      { label: 'Marketing Assets', icon: Presentation, path: '/affiliate/dashboard#assets' },
      { label: 'Back to App', icon: ArrowLeft, path: effectiveIsClient ? '/client/dashboard' : '/dashboard' },
    ];
  } else if (effectiveIsClient) {
    navItems = [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/client/dashboard' },
      { label: 'Projects Submitted', icon: CheckCircle, path: '/client/projects' },
      { label: 'Start a Project', icon: PlusCircle, path: '/client/start-project' },
      { label: 'Talk to the Designer', icon: MessageSquare, path: '/client/messages' },
      { label: 'Payments', icon: Wallet, path: '/client/payments' },
      { label: 'Support Desk', icon: LifeBuoy, path: '/client/support' },
      { label: 'Settings', icon: Settings, path: '/client/settings' },
    ];
  } else {
    navItems = [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
      { label: 'Marketplace', icon: ShoppingBag, path: '/marketplace' },
      { label: 'Submit Work', icon: Upload, path: '/submit-work' },
      { label: 'Partner Program', icon: TrendingUp, path: '/affiliate/dashboard' },
      { label: 'Talk to the Designer', icon: MessageSquare, path: '/messages' },
      { label: 'Payments', icon: Wallet, path: '/payments' },
      { label: 'Settings', icon: Settings, path: '/settings' },
      { label: 'Install App', icon: Download, path: '/install' },
    ];
  }

  const pageTitle = navItems.find(item => item.path === location.pathname)?.label || 'Dashboard';

  return (
    <div className="min-h-screen bg-transparent flex w-full relative z-0">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 
        ${collapsed ? 'w-[72px]' : 'w-64'} 
        bg-sidebar-background border-r border-sidebar-border
        transform transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={`h-16 border-b border-sidebar-border flex items-center ${collapsed ? 'justify-center px-2' : 'justify-between px-5'}`}>
            {!collapsed && (
              <Link to="/">
                <BrandLogo height={40} />
              </Link>
            )}
            {collapsed && (
              <Link to="/" className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                PH
              </Link>
            )}
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex w-7 h-7 rounded-md items-center justify-center text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
            >
              <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-4 px-3 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const showBadge = (item.path === '/messages' || item.path === '/client/messages') && unreadMessages > 0;
              const showNotifBadge = item.path === '/marketplace' && unreadNotifications > 0;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  title={collapsed ? item.label : undefined}
                  className={`
                    group relative flex items-center gap-3 rounded-xl transition-all duration-200
                    ${collapsed ? 'justify-center px-0 py-3' : 'px-3.5 py-2.5'}
                    ${isActive
                      ? 'bg-primary/10 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.2)]'
                      : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    }
                  `}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-primary' : ''}`} />
                  {!collapsed && <span className="text-sm font-medium flex-1">{item.label}</span>}
                  {showBadge && (
                    <Badge variant="default" className={`h-5 min-w-[20px] px-1.5 text-[10px] font-bold rounded-full ${collapsed ? 'absolute -top-1 -right-1' : ''}`}>
                      {unreadMessages}
                    </Badge>
                  )}
                  {showNotifBadge && (
                    <Badge variant="default" className={`h-5 min-w-[20px] px-1.5 text-[10px] font-bold rounded-full bg-amber-500 ${collapsed ? 'absolute -top-1 -right-1' : ''}`}>
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className={`border-t border-sidebar-border ${collapsed ? 'p-2' : 'p-3'}`}>
            {isAdmin && !collapsed && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start mb-2 text-primary hover:bg-primary/10 text-xs"
                onClick={() => navigate('/superadmin')}
              >
                <Shield className="w-4 h-4 mr-2" />
                Superadmin
              </Button>
            )}
            {isAdmin && collapsed && (
              <Button
                variant="ghost"
                size="icon"
                className="w-full mb-2 text-primary hover:bg-primary/10"
                onClick={() => navigate('/superadmin')}
                title="Superadmin"
              >
                <Shield className="w-4 h-4" />
              </Button>
            )}

            <Link
              to={effectiveIsClient ? "/client/profile" : "/edit-profile"}
              className={`
                flex items-center gap-3 rounded-xl hover:bg-sidebar-accent transition-colors
                ${collapsed ? 'justify-center p-2' : 'p-2.5'}
              `}
              title={collapsed ? profile?.full_name : undefined}
            >
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                {getInitials(profile?.full_name || 'PH')}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-xs truncate text-sidebar-foreground">{profile?.full_name || 'User'}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {effectiveIsClient ? 'Client Account' : (profile?.professional_title || 'Designer')}
                  </p>
                </div>
              )}
            </Link>

            <button
              onClick={handleLogout}
              className={`
                flex items-center gap-3 w-full rounded-xl text-muted-foreground 
                hover:bg-destructive/10 hover:text-destructive transition-colors mt-1
                ${collapsed ? 'justify-center p-2' : 'px-3 py-2'}
              `}
              title={collapsed ? 'Logout' : undefined}
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span className="text-xs font-medium">Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top Bar */}
        <header className="h-14 border-b border-white/5 flex items-center justify-between px-4 lg:px-6 bg-background/40 backdrop-blur-3xl sticky top-0 z-30 shadow-lg">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-foreground hover:text-primary transition-colors">
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base font-heading font-bold">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/messages"
              className="relative group"
              title="Talk to the Designer"
            >
              <Button variant="ghost" size="icon" className="w-8 h-8">
                <MessageSquare className="w-4 h-4" />
              </Button>
              {unreadMessages > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-[9px] text-primary-foreground flex items-center justify-center font-bold">
                  {unreadMessages}
                </span>
              )}
              <span className="absolute top-10 right-0 px-2 py-1 bg-popover text-[10px] text-popover-foreground rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-border shadow-sm">
                Talk to the Designer
              </span>
            </Link>
            <NotificationBell />
            <Link to={effectiveIsClient ? "/client/profile" : "/edit-profile"}>
              <Button variant="ghost" size="icon" className="w-8 h-8">
                <User className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </header>

        {/* Page Content with Mobile Bottom Clearance */}
        <main className="flex-1 overflow-auto pb-24 lg:pb-0">
          {children}
        </main>

        {/* Native Mobile App Bottom Tab Bar */}
        <nav
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-2xl border-t border-border/80 shadow-[0_-4px_25px_rgba(0,0,0,0.06)] px-2 pt-1 pb-safe"
          aria-label="Mobile Dashboard Navigation"
        >
          <div className="grid grid-cols-5 items-center h-14">
            {effectiveIsClient ? (
              <>
                <Link
                  to="/client/dashboard"
                  className={`flex flex-col items-center justify-center h-full gap-1 active:scale-95 transition-transform ${
                    location.pathname === '/client/dashboard' ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="text-[10px] tracking-tight">Home</span>
                </Link>

                <Link
                  to="/client/projects"
                  className={`flex flex-col items-center justify-center h-full gap-1 active:scale-95 transition-transform ${
                    location.pathname === '/client/projects' ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-[10px] tracking-tight">Projects</span>
                </Link>

                <Link
                  to="/client/start-project"
                  className="flex flex-col items-center justify-center h-full gap-0.5 -mt-3 group"
                >
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-[0_0_20px_hsla(var(--primary)/0.4)] group-active:scale-95 transition-transform">
                    <PlusCircle className="w-5 h-5" />
                  </div>
                  <span className="text-[9px] font-bold text-primary tracking-tight">New Brief</span>
                </Link>

                <Link
                  to="/client/messages"
                  className={`relative flex flex-col items-center justify-center h-full gap-1 active:scale-95 transition-transform ${
                    location.pathname === '/client/messages' ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-[10px] tracking-tight">Chat</span>
                  {unreadMessages > 0 && (
                    <span className="absolute top-1 right-3 w-4 h-4 rounded-full bg-primary text-[9px] text-primary-foreground flex items-center justify-center font-bold">
                      {unreadMessages}
                    </span>
                  )}
                </Link>

                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="flex flex-col items-center justify-center h-full gap-1 text-muted-foreground hover:text-foreground active:scale-95 transition-transform"
                >
                  <Menu className="w-4 h-4 text-primary" />
                  <span className="text-[10px] tracking-tight">Menu</span>
                </button>
              </>
            ) : isAffiliateMode ? (
              <>
                <Link
                  to="/affiliate/dashboard"
                  className={`flex flex-col items-center justify-center h-full gap-1 active:scale-95 transition-transform ${
                    location.pathname === '/affiliate/dashboard' ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="text-[10px] tracking-tight">Overview</span>
                </Link>

                <Link
                  to="/affiliate/dashboard#referrals"
                  className="flex flex-col items-center justify-center h-full gap-1 text-muted-foreground hover:text-foreground active:scale-95 transition-transform"
                >
                  <Users className="w-4 h-4" />
                  <span className="text-[10px] tracking-tight">Referrals</span>
                </Link>

                <Link
                  to="/affiliate/dashboard#payouts"
                  className="flex flex-col items-center justify-center h-full gap-1 text-muted-foreground hover:text-foreground active:scale-95 transition-transform"
                >
                  <Wallet className="w-4 h-4 text-primary" />
                  <span className="text-[10px] tracking-tight">Payouts</span>
                </Link>

                <Link
                  to="/affiliate/dashboard#assets"
                  className="flex flex-col items-center justify-center h-full gap-1 text-muted-foreground hover:text-foreground active:scale-95 transition-transform"
                >
                  <Presentation className="w-4 h-4" />
                  <span className="text-[10px] tracking-tight">Assets</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="flex flex-col items-center justify-center h-full gap-1 text-muted-foreground hover:text-foreground active:scale-95 transition-transform"
                >
                  <Menu className="w-4 h-4 text-primary" />
                  <span className="text-[10px] tracking-tight">Menu</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/dashboard"
                  className={`flex flex-col items-center justify-center h-full gap-1 active:scale-95 transition-transform ${
                    location.pathname === '/dashboard' ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="text-[10px] tracking-tight">Workspace</span>
                </Link>

                <Link
                  to="/marketplace"
                  className={`relative flex flex-col items-center justify-center h-full gap-1 active:scale-95 transition-transform ${
                    location.pathname === '/marketplace' ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span className="text-[10px] tracking-tight">Market</span>
                  {unreadNotifications > 0 && (
                    <span className="absolute top-1 right-3 w-3.5 h-3.5 rounded-full bg-amber-500 text-[8px] text-white flex items-center justify-center font-bold">
                      •
                    </span>
                  )}
                </Link>

                <Link
                  to="/submit-work"
                  className="flex flex-col items-center justify-center h-full gap-0.5 -mt-3 group"
                >
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-[0_0_20px_hsla(var(--primary)/0.4)] group-active:scale-95 transition-transform">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-[9px] font-bold text-primary tracking-tight">Submit</span>
                </Link>

                <Link
                  to="/messages"
                  className={`relative flex flex-col items-center justify-center h-full gap-1 active:scale-95 transition-transform ${
                    location.pathname === '/messages' ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-[10px] tracking-tight">Chat</span>
                  {unreadMessages > 0 && (
                    <span className="absolute top-1 right-3 w-4 h-4 rounded-full bg-primary text-[9px] text-primary-foreground flex items-center justify-center font-bold">
                      {unreadMessages}
                    </span>
                  )}
                </Link>

                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="flex flex-col items-center justify-center h-full gap-1 text-muted-foreground hover:text-foreground active:scale-95 transition-transform"
                >
                  <Menu className="w-4 h-4 text-primary" />
                  <span className="text-[10px] tracking-tight">More</span>
                </button>
              </>
            )}
          </div>
        </nav>
      </div>
    </div>
  );
};

export default DashboardLayout;
