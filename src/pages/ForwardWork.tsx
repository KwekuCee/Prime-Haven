import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SuperAdminLayout from '@/components/admin/SuperAdminLayout';
import ForwardWorkToClient from '@/components/admin/ForwardWorkToClient';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const ForwardWork = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/superadmin-login', { replace: true }); return; }
    const checkAccess = async () => {
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
      if (!data || !['superadmin', 'masteradmin'].includes(data.role)) {
        navigate('/dashboard', { replace: true });
      }
    };
    checkAccess();
  }, [user, authLoading, navigate]);

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
