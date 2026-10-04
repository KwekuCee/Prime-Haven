import { useState, useMemo } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  ClipboardList,
  Star,
  Download,
  Activity,
  LogOut,
  Menu,
  X,
  Shield,
  RefreshCw,
  PanelLeftClose,
  PanelLeft,
  Send,
  ShoppingCart,
  Calendar,
  TrendingUp,
  Ticket,
  Percent,
  Presentation,
  MonitorPlay,
  MessageSquare,
  Gavel,
  Settings as SettingsIcon,
  Search,
  ExternalLink,
  ChevronDown,
  Banknote,
  Compass
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  badge?: string;
  badgeColor?: string;
}

interface NavSection {
  title: string;
  id: string;
  description?: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Command Center',
    id: 'command',
    description: 'Core intelligence & metrics',
    items: [
      { label: 'Executive Overview', icon: LayoutDashboard, path: '/superadmin' },
      { label: 'Performance Analytics', icon: TrendingUp, path: '/superadmin', tab: 'analytics' },
      { label: 'Finance & Revenue', icon: DollarSign, path: '/superadmin/finance', badge: 'Escrow', badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
      { label: 'QA Review Queue', icon: FileCheck, path: '/superadmin/qa-reviewer' },
    ],
  },
  {
    title: 'Projects & Delivery',
    id: 'delivery',
    description: 'Production pipeline & client jobs',
    items: [
      { label: 'Client Projects', icon: FolderKanban, path: '/superadmin/projects' },
      { label: 'Contracts & Agreements', icon: Briefcase, path: '/superadmin/contracts' },
      { label: 'Client Orders', icon: ShoppingCart, path: '/superadmin', tab: 'orders' },
      { label: 'Talent Payouts', icon: Banknote, path: '/superadmin', tab: 'payments' },
      { label: 'Direct Hire Inquiries', icon: Gavel, path: '/superadmin/hire-requests' },
      { label: 'Discovery Calls', icon: Calendar, path: '/superadmin', tab: 'consultations' },
      { label: 'Forward Work Queue', icon: Send, path: '/superadmin/forward-work' },
    ],
  },
  {
    title: 'Creative Departments',
    id: 'departments',
    description: 'Specialized skill tracks',
    items: [
      { label: 'Web Development', icon: Globe, path: '/superadmin/web', badge: 'Dev', badgeColor: 'bg-blue-100 text-blue-800 border-blue-200' },
      { label: 'UI/UX Design', icon: Layout, path: '/superadmin/uiux', badge: 'Figma', badgeColor: 'bg-purple-100 text-purple-800 border-purple-200' },
      { label: 'Graphic Design', icon: Palette, path: '/superadmin/graphic-design', badge: 'Brand', badgeColor: 'bg-amber-100 text-amber-800 border-amber-200' },
      { label: 'SMM & Content Media', icon: MonitorPlay, path: '/superadmin', tab: 'smm' },
    ],
  },
  {
    title: 'Talent & Directory',
    id: 'people',
    description: 'Users, freelancers & clients',
    items: [
      { label: 'All Users & Access', icon: Users, path: '/superadmin', tab: 'users' },
      { label: 'Core Agency Team', icon: UserCheck, path: '/superadmin', tab: 'team' },
      { label: 'Client Database', icon: UserSquare, path: '/superadmin/clients' },
      { label: 'Talent Applicants', icon: ClipboardList, path: '/superadmin/applicants', badge: 'Vetting', badgeColor: 'bg-orange-100 text-orange-800 border-orange-200' },
    ],
  },
  {
    title: 'Growth & Content',
    id: 'growth',
    description: 'Marketing, social & brand presence',
    items: [
      { label: 'Showcase Portfolio', icon: Image, path: '/superadmin/portfolio' },
      { label: 'Agency Blog & News', icon: Newspaper, path: '/superadmin', tab: 'blog' },
      { label: 'Client Testimonials', icon: Star, path: '/superadmin', tab: 'testimonials' },
      { label: 'Promo Codes', icon: Percent, path: '/superadmin', tab: 'promos' },
      { label: 'Promo Banners', icon: Ticket, path: '/superadmin/promo' },
      { label: 'Email Broadcasts', icon: MessageSquare, path: '/superadmin', tab: 'communications' },
      { label: 'Brand & Marketing Kits', icon: Presentation, path: '/superadmin', tab: 'marketing_assets' },
    ],
  },
  {
    title: 'Platform & Governance',
    id: 'governance',
    description: 'Pricing, audit logs & system ops',
    items: [
      { label: 'Service Pricing & Rates', icon: Tag, path: '/superadmin/pricing' },
      { label: 'Monthly Snapshots', icon: Download, path: '/superadmin', tab: 'reports' },
      { label: 'Security & Audit Logs', icon: Activity, path: '/superadmin', tab: 'logs' },
      { label: 'System Configuration', icon: SettingsIcon, path: '/superadmin/settings' },
    ],
  },
];

