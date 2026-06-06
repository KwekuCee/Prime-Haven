import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const CATEGORIES: { value: string; label: string; profession: string }[] = [
  { value: 'graphic-design', label: 'Graphic Design', profession: 'Graphic Designer' },
  { value: 'app-design', label: 'UI/UX Design', profession: 'UI/UX Designer' },
  { value: 'web-development', label: 'Web Development', profession: 'Web Developer' },
];

interface Props {
  onPosted?: () => void;
}

const ClientPostJobDialog = ({ onPosted }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'graphic-design',
    budget: '',
    deadline: '',
  });

  const reset = () =>
    setForm({
      title: '',
      description: '',
      category: 'graphic-design',
      budget: '',
      deadline: '',
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.title.trim() || !form.description.trim()) {
      toast({
        title: 'Missing details',
        description: 'A title and description are required.',
        variant: 'destructive',
      });
      return;
    }
    setSubmitting(true);
    try {
      const cat = CATEGORIES.find((c) => c.value === form.category)!;
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .maybeSingle();

      const max =
        form.category === 'graphic-design' ? 2 : 1; // graphic-design allows 2, others 1
      const { error } = await supabase.from('client_projects').insert({
        title: form.title.trim().slice(0, 200),
        description: form.description.trim().slice(0, 4000),
        category: form.category,
        client_name: profile?.full_name || user.email || 'Client',
        client_email: profile?.email || user.email,
        created_by: user.id,
        budget: form.budget.trim() || null,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
        required_professions: [cat.profession],
        max_assignees: max,
        status: 'pending',
      });
      if (error) throw error;
      toast({
        title: 'Job posted ✨',
        description: 'Designers can now see and claim your job.',
      });
      reset();
      setOpen(false);
      onPosted?.();
    } catch (err: any) {
      toast({
        title: 'Could not post job',
        description: err.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 text-xs">
          <Plus className="w-4 h-4" /> Post New Job
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Post a New Job</DialogTitle>
          <DialogDescription>
            Your job appears in the designer marketplace. Designers can claim and
            chat with you on-platform.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Logo redesign for fashion brand"
              maxLength={200}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="category">Category</Label>
            <Select
              value={form.category}
              onValueChange={(v) => setForm({ ...form, category: v })}
            >
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={5}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Goals, deliverables, style references, brand info…"
              maxLength={4000}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="budget">Budget (optional)</Label>
              <Input
                id="budget"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
                placeholder="GH₵500"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deadline">Deadline (optional)</Label>
              <Input
                id="deadline"
                type="date"
                value={form.deadline}
                onChange={(e) =>
                  setForm({ ...form, deadline: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Posting…
                </>
              ) : (
                'Post Job'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ClientPostJobDialog;
