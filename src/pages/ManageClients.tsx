import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Mail, UserSquare, Send, Loader2, Phone, Plus, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import SuperAdminLayout from '@/components/admin/SuperAdminLayout';
import { format } from 'date-fns';

interface Client {
  id: string;
  name: string;
  email: string | null;
  whatsapp: string | null;
  company: string | null;
  notes: string | null;
  created_at: string;
}

const ManageClients = () => {
  const { user, checking } = useAdminGuard();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [emailDialog, setEmailDialog] = useState<Client | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sending, setSending] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', email: '', whatsapp: '', company: '', notes: '' });
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', whatsapp: '', company: '', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!checking && user) {
      loadClients();
    }
  }, [checking, user]);

  const loadClients = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setClients((data || []) as Client[]);
    } catch (err) {
      console.error('Error loading clients:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = useMemo(() => {
    if (!searchQuery) return clients;
    const q = searchQuery.toLowerCase();
    return clients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.company || '').toLowerCase().includes(q)
    );
  }, [clients, searchQuery]);

  const handleAddClient = async () => {
    if (!addForm.name.trim()) {
      toast({ title: 'Name required', variant: 'destructive' });
      return;
    }
    setAdding(true);
    try {
      const { error } = await supabase.from('clients').insert({
        name: addForm.name.trim(),
        email: addForm.email.trim() || null,
        whatsapp: addForm.whatsapp.trim() || null,
        company: addForm.company.trim() || null,
        notes: addForm.notes.trim() || null,
      });
      if (error) throw error;
      toast({ title: 'Client Added!', description: `${addForm.name} has been added.` });
      setAddForm({ name: '', email: '', whatsapp: '', company: '', notes: '' });
      setIsAddOpen(false);
      await loadClients();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.from('clients').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      toast({ title: 'Deleted', description: `${deleteTarget.name} has been removed.` });
      setDeleteTarget(null);
      await loadClients();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const openEditDialog = (client: Client) => {
    setEditClient(client);
    setEditForm({
      name: client.name,
      email: client.email || '',
      whatsapp: client.whatsapp || '',
      company: client.company || '',
      notes: client.notes || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editClient || !editForm.name.trim()) {
      toast({ title: 'Name required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('clients').update({
        name: editForm.name.trim(),
        email: editForm.email.trim() || null,
        whatsapp: editForm.whatsapp.trim() || null,
        company: editForm.company.trim() || null,
        notes: editForm.notes.trim() || null,
      }).eq('id', editClient.id);
      if (error) throw error;
      toast({ title: 'Client Updated!', description: `${editForm.name} has been updated.` });
      setEditClient(null);
      await loadClients();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const openEmailDialog = (client: Client) => {
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
      toast({ title: 'Send Failed', description: err.message || 'Could not send email.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <SuperAdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-bold flex items-center gap-2">
              <UserSquare className="w-6 h-6 text-primary" />
              Client Management
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">Add, manage and email your clients</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">{clients.length} clients</Badge>
            <Button size="sm" onClick={() => setIsAddOpen(true)} className="gap-1.5">
              <Plus className="w-4 h-4" /> Add Client
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border/50 bg-card/50">
          <div className="p-4 sm:p-5 border-b border-border/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold">All Clients</h2>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Search clients..." className="pl-8 h-8 text-sm w-full sm:w-48" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="p-4 sm:p-5">
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <UserSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>{searchQuery ? 'No clients match your search.' : 'No clients yet. Add your first client!'}</p>
                {!searchQuery && (
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => setIsAddOpen(true)}>
                    <Plus className="w-4 h-4 mr-1" /> Add Client
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-md border border-border/50 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs font-semibold">Client</TableHead>
                      <TableHead className="text-xs font-semibold">Email</TableHead>
                      <TableHead className="text-xs font-semibold">WhatsApp</TableHead>
                      <TableHead className="text-xs font-semibold">Company</TableHead>
                      <TableHead className="text-xs font-semibold">Added</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell className="font-semibold">{client.name}</TableCell>
                        <TableCell className="text-sm">{client.email || '—'}</TableCell>
                        <TableCell className="text-sm">
                          {client.whatsapp ? (
                            <a href={`https://wa.me/${client.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener" className="text-primary hover:underline flex items-center gap-1">
                              <Phone className="w-3 h-3" />{client.whatsapp}
                            </a>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-sm">{client.company || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(client.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="outline" onClick={() => openEditDialog(client)} className="gap-1 h-7 text-xs">
                              <Pencil className="w-3 h-3" /> Edit
                            </Button>
                            {client.email && (
                              <Button size="sm" variant="outline" onClick={() => openEmailDialog(client)} className="gap-1 h-7 text-xs">
                                <Mail className="w-3 h-3" /> Email
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(client)} className="h-7 text-xs text-destructive hover:text-destructive">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Client Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" /> Add New Client
            </DialogTitle>
            <DialogDescription>Add a client to your directory.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input placeholder="Client name" value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="client@example.com" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>WhatsApp</Label>
              <Input placeholder="+233..." value={addForm.whatsapp} onChange={e => setAddForm(f => ({ ...f, whatsapp: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Company</Label>
              <Input placeholder="Company name" value={addForm.company} onChange={e => setAddForm(f => ({ ...f, company: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea placeholder="Any notes..." value={addForm.notes} onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddClient} disabled={adding || !addForm.name.trim()}>
              {adding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Add Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={!!editClient} onOpenChange={(open) => !open && setEditClient(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" /> Edit Client
            </DialogTitle>
            <DialogDescription>Update client details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input placeholder="Client name" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="client@example.com" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>WhatsApp</Label>
              <Input placeholder="+233..." value={editForm.whatsapp} onChange={e => setEditForm(f => ({ ...f, whatsapp: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Company</Label>
              <Input placeholder="Company name" value={editForm.company} onChange={e => setEditForm(f => ({ ...f, company: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea placeholder="Any notes..." value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditClient(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={saving || !editForm.name.trim()}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Pencil className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClient} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send Email Dialog */}
      <Dialog open={!!emailDialog} onOpenChange={(open) => !open && setEmailDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Send Email to {emailDialog?.name}
            </DialogTitle>
            <DialogDescription>Sending to: {emailDialog?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input placeholder="Email subject..." value={emailSubject} onChange={e => setEmailSubject(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea placeholder="Write your message..." value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={6} />
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
