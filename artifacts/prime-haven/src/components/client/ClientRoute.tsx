import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

/**
 * Guards the /client/* portal: only accounts carrying the `client` role may enter.
 * Admins are allowed through so they can inspect a client's view.
 */
const ClientRoute = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate('/client/login', { replace: true });
      return;
    }

    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (cancelled) return;

      const roles = (data || []).map((r: any) => String(r.role));
      const allowed = roles.includes('client') || roles.includes('superadmin') || roles.includes('masteradmin');

      if (!allowed) {
        navigate('/dashboard', { replace: true });
        return;
      }

      setChecking(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, navigate]);

  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
};

export default ClientRoute;
