import { useState } from 'react';
import { motion } from 'framer-motion';
import { Rocket, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const serviceCategories = [
  { value: 'logo-design', label: 'Logo Design' },
  { value: 'brand-identity', label: 'Brand Identity' },
  { value: 'app-design', label: 'App / UI/UX Design' },
  { value: 'web-design', label: 'Web Design' },
  { value: 'web-development', label: 'Web Development' },
  { value: 'print-design', label: 'Print Design' },
  { value: 'flyer-design', label: 'Flyer / Poster Design' },
  { value: 'social-media', label: 'Social Media Design' },
  { value: 'other', label: 'Other' },
];

interface StartProjectDialogProps {
  trigger?: React.ReactNode;
}

const StartProjectDialog = ({ trigger }: StartProjectDialogProps) => {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    whatsapp: '',
    category: '',
    description: '',
    budget: '',
  });

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.whatsapp || !form.category || !form.description) {
      toast({ title: 'Missing fields', description: 'Please fill in all required fields.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('submit-project-inquiry', {
        body: form,
      });
      if (error) throw error;
      toast({ title: 'Inquiry Sent! 🎉', description: 'We\'ll get back to you within 24 hours.' });
      setForm({ fullName: '', email: '', whatsapp: '', category: '', description: '', budget: '' });
      setOpen(false);
    } catch (err: any) {
      toast({ title: 'Failed to send', description: err.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="primary" className="glow-primary gap-2">
            <Rocket className="w-4 h-4" />
            Start a Project
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Rocket className="w-5 h-5 text-primary" />
            Start a Project with Us
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input id="fullName" value={form.fullName} onChange={e => handleChange('fullName', e.target.value)} placeholder="John Doe" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" value={form.email} onChange={e => handleChange('email', e.target.value)} placeholder="john@example.com" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp Number *</Label>
            <Input id="whatsapp" type="tel" value={form.whatsapp} onChange={e => handleChange('whatsapp', e.target.value)} placeholder="+233 XX XXX XXXX" required />
          </div>
          <div className="space-y-2">
            <Label>Service Category *</Label>
            <Select value={form.category} onValueChange={v => handleChange('category', v)}>
              <SelectTrigger><SelectValue placeholder="Select a service" /></SelectTrigger>
              <SelectContent>
                {serviceCategories.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Project Description *</Label>
            <Textarea id="description" value={form.description} onChange={e => handleChange('description', e.target.value)} placeholder="Tell us about your project, goals, and timeline..." className="min-h-[100px]" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="budget">Budget (Optional)</Label>
            <Input id="budget" value={form.budget} onChange={e => handleChange('budget', e.target.value)} placeholder="e.g. $500 - $1,000" />
          </div>
          <Button type="submit" disabled={submitting} className="w-full glow-primary gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {submitting ? 'Sending...' : 'Submit Inquiry'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StartProjectDialog;
