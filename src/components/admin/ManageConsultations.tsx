import { useState, useEffect } from 'react';
import { Calendar, Search, CheckCircle, XCircle, Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Booking {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  service_interest: string | null;
  preferred_date: string;
  preferred_time: string;
  message: string | null;
  status: string;
  created_at: string;
}

const ManageConsultations = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { toast } = useToast();

  useEffect(() => { loadBookings(); }, []);

  const loadBookings = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('consultation_bookings').select('*').order('created_at', { ascending: false });
    if (error) console.error(error);
    setBookings(data || []);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('consultation_bookings').update({ status }).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Updated', description: `Booking ${status}` });
      loadBookings();
    }
  };

  const deleteBooking = async (id: string) => {
    const { error } = await supabase.from('consultation_bookings').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Deleted' });
      loadBookings();
    }
  };

  const filtered = bookings.filter(b => {
    const matchSearch = !search || b.full_name.toLowerCase().includes(search.toLowerCase()) || b.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusBadge = (s: string) => {
    if (s === 'confirmed') return <Badge className="text-[10px] bg-emerald-600">Confirmed</Badge>;
    if (s === 'cancelled') return <Badge variant="destructive" className="text-[10px]">Cancelled</Badge>;
    return <Badge variant="outline" className="text-[10px]">Pending</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/50 bg-card/50">
        <div className="p-4 sm:p-5 border-b border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold flex items-center gap-2"><Calendar className="w-4 h-4" />Consultations ({bookings.length})</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Manage consultation booking requests</p>
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
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {filtered.length > 0 ? (
          <>
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-semibold">Name</TableHead>
                    <TableHead className="text-xs font-semibold">Contact</TableHead>
                    <TableHead className="text-xs font-semibold">Service</TableHead>
                    <TableHead className="text-xs font-semibold">Date/Time</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(b => (
                    <TableRow key={b.id}>
                      <TableCell>
                        <div className="text-sm font-medium">{b.full_name}</div>
                        {b.company_name && <div className="text-[11px] text-muted-foreground">{b.company_name}</div>}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">{b.email}</div>
                        {b.phone && <div className="text-[11px] text-muted-foreground">{b.phone}</div>}
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{b.service_interest || 'General'}</Badge></TableCell>
                      <TableCell>
                        <div className="text-xs font-medium">{format(new Date(b.preferred_date), 'MMM d, yyyy')}</div>
                        <div className="text-[11px] text-muted-foreground">{b.preferred_time}</div>
                      </TableCell>
                      <TableCell>{statusBadge(b.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {b.status === 'pending' && (
                            <>
                              <Button size="sm" variant="ghost" className="h-7 text-[10px] text-emerald-500" onClick={() => updateStatus(b.id, 'confirmed')}>
                                <CheckCircle className="w-3 h-3 mr-1" />Confirm
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 text-[10px] text-destructive" onClick={() => updateStatus(b.id, 'cancelled')}>
                                <XCircle className="w-3 h-3 mr-1" />Cancel
                              </Button>
                            </>
                          )}
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteBooking(b.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden divide-y divide-border/30">
              {filtered.map(b => (
                <div key={b.id} className="p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-semibold">{b.full_name}</p>
                      <p className="text-[11px] text-muted-foreground">{b.email}</p>
                    </div>
                    {statusBadge(b.status)}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-[11px]">
                    <Badge variant="outline" className="text-[10px]">{b.service_interest || 'General'}</Badge>
                    <span className="text-muted-foreground">{format(new Date(b.preferred_date), 'MMM d')} · {b.preferred_time}</span>
                  </div>
                  {b.message && <p className="text-[11px] text-muted-foreground line-clamp-2">{b.message}</p>}
                  {b.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="h-7 text-[10px] flex-1 text-emerald-500" onClick={() => updateStatus(b.id, 'confirmed')}>Confirm</Button>
                      <Button size="sm" variant="outline" className="h-7 text-[10px] flex-1 text-destructive" onClick={() => updateStatus(b.id, 'cancelled')}>Cancel</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No consultation bookings</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageConsultations;
