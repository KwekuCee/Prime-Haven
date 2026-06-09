import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Star, Plus, Pencil, Trash2, Eye, EyeOff, Copy, ExternalLink } from 'lucide-react';

interface Testimonial {
  id: string;
  client_name: string;
  company_role: string | null;
  service_used: string | null;
  rating: number;
  review_text: string;
  is_visible: boolean;
  display_order: number | null;
}

const SERVICE_OPTIONS = ['Graphic Design', 'UI/UX Design', 'Web Development', 'IT Solutions'];

const StarPicker = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((i) => (
      <button key={i} type="button" onClick={() => onChange(i)}>
        <Star className={`w-6 h-6 transition-colors ${i <= value ? 'text-primary fill-primary' : 'text-muted-foreground/40 hover:text-primary/60'}`} />
      </button>
    ))}
  </div>
);

const emptyForm = {
  client_name: '',
  company_role: '',
  service_used: '',
  rating: 5,
  review_text: '',
  display_order: 0,
  is_visible: true,
};

const ManageTestimonials = () => {
  const { toast } = useToast();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Testimonial | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchTestimonials = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .order('display_order', { ascending: true });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else setTestimonials(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchTestimonials(); }, []);

  const openAdd = () => {
    setEditTarget(null);
    setForm({ ...emptyForm, display_order: testimonials.length + 1 });
    setDialogOpen(true);
  };

  const openEdit = (t: Testimonial) => {
    setEditTarget(t);
    setForm({
      client_name: t.client_name,
      company_role: t.company_role || '',
      service_used: t.service_used || '',
      rating: t.rating,
      review_text: t.review_text,
      display_order: t.display_order ?? 0,
      is_visible: t.is_visible,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.client_name.trim() || !form.review_text.trim()) {
      toast({ title: 'Validation', description: 'Client name and review text are required.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      client_name: form.client_name.trim(),
      company_role: form.company_role.trim() || null,
      service_used: form.service_used || null,
      rating: form.rating,
      review_text: form.review_text.trim(),
      display_order: form.display_order,
      is_visible: form.is_visible,
    };

    if (editTarget) {
      const { error } = await supabase.from('testimonials').update(payload).eq('id', editTarget.id);
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
      else { toast({ title: 'Updated!', description: 'Testimonial has been updated.' }); setDialogOpen(false); fetchTestimonials(); }
    } else {
      const { error } = await supabase.from('testimonials').insert(payload);
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
      else { toast({ title: 'Added!', description: 'New testimonial is now live.' }); setDialogOpen(false); fetchTestimonials(); }
    }
    setSaving(false);
  };

  const toggleVisibility = async (t: Testimonial) => {
    const { error } = await supabase.from('testimonials').update({ is_visible: !t.is_visible }).eq('id', t.id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else fetchTestimonials();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('testimonials').delete().eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Deleted', description: 'Testimonial removed.' }); fetchTestimonials(); }
  };

  const reviewLink = `${window.location.origin}/review`;

  const copyReviewLink = () => {
    navigator.clipboard.writeText(reviewLink);
    toast({ title: 'Link Copied!', description: 'Share this link with clients to collect reviews.' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Client Testimonials</h2>
          <p className="text-muted-foreground text-sm mt-1">Manage reviews displayed on the homepage.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={copyReviewLink} className="gap-2">
            <Copy className="w-4 h-4" /> Copy Review Link
          </Button>
          <Button variant="outline" size="icon" onClick={() => window.open(reviewLink, '_blank')}>
            <ExternalLink className="w-4 h-4" />
          </Button>
          <Button onClick={openAdd} className="gap-2">
            <Plus className="w-4 h-4" /> Add Review
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading testimonials...</div>
      ) : testimonials.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
          No testimonials yet. Click "Add Review" to get started.
        </div>
      ) : (
        <div className="grid gap-4">
          {testimonials.map((t) => (
            <Card key={t.id} className={`transition-opacity ${!t.is_visible ? 'opacity-50' : ''}`}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="font-semibold text-foreground">{t.client_name}</span>
                      {t.company_role && <span className="text-sm text-muted-foreground">· {t.company_role}</span>}
                      {t.service_used && (
                        <Badge variant="secondary" className="text-xs">{t.service_used}</Badge>
                      )}
                      {!t.is_visible && <Badge variant="outline" className="text-xs text-muted-foreground">Hidden</Badge>}
                    </div>
                    <div className="flex gap-0.5 mb-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-3.5 h-3.5 ${i < t.rating ? 'text-primary fill-primary' : 'text-muted-foreground/30'}`} />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">"{t.review_text}"</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => toggleVisibility(t)} title={t.is_visible ? 'Hide' : 'Show'}>
                      {t.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete testimonial?</AlertDialogTitle>
                          <AlertDialogDescription>This will permanently remove the review from {t.client_name}.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(t.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Testimonial' : 'Add New Testimonial'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Client Name *</Label>
                <Input
                  placeholder="e.g. Ama Boateng"
                  value={form.client_name}
                  onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Company / Role</Label>
                <Input
                  placeholder="e.g. CEO at TechStart"
                  value={form.company_role}
                  onChange={(e) => setForm({ ...form, company_role: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Service Used</Label>
                <Select value={form.service_used} onValueChange={(v) => setForm({ ...form, service_used: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Rating</Label>
              <StarPicker value={form.rating} onChange={(v) => setForm({ ...form, rating: v })} />
            </div>
            <div className="space-y-2">
              <Label>Review Text *</Label>
              <Textarea
                placeholder="Write the client's review here..."
                value={form.review_text}
                onChange={(e) => setForm({ ...form, review_text: e.target.value })}
                className="min-h-[100px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Display Order</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.display_order}
                  onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Visibility</Label>
                <Select value={form.is_visible ? 'visible' : 'hidden'} onValueChange={(v) => setForm({ ...form, is_visible: v === 'visible' })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visible">Visible</SelectItem>
                    <SelectItem value="hidden">Hidden</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editTarget ? 'Save Changes' : 'Add Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageTestimonials;