const SuperAdminLayout = ({ children, onRefresh, loading }: SuperAdminLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const currentTab = searchParams.get('tab') || '';
  const currentPath = location.pathname;

  const isActive = (item: NavItem) => {
    if (item.path === '/superadmin' && item.tab) {
      return currentPath === '/superadmin' && currentTab === item.tab;
    }
    if (item.path === '/superadmin' && !item.tab && (item.label === 'Executive Overview' || item.label === 'Overview')) {
      return currentPath === '/superadmin' && (!currentTab || currentTab === 'overview');
    }
    if (item.path && item.path !== '/superadmin') {
      return currentPath === item.path;
    }
    return false;
  };

  // Determine current page breadcrumb
  const currentBreadcrumb = useMemo(() => {
    for (const section of navSections) {
      for (const item of section.items) {
        if (isActive(item)) {
          return { section: section.title, page: item.label };
        }
      }
    }
    return { section: 'Command Center', page: 'Console' };
  }, [currentPath, currentTab]);

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
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

  // Filter sections by search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return navSections;
    const q = searchQuery.toLowerCase();
    return navSections
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) => item.label.toLowerCase().includes(q) || section.title.toLowerCase().includes(q)
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex w-full relative z-0 selection:bg-primary/20">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Light Theme Sidebar */}
      <aside
        className={`
          fixed lg:sticky lg:top-0 inset-y-0 left-0 z-50 h-screen
          ${collapsed ? 'w-[74px]' : 'w-[280px]'}
          bg-white/95 backdrop-blur-xl border-r border-slate-200 shadow-[4px_0_24px_rgba(0,0,0,0.03)]
          transform transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col
        `}
      >
        {/* Brand Header */}
        <div
          className={`h-16 flex items-center border-b border-slate-200 shrink-0 ${
            collapsed ? 'justify-center px-2' : 'px-4 justify-between'
          }`}
        >
          {!collapsed ? (
            <div className="flex items-center justify-between w-full">
              <Link to="/superadmin" className="flex items-center gap-2">
                <BrandLogo height={36} variant="light" />
              </Link>
              <div className="flex items-center gap-1.5">
                <Badge className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold px-2 py-0.5 tracking-wider uppercase">
                  Superadmin
                </Badge>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-xs">
              <Shield className="w-5 h-5 text-primary" />
            </div>
          )}
        </div>

        {/* Quick Search Tool Filter */}
        {!collapsed && (
          <div className="p-3 border-b border-slate-100 bg-slate-50/60">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Jump to tool or tab..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-7 text-xs rounded-lg bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Navigation List */}
        <TooltipProvider delayDuration={0}>
          <ScrollArea className="flex-1">
            <nav className={`py-3 space-y-3.5 ${collapsed ? 'px-2' : 'px-3'}`}>
              {filteredSections.map((section) => {
                const isSectionCollapsed = !!collapsedSections[section.id];
                const hasActiveChild = section.items.some((item) => isActive(item));

                if (collapsed) {
                  return (
                    <div key={section.id} className="space-y-1 py-1">
                      <div className="h-px bg-slate-200 mx-1 mb-2" />
                      {section.items.map((item) => {
                        const active = isActive(item);
                        const Icon = item.icon;
                        return (
                          <Tooltip key={item.label + (item.tab || '')}>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => handleNavClick(item)}
                                className={`
                                  flex items-center justify-center w-10 h-10 mx-auto rounded-xl transition-all duration-200
                                  ${
                                    active
                                      ? 'bg-primary text-white shadow-md shadow-primary/25 scale-105'
                                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                  }
                                `}
                              >
                                <Icon className="w-4 h-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" sideOffset={10} className="bg-slate-900 text-white border-slate-800 text-xs">
                              <p className="font-semibold">{item.label}</p>
                              <p className="text-[10px] text-slate-400">{section.title}</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  );
                }

                return (
                  <div key={section.id} className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-1.5 shadow-2xs">
                    {/* Section Header */}
                    <button
                      type="button"
                      onClick={() => toggleSection(section.id)}
                      className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-left text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors group"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${hasActiveChild ? 'text-primary' : 'text-slate-500 group-hover:text-slate-900'}`}>
                          {section.title}
                        </span>
                        {hasActiveChild && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        )}
                      </div>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                          isSectionCollapsed ? '-rotate-90' : 'rotate-0'
                        }`}
                      />
                    </button>

                    {/* Section Items */}
                    {!isSectionCollapsed && (
                      <div className="space-y-0.5 mt-1">
                        {section.items.map((item) => {
                          const active = isActive(item);
                          const Icon = item.icon;
                          return (
                            <button
                              key={item.label + (item.tab || '')}
                              onClick={() => handleNavClick(item)}
                              className={`
                                flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 text-left
                                ${
                                  active
                                    ? 'bg-primary/10 text-primary border border-primary/20 font-semibold shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                                }
                              `}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-primary' : 'text-slate-500 group-hover:text-slate-900'}`} />
                                <span className="truncate">{item.label}</span>
                              </div>
                              {item.badge && (
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${
                                    item.badgeColor || 'bg-slate-100 text-slate-700 border-slate-200'
                                  }`}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </ScrollArea>
        </TooltipProvider>

        {/* Sidebar Footer */}
        <div className={`border-t border-slate-200 shrink-0 ${collapsed ? 'p-2 space-y-1.5' : 'p-3 space-y-2'}`}>
          {/* Quick Portal Jumpers (Desktop dropdown) */}
          {!collapsed ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 border border-slate-200/80 text-slate-700 hover:text-slate-900 hover:bg-slate-200/70 transition-colors shadow-2xs"
                >
                  <span className="flex items-center gap-2">
                    <Compass className="w-3.5 h-3.5 text-primary" />
                    Quick Portal Jump
                  </span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="w-56 bg-white text-slate-900 border-slate-200 rounded-xl p-1.5 shadow-xl">
                <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-primary px-2 py-1">
                  Active Environments
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => navigate('/client/dashboard')} className="text-xs hover:bg-slate-100 rounded-lg cursor-pointer">
                  <UserSquare className="w-3.5 h-3.5 mr-2 text-primary" />
                  Client Portal View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/dashboard')} className="text-xs hover:bg-slate-100 rounded-lg cursor-pointer">
                  <Users className="w-3.5 h-3.5 mr-2 text-primary" />
                  Talent Workspace View
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-100" />
                <DropdownMenuItem onClick={() => navigate('/')} className="text-xs hover:bg-slate-100 rounded-lg cursor-pointer">
                  <Globe className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                  Public Landing Website
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigate('/')}
                  className="flex items-center justify-center w-10 h-10 mx-auto rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                >
                  <Compass className="w-4 h-4 text-primary" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Switch Portal View</TooltipContent>
            </Tooltip>
          )}

          {/* Collapse Toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`w-full hidden lg:flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors h-8 text-xs ${
              collapsed ? '' : 'gap-2 px-3'
            }`}
          >
            {collapsed ? (
              <PanelLeft className="w-4 h-4" />
            ) : (
              <>
                <PanelLeftClose className="w-4 h-4" />
                <span className="text-xs font-medium">Collapse Navigation</span>
              </>
            )}
          </button>

          {/* Logout Button */}
          {!collapsed ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Terminate Session</span>
            </button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center w-10 h-10 mx-auto rounded-xl text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Terminate Session</TooltipContent>
            </Tooltip>
          )}
        </div>
      </aside>

      {/* Main Content Area with Desktop Top Bar */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0 bg-[#f8fafc]">
        {/* Top Header Bar for Desktop & Mobile */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl shadow-2xs">
          {/* Left: Mobile Menu + Breadcrumbs */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb Trail */}
            <div className="flex items-center gap-2 text-xs">
              <span className="hidden sm:inline text-slate-400 font-semibold uppercase tracking-wider">
                Superadmin
              </span>
              <span className="hidden sm:inline text-slate-300">/</span>
              <span className="text-slate-500 font-medium hidden md:inline">
                {currentBreadcrumb.section}
              </span>
              <span className="text-slate-300 hidden md:inline">/</span>
              <span className="text-slate-900 font-bold font-heading">
                {currentBreadcrumb.page}
              </span>
            </div>
          </div>

          {/* Right: Status, Refresh, Notifications, User Badge */}
          <div className="flex items-center gap-3">
            {/* Platform Status Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Accra Production Node</span>
            </div>

            {/* Refresh Action */}
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={loading}
                className="h-9 px-3 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 gap-1.5 text-xs font-semibold"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
                <span className="hidden md:inline">Refresh Data</span>
              </Button>
            )}

            {/* Notifications */}
            <NotificationCenter />

            {/* Admin Avatar Pill */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-amber-500 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                SA
              </div>
            </div>
          </div>
        </header>

        {/* Page Viewport with Smooth Animation & Mobile Bottom Clearance */}
        <main className="flex-1 overflow-auto pb-24 lg:pb-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPath + currentTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Native Mobile App Bottom Tab Bar */}
        <nav
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-2xl border-t border-slate-200/90 shadow-[0_-4px_25px_rgba(0,0,0,0.06)] px-2 pt-1 pb-safe"
          aria-label="Mobile Superadmin Navigation"
        >
          <div className="grid grid-cols-5 items-center h-14">
            <Link
              to="/superadmin"
              className={`flex flex-col items-center justify-center h-full gap-1 active:scale-95 transition-transform ${
                currentPath === '/superadmin' && (!currentTab || currentTab === 'overview')
                  ? 'text-primary font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="text-[10px] tracking-tight">Overview</span>
            </Link>

            <Link
              to="/superadmin/projects"
              className={`flex flex-col items-center justify-center h-full gap-1 active:scale-95 transition-transform ${
                currentPath === '/superadmin/projects'
                  ? 'text-primary font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <FolderKanban className="w-4 h-4" />
              <span className="text-[10px] tracking-tight">Projects</span>
            </Link>

            <Link
              to="/superadmin/finance"
              className={`flex flex-col items-center justify-center h-full gap-1 active:scale-95 transition-transform ${
                currentPath === '/superadmin/finance'
                  ? 'text-primary font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span className="text-[10px] tracking-tight">Finance</span>
            </Link>

            <Link
              to="/superadmin/qa-reviewer"
              className={`flex flex-col items-center justify-center h-full gap-1 active:scale-95 transition-transform ${
                currentPath === '/superadmin/qa-reviewer'
                  ? 'text-primary font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span className="text-[10px] tracking-tight">QA Gate</span>
            </Link>

            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="flex flex-col items-center justify-center h-full gap-1 text-slate-500 hover:text-slate-900 active:scale-95 transition-transform"
            >
              <Compass className="w-4 h-4 text-primary" />
              <span className="text-[10px] tracking-tight">All Tools</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
};

export default SuperAdminLayout;
