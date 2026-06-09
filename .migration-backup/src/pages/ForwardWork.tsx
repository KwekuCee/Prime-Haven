import SuperAdminLayout from '@/components/admin/SuperAdminLayout';
import ForwardWorkToClient from '@/components/admin/ForwardWorkToClient';
import { useAdminGuard } from '@/hooks/useAdminGuard';

const ForwardWork = () => {
  const { checking } = useAdminGuard();

  if (checking) return null;

  return (
    <SuperAdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-heading font-bold">Forward Work to Client</h1>
          <p className="text-xs text-muted-foreground mt-1">Select a client, choose accepted submissions, and send branded delivery emails</p>
        </div>
        <ForwardWorkToClient />
      </div>
    </SuperAdminLayout>
  );
};

export default ForwardWork;
