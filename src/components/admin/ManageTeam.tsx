import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TeamMember {
  id: string;
  full_name: string;
  role_title: string;
  bio: string;
  photo_url: string | null;
  display_order: number;
  is_visible: boolean;
  position_level: number;
  created_at: string;
}

const EXECUTIVE_POSITIONS = [
  { value: 'CEO & Founder', level: 1 },
  { value: 'Co-Founder', level: 1 },
  { value: 'CTO (Chief Technology Officer)', level: 1 },
  { value: 'COO (Chief Operations Officer)', level: 1 },
  { value: 'CFO (Chief Financial Officer)', level: 1 },
  { value: 'CMO (Chief Marketing Officer)', level: 1 },
  { value: 'CCO (Chief Creative Officer)', level: 1 },
  { value: 'VP of Design', level: 2 },
  { value: 'VP of Engineering', level: 2 },
  { value: 'VP of Marketing', level: 2 },
  { value: 'VP of Operations', level: 2 },
  { value: 'Creative Director', level: 3 },
  { value: 'Art Director', level: 3 },
  { value: 'Technical Director', level: 3 },
  { value: 'Design Director', level: 3 },
  { value: 'Project Manager', level: 4 },
  { value: 'Product Manager', level: 4 },
  { value: 'Operations Manager', level: 4 },
  { value: 'Lead Designer', level: 5 },
  { value: 'Lead Developer', level: 5 },
  { value: 'Senior Designer', level: 5 },
  { value: 'Senior Developer', level: 5 },
];

const LEVEL_LABELS: Record<number, string> = {
  1: 'C-Suite / Founders',
  2: 'Vice Presidents',
  3: 'Directors',
  4: 'Managers',
  5: 'Leads / Seniors',
  99: 'Other',
};

