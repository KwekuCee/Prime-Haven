import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
  created_at: string;
}

const ManageTeam = () => {
  const { toast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [form, setForm] = useState({
    full_name: '',
    role_title: '',
    bio: '',
    photo_url: '',
    display_order: 0,
    is_visible: true,
  });

  const loadMembers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('team_members' as any)
      .select('*')
      .order('display_order', { ascending: true });
    if (!error && data) setMembers(data as any);
    setLoading(false);
  };

  useEffect(() => { loadMembers(); }, []);

  const openNew = () => {
    setEditingMember(null);
    setForm({ full_name: '', role_title: '', bio: '', photo_url: '', display_order: members.length, is_visible: true });
    setDialogOpen(true);
  };

  const openEdit = (m: TeamMember) => {
    setEditingMember(m);
    setForm({
      full_name: m.full_name,
      role_title: m.role_title,
      bio: m.bio,
      photo_url: m.photo_url || '',
      display_order: m.display_order,
      is_visible: m.is_visible,
    });
    setDialogOpen(true);
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
            <CardDescription className="font-medium">Manage the "Meet Our Team" section on the homepage</CardDescription>
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
                  <TableHead className="font-semibold">Role</TableHead>
                  <TableHead className="font-semibold">Order</TableHead>
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
                    <TableCell>{m.display_order}</TableCell>
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
              {editingMember ? 'Update team member details' : 'Add a new member to the team section'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="font-semibold">Full Name *</Label>
              <Input value={form.full_name} onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="e.g. Michael Essilfie" />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Role / Title *</Label>
              <Input value={form.role_title} onChange={(e) => setForm(f => ({ ...f, role_title: e.target.value }))} placeholder="e.g. CEO & Founder" />
            </div>
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
