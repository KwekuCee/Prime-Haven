import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  LayoutDashboard,
  FileCheck,
  Users,
  DollarSign,
  Palette,
  Layout,
  Globe,
  Image,
  Briefcase,
  FolderKanban,
  Tag,
  UserSquare,
  Newspaper,
  UserCheck,
  Star,
  Download,
  Activity,
  LogOut,
  Menu,
  X,
  Shield,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
      { label: 'Submissions', icon: FileCheck, path: '/superadmin', tab: 'submissions' },
      { label: 'Users', icon: Users, path: '/superadmin', tab: 'users' },
      { label: 'Payments', icon: DollarSign, path: '/superadmin', tab: 'payments' },
    ],
  },
  {
    title: 'Categories',
    defaultOpen: true,
    items: [
      { label: 'Graphic Design', icon: Palette, path: '/superadmin', tab: 'submissions' },
      { label: 'UI/UX Design', icon: Layout, path: '/superadmin/uiux' },
      { label: 'Web Development', icon: Globe, path: '/superadmin/web' },
    ],
  },
  {
    title: 'Management',
    defaultOpen: true,
    items: [
      { label: 'Portfolio', icon: Image, path: '/superadmin/portfolio' },
      { label: 'Contracts', icon: Briefcase, path: '/superadmin/contracts' },
      { label: 'Projects', icon: FolderKanban, path: '/superadmin/projects' },
      { label: 'Pricing', icon: Tag, path: '/superadmin/pricing' },
      { label: 'Clients', icon: UserSquare, path: '/superadmin/clients' },
    ],
  },
  {
    title: 'Content',
    defaultOpen: false,
    items: [
      { label: 'Blog', icon: Newspaper, path: '/superadmin', tab: 'blog' },
      { label: 'Team', icon: UserCheck, path: '/superadmin', tab: 'team' },
      { label: 'Reviews', icon: Star, path: '/superadmin', tab: 'testimonials' },
    ],
  },
  {
    title: 'System',
    defaultOpen: false,
    items: [
      { label: 'Reports', icon: Download, path: '/superadmin', tab: 'reports' },
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
      return currentPath === '/superadmin' && !currentTab;
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
    const { supabase } = await import('@/integrations/supabase/client');
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          ${collapsed ? 'w-16' : 'w-64'}
          bg-card border-r border-border transform transition-all duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col
        `}
      >
        {/* Logo */}
        <div className="p-3 border-b border-border flex items-center justify-between">
          {!collapsed ? (
            <>
              <Link to="/superadmin" className="flex items-center gap-2">
                <BrandLogo height={28} />
              </Link>
              <div className="flex items-center gap-1">
                <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0.5">
                  <Shield className="w-3 h-3 mr-0.5" />
                  Admin
                </Badge>
                <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-muted-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </>
          ) : (
            <div className="w-full flex justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
          )}
        </div>

        {/* Navigation */}
        <TooltipProvider delayDuration={0}>
          <nav className="flex-1 overflow-y-auto p-2 space-y-1">
            {navSections.map((section) => (
              collapsed ? (
                <div key={section.title} className="space-y-0.5 mb-2">
                  {section.items.map((item) => {
                    const active = isActive(item);
                    return (
                      <Tooltip key={item.label + (item.tab || '')}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => handleNavClick(item)}
                            className={`flex items-center justify-center w-full p-2.5 rounded-lg transition-colors ${
                              active
                                ? 'bg-primary/10 text-primary'
                                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                            }`}
                          >
                            <item.icon className="w-4 h-4 shrink-0" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="font-medium">
                          {item.label}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              ) : (
                <Collapsible key={section.title} defaultOpen={section.defaultOpen}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
                    {section.title}
                    <ChevronDown className="w-3 h-3" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-0.5 mt-0.5">
                    {section.items.map((item) => {
                      const active = isActive(item);
                      return (
                        <button
                          key={item.label + (item.tab || '')}
                          onClick={() => handleNavClick(item)}
                          className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
                            active
                              ? 'bg-primary/10 text-primary font-semibold'
                              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                          }`}
                        >
                          <item.icon className="w-4 h-4 shrink-0" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              )
            ))}
          </nav>
        </TooltipProvider>

        {/* Footer */}
        <div className="p-2 border-t border-border space-y-1">
          {/* Collapse toggle - desktop only */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center lg:flex hidden text-muted-foreground"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            {!collapsed && <span className="ml-2">Collapse</span>}
          </Button>
          {!collapsed ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-muted-foreground"
                onClick={() => navigate('/dashboard')}
              >
                <Users className="w-4 h-4 mr-2" />
                Switch to User View
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-muted-foreground"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </>
          ) : (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-center text-muted-foreground"
                    onClick={() => navigate('/dashboard')}
                  >
                    <Users className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Switch to User View</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-center text-muted-foreground"
                    onClick={handleLogout}
                  >
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
        <div className="flex items-center justify-between p-4 border-b border-border lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-foreground">
            <Menu className="w-6 h-6" />
          </button>
          <Badge variant="secondary" className="text-xs font-bold">
            <Shield className="w-3 h-3 mr-1" />
            Super Admin
          </Badge>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button onClick={onRefresh} className="text-muted-foreground">
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;
