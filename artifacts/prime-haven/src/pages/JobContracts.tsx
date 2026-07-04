import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Briefcase, Plus, Send, Calendar, DollarSign, Users, FileText,
  ArrowLeft, Trash2, Clock, CheckCircle, XCircle, Upload, Image as ImageIcon,
  Loader2, RefreshCw, UserPlus, FileSearch
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import SuperAdminLayout from '@/components/admin/SuperAdminLayout';
import { format } from 'date-fns';

const JOB_CATEGORIES = [
  { id: 'graphic-design', label: 'Graphic Design' },
  { id: 'app-design', label: 'UI/UX Design' },
  { id: 'web-dev', label: 'Web Development' },
];

interface JobContract {
  id: string;
  title: string;
  description: string;
  category: string;
  deadline: string | null;
  budget: string | null;
  requirements: string | null;
  client_name: string | null;
  special_instructions: string | null;
  discord_message_id: string | null;
  discord_channel_id: string | null;
  reference_files: string[] | null;
  active_designers_count: number;
  active_designer_ids: string[];
  status: string;
  target_professions: string[] | null;
  created_at: string;
}

interface ClientOption {
  id: string;
  name: string;
  email: string | null;
  whatsapp: string | null;
  company: string | null;
}

const JobContracts = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<JobContract[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [posting, setPosting] = useState(false);

  const [referenceFiles, setReferenceFiles] = useState<{ file: File; uploading: boolean; url?: string }[]>([]);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  const [clientsList, setClientsList] = useState<ClientOption[]>([]);
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);
  const [newClientForm, setNewClientForm] = useState({ name: '', email: '', whatsapp: '', company: '' });
  const [addingClient, setAddingClient] = useState(false);
  const [designerNames, setDesignerNames] = useState<Record<string, string>>({});

  const [isPushDialogOpen, setIsPushDialogOpen] = useState(false);
  const [selectedContractForPush, setSelectedContractForPush] = useState<JobContract | null>(null);
  const [pushProfessions, setPushProfessions] = useState<string[]>([]);
  const [pushing, setPushing] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    deadline: '',
    budget: '',
    requirements: '',
    clientName: '',
    specialInstructions: '',
  });

  const loadClients = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('clients')
        .select('id, name, email, whatsapp, company')
        .order('name');
      setClientsList((data || []) as ClientOption[]);
    } catch (err) {
      console.error('Error loading clients:', err);
    }
  }, []);

  const loadContracts = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('job_contracts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const contractsData = (data || []) as JobContract[];
      setContracts(contractsData);

      // 1. Collect IDs from active_designer_ids (legacy)
      const legacyIds = [...new Set(contractsData.flatMap(c => c.active_designer_ids || []))];

      // 2. Fetch from job_contract_claims (new system)
      const contractIds = contractsData.map(c => c.id);
      const { data: claimsData } = contractIds.length
        ? await (supabase as any)
          .from('job_contract_claims')
          .select('contract_id, designer_id')
          .in('contract_id', contractIds)
          .eq('status', 'active')
        : { data: [] };

      const claimDesignerIds = [...new Set((claimsData || []).map((cl: any) => cl.designer_id))];

      // 3. Resolve all unique designer IDs
      const allIds = [...new Set([...legacyIds, ...claimDesignerIds])] as string[];
      if (allIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', allIds);

        const names: Record<string, string> = {};
        profiles?.forEach(p => { names[p.id] = p.full_name || 'Designer'; });
        setDesignerNames(names);
      }
    } catch (err: any) {
      console.error('Error loading contracts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/superadmin-login', { replace: true });
      return;
    }
    const checkAccess = async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      if (!data || !['superadmin', 'masteradmin'].includes(data.role)) {
        navigate('/dashboard', { replace: true });
        return;
      }
      await Promise.all([loadContracts(), loadClients()]);
    };
    checkAccess();
  }, [user, authLoading, navigate, loadContracts, loadClients]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    for (const file of Array.from(files)) {
      const entry = { file, uploading: true } as { file: File; uploading: boolean; url?: string };
      setReferenceFiles(prev => [...prev, entry]);

      try {
        const ext = file.name.split('.').pop();
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from('job-reference-files').upload(path, file);
        if (error) throw error;

        const { data: signed } = await supabase.storage
          .from('job-reference-files')
          .createSignedUrl(path, 60 * 60 * 24 * 365);
        const url = signed?.signedUrl ?? '';
        setReferenceFiles(prev => prev.map(f => f.file === file ? { ...f, uploading: false, url } : f));
      } catch (err: any) {
        console.error('Upload error:', err);
        setReferenceFiles(prev => prev.filter(f => f.file !== file));
        toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
      }
    }
    e.target.value = '';
  };

  const removeReferenceFile = (index: number) => {
    setReferenceFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddNewClient = async () => {
    if (!newClientForm.name.trim()) {
      toast({ title: 'Name required', variant: 'destructive' });
      return;
    }
    setAddingClient(true);
    try {
      const { data, error } = await supabase.from('clients').insert({
        name: newClientForm.name.trim(),
        email: newClientForm.email.trim() || null,
        whatsapp: newClientForm.whatsapp.trim() || null,
        company: newClientForm.company.trim() || null,
      }).select().single();
      if (error) throw error;
      toast({ title: 'Client Added!', description: `${newClientForm.name} added to client list.` });
      setForm(f => ({ ...f, clientName: newClientForm.name.trim() }));
      setNewClientForm({ name: '', email: '', whatsapp: '', company: '' });
      setIsNewClientOpen(false);
      await loadClients();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setAddingClient(false);
    }
  };

  const handleCreate = async () => {
    if (!form.title || !form.description || !form.category) {
      toast({ title: 'Missing Fields', description: 'Title, description, and category are required.', variant: 'destructive' });
      return;
    }

    setPosting(true);
    try {
      const fileUrls = referenceFiles.filter(f => f.url).map(f => f.url!);

      const professionMap: Record<string, string[]> = {
        'graphic-design': ['Graphic Designer'],
        'app-design': ['UI/UX Designer'],
        'web-dev': ['Web Developer'],
      };

      const { data: contract, error } = await supabase
        .from('job_contracts')
        .insert({
          title: form.title,
          description: form.description,
          category: form.category,
          deadline: form.deadline || null,
          budget: form.budget || null,
          requirements: form.requirements || null,
          client_name: form.clientName || null,
          special_instructions: form.specialInstructions || null,
          reference_files: fileUrls.length > 0 ? fileUrls : null,
          posted_by: user?.id,
          status: 'active',
          target_professions: professionMap[form.category] || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Look up client email/whatsapp from the selected client
      const selectedClient = clientsList.find(c => c.name === form.clientName);

      const { error: fnError } = await supabase.functions.invoke('post-job-contract', {
        body: {
          title: form.title,
          description: form.description,
          category: form.category,
          deadline: form.deadline || null,
          budget: form.budget || null,
          requirements: form.requirements || null,
          clientName: form.clientName || null,
          clientEmail: selectedClient?.email || null,
          clientWhatsapp: selectedClient?.whatsapp || null,
          specialInstructions: form.specialInstructions || null,
          contractId: contract?.id,
          referenceFiles: fileUrls,
        },
      });

      if (fnError) {
        console.error('Edge function error:', fnError);
        toast({ title: 'Contract Saved', description: 'Contract saved. Discord/email notification may have failed — the contract is still listed below.', variant: 'destructive' });
      } else {
        toast({ title: 'Job Posted! 🎉', description: 'Contract posted to Discord and emails sent to relevant designers.' });
      }

      setForm({ title: '', description: '', category: '', deadline: '', budget: '', requirements: '', clientName: '', specialInstructions: '' });
      setReferenceFiles([]);
      setIsCreateOpen(false);
    } catch (err: any) {
      console.error('Error creating contract:', err);
      toast({ title: 'Error', description: err.message || 'Failed to create contract', variant: 'destructive' });
    } finally {
      setPosting(false);
      await loadContracts();
    }
  };

  const handleStatusUpdate = async (contract: JobContract, newStatus: string) => {
    setStatusUpdating(contract.id);
    try {
      const { error } = await supabase
        .from('job_contracts')
        .update({ status: newStatus })
        .eq('id', contract.id);
      if (error) throw error;

      // Sync with client_projects table where applicable
      if (contract.title && contract.client_name) {
        const projectStatusMap: Record<string, string> = {
          active: 'pending',
          in_progress: 'in_progress',
          completed: 'completed',
          cancelled: 'on_hold'
        };
        const syncedStatus = projectStatusMap[newStatus] || newStatus;

        const { error: projError } = await supabase
          .from('client_projects')
          .update({ status: syncedStatus })
          .eq('title', contract.title)
          .eq('client_name', contract.client_name);

        if (projError) {
          console.error("Optionally skipped project sync: ", projError);
        }
      }

      if (contract.discord_message_id && contract.discord_channel_id) {
        try {
          await supabase.functions.invoke('post-job-contract', {
            body: {
              action: 'update_status',
              contractId: contract.id,
              discordMessageId: contract.discord_message_id,
              discordChannelId: contract.discord_channel_id,
              title: contract.title,
              newStatus,
            },
          });
        } catch (discordErr) {
          console.error('Discord update failed:', discordErr);
        }
      }

      toast({ title: 'Status Updated', description: `Contract status changed to "${newStatus}".` });
      await loadContracts();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setStatusUpdating(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('job_contracts').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Deleted', description: 'Job contract removed.' });
      await loadContracts();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handlePushToMarketplace = async () => {
    if (!selectedContractForPush || pushProfessions.length === 0) return;

    setPushing(true);
    try {
      const { error } = await supabase
        .from('job_contracts')
        .update({
          status: 'active',
          target_professions: pushProfessions
        })
        .eq('id', selectedContractForPush.id);

      if (error) throw error;

      toast({
        title: 'Pushed to Marketplace!',
        description: `Contract is now visible to: ${pushProfessions.join(', ')}`
      });

      setIsPushDialogOpen(false);
      setSelectedContractForPush(null);
      await loadContracts();
    } catch (err: any) {
      console.error('Push error:', err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setPushing(false);
    }
  };

  const openPushDialog = (contract: JobContract) => {
    setSelectedContractForPush(contract);
    setPushProfessions(contract.target_professions || [contract.category]);
    setIsPushDialogOpen(true);
  };

  const getCategoryLabel = (id: string) => JOB_CATEGORIES.find(c => c.id === id)?.label || id;

  if (authLoading || loading) {
    return (
      <SuperAdminLayout>
        <div className="flex items-center justify-center py-32">
          <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-bold flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-primary" />
              Job Contracts
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">Post job briefs to Discord channels and notify designers via email</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} size="sm" className="gap-2">
            <Plus className="w-4 h-4" /> Post New Job
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Total Jobs', value: contracts.length, icon: Briefcase, color: 'text-primary', bg: 'bg-primary/10' },
            { label: 'Active Jobs', value: contracts.filter(c => c.status === 'active').length, icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: 'On Discord', value: contracts.filter(c => c.discord_message_id).length, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          ].map((card, i) => (
            <motion.div key={card.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }}>
              <div className="rounded-xl glass-card p-4 glass-hover">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{card.label}</span>
                  <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                    <card.icon className={`w-4 h-4 ${card.color}`} />
                  </div>
                </div>
                <div className="text-2xl font-bold tracking-tight">{card.value}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Contracts Table */}
        <div className="rounded-xl glass-card">
          <div className="p-4 sm:p-5 border-b border-border/50">
            <h2 className="text-base font-bold">All Job Contracts</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Manage job briefs posted to professional groups</p>
          </div>
          <div className="p-4 sm:p-5">
            {contracts.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>No job contracts posted yet.</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setIsCreateOpen(true)}>
                  Post Your First Job
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border border-white/5 bg-transparent">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs font-semibold">Title</TableHead>
                      <TableHead className="text-xs font-semibold">Category</TableHead>
                      <TableHead className="text-xs font-semibold">Budget</TableHead>
                      <TableHead className="text-xs font-semibold">Designer(s)</TableHead>
                      <TableHead className="text-xs font-semibold">Deadline</TableHead>
                      <TableHead className="text-xs font-semibold">Discord</TableHead>
                      <TableHead className="text-xs font-semibold">Status</TableHead>
                      <TableHead className="text-xs font-semibold">Posted</TableHead>
                      <TableHead className="text-xs font-semibold"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contracts.map(c => (
                      <TableRow key={c.id} className="group">
                        <TableCell className="font-medium text-sm max-w-[200px] truncate">{c.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-medium">{getCategoryLabel(c.category)}</Badge>
                        </TableCell>
                        <TableCell>{c.budget || '—'}</TableCell>
                        <TableCell>
                          {c.active_designer_ids && c.active_designer_ids.length > 0 ? (
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-2">
                                <div
                                  title={designerNames[c.active_designer_ids[0]] || 'Loading...'}
                                  className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary cursor-help shrink-0"
                                >
                                  {(designerNames[c.active_designer_ids[0]] || '?').charAt(0).toUpperCase()}
                                </div>
                                <span className="text-xs font-semibold truncate max-w-[100px]">
                                  {designerNames[c.active_designer_ids[0]] || 'Designer'}
                                </span>
                              </div>
                              {c.active_designer_ids.length > 1 && (
                                <div className="flex -space-x-1.5 ml-0.5">
                                  {c.active_designer_ids.slice(1, 4).map((id) => (
                                    <div
                                      key={id}
                                      title={designerNames[id] || 'Loading...'}
                                      className="h-4 w-4 rounded-full border border-background bg-muted flex items-center justify-center text-[7px] font-medium text-muted-foreground cursor-help"
                                    >
                                      {(designerNames[id] || '?').charAt(0).toUpperCase()}
                                    </div>
                                  ))}
                                  {c.active_designers_count > 4 && (
                                    <div className="h-4 w-4 rounded-full border border-background bg-muted flex items-center justify-center text-[7px] font-medium text-muted-foreground">
                                      +{c.active_designers_count - 4}
                                    </div>
                                  )}
                                  {c.active_designers_count > 1 && c.active_designers_count <= 4 && c.active_designers_count > c.active_designer_ids.length && (
                                    <div className="h-4 w-4 rounded-full border border-background bg-muted flex items-center justify-center text-[7px] font-medium text-muted-foreground">
                                      +{c.active_designers_count - c.active_designer_ids.length}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : c.active_designers_count > 0 ? (
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                                {c.active_designers_count} Claimants
                              </Badge>
                              <span className="text-[10px] text-muted-foreground italic">(IDs not synced)</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">None yet</span>
                          )}
                        </TableCell>
                        <TableCell>{c.deadline ? format(new Date(c.deadline), 'dd MMM yyyy') : '—'}</TableCell>
                        <TableCell>
                          {c.discord_message_id ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={c.status}
                            onValueChange={(v) => handleStatusUpdate(c, v)}
                            disabled={statusUpdating === c.id}
                          >
                            <SelectTrigger className="w-[120px] h-8 text-xs">
                              {statusUpdating === c.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <SelectValue />
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {format(new Date(c.created_at), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="View Related Submissions"
                              onClick={() => window.open(`/superadmin/submissions?contract=${encodeURIComponent(c.title)}`, '_blank')}
                            >
                              <FileSearch className="w-4 h-4 text-muted-foreground hover:text-primary" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Push to Marketplace"
                              onClick={() => openPushDialog(c)}
                            >
                              <Send className="w-4 h-4 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
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

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Post New Job Contract
            </DialogTitle>
            <DialogDescription>
              This will be posted to Discord and emailed to relevant group members.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div>
              <Label>Job Title *</Label>
              <Input
                placeholder="e.g. Logo Design for Tech Startup"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div>
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {JOB_CATEGORIES.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Description *</Label>
              <Textarea
                placeholder="Full description of the project..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Client Name</Label>
                <div className="flex gap-2">
                  <Select
                    value={form.clientName}
                    onValueChange={v => {
                      if (v === '__new__') {
                        setIsNewClientOpen(true);
                      } else {
                        setForm(f => ({ ...f, clientName: v }));
                      }
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientsList.map(c => (
                        <SelectItem key={c.id} value={c.name}>
                          <div className="flex flex-col">
                            <span>{c.name}</span>
                            {c.company && <span className="text-xs text-muted-foreground">{c.company}</span>}
                          </div>
                        </SelectItem>
                      ))}
                      <SelectItem value="__new__" className="text-primary font-medium">
                        <span className="flex items-center gap-1.5">
                          <UserPlus className="w-3.5 h-3.5" /> Add New Client
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Budget / Pay</Label>
                <Input
                  placeholder="e.g. GH₵500 or Negotiable"
                  value={form.budget}
                  onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>Deadline</Label>
              <Input
                type="date"
                value={form.deadline}
                onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
              />
            </div>

            <div>
              <Label>Requirements</Label>
              <Textarea
                placeholder="Specific requirements, deliverables, tools..."
                value={form.requirements}
                onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))}
                rows={3}
              />
            </div>

            <div>
              <Label>Special Instructions</Label>
              <Textarea
                placeholder="Any special instructions or notes..."
                value={form.specialInstructions}
                onChange={e => setForm(f => ({ ...f, specialInstructions: e.target.value }))}
                rows={2}
              />
            </div>

            {/* Reference Files Upload */}
            <div>
              <Label>Reference Files</Label>
              <div className="mt-2 border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors">
                <input
                  id="ref-file-upload"
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label htmlFor="ref-file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                  <Upload className="w-6 h-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Click to upload reference images</span>
                </label>
              </div>
              {referenceFiles.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {referenceFiles.map((f, i) => (
                    <div key={i} className="relative group rounded-lg overflow-hidden border border-border">
                      {f.file.type.startsWith('image/') ? (
                        <img src={URL.createObjectURL(f.file)} alt="" className="w-full h-20 object-cover" />
                      ) : (
                        <div className="w-full h-20 flex items-center justify-center bg-muted">
                          <FileText className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      {f.uploading && (
                        <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeReferenceFile(i)}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XCircle className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={posting} className="gap-2">
              {posting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary-foreground" />
                  Posting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Post Job
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Client Dialog (inline from job posting) */}
      <Dialog open={isNewClientOpen} onOpenChange={setIsNewClientOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" /> Add New Client
            </DialogTitle>
            <DialogDescription>Create a new client and select them for this job.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input placeholder="Client name" value={newClientForm.name} onChange={e => setNewClientForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="client@example.com" value={newClientForm.email} onChange={e => setNewClientForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>WhatsApp</Label>
              <Input placeholder="+233..." value={newClientForm.whatsapp} onChange={e => setNewClientForm(f => ({ ...f, whatsapp: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Company</Label>
              <Input placeholder="Company name" value={newClientForm.company} onChange={e => setNewClientForm(f => ({ ...f, company: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewClientOpen(false)}>Cancel</Button>
            <Button onClick={handleAddNewClient} disabled={addingClient || !newClientForm.name.trim()}>
              {addingClient ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Add & Select
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Push to Marketplace Dialog */}
      <Dialog open={isPushDialogOpen} onOpenChange={setIsPushDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Push to Marketplace
            </DialogTitle>
            <DialogDescription>
              Select which professions should be able to see and claim this job.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-3">
              <Label>Target Professions</Label>
              <div className="space-y-2">
                {[
                  { id: 'Graphic Designer', label: 'Graphic Designers' },
                  { id: 'UI/UX Designer', label: 'UI/UX Designers' },
                  { id: 'Web Developer', label: 'Web Developers' },
                ].map((prof) => (
                  <div key={prof.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => {
                      if (pushProfessions.includes(prof.id)) {
                        setPushProfessions(prev => prev.filter(p => p !== prof.id));
                      } else {
                        setPushProfessions(prev => [...prev, prof.id]);
                      }
                    }}
                  >
                    <div className={`w-5 h-5 rounded border ${pushProfessions.includes(prof.id) ? 'bg-primary border-primary' : 'border-border'} flex items-center justify-center`}>
                      {pushProfessions.includes(prof.id) && <CheckCircle className="w-3.5 h-3.5 text-primary-foreground" />}
                    </div>
                    <span className="text-sm font-medium">{prof.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {selectedContractForPush && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Contract</p>
                <p className="text-sm font-bold truncate">{selectedContractForPush.title}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPushDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handlePushToMarketplace}
              disabled={pushing || pushProfessions.length === 0}
              className="gap-2"
            >
              {pushing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Push to Marketplace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
};

export default JobContracts;
