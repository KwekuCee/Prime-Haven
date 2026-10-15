import type { ReactNode } from 'react';
import { Loader2, AlertCircle, RefreshCw, LogOut, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

/**
 * Central guard for every /superadmin page. Pages render only after the
 * signed-in user's admin role is confirmed by the backend.
 * Provides explicit loading, recoverable error, and fallback states.
 */
const AdminRoute = ({ children }: { children: ReactNode }) => {
  const { isAdmin, checking, error, retry } = useAdminGuard();
  const navigate = useNavigate();

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background" role="status" aria-label="Checking access">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-medium animate-pulse">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4" role="alert">
        <div className="max-w-md w-full rounded-2xl border border-destructive/30 bg-card p-6 shadow-lg text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive mx-auto flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-heading font-bold text-foreground">Access Verification Failed</h2>
            <p className="text-xs text-muted-foreground mt-1">
              {error}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
            <Button size="sm" onClick={() => retry()} className="gap-2">
              <RefreshCw className="w-3.5 h-3.5" />
              Try Again
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate('/superadmin-login', { replace: true });
              }}
              className="gap-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </Button>
            <Button size="sm" variant="ghost" onClick={() => navigate('/')} className="gap-2">
              <Home className="w-3.5 h-3.5" />
              Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background" role="status" aria-label="Redirecting">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminRoute;

