import { useState, useEffect } from 'react';
import { ShoppingCart, Search, Eye, CheckCircle, Clock, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ClientOrder {
  id: string;
  client_name: string;
  client_email: string;
  client_whatsapp: string | null;
  service_type: string;
  tier: string;
  price: number;
  description: string | null;
  payment_status: string;
  payment_reference: string | null;
  created_at: string;
}

const ManageClientOrders = () => {
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { toast } = useToast();

  useEffect(() => { loadOrders(); }, []);

  const loadOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('client_orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) console.error(error);
    setOrders(data || []);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('client_orders').update({ payment_status: status, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Updated', description: `Order status set to ${status}` });
      loadOrders();
    }
  };

  const filtered = orders.filter(o => {
    const matchSearch = !search || o.client_name.toLowerCase().includes(search.toLowerCase()) || o.client_email.toLowerCase().includes(search.toLowerCase()) || o.service_type.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || o.payment_status === statusFilter;
    return matchSearch && matchStatus;
  });

  const exportOrders = () => {
    const rows = filtered.map(o => ({
      Client: o.client_name,
      Email: o.client_email,
      Service: o.service_type,
      Tier: o.tier,
      Price: `GH₵${o.price.toFixed(2)}`,
      Status: o.payment_status,
      Date: format(new Date(o.created_at), 'yyyy-MM-dd HH:mm'),
    }));
    const headers = Object.keys(rows[0] || {});
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify((r as any)[h] ?? '')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `client-orders-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const statusColor = (s: string) => {
    if (s === 'completed' || s === 'paid') return 'bg-emerald-600';
    if (s === 'pending') return 'bg-amber-500';
    return '';
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/50 bg-card/50">
        <div className="p-4 sm:p-5 border-b border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold flex items-center gap-2"><ShoppingCart className="w-4 h-4" />Client Orders ({orders.length})</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Manage incoming client orders</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
                <Input placeholder="Search..." className="pl-8 h-8 text-sm w-full sm:w-48" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-sm w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={exportOrders}>
                <Download className="w-3.5 h-3.5 mr-1" />Export
              </Button>
            </div>
          </div>
        </div>

        {filtered.length > 0 ? (
          <>
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-semibold">Client</TableHead>
                    <TableHead className="text-xs font-semibold">Service</TableHead>
                    <TableHead className="text-xs font-semibold">Tier</TableHead>
                    <TableHead className="text-xs font-semibold">Price</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-xs font-semibold">Date</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(order => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div className="text-sm font-medium">{order.client_name}</div>
                        <div className="text-[11px] text-muted-foreground">{order.client_email}</div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{order.service_type}</Badge></TableCell>
                      <TableCell className="text-xs">{order.tier}</TableCell>
                      <TableCell className="text-sm font-bold">GH₵{order.price.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${statusColor(order.payment_status)}`}>{order.payment_status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(order.created_at), 'MMM d, yy')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {order.payment_status === 'pending' && (
                            <Button size="sm" variant="ghost" className="h-7 text-[10px] text-emerald-500" onClick={() => updateStatus(order.id, 'completed')}>
                              <CheckCircle className="w-3 h-3 mr-1" />Complete
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden divide-y divide-border/30">
              {filtered.map(order => (
                <div key={order.id} className="p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-semibold">{order.client_name}</p>
                      <p className="text-[11px] text-muted-foreground">{order.client_email}</p>
                    </div>
                    <Badge className={`text-[10px] ${statusColor(order.payment_status)}`}>{order.payment_status}</Badge>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">{order.service_type}</Badge>
                    <span className="text-xs font-bold">GH₵{order.price.toFixed(2)}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{format(new Date(order.created_at), 'MMM d')}</span>
                  </div>
                  {order.payment_status === 'pending' && (
                    <Button size="sm" variant="outline" className="h-7 text-[10px] w-full" onClick={() => updateStatus(order.id, 'completed')}>
                      <CheckCircle className="w-3 h-3 mr-1" />Mark Completed
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No orders found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageClientOrders;
