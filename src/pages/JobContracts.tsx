import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Briefcase, Plus, Send, Calendar, DollarSign, Users, FileText,
  ArrowLeft, Trash2, Clock, CheckCircle, XCircle, Upload, Image as ImageIcon,
  Loader2, RefreshCw
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
import { AdminNavigation } from '@/components/admin/AdminNavigation';
import BrandLogo from '@/components/BrandLogo';
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
  status: string;
  created_at: string;
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

  const loadContracts = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('job_contracts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setContracts((data || []) as JobContract[]);
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
      await loadContracts();
    };
    checkAccess();
  }, [user, authLoading, navigate, loadContracts]);

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
        
        const { data: { publicUrl } } = supabase.storage.from('job-reference-files').getPublicUrl(path);
        setReferenceFiles(prev => prev.map(f => f.file === file ? { ...f, uploading: false, url: publicUrl } : f));
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

  const handleCreate = async () => {
    if (!form.title || !form.description || !form.category) {
      toast({ title: 'Missing Fields', description: 'Title, description, and category are required.', variant: 'destructive' });
      return;
    }

    setPosting(true);
    try {
      const fileUrls = referenceFiles.filter(f => f.url).map(f => f.url!);

      // 1. Save to database
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
        })
        .select()
        .single();

      if (error) throw error;

      // 2. Post to Discord + send emails via edge function
      const { error: fnError } = await supabase.functions.invoke('post-job-contract', {
        body: {
          title: form.title,
          description: form.description,
          category: form.category,
          deadline: form.deadline || null,
          budget: form.budget || null,
          requirements: form.requirements || null,
          clientName: form.clientName || null,
          specialInstructions: form.specialInstructions || null,
          contractId: contract?.id,
          referenceFiles: fileUrls,
        },
      });

      if (fnError) {
        console.error('Edge function error:', fnError);
        toast({ title: 'Partially Posted', description: 'Contract saved but Discord/email notification may have failed.', variant: 'destructive' });
      } else {
        toast({ title: 'Job Posted! 🎉', description: 'Contract posted to Discord and emails sent to relevant designers.' });
      }

      setForm({ title: '', description: '', category: '', deadline: '', budget: '', requirements: '', clientName: '', specialInstructions: '' });
      setReferenceFiles([]);
      setIsCreateOpen(false);
      await loadContracts();
    } catch (err: any) {
      console.error('Error creating contract:', err);
      toast({ title: 'Error', description: err.message || 'Failed to create contract', variant: 'destructive' });
    } finally {
      setPosting(false);
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

      // Update Discord if message exists
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

  const getCategoryLabel = (id: string) => JOB_CATEGORIES.find(c => c.id === id)?.label || id;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BrandLogo />
            <div className="hidden sm:block h-6 w-px bg-border" />
            <AdminNavigation />
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/superadmin')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Briefcase className="w-8 h-8 text-primary" />
                Job Contracts
              </h1>
              <p className="text-muted-foreground mt-1">Post job briefs to Discord channels and notify designers via email</p>
            </div>
            <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Post New Job
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-foreground">{contracts.length}</div>
                <p className="text-sm text-muted-foreground">Total Jobs Posted</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-primary">{contracts.filter(c => c.status === 'active').length}</div>
                <p className="text-sm text-muted-foreground">Active Jobs</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-muted-foreground">{contracts.filter(c => c.discord_message_id).length}</div>
                <p className="text-sm text-muted-foreground">Posted to Discord</p>
              </CardContent>
            </Card>
          </div>

          {/* Contracts Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Job Contracts</CardTitle>
              <CardDescription>Manage job briefs posted to professional groups</CardDescription>
            </CardHeader>
            <CardContent>
              {contracts.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No job contracts posted yet.</p>
                  <Button variant="outline" className="mt-4" onClick={() => setIsCreateOpen(true)}>
                    Post Your First Job
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Budget</TableHead>
                        <TableHead>Deadline</TableHead>
                        <TableHead>Discord</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Posted</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contracts.map(c => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium max-w-[200px] truncate">{c.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{getCategoryLabel(c.category)}</Badge>
                          </TableCell>
                          <TableCell>{c.budget || '—'}</TableCell>
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
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
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
                <Input
                  placeholder="e.g. Acme Corp"
                  value={form.clientName}
                  onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
                />
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
    </div>
  );
};

export default JobContracts;
