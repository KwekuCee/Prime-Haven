import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { useAdminGuard } from '@/hooks/useAdminGuard';

/**
 * Central guard for every /superadmin page. Pages render only after the
 * signed-in user's admin role is confirmed by the backend. Data itself is
 * still protected by database access rules; this stops the UI from loading.
 */
const AdminRoute = ({ children }: { children: ReactNode }) => {
  const { isAdmin, checking } = useAdminGuard();

  if (checking || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background" role="status" aria-label="Checking access">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  return <>{children}</>;
};

export default AdminRoute;
