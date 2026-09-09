import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const DEFAULT_ROLES = ['superadmin', 'masteradmin'];

/**
 * Single shared admin access guard.
 * Every admin page should use this instead of re-implementing a role lookup.
 * Returns { isAdmin, role, checking, user } so the page can show a loader.
 */
export const useAdminGuard = (allowedRoles: string[] = DEFAULT_ROLES) => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  // Keep the dependency stable even when callers pass an inline array.
  const rolesKey = useMemo(() => allowedRoles.join(','), [allowedRoles]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setChecking(false);
      navigate('/superadmin-login', { replace: true });
      return;
    }

    let cancelled = false;
    const roles = rolesKey.split(',');

    const verifyRole = async () => {
      try {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (cancelled) return;

        if (!data || !roles.includes(data.role)) {
          setChecking(false);
          navigate('/dashboard', { replace: true });
          return;
        }

        setRole(data.role);
        setIsAdmin(true);
        setChecking(false);
      } catch {
        if (cancelled) return;
        setChecking(false);
        navigate('/superadmin-login', { replace: true });
      }
    };

    verifyRole();
    return () => { cancelled = true; };
  }, [user, authLoading, navigate, rolesKey]);

  return { isAdmin, role, checking, user };
};
