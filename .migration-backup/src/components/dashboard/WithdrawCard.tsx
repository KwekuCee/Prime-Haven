import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Wallet, Plus, Trash2, Loader2, Copy } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Method = { id: string; provider: 'mtn' | 'vodafone' | 'airteltigo'; phone_number: string; account_name: string; is_default: boolean };
type Withdrawal = { id: string; amount: number; currency: string; status: string; created_at: string; failure_reason: string | null; korapay_reference: string | null };

const PROVIDER_LABEL: Record<string, string> = { mtn: 'MTN MoMo', vodafone: 'Vodafone Cash', airteltigo: 'AirtelTigo Money' };

interface Props {
  userId: string;
  availableBalance: number;
}

export default function WithdrawCard({ userId, availableBalance }: Props) {
  const [methods, setMethods] = useState<Method[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [liveSalary, setLiveSalary] = useState<number | null>(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [methodOpen, setMethodOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [newMethod, setNewMethod] = useState<{ provider: Method['provider']; phone_number: string; account_name: string }>({ provider: 'mtn', phone_number: '', account_name: '' });

  const today = new Date();
  const isWithdrawalDay = today.getUTCDate() === 30;
  const daysToNext = useMemo(() => {
    const d = new Date(today);
    d.setUTCDate(30);
    if (d <= today) d.setUTCMonth(d.getUTCMonth() + 1);
    return Math.ceil((d.getTime() - today.getTime()) / 86400000);
  }, [today]);

  const refresh = async () => {
    const [{ data: m }, { data: w }, { data: dd }] = await Promise.all([
      supabase.from('user_payout_methods').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('withdrawals').select('id, amount, currency, status, created_at, failure_reason, korapay_reference').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
      supabase.from('designer_details').select('salary_estimated').eq('user_id', userId).maybeSingle(),
    ]);
    setMethods((m as Method[]) || []);
    setWithdrawals((w as Withdrawal[]) || []);
    if (dd && typeof (dd as any).salary_estimated === 'number') setLiveSalary(Number((dd as any).salary_estimated));
    if (m && m.length && !selectedMethod) {
      const def = (m as Method[]).find((x) => x.is_default) || (m as Method[])[0];
      setSelectedMethod(def.id);
    }
  };

  useEffect(() => {
    refresh();
    // Poll every 10s to pick up withdrawal status / balance changes without
    // broadcasting sensitive financial data over Realtime.
    const interval = setInterval(refresh, 10000);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [userId]);

  const addMethod = async () => {
    if (!newMethod.phone_number.trim() || !newMethod.account_name.trim()) {
      toast.error('Fill all fields');
      return;
    }
    const { error } = await supabase.from('user_payout_methods').insert({
      user_id: userId,
      provider: newMethod.provider,
      phone_number: newMethod.phone_number.trim(),
      account_name: newMethod.account_name.trim(),
      is_default: methods.length === 0,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Payment method saved');
    setNewMethod({ provider: 'mtn', phone_number: '', account_name: '' });
    setMethodOpen(false);
    refresh();
  };

  const deleteMethod = async (id: string) => {
    const { error } = await supabase.from('user_payout_methods').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    refresh();
  };

  const submitWithdrawal = async () => {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 100) { toast.error('Minimum is$10'); return; }
    if (amt > effectiveBalance) { toast.error('Amount exceeds available balance'); return; }
    if (!selectedMethod) { toast.error('Select a payment method'); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('withdrawals').insert({
        user_id: userId,
        payout_method_id: selectedMethod,
        amount: amt,
        currency: 'GHS',
        status: 'pending',
      });
      if (error) {
        toast.error(error.message || 'Withdrawal request failed');
      } else {
        toast.success('Withdrawal requested. Pending approval.');
        setWithdrawOpen(false);
        setAmount('');
        refresh();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const earned = liveSalary ?? availableBalance;
  const locked = withdrawals.filter(w => w.status !== 'failed').reduce((s, w) => s + Number(w.amount || 0), 0);
  // If liveSalary is set we treat it as raw earnings and subtract locked; else fall back to prop (already net).
  const effectiveBalance = liveSalary !== null ? Math.max(0, earned - locked) : availableBalance;
  const canWithdraw = isWithdrawalDay && effectiveBalance >= 100;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base flex items-center gap-2"><Wallet className="h-4 w-4 text-emerald-500" /> Withdraw Earnings</CardTitle>
        <Badge variant={isWithdrawalDay ? 'default' : 'secondary'}>
          {isWithdrawalDay ? 'Window open today' : `Opens in ${daysToNext} day${daysToNext === 1 ? '' : 's'}`}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Available balance</p>
            <p className="text-2xl font-bold">GH₵{effectiveBalance.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">Minimum$10 • Mobile Money via Korapay</p>
          </div>
          <Button
            onClick={() => setWithdrawOpen(true)}
            disabled={!canWithdraw}
            title={!isWithdrawalDay ? 'Available only on the 30th' : effectiveBalance < 100 ? 'Balance below$10' : ''}
          >
            Withdraw
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Saved payment methods</p>
            <Button size="sm" variant="outline" onClick={() => setMethodOpen(true)}><Plus className="h-3 w-3 mr-1" /> Add</Button>
          </div>
          {methods.length === 0 ? (
            <p className="text-xs text-muted-foreground">No payment methods yet. Add one to enable withdrawals.</p>
          ) : (
            <div className="space-y-1.5">
              {methods.map((m) => (
                <div key={m.id} className="flex items-center justify-between text-sm border border-border/60 rounded-md px-3 py-2">
                  <div>
                    <span className="font-medium">{PROVIDER_LABEL[m.provider]}</span>
                    <span className="text-muted-foreground"> • {m.phone_number} • {m.account_name}</span>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => deleteMethod(m.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Withdrawal history</p>
          {withdrawals.length === 0 ? (
            <p className="text-xs text-muted-foreground">No withdrawals yet.</p>
          ) : (
            <div className="rounded-md border border-border/50 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-9">Date</TableHead>
                    <TableHead className="h-9">Amount</TableHead>
                    <TableHead className="h-9">Status</TableHead>
                    <TableHead className="h-9">Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="py-2 text-xs whitespace-nowrap">
                        {new Date(w.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="py-2 text-xs font-medium">
                        {w.currency === 'GHS' ? 'GH₵' : `${w.currency} `}{Number(w.amount).toFixed(2)}
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge variant={w.status === 'success' ? 'default' : w.status === 'failed' ? 'destructive' : 'secondary'} className="capitalize">
                          {w.status}
                        </Badge>
                        {w.status === 'failed' && w.failure_reason && (
                          <p className="text-[10px] text-destructive mt-1 max-w-[200px] truncate" title={w.failure_reason}>
                            {w.failure_reason}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="py-2 text-xs">
                        {w.korapay_reference ? (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(w.korapay_reference!);
                              toast.success('Reference copied');
                            }}
                            className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                            title="Click to copy"
                          >
                            <span className="truncate max-w-[140px]">{w.korapay_reference}</span>
                            <Copy className="h-3 w-3 shrink-0" />
                          </button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>


      {/* Withdraw dialog */}
      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request withdrawal</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Amount (GHS)</Label>
              <Input type="number" min={100} step={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100" />
              <p className="text-xs text-muted-foreground mt-1">Available: GH₵{effectiveBalance.toFixed(2)}</p>
            </div>
            <div>
              <Label>Payment method</Label>
              <Select value={selectedMethod} onValueChange={setSelectedMethod}>
                <SelectTrigger><SelectValue placeholder="Select a method" /></SelectTrigger>
                <SelectContent>
                  {methods.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{PROVIDER_LABEL[m.provider]} • {m.phone_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawOpen(false)}>Cancel</Button>
            <Button onClick={submitWithdrawal} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add method dialog */}
      <Dialog open={methodOpen} onOpenChange={setMethodOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add payment method</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Mobile Money provider</Label>
              <Select value={newMethod.provider} onValueChange={(v) => setNewMethod((p) => ({ ...p, provider: v as Method['provider'] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mtn">MTN MoMo</SelectItem>
                  <SelectItem value="vodafone">Vodafone Cash</SelectItem>
                  <SelectItem value="airteltigo">AirtelTigo Money</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Phone number</Label>
              <Input value={newMethod.phone_number} onChange={(e) => setNewMethod((p) => ({ ...p, phone_number: e.target.value }))} placeholder="0244123456" />
            </div>
            <div>
              <Label>Account name</Label>
              <Input value={newMethod.account_name} onChange={(e) => setNewMethod((p) => ({ ...p, account_name: e.target.value }))} placeholder="As registered with MoMo" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMethodOpen(false)}>Cancel</Button>
            <Button onClick={addMethod}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
