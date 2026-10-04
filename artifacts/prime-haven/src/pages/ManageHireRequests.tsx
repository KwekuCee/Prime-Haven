import { useEffect, useMemo, useState } from 'react';
import { Search, Loader2, Trash2, Mail, Phone, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import SuperAdminLayout from '@/components/admin/SuperAdminLayout';
import { CORE_SERVICES } from '@/lib/coreServices';
import { format } from 'date-fns';

interface HireRequest {
  id: string;
  full_name: string;
  email: string;
  whatsapp: string | null;
  service_slug: string;
  service_label: string | null;
  tier: string | null;
  budget: string | null;
  deadline: string | null;
  brief: string;
  reference_images: string[] | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

const STATUSES = ['new', 'contacted', 'quoted', 'converted', 'closed'] as const;

const statusTone: Record<string, string> = {
  new: 'bg-primary/10 text-primary',
  contacted: 'bg-blue-500/10 text-blue-600',
  quoted: 'bg-amber-500/10 text-amber-600',
  converted: 'bg-emerald-500/10 text-emerald-600',
  closed: 'bg-muted text-muted-foreground',
};

const ManageHireRequests = () => {
  const { checking: guardLoading } = useAdminGuard();
  const { toast } = useToast();

  const [rows, setRows] = useState<HireRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<HireRequest | null>(null);
  const [deleting, setDeleting] = useState<HireRequest | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('hire_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast({ variant: 'destructive', title: 'Could not load requests', description: error.message });
    } else {
      setRows((data || []) as HireRequest[]);
    }
    setLoading(false);
  };

  useEffect(() => { if (!guardLoading) void load(); }, [guardLoading]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (serviceFilter !== 'all' && r.service_slug !== serviceFilter) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!q) return true;
      return [r.full_name, r.email, r.brief, r.service_label || ''].some((v) => v.toLowerCase().includes(q));
    });
  }, [rows, search, serviceFilter, statusFilter]);

  const setStatus = async (row: HireRequest, status: string) => {
    setBusy(true);
    const { error } = await (supabase as any).from('hire_requests').update({ status }).eq('id', row.id);
    setBusy(false);
    if (error) {
      toast({ variant: 'destructive', title: 'Update failed', description: error.message });
      return;
    }
    setRows((p) => p.map((r) => (r.id === row.id ? { ...r, status } : r)));
    setSelected((s) => (s && s.id === row.id ? { ...s, status } : s));
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    const { error } = await (supabase as any).from('hire_requests').delete().eq('id', deleting.id);
    setBusy(false);
    if (error) {
      toast({ variant: 'destructive', title: 'Delete failed', description: error.message });
      return;
    }
    setRows((p) => p.filter((r) => r.id !== deleting.id));
    setDeleting(null);
    setSelected(null);
    toast({ title: 'Request deleted' });
  };

  return (
    <SuperAdminLayout onRefresh={load} loading={loading}>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Hire requests</h1>
          <p className="text-sm text-muted-foreground">
            Direct enquiries sent from the service pages. {rows.length} total.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email or brief" className="h-11 rounded-xl pl-9" />
          </div>
          <Select value={serviceFilter} onValueChange={setServiceFilter}>
            <SelectTrigger className="h-11 rounded-xl sm:w-56"><SelectValue placeholder="All services" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All services</SelectItem>
              {CORE_SERVICES.map((s) => <SelectItem key={s.slug} value={s.slug}>{s.title}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-11 rounded-xl sm:w-44"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No hire requests yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id} className="cursor-pointer" onClick={() => setSelected(r)}>
                      <TableCell>
                        <p className="font-medium text-foreground">{r.full_name}</p>
                        <p className="text-xs text-muted-foreground">{r.email}</p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{r.service_label || r.service_slug}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.tier || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.budget || '—'}</TableCell>
                      <TableCell>
                        <Badge className={`${statusTone[r.status] || 'bg-muted'} capitalize`} variant="secondary">{r.status}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {format(new Date(r.created_at), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); setDeleting(r); }}
                          aria-label={`Delete request from ${r.full_name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Detail */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.full_name}</DialogTitle>
                <DialogDescription>
                  {selected.service_label || selected.service_slug}
                  {selected.tier ? ` · ${selected.tier}` : ''}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <a href={`mailto:${selected.email}`} className="flex items-center gap-2 rounded-xl border border-border/60 px-4 py-3 text-sm hover:border-primary/40">
                    <Mail className="h-4 w-4 text-primary" /> {selected.email}
                  </a>
                  {selected.whatsapp && (
                    <a href={`https://wa.me/${selected.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-border/60 px-4 py-3 text-sm hover:border-primary/40">
                      <Phone className="h-4 w-4 text-primary" /> {selected.whatsapp}
                    </a>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-border/60 bg-muted/40 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Budget</p>
                    <p className="mt-1 text-sm font-semibold">{selected.budget || '—'}</p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-muted/40 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Deadline</p>
                    <p className="mt-1 text-sm font-semibold">{selected.deadline || '—'}</p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-muted/40 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Received</p>
                    <p className="mt-1 text-sm font-semibold">{format(new Date(selected.created_at), 'dd MMM yyyy')}</p>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Brief</p>
                  <p className="mt-2 whitespace-pre-wrap rounded-xl border border-border/60 bg-muted/30 p-4 text-sm leading-relaxed">{selected.brief}</p>
                </div>

                {selected.reference_images && selected.reference_images.length > 0 && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">References</p>
                    <ul className="mt-2 space-y-1.5">
                      {selected.reference_images.map((url) => (
                        <li key={url}>
                          <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 break-all text-sm text-primary underline">
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" /> {url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Status</p>
                  <Select value={selected.status} onValueChange={(v) => setStatus(selected, v)} disabled={busy}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" className="rounded-xl" onClick={() => setDeleting(selected)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
                <Button className="rounded-xl" onClick={() => setSelected(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this request?</DialogTitle>
            <DialogDescription>
              {deleting?.full_name}'s request will be permanently removed. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="destructive" className="rounded-xl" onClick={remove} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />} Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
};

export default ManageHireRequests;
