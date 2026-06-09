import { useState, useMemo, useEffect } from 'react';
import { DollarSign, Search, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';

interface Payment {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  status: string;
  transaction_id: string;
  created_at: string;
  user_name: string;
}

interface AdminPaymentsProps {
  payments: Payment[];
  onExport: () => void;
}

const ITEMS_PER_PAGE = 10;

const AdminPayments = ({ payments, onExport }: AdminPaymentsProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let result = payments;
    if (statusFilter !== 'all') result = result.filter(p => p.status === statusFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.user_name.toLowerCase().includes(q) || p.transaction_id?.toLowerCase().includes(q) || p.type.toLowerCase().includes(q));
    }
    return result;
  }, [payments, statusFilter, searchQuery]);

  useEffect(() => { setPage(1); }, [statusFilter, searchQuery]);

  const paged = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/50 bg-card/50">
        <div className="p-4 sm:p-5 border-b border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold">Payments ({payments.length})</h2>
              <p className="text-xs text-muted-foreground mt-0.5">All payment transactions</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
                <Input placeholder="Search..." className="pl-8 h-8 text-sm w-full sm:w-44" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onExport}>
                <Download className="w-3.5 h-3.5 mr-1" />Export
              </Button>
            </div>
          </div>
        </div>

        {filtered.length > 0 ? (
          <>
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-semibold">User</TableHead>
                    <TableHead className="text-xs font-semibold">Amount</TableHead>
                    <TableHead className="text-xs font-semibold">Type</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-xs font-semibold">Transaction ID</TableHead>
                    <TableHead className="text-xs font-semibold">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm font-medium">{p.user_name}</TableCell>
                      <TableCell className="text-sm font-bold">GH₵{p.amount.toFixed(2)}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{p.type}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={p.status === 'completed' ? 'default' : p.status === 'failed' ? 'destructive' : 'outline'} className="text-[10px]">
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-muted-foreground">{p.transaction_id}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(p.created_at), 'MMM d, yy')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="sm:hidden divide-y divide-border/30">
              {paged.map((p) => (
                <div key={p.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{p.user_name}</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{p.type}</Badge>
                      <span>{format(new Date(p.created_at), 'MMM d')}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold">GH₵{p.amount.toFixed(2)}</div>
                    <Badge variant={p.status === 'completed' ? 'default' : 'outline'} className="text-[10px]">{p.status}</Badge>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-border/50">
                <p className="text-[11px] text-muted-foreground">
                  {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
                </p>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No payments found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPayments;
