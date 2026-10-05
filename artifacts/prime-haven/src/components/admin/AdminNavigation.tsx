import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Palette,
  Layout,
  Globe,
  Image,
  Briefcase,
  FolderKanban,
  DollarSign,
  Ticket
} from 'lucide-react';

export const AdminNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const links = [
    { path: '/superadmin', label: 'Overview', icon: LayoutDashboard },
    { path: '/superadmin/graphic-design', label: 'Graphic Design', icon: Palette },
    { path: '/superadmin/uiux', label: 'UI/UX Design', icon: Layout },
    { path: '/superadmin/web', label: 'Web Dev', icon: Globe },
    { path: '/superadmin/projects', label: 'Projects', icon: FolderKanban },
    { path: '/superadmin/contracts', label: 'Contracts', icon: Briefcase },
    { path: '/superadmin/portfolio', label: 'Portfolio', icon: Image },
    { path: '/superadmin/pricing', label: 'Pricing', icon: DollarSign },
    { path: '/superadmin/promo', label: 'Promo', icon: Ticket },
  ];

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 pb-1 overflow-x-auto no-scrollbar">
      {links.map((link) => {
        const isActive = location.pathname === link.path;
        const Icon = link.icon;
        return (
          <Button
            key={link.path}
            variant={isActive ? 'default' : 'outline'}
            size="sm"
            onClick={() => navigate(link.path)}
            className={`font-semibold text-xs whitespace-nowrap shrink-0 rounded-full h-8 px-3.5 transition-all ${
              isActive
                ? 'bg-primary text-white shadow-xs'
                : 'border-slate-200 dark:border-white/15 bg-white dark:bg-white/[0.05] text-slate-700 dark:text-zinc-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 shadow-2xs'
            }`}
          >
            <Icon className="w-3.5 h-3.5 mr-1.5 text-primary" />
            <span>{link.label}</span>
          </Button>
        );
      })}
    </div>
  );
};
