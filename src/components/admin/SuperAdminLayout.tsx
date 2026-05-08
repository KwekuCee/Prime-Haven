import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, FileCheck, Users, DollarSign, Palette, Layout, Globe,
  Image, Briefcase, FolderKanban, Tag, UserSquare, Newspaper, UserCheck,
  Star, Download, Activity, LogOut, Menu, X, Shield,
  RefreshCw, PanelLeftClose, PanelLeft, Send, ShoppingCart, Calendar,
  TrendingUp, Ticket, Presentation, MonitorPlay, MessageSquare, Gavel, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import NotificationCenter from '@/components/admin/NotificationCenter';
import BrandLogo from '@/components/BrandLogo';

interface SuperAdminLayoutProps {
  children: React.ReactNode;
  onRefresh?: () => void;
  loading?: boolean;
}

interface NavItem {
  label: string;
  icon: any;
  path?: string;
  tab?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
  defaultOpen?: boolean;
}

const navSections: NavSection[] = [
  {
    title: 'Dashboard',
    defaultOpen: true,
    items: [
      { label: 'Overview', icon: LayoutDashboard, path: '/superadmin' },
      { label: 'QA Review Queue', icon: FileCheck, path: '/superadmin/qa-reviewer' },
      { label: 'Finance Hub', icon: DollarSign, path: '/superadmin/finance' },
      { label: 'Promo', icon: Zap, path: '/superadmin/promo' },
      { label: 'Users', icon: Users, path: '/superadmin', tab: 'users' },
      { label: 'Analytics', icon: TrendingUp, path: '/superadmin', tab: 'analytics' },
    ],
  },
  {
    title: 'Departments',
    defaultOpen: true,
    items: [
      { label: 'Graphic Design', icon: Palette, path: '/superadmin/graphic-design' },
      { label: 'UI/UX Design', icon: Layout, path: '/superadmin/uiux' },
      { label: 'Web Development', icon: Globe, path: '/superadmin/web' },
    ],
  },
  {
    title: 'User Portals',
    defaultOpen: true,
    items: [
      { label: 'Client Dashboard', icon: UserSquare, path: '/client/dashboard' },
      { label: 'Affiliates', icon: Send, path: '/affiliate/dashboard' },
    ],
  },
  {
    title: 'People',
    defaultOpen: false,
    items: [
      { label: 'Team', icon: UserCheck, path: '/superadmin', tab: 'team' },
      { label: 'Clients DB', icon: UserSquare, path: '/superadmin', tab: 'clients' },
    ],
  },
  {
    title: 'Operations',
    defaultOpen: false,
    items: [
      { label: 'Orders', icon: ShoppingCart, path: '/superadmin', tab: 'orders' },
      { label: 'Payments', icon: DollarSign, path: '/superadmin', tab: 'payments' },
      { label: 'Consultations', icon: Calendar, path: '/superadmin', tab: 'consultations' },
      { label: 'Promo Codes', icon: Ticket, path: '/superadmin', tab: 'promos' },
    ],
  },
  {
    title: 'Support',
    defaultOpen: true,
    items: [
      { label: 'Messaging Hub', icon: MessageSquare, path: '/superadmin', tab: 'messages' },
    ],
  },
  {
    title: 'Management',
    defaultOpen: false,
    items: [
      { label: 'Projects', icon: FolderKanban, path: '/superadmin/projects' },
      { label: 'Contracts', icon: Briefcase, path: '/superadmin/contracts' },
      { label: 'Forward Work', icon: Send, path: '/superadmin/forward-work' },
      { label: 'Portfolio', icon: Image, path: '/superadmin/portfolio' },
      { label: 'Pricing', icon: Tag, path: '/superadmin/pricing' },
    ],
  },
  {
    title: 'System & Content',
    defaultOpen: false,
    items: [
      { label: 'Blog', icon: Newspaper, path: '/superadmin', tab: 'blog' },
      { label: 'Reviews', icon: Star, path: '/superadmin', tab: 'testimonials' },
      { label: 'Reports', icon: Download, path: '/superadmin', tab: 'reports' },
      { label: 'Marketing Assets', icon: Presentation, path: '/superadmin', tab: 'marketing_assets' },
      { label: 'Communications', icon: Send, path: '/superadmin', tab: 'communications' },
      { label: 'Logs', icon: Activity, path: '/superadmin', tab: 'logs' },
    ],
  },
];

