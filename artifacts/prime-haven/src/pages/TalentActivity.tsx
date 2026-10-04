import { useEffect, useState } from 'react';
import { Activity, Briefcase, CreditCard, FileCheck, MessageSquare, ShieldCheck } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import TalentPageHeader from '@/components/dashboard/TalentPageHeader';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ActivityRow { id: string; action_type: string; summary: string; entity_type: string | null; metadata: unknown; created_at: string; }
const iconFor = (action: string) => action.includes('withdrawal') || action.includes('payout') ? CreditCard : action.includes('message') ? MessageSquare : action.includes('submit') ? FileCheck : action.includes('project') || action.includes('contract') ? Briefcase : ShieldCheck;
const labelFor = (action: string) => action.replace(/_/g, ' ').replace(/^\w/, (letter) => letter.toUpperCase());

export default function TalentActivity() {
  const { user } = useAuth();
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!user) return;
    supabase.from('talent_activity_logs').select('id, action_type, summary, entity_type, metadata, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100)
      .then(({ data }) => { setRows((data || []) as ActivityRow[]); setLoading(false); });
  }, [user]);
  return (
    <DashboardLayout>
      <main className="mx-auto max-w-[1400px] space-y-5 p-4 sm:p-6 lg:p-8">
        <TalentPageHeader eyebrow="Account security" title="Activity history" description="A private record of important work, payment, and account events." icon={Activity} />
        <section className="rounded-lg border border-border bg-card shadow-soft">
          <div className="border-b border-border px-5 py-4"><h2 className="font-heading text-base font-bold">Recent events</h2><p className="text-xs text-muted-foreground">Visible only to you and authorized administrators.</p></div>
          <div className="divide-y divide-border">
            {loading && Array.from({ length: 5 }).map((_, i) => <div key={i} className="flex gap-3 p-5"><Skeleton className="h-9 w-9 rounded-md" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-64" /></div></div>)}
            {!loading && rows.length === 0 && <div className="px-5 py-16 text-center"><Activity className="mx-auto mb-3 h-7 w-7 text-muted-foreground" /><p className="text-sm font-semibold">No activity recorded yet</p><p className="mt-1 text-xs text-muted-foreground">New work and payment events will appear here.</p></div>}
            {rows.map((row) => { const Icon = iconFor(row.action_type); return <article key={row.id} className="flex gap-3 px-5 py-4"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><Icon className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{row.summary}</p><Badge variant="outline" className="text-[9px]">{labelFor(row.action_type)}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()}</p></div></article>; })}
          </div>
        </section>
      </main>
    </DashboardLayout>
  );
}
