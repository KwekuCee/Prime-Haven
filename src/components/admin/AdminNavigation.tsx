import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Palette, Layout, Globe, Image, Briefcase } from 'lucide-react';

export const AdminNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const links = [
    { path: '/superadmin', label: 'Graphic Design', icon: Palette },
    { path: '/superadmin/uiux', label: 'App Design', icon: Layout },
    { path: '/superadmin/web', label: 'Web Development', icon: Globe },
    { path: '/superadmin/portfolio', label: 'Portfolio', icon: Image },
    { path: '/superadmin/contracts', label: 'Contracts', icon: Briefcase },
  ];

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 pb-1">
      {links.map(link => {
        const isActive = location.pathname === link.path;
        return (
          <Button
            key={link.path}
            variant={isActive ? 'default' : 'outline'}
            size="sm"
            onClick={() => navigate(link.path)}
            className="font-semibold text-xs sm:text-sm whitespace-nowrap shrink-0"
          >
            <link.icon className="w-4 h-4 sm:mr-1.5" />
            <span className="hidden sm:inline">{link.label}</span>
          </Button>
        );
      })}
    </div>
  );
};