const SuperAdminLayout = ({ children, onRefresh, loading }: SuperAdminLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const currentTab = searchParams.get('tab') || '';
  const currentPath = location.pathname;

  const isActive = (item: NavItem) => {
    if (item.path === '/superadmin' && item.tab) {
      return currentPath === '/superadmin' && currentTab === item.tab;
    }
    if (item.path === '/superadmin' && !item.tab && item.label === 'Overview') {
      return currentPath === '/superadmin' && (!currentTab || currentTab === 'overview');
    }
    if (item.path && item.path !== '/superadmin') {
      return currentPath === item.path;
    }
    return false;
  };

  const handleNavClick = (item: NavItem) => {
    if (item.tab) {
      navigate(`${item.path}?tab=${item.tab}`);
    } else {
      navigate(item.path || '/superadmin');
    }
    setSidebarOpen(false);
  };

  const handleLogout = async () => {
    const { supabase } = await import(/* @vite-ignore */ '@/integrations/supabase/client');
    await supabase.auth.signOut();
    navigate('/login');
  };

  const NavButton = ({ item }: { item: NavItem }) => {
    const active = isActive(item);

    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => handleNavClick(item)}
              className={`
                flex items-center justify-center w-10 h-10 mx-auto rounded-xl transition-all duration-300
                ${active
                  ? 'bg-primary/20 text-primary border border-primary/30 shadow-[0_0_20px_hsla(16,99%,55%,0.3)] scale-105'
                  : 'text-muted-foreground hover:bg-white/5 hover:text-foreground hover:scale-105 hover:shadow-lg'
                }
              `}
            >
              <item.icon className="w-[18px] h-[18px]" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            <p className="font-medium text-sm">{item.label}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <button
        onClick={() => handleNavClick(item)}
        className={`
          flex items-center gap-3 w-full px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-300
          ${active
            ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_hsla(16,99%,55%,0.15)] translate-x-1'
            : 'text-muted-foreground hover:bg-white/5 hover:text-foreground hover:translate-x-1'
          }
        `}
      >
        <item.icon className="w-[18px] h-[18px] shrink-0" />
        <span className="truncate">{item.label}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-transparent flex w-full relative z-0">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky lg:top-0 inset-y-0 left-0 z-50 h-screen
          ${collapsed ? 'w-[68px]' : 'w-[260px]'}
          bg-sidebar-background/40 backdrop-blur-3xl border-r border-white/5 shadow-2xl
          transform transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col
        `}
      >
        {/* Header */}
        <div className={`h-16 flex items-center border-b border-border/50 shrink-0 ${collapsed ? 'justify-center px-2' : 'px-4 justify-between'}`}>
          {!collapsed ? (
            <>
              <Link to="/superadmin" className="flex items-center gap-2.5">
                <BrandLogo height={26} />
              </Link>
              <div className="flex items-center gap-1.5">
                <Badge className="bg-primary/15 text-primary border-0 text-[10px] font-bold px-1.5 py-0.5 hover:bg-primary/15">
                  <Shield className="w-2.5 h-2.5 mr-0.5" />
                  Admin
                </Badge>
                <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 rounded-lg hover:bg-secondary text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shadow-[0_0_15px_hsla(16,99%,55%,0.3)]">
              <Shield className="w-4 h-4 text-primary" />
            </div>
          )}
        </div>

        {/* Navigation */}
        <TooltipProvider delayDuration={0}>
          <ScrollArea className="flex-1">
            <nav className={`py-3 space-y-1 ${collapsed ? 'px-2' : 'px-3'}`}>
              {navSections.map((section) => (
                collapsed ? (
                  <div key={section.title} className="space-y-1 py-1.5">
                    <div className="h-px bg-border/40 mx-1 mb-2" />
                    {section.items.map((item) => (
                      <NavButton key={item.label + (item.tab || '')} item={item} />
                    ))}
                  </div>
                ) : (
                  <div key={section.title} className="mb-4">
                    <div className="flex items-center w-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                      {section.title}
                    </div>
                    <div className="space-y-0.5 mt-1">
                      {section.items.map((item) => (
                        <NavButton key={item.label + (item.tab || '')} item={item} />
                      ))}
                    </div>
                  </div>
                )
              ))}
            </nav>
          </ScrollArea>
        </TooltipProvider>

        {/* Footer */}
        <div className={`border-t border-border/50 shrink-0 ${collapsed ? 'p-2 space-y-1' : 'p-3 space-y-1'}`}>
          {/* Collapse toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full hidden lg:flex items-center justify-center text-muted-foreground hover:text-foreground h-9"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <PanelLeft className="w-4 h-4" /> : <><PanelLeftClose className="w-4 h-4 mr-2" /><span className="text-xs">Collapse</span></>}
          </Button>

          {!collapsed ? (
            <>
              <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground h-9 text-xs" onClick={() => navigate('/dashboard')}>
                <Users className="w-4 h-4 mr-2" />
                User View
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground h-9 text-xs" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </>
          ) : (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-center text-muted-foreground h-9" onClick={() => navigate('/dashboard')}>
                    <Users className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">User View</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-center text-muted-foreground h-9" onClick={handleLogout}>
                    <LogOut className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Logout</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 border-b border-white/5 bg-background/40 backdrop-blur-3xl shadow-lg lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 rounded-xl hover:bg-white/5 text-foreground">
            <Menu className="w-5 h-5" />
          </button>
          <Badge className="bg-primary/15 text-primary border-0 text-xs font-bold">
            <Shield className="w-3 h-3 mr-1" />
            Admin Panel
          </Badge>
          <div className="flex items-center gap-1">
            <NotificationCenter />
            {onRefresh && (
              <button onClick={onRefresh} className="p-2 rounded-xl hover:bg-secondary text-muted-foreground">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </header>

        {/* Page Content with animation */}
        <main className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPath + currentTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;
