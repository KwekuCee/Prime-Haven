import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import SuperAdminLayout from '@/components/admin/SuperAdminLayout';
import { format } from 'date-fns';

interface LogRow {
  id: string;
  admin_id: string | null;
  action_type: string;
  description: string | null;
  timestamp: string | null;
}

const PAGE_SIZE = 25;

const CATEGORIES: Record<string, { label: string; match: (a: string) => boolean; tone: string }> = {
  money: { label: 'Money', match: (a) => /withdraw|salary|payment|revenue|ledger|tip/.test(a), tone: 'bg-emerald-500/10 text-emerald-700' },
  work: { label: 'Work & reviews', match: (a) => /submission|correction|client_|work_|project|approval|contract/.test(a), tone: 'bg-blue-500/10 text-blue-700' },
  access: { label: 'Access & roles', match: (a) => /login|role|user_|admin_|password|promote|demote/.test(a), tone: 'bg-amber-500/10 text-amber-700' },
  comms: { label: 'Messages & email', match: (a) => /email|broadcast|notification/.test(a), tone: 'bg-primary/10 text-primary' },
};

const categoryOf = (a: string) => Object.entries(CATEGORIES).find(([, c]) => c.match(a))?.[0] || 'other';
const prettyAction = (a: string) => a.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

const ActivityLog = () => {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('system_logs')
      .select('id, admin_id, action_type, description, timestamp', { count: 'exact' })
      .order('timestamp', { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    const term = search.trim().replace(/[%,()]/g, '');
    if (term) q = q.or(`action_type.ilike.%${term}%,description.ilike.%${term}%`);
    if (category === 'money') q = q.or('action_type.ilike.%withdraw%,action_type.ilike.%salary%,action_type.ilike.%payment%,action_type.ilike.%revenue%,action_type.ilike.%ledger%');
    if (category === 'work') q = q.or('action_type.ilike.%submission%,action_type.ilike.%correction%,action_type.ilike.%client_%,action_type.ilike.%work_%,action_type.ilike.%project%,action_type.ilike.%approval%,action_type.ilike.%contract%');
    if (category === 'access') q = q.or('action_type.ilike.%login%,action_type.ilike.%role%,action_type.ilike.%user_%,action_type.ilike.%admin_%,action_type.ilike.%password%');
    if (category === 'comms') q = q.or('action_type.ilike.%email%,action_type.ilike.%broadcast%');
    const { data, count } = await q;
    const list = (data || []) as LogRow[];
    setRows(list);
    setTotal(count || 0);
    const ids = [...new Set(list.map((r) => r.admin_id).filter(Boolean))] as string[];
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles').select('id, full_name, email').in('id', ids);
      setNames(new Map((profs || []).map((p: any) => [p.id, p.full_name || p.email])));
    }
    setLoading(false);
  }, [page, search, category]);

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  useEffect(() => { setPage(0); }, [search, category]);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  return (
    <SuperAdminLayout onRefresh={load} loading={loading}>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Activity log</h1>
          <p className="text-sm text-muted-foreground">Every admin, payout, role and project change in one place. {total} entries.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search actions or details" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search activity" />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="sm:w-48" aria-label="Filter by category"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All activity</SelectItem>
              {Object.entries(CATEGORIES).map(([k, c]) => <SelectItem key={k} value={k}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="rounded-2xl border border-border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow><TableHead>When</TableHead><TableHead>Action</TableHead><TableHead>By</TableHead><TableHead>Details</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && !loading && (
                <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No activity found.</TableCell></TableRow>
              )}
              {rows.map((r) => {
                const cat = CATEGORIES[categoryOf(r.action_type)];
                return (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{r.timestamp ? format(new Date(r.timestamp), 'MMM d, HH:mm') : '-'}</TableCell>
                    <TableCell><Badge variant="outline" className={`border-0 whitespace-nowrap ${cat?.tone || 'bg-muted text-muted-foreground'}`}>{prettyAction(r.action_type)}</Badge></TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{r.admin_id ? names.get(r.admin_id) || 'User' : 'System'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground min-w-[240px]">{r.description || '-'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Page {page + 1} of {pages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)} aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)} aria-label="Next page"><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
};

export default ActivityLog;
