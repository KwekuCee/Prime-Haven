import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const DEFAULT_ROLES = ['superadmin', 'masteradmin'];

/**
 * Single shared admin access guard.
 * Every admin page should use this instead of re-implementing a role lookup.
 * Returns { isAdmin, role, checking, user, error, retry }.
 */
export const useAdminGuard = (allowedRoles: string[] = DEFAULT_ROLES) => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Keep the dependency stable even when callers pass an inline array.
  const rolesKey = useMemo(() => allowedRoles.join(','), [allowedRoles]);

  const retry = useCallback(() => {
    setError(null);
    setChecking(true);
    setRetryCount((c) => c + 1);
  }, []);

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;
    const allowed = rolesKey.split(',').map((r) => r.trim().toLowerCase());

    const verifyRole = async () => {
      setChecking(true);
      setError(null);

      // Verify active session with backend in case of client hydration race condition
      let activeUser = user;
      if (!activeUser) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          activeUser = sessionData?.session?.user ?? null;
        } catch {
          activeUser = null;
        }
      }

      if (cancelled) return;

      if (!activeUser) {
        setChecking(false);
        setIsAdmin(false);
        navigate('/superadmin-login', { replace: true });
        return;
      }

      try {
        // A user can hold several roles (e.g. client + superadmin), so read all rows without .single()
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', activeUser.id);

        if (cancelled) return;

        if (rolesError) {
          console.error('[useAdminGuard] Backend role check error:', rolesError.message);
          setError('Could not verify administrator permissions from the backend. Please check your connection.');
          setChecking(false);
          setIsAdmin(false);
          return;
        }

        const userRoles = (rolesData ?? []).map((r) => String(r.role || '').trim().toLowerCase());
        const match = userRoles.find((r) => allowed.includes(r));

        if (!match) {
          console.warn('[useAdminGuard] Access denied. User roles:', userRoles);
          setChecking(false);
          setIsAdmin(false);
          navigate('/dashboard', { replace: true });
          return;
        }

        setRole(match);
        setIsAdmin(true);
        setError(null);
        setChecking(false);
      } catch (err: any) {
        if (cancelled) return;
        console.error('[useAdminGuard] Unexpected verification failure:', err);
        setError('A temporary connection error occurred while checking permissions.');
        setChecking(false);
        setIsAdmin(false);
      }
    };

    verifyRole();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, navigate, rolesKey, retryCount]);

  return { isAdmin, role, checking, user, error, retry };
};

