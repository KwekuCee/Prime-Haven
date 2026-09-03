import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

/**
 * Guards areas that belong to registered professionals only (Marketplace,
 * Partner Program). Accounts that exist purely as clients are sent back to
 * their own portal. Signed-out visitors are left alone so public pages that
 * use this guard can still redirect to login themselves.
 */
const ProfessionalRoute = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setChecking(false);
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
      const clientOnly = roles.length > 0 && roles.every(r => r === 'client');

      if (clientOnly) {
        navigate('/client/dashboard', { replace: true });
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

export default ProfessionalRoute;
