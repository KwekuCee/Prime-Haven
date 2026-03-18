import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Mail, UserSquare, Send, Loader2, Phone, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import SuperAdminLayout from '@/components/admin/SuperAdminLayout';
import { format } from 'date-fns';

interface ClientRecord {
  name: string;
  email: string;
  whatsapp: string;
  source: 'order' | 'project';
  service: string;
  status: string;
  date: string;
  projectTitle?: string;
}

const ManageClients = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [emailDialog, setEmailDialog] = useState<ClientRecord | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/superadmin-login', { replace: true }); return; }
    const checkAccess = async () => {
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
      if (!data || !['superadmin', 'masteradmin'].includes(data.role)) {
        navigate('/dashboard', { replace: true });
        return;
      }
      loadClients();
    };
    checkAccess();
  }, [user, authLoading, navigate]);

  const loadClients = async () => {
    setLoading(true);
    try {
      const [ordersRes, projectsRes] = await Promise.all([
        supabase.from('client_orders').select('client_name, client_email, client_whatsapp, service_type, tier, payment_status, created_at').order('created_at', { ascending: false }),
        supabase.from('client_projects').select('title, client_name, client_email, client_whatsapp, category, status, created_at').order('created_at', { ascending: false }),
      ]);

      const records: ClientRecord[] = [];
      (ordersRes.data || []).forEach((o: any) => {
        records.push({
          name: o.client_name,
          email: o.client_email,
          whatsapp: o.client_whatsapp || '',
          source: 'order',
          service: `${o.service_type} (${o.tier})`,
          status: o.payment_status,
          date: o.created_at,
        });
      });
      (projectsRes.data || []).forEach((p: any) => {
        records.push({
          name: p.client_name,
          email: p.client_email || '',
          whatsapp: p.client_whatsapp || '',
          source: 'project',
          service: p.category,
          status: p.status,
          date: p.created_at,
          projectTitle: p.title,
        });
      });

      setClients(records);
    } catch (err) {
      console.error('Error loading clients:', err);
    } finally {
      setLoading(false);
    }
  };

  // Deduplicate by email for unique clients
  const uniqueClients = useMemo(() => {
    const map = new Map<string, ClientRecord>();
    clients.forEach(c => {
      const key = c.email?.toLowerCase() || c.name.toLowerCase();
      if (!map.has(key)) map.set(key, c);
    });
    return Array.from(map.values());
  }, [clients]);

  const filteredClients = useMemo(() => {
    if (!searchQuery) return clients;
    const q = searchQuery.toLowerCase();
    return clients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.service.toLowerCase().includes(q)
    );
  }, [clients, searchQuery]);

  const openEmailDialog = (client: ClientRecord) => {
    setEmailDialog(client);
    setEmailSubject('');
    setEmailBody('');
  };

  const handleSendEmail = async () => {
    if (!emailDialog || !emailSubject.trim() || !emailBody.trim()) {
      toast({ title: 'Missing fields', description: 'Subject and body are required.', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-client-email', {
        body: {
          to: emailDialog.email,
          subject: emailSubject.trim(),
          body: emailBody.trim(),
          clientName: emailDialog.name,
        },
      });
      if (error) throw error;
      toast({ title: 'Email Sent!', description: `Email sent to ${emailDialog.email}` });
      setEmailDialog(null);
    } catch (err: any) {
      console.error('Send email error:', err);
      toast({ title: 'Send Failed', description: err.message || 'Could not send email.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <SuperAdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-heading font-bold flex items-center gap-3">
              <UserSquare className="w-7 h-7 text-primary" />
              Client Management
            </h1>
            <p className="text-muted-foreground mt-1">View all clients and send them emails</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{uniqueClients.length} unique clients</Badge>
            <Badge variant="outline">{clients.length} total records</Badge>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold">{clients.filter(c => c.source === 'order').length}</div>
              <p className="text-sm text-muted-foreground">Service Orders</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-primary">{clients.filter(c => c.source === 'project').length}</div>
              <p className="text-sm text-muted-foreground">Projects</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-emerald-500">{clients.filter(c => c.email).length}</div>
              <p className="text-sm text-muted-foreground">With Email</p>
            </CardContent>
          </Card>
        </div>

        {/* Client Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle>All Client Records</CardTitle>
                <CardDescription>Combined from orders and projects</CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search clients..."
                  className="pl-9 w-full sm:w-[250px]"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <UserSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>No clients found.</p>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>WhatsApp</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-semibold">
                          {client.name}
                          {client.projectTitle && (
                            <p className="text-xs text-muted-foreground">{client.projectTitle}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{client.email || '—'}</TableCell>
                        <TableCell className="text-sm">
                          {client.whatsapp ? (
                            <a href={`https://wa.me/${client.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener" className="text-primary hover:underline flex items-center gap-1">
                              <Phone className="w-3 h-3" />{client.whatsapp}
                            </a>
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {client.source === 'order' ? 'Order' : 'Project'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{client.service}</TableCell>
                        <TableCell>
                          <Badge variant={client.status === 'completed' || client.status === 'paid' ? 'default' : 'outline'} className="text-xs">
                            {client.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(client.date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          {client.email && (
                            <Button size="sm" variant="outline" onClick={() => openEmailDialog(client)} className="gap-1">
                              <Mail className="w-3 h-3" />
                              Email
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Send Email Dialog */}
      <Dialog open={!!emailDialog} onOpenChange={(open) => !open && setEmailDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Send Email to {emailDialog?.name}
            </DialogTitle>
            <DialogDescription>
              Sending to: {emailDialog?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                placeholder="Email subject..."
                value={emailSubject}
                onChange={e => setEmailSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                placeholder="Write your message..."
                value={emailBody}
                onChange={e => setEmailBody(e.target.value)}
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialog(null)}>Cancel</Button>
            <Button onClick={handleSendEmail} disabled={sending || !emailSubject.trim() || !emailBody.trim()}>
              {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
};

export default ManageClients;
