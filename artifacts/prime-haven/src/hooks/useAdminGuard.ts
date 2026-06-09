import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

/**
 * Shared admin access guard hook.
 * Redirects non-admin users away from admin pages.
 * Returns { isAdmin, role, checking } so the page can show a loader.
 */
export const useAdminGuard = (allowedRoles: string[] = ['superadmin', 'masteradmin']) => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate('/superadmin-login', { replace: true });
      setChecking(false);
      return;
    }

    const verifyRole = async () => {
      try {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (!data || !allowedRoles.includes(data.role)) {
          navigate('/dashboard', { replace: true });
          setChecking(false);
          return;
        }

        setRole(data.role);
        setIsAdmin(true);
      } catch {
        navigate('/superadmin-login', { replace: true });
      } finally {
        setChecking(false);
      }
    };

    verifyRole();
  }, [user, authLoading, navigate, allowedRoles]);

  return { isAdmin, role, checking, user };
};
