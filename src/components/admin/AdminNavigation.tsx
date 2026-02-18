import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Palette, Layout, Globe, Image } from 'lucide-react';

export const AdminNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const links = [
    { path: '/superadmin', label: 'Graphic Design', icon: Palette },
    { path: '/superadmin/uiux', label: 'UI/UX Design', icon: Layout },
    { path: '/superadmin/web', label: 'Web Development', icon: Globe },
    { path: '/superadmin/portfolio', label: 'Portfolio', icon: Image },
  ];

  return (
    <div className="flex items-center gap-2 mt-3">
      {links.map(link => {
        const isActive = location.pathname === link.path;
        return (
          <Button
            key={link.path}
            variant={isActive ? 'default' : 'outline'}
            size="sm"
            onClick={() => navigate(link.path)}
            className="font-semibold"
          >
            <link.icon className="w-4 h-4 mr-1.5" />
            {link.label}
          </Button>
        );
      })}
    </div>
  );
};
