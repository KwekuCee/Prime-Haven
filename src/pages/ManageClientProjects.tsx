import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Copy, ExternalLink, Trash2, Edit, CheckCircle, Clock, Circle, Save, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import SuperAdminLayout from '@/components/admin/SuperAdminLayout';

interface ClientProject {
  id: string;
  title: string;
  client_name: string;
  client_email: string | null;
  client_whatsapp: string | null;
  description: string | null;
  category: string;
  status: string;
  progress_percentage: number;
  tracking_token: string;
  budget: string | null;
  deadline: string | null;
  created_at: string;
}

interface Milestone {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: string;
  sort_order: number;
  completed_at: string | null;
}

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Under Review' },
  { value: 'completed', label: 'Completed' },
  { value: 'on_hold', label: 'On Hold' },
];

const ManageClientProjects = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editProject, setEditProject] = useState<ClientProject | null>(null);
  const [showMilestonesDialog, setShowMilestonesDialog] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({ title: '', client_name: '', client_email: '', client_whatsapp: '', description: '', category: 'web-development', budget: '', status: 'pending', progress_percentage: 0 });
  const [newMilestone, setNewMilestone] = useState({ title: '', description: '' });

  useEffect(() => {
    if (!authLoading && !user) navigate('/superadmin-login', { replace: true });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('client_projects').select('*').order('created_at', { ascending: false });
    if (error) { console.error(error); toast({ title: 'Error', description: 'Failed to load projects', variant: 'destructive' }); }
    else setProjects(data || []);
    setLoading(false);
  };

  const loadMilestones = async (projectId: string) => {
    const { data } = await supabase.from('project_milestones').select('*').eq('project_id', projectId).order('sort_order');
    setMilestones(data || []);
  };

  const handleCreate = async () => {
    setSaving(true);
    const { error } = await supabase.from('client_projects').insert({ ...form, created_by: user?.id });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Project created!' }); setShowCreateDialog(false); resetForm(); loadProjects(); }
    setSaving(false);
  };

  const handleUpdate = async () => {
    if (!editProject) return;
    setSaving(true);
    const { error } = await supabase.from('client_projects').update({ title: form.title, client_name: form.client_name, client_email: form.client_email, client_whatsapp: form.client_whatsapp, description: form.description, category: form.category, budget: form.budget, status: form.status, progress_percentage: form.progress_percentage }).eq('id', editProject.id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Project updated!' }); setEditProject(null); resetForm(); loadProjects(); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('client_projects').delete().eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Project deleted' }); loadProjects(); }
  };

  const addMilestone = async () => {
    if (!showMilestonesDialog || !newMilestone.title.trim()) return;
    const { error } = await supabase.from('project_milestones').insert({ project_id: showMilestonesDialog, title: newMilestone.title, description: newMilestone.description || null, sort_order: milestones.length });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { setNewMilestone({ title: '', description: '' }); loadMilestones(showMilestonesDialog); }
  };

  const toggleMilestoneStatus = async (m: Milestone) => {
    const newStatus = m.status === 'completed' ? 'pending' : 'completed';
    await supabase.from('project_milestones').update({ status: newStatus, completed_at: newStatus === 'completed' ? new Date().toISOString() : null }).eq('id', m.id);
    if (showMilestonesDialog) loadMilestones(showMilestonesDialog);
  };

  const deleteMilestone = async (id: string) => {
    await supabase.from('project_milestones').delete().eq('id', id);
    if (showMilestonesDialog) loadMilestones(showMilestonesDialog);
  };

  const resetForm = () => setForm({ title: '', client_name: '', client_email: '', client_whatsapp: '', description: '', category: 'web-development', budget: '', status: 'pending', progress_percentage: 0 });

  const sendStatusEmail = async (project: ClientProject) => {
    if (!project.client_email) {
      toast({ title: 'No Email', description: 'This project has no client email configured.', variant: 'destructive' });
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke('notify-project-status', {
        body: { projectId: project.id },
      });
      if (error) throw error;
      toast({ title: 'Email Sent!', description: `Status update sent to ${project.client_email}` });
    } catch (err) {
      console.error('Failed to send status email:', err);
      toast({ title: 'Failed', description: 'Could not send status email. Try again later.', variant: 'destructive' });
    }
  };

  const copyTrackingLink = (token: string) => {
    const url = `${window.location.origin}/track/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Copied!', description: 'Tracking link copied to clipboard.' });
  };

  const openEdit = (p: ClientProject) => {
    setForm({ title: p.title, client_name: p.client_name, client_email: p.client_email || '', client_whatsapp: p.client_whatsapp || '', description: p.description || '', category: p.category, budget: p.budget || '', status: p.status, progress_percentage: p.progress_percentage });
    setEditProject(p);
  };

  const openMilestones = (projectId: string) => {
    setShowMilestonesDialog(projectId);
    loadMilestones(projectId);
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = { pending: 'bg-muted', in_progress: 'bg-primary/20 text-primary', review: 'bg-yellow-500/20 text-yellow-500', completed: 'bg-emerald-500/20 text-emerald-500', on_hold: 'bg-orange-500/20 text-orange-500' };
    return <Badge className={colors[status] || 'bg-muted'}>{statusOptions.find(s => s.value === status)?.label || status}</Badge>;
  };

  const renderProjectForm = (onSubmit: () => void, submitLabel: string) => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><Label>Project Title</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
        <div><Label>Client Name</Label><Input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} /></div>
        <div><Label>Client Email</Label><Input value={form.client_email} onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))} /></div>
        <div><Label>WhatsApp</Label><Input value={form.client_whatsapp} onChange={e => setForm(f => ({ ...f, client_whatsapp: e.target.value }))} /></div>
        <div><Label>Category</Label>
          <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="web-development">Web Development</SelectItem>
              <SelectItem value="ui-ux">UI/UX Design</SelectItem>
              <SelectItem value="graphic-design">Graphic Design</SelectItem>
              <SelectItem value="branding">Branding</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Budget</Label><Input value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} placeholder="e.g. $500 - $1000" /></div>
        <div><Label>Status</Label>
          <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{statusOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Progress ({form.progress_percentage}%)</Label>
          <Slider value={[form.progress_percentage]} onValueChange={([v]) => setForm(f => ({ ...f, progress_percentage: v }))} max={100} step={5} className="mt-2" />
        </div>
      </div>
      <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
      <DialogFooter>
        <Button onClick={onSubmit} disabled={saving || !form.title.trim() || !form.client_name.trim()} variant="primary">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}{submitLabel}
        </Button>
      </DialogFooter>
    </div>
  );

  return (
    <SuperAdminLayout>
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-heading font-bold">Client Projects</h1>
            <p className="text-muted-foreground">Manage projects and share tracking links with clients</p>
          </div>
          <Button variant="primary" onClick={() => { resetForm(); setShowCreateDialog(true); }}>
            <Plus className="w-4 h-4 mr-2" /> New Project
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : projects.length === 0 ? (
          <Card><CardContent className="py-16 text-center text-muted-foreground">No projects yet. Create your first client project above.</CardContent></Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-semibold">{p.title}</TableCell>
                    <TableCell>{p.client_name}</TableCell>
                    <TableCell>{statusBadge(p.status)}</TableCell>
                    <TableCell>{p.progress_percentage}%</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => copyTrackingLink(p.tracking_token)} title="Copy tracking link"><Copy className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => window.open(`/track/${p.tracking_token}`, '_blank')} title="Preview"><ExternalLink className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => openMilestones(p.id)} title="Milestones"><CheckCircle className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => sendStatusEmail(p)} title="Send status email" className="text-primary"><Mail className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(p)} title="Edit"><Edit className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(p.id)} title="Delete" className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Create New Project</DialogTitle></DialogHeader>{renderProjectForm(handleCreate, "Create Project")}</DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editProject} onOpenChange={() => setEditProject(null)}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Edit Project</DialogTitle></DialogHeader>{renderProjectForm(handleUpdate, "Save Changes")}</DialogContent>
      </Dialog>

      {/* Milestones Dialog */}
      <Dialog open={!!showMilestonesDialog} onOpenChange={() => setShowMilestonesDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Manage Milestones</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {milestones.map(m => (
              <div key={m.id} className="flex items-center gap-3">
                <button onClick={() => toggleMilestoneStatus(m)} className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border ${m.status === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-border'}`}>
                  {m.status === 'completed' && <CheckCircle className="w-4 h-4" />}
                </button>
                <span className={`flex-1 ${m.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>{m.title}</span>
                <Button size="sm" variant="ghost" onClick={() => deleteMilestone(m.id)} className="text-destructive"><Trash2 className="w-3 h-3" /></Button>
              </div>
            ))}
            <div className="flex gap-2 pt-2 border-t border-border">
              <Input placeholder="New milestone..." value={newMilestone.title} onChange={e => setNewMilestone(m => ({ ...m, title: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addMilestone()} />
              <Button size="sm" onClick={addMilestone} disabled={!newMilestone.title.trim()}><Plus className="w-4 h-4" /></Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
};

export default ManageClientProjects;