const ManageTeam = () => {
  const { toast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [useCustomTitle, setUseCustomTitle] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    role_title: '',
    bio: '',
    photo_url: '',
    display_order: 0,
    is_visible: true,
    position_level: 1,
  });

  const loadMembers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('team_members' as any)
      .select('*')
      .order('position_level', { ascending: true })
      .order('display_order', { ascending: true });
    if (!error && data) setMembers(data as any);
    setLoading(false);
  };

  useEffect(() => { loadMembers(); }, []);

  const openNew = () => {
    setEditingMember(null);
    setUseCustomTitle(false);
    setForm({ full_name: '', role_title: '', bio: '', photo_url: '', display_order: members.length, is_visible: true, position_level: 1 });
    setDialogOpen(true);
  };

  const openEdit = (m: TeamMember) => {
    setEditingMember(m);
    const isPreset = EXECUTIVE_POSITIONS.some(p => p.value === m.role_title);
    setUseCustomTitle(!isPreset);
    setForm({
      full_name: m.full_name,
      role_title: m.role_title,
      bio: m.bio,
      photo_url: m.photo_url || '',
      display_order: m.display_order,
      is_visible: m.is_visible,
      position_level: m.position_level,
    });
    setDialogOpen(true);
  };

  const handlePositionSelect = (value: string) => {
    if (value === '__custom__') {
      setUseCustomTitle(true);
      setForm(f => ({ ...f, role_title: '' }));
      return;
    }
    const pos = EXECUTIVE_POSITIONS.find(p => p.value === value);
    setUseCustomTitle(false);
    setForm(f => ({ ...f, role_title: value, position_level: pos?.level ?? 99 }));
  };

  const handleSave = async () => {
    if (!form.full_name.trim() || !form.role_title.trim() || !form.bio.trim()) {
      toast({ title: 'Missing fields', description: 'Name, role, and bio are required.', variant: 'destructive' });
      return;
    }

    const payload = {
      full_name: form.full_name.trim(),
      role_title: form.role_title.trim(),
      bio: form.bio.trim(),
      photo_url: form.photo_url.trim() || null,
      display_order: form.display_order,
      is_visible: form.is_visible,
      position_level: form.position_level,
    };

    if (editingMember) {
      const { error } = await (supabase.from('team_members' as any) as any).update(payload).eq('id', editingMember.id);
      if (error) {
        toast({ title: 'Error', description: 'Failed to update team member.', variant: 'destructive' });
        return;
      }
      toast({ title: 'Updated', description: 'Team member updated successfully.' });
    } else {
      const { error } = await (supabase.from('team_members' as any) as any).insert(payload);
      if (error) {
        toast({ title: 'Error', description: 'Failed to add team member.', variant: 'destructive' });
        return;
      }
      toast({ title: 'Added', description: 'Team member added successfully.' });
    }

    setDialogOpen(false);
    loadMembers();
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase.from('team_members' as any) as any).delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete team member.', variant: 'destructive' });
      return;
    }
    toast({ title: 'Deleted', description: 'Team member removed.' });
    loadMembers();
  };

  const toggleVisibility = async (m: TeamMember) => {
    await (supabase.from('team_members' as any) as any).update({ is_visible: !m.is_visible }).eq('id', m.id);
    loadMembers();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-bold flex items-center gap-2">
              <Users className="w-5 h-5" />
              Team Members ({members.length})
            </CardTitle>
            <CardDescription className="font-medium">Manage executive positions and team hierarchy</CardDescription>
          </div>
          <Button onClick={openNew}>
            <Plus className="w-4 h-4 mr-2" />
            Add Member
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {members.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="font-semibold">Position</TableHead>
                  <TableHead className="font-semibold">Tier</TableHead>
                  <TableHead className="font-semibold">Visible</TableHead>
                  <TableHead className="font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        {m.photo_url ? (
                          <img src={m.photo_url} alt={m.full_name} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <Users className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        {m.full_name}
                      </div>
                    </TableCell>
                    <TableCell>{m.role_title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {LEVEL_LABELS[m.position_level] || 'Other'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className="cursor-pointer"
                        variant={m.is_visible ? 'default' : 'secondary'}
                        onClick={() => toggleVisibility(m)}
                      >
                        {m.is_visible ? 'Visible' : 'Hidden'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(m)}>
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(m.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No team members yet</p>
            <p className="text-sm mt-2">Add your first team member to display on the homepage</p>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-bold">{editingMember ? 'Edit' : 'Add'} Team Member</DialogTitle>
            <DialogDescription className="font-medium">
              {editingMember ? 'Update team member details' : 'Add a new executive or team member'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="font-semibold">Full Name *</Label>
              <Input value={form.full_name} onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="e.g. Michael Essilfie" />
            </div>

            <div className="space-y-2">
              <Label className="font-semibold">Executive Position *</Label>
              <Select
                value={useCustomTitle ? '__custom__' : form.role_title}
                onValueChange={handlePositionSelect}
              >
                <SelectTrigger><SelectValue placeholder="Select a position" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__separator_csuite__" disabled className="font-bold text-xs text-muted-foreground uppercase tracking-wider">— C-Suite / Founders —</SelectItem>
                  {EXECUTIVE_POSITIONS.filter(p => p.level === 1).map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.value}</SelectItem>
                  ))}
                  <SelectItem value="__separator_vp__" disabled className="font-bold text-xs text-muted-foreground uppercase tracking-wider">— Vice Presidents —</SelectItem>
                  {EXECUTIVE_POSITIONS.filter(p => p.level === 2).map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.value}</SelectItem>
                  ))}
                  <SelectItem value="__separator_dir__" disabled className="font-bold text-xs text-muted-foreground uppercase tracking-wider">— Directors —</SelectItem>
                  {EXECUTIVE_POSITIONS.filter(p => p.level === 3).map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.value}</SelectItem>
                  ))}
                  <SelectItem value="__separator_mgr__" disabled className="font-bold text-xs text-muted-foreground uppercase tracking-wider">— Managers —</SelectItem>
                  {EXECUTIVE_POSITIONS.filter(p => p.level === 4).map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.value}</SelectItem>
                  ))}
                  <SelectItem value="__separator_lead__" disabled className="font-bold text-xs text-muted-foreground uppercase tracking-wider">— Leads / Seniors —</SelectItem>
                  {EXECUTIVE_POSITIONS.filter(p => p.level === 5).map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.value}</SelectItem>
                  ))}
                  <SelectItem value="__custom__" className="font-semibold text-primary">✏️ Custom Title...</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {useCustomTitle && (
              <div className="space-y-2">
                <Label className="font-semibold">Custom Title *</Label>
                <Input value={form.role_title} onChange={(e) => setForm(f => ({ ...f, role_title: e.target.value }))} placeholder="e.g. Head of Communications" />
                <div className="space-y-2">
                  <Label className="font-semibold text-sm">Hierarchy Tier</Label>
                  <Select value={String(form.position_level)} onValueChange={v => setForm(f => ({ ...f, position_level: parseInt(v) }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">C-Suite / Founders</SelectItem>
                      <SelectItem value="2">Vice Presidents</SelectItem>
                      <SelectItem value="3">Directors</SelectItem>
                      <SelectItem value="4">Managers</SelectItem>
                      <SelectItem value="5">Leads / Seniors</SelectItem>
                      <SelectItem value="99">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="font-semibold">Bio *</Label>
              <Textarea value={form.bio} onChange={(e) => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="A short backstory..." className="min-h-[100px]" />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Photo URL</Label>
              <Input value={form.photo_url} onChange={(e) => setForm(f => ({ ...f, photo_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-semibold">Display Order</Label>
                <Input type="number" value={form.display_order} onChange={(e) => setForm(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">Visible</Label>
                <div className="pt-2">
                  <Switch checked={form.is_visible} onCheckedChange={(v) => setForm(f => ({ ...f, is_visible: v }))} />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              {editingMember ? 'Update' : 'Add'} Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ManageTeam;
