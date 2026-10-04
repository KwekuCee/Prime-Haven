import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import SuperAdminLayout from '@/components/admin/SuperAdminLayout';

interface Row {
  userId: string;
  name: string;
  earned: number;
  pendingEarnings: number;
  paidOut: number;
  inFlight: number;
  balance: number;
  issues: string[];
}

const STUCK_DAYS = 7;
const money = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PayoutReconciliation = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [unmatched, setUnmatched] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: earnings }, { data: withdrawals }] = await Promise.all([
      (supabase as any).from('job_earnings').select('designer_id, amount, status'),
      supabase.from('withdrawals').select('id, user_id, amount, status, korapay_reference, created_at'),
    ]);
    const { data: um } = await (supabase as any).from('unmatched_payments').select('id, reference, gateway, amount_ghs, client_email, created_at').eq('status', 'needs_matching').order('created_at', { ascending: false });
    setUnmatched(um || []);
    const map = new Map<string, Row>();
    const get = (id: string) => {
      if (!map.has(id)) map.set(id, { userId: id, name: 'Unknown', earned: 0, pendingEarnings: 0, paidOut: 0, inFlight: 0, balance: 0, issues: [] });
      return map.get(id)!;
    };
    (earnings || []).forEach((e: any) => {
      const r = get(e.designer_id);
      if (e.status === 'earned' || e.status === 'paid') r.earned += Number(e.amount) || 0;
      else if (e.status === 'pending') r.pendingEarnings += Number(e.amount) || 0;
    });
    const refs = new Map<string, number>();
    const now = Date.now();
    (withdrawals || []).forEach((w: any) => {
      const r = get(w.user_id);
      const amt = Number(w.amount) || 0;
      if (['completed', 'paid', 'success', 'successful'].includes(w.status)) r.paidOut += amt;
      else if (['pending', 'approved', 'processing'].includes(w.status)) {
        r.inFlight += amt;
        if (now - new Date(w.created_at).getTime() > STUCK_DAYS * 864e5) r.issues.push(`Withdrawal waiting over ${STUCK_DAYS} days`);
      }
      if (w.korapay_reference) refs.set(w.korapay_reference, (refs.get(w.korapay_reference) || 0) + 1);
    });
    (withdrawals || []).forEach((w: any) => {
      if (w.korapay_reference && (refs.get(w.korapay_reference) || 0) > 1) get(w.user_id).issues.push('Duplicate payment reference');
    });
    map.forEach((r) => {
      r.balance = r.earned - r.paidOut - r.inFlight;
      if (r.balance < -0.01) r.issues.push('Paid out more than earned');
      r.issues = [...new Set(r.issues)];
    });
    const ids = [...map.keys()];
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles').select('id, full_name, email').in('id', ids);
      (profs || []).forEach((p: any) => { const r = map.get(p.id); if (r) r.name = p.full_name || p.email; });
    }
    setRows([...map.values()].sort((a, b) => b.issues.length - a.issues.length || b.balance - a.balance));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const totals = useMemo(() => rows.reduce((t, r) => ({
    earned: t.earned + r.earned, paid: t.paid + r.paidOut, flight: t.flight + r.inFlight, flagged: t.flagged + (r.issues.length ? 1 : 0),
  }), { earned: 0, paid: 0, flight: 0, flagged: 0 }), [rows]);

  const cards = [
    { label: 'Earned by professionals', value: `$${money(totals.earned)}` },
    { label: 'Paid out', value: `$${money(totals.paid)}` },
    { label: 'Waiting to be paid', value: `$${money(totals.flight)}` },
    { label: 'Accounts needing attention', value: String(totals.flagged) },
  ];

  return (
    <SuperAdminLayout onRefresh={load} loading={loading}>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Payout reconciliation</h1>
          <p className="text-sm text-muted-foreground">Compares what each professional earned from approved jobs against what has been withdrawn.</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {cards.map((c) => (
            <div key={c.label} className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="font-heading text-xl font-bold text-foreground mt-1">{c.value}</p>
            </div>
          ))}
        </div>
        {unmatched.length > 0 && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 space-y-2">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-destructive" /> {unmatched.length} confirmed client payment(s) need matching to an account</p>
            {unmatched.map((u) => (
              <p key={u.id} className="text-xs text-muted-foreground">GH₵{money(Number(u.amount_ghs))} via {u.gateway} · {u.client_email || 'no email'} · ref {u.reference}</p>
            ))}
          </div>
        )}
        <div className="rounded-2xl border border-border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Professional</TableHead><TableHead className="text-right">Earned</TableHead>
                <TableHead className="text-right">Awaiting approval</TableHead><TableHead className="text-right">Paid out</TableHead>
                <TableHead className="text-right">In progress</TableHead><TableHead className="text-right">Balance</TableHead><TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && !loading && (
                <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No earnings or withdrawals recorded yet.</TableCell></TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.userId}>
                  <TableCell className="font-medium whitespace-nowrap">{r.name}</TableCell>
                  <TableCell className="text-right">${money(r.earned)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">${money(r.pendingEarnings)}</TableCell>
                  <TableCell className="text-right">${money(r.paidOut)}</TableCell>
                  <TableCell className="text-right">${money(r.inFlight)}</TableCell>
                  <TableCell className={`text-right font-semibold ${r.balance < 0 ? 'text-destructive' : ''}`}>${money(r.balance)}</TableCell>
                  <TableCell className="min-w-[180px]">
                    {r.issues.length === 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5" /> Matches</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {r.issues.map((i) => (
                          <Badge key={i} variant="outline" className="border-0 bg-destructive/10 text-destructive gap-1"><AlertTriangle className="w-3 h-3" />{i}</Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </SuperAdminLayout>
  );
};

export default PayoutReconciliation;
