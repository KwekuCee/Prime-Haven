import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
  currentAdminId?: string;
  onSaved: () => void;
}

export const EditUserDialog = ({ open, onOpenChange, user, currentAdminId, onSaved }: EditUserDialogProps) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    professional_title: '',
    experience_level: '',
    total_points: 0,
    monthly_points: 0,
    skills: '',
    portfolio_url: '',
    payment_method: '',
    registration_fee_paid: false,
    is_active: true,
  });

  useEffect(() => {
    if (user) {
      setForm({
        full_name: user.full_name || '',
        phone: user.phone || '',
        email: user.email || '',
        professional_title: user.designer_details?.professional_title || '',
        experience_level: user.designer_details?.experience_level || '',
        total_points: user.designer_details?.total_points || 0,
        monthly_points: user.designer_details?.monthly_points || 0,
        skills: (user.designer_details?.skills || []).join(', '),
        portfolio_url: user.designer_details?.portfolio_url || '',
        payment_method: user.designer_details?.payment_method || '',
        registration_fee_paid: user.registration_fee_paid || false,
        is_active: user.is_active !== false,
      });
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: form.full_name,
          phone: form.phone,
          registration_fee_paid: form.registration_fee_paid,
          is_active: form.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Update designer details
      const skillsArray = form.skills.split(',').map(s => s.trim()).filter(Boolean);
      const { error: detailsError } = await supabase
        .from('designer_details')
        .update({
          professional_title: form.professional_title,
          experience_level: form.experience_level,
          total_points: form.total_points,
          monthly_points: form.monthly_points,
          skills: skillsArray,
          portfolio_url: form.portfolio_url,
          payment_method: form.payment_method,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (detailsError) throw detailsError;

      // Log the action
      if (currentAdminId) {
        await supabase.from('system_logs').insert({
          action_type: 'user_edited',
          admin_id: currentAdminId,
          description: `Edited user details: ${form.full_name || user.email}`,
          timestamp: new Date().toISOString(),
        });
      }

      toast({ title: 'User Updated', description: 'All changes have been saved.' });
      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Edit user error:', error);
      toast({ title: 'Update Failed', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-bold">Edit User Details</DialogTitle>
          <DialogDescription className="font-medium">
            Modify all details for {user?.full_name || user?.email}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label className="font-semibold">Full Name</Label>
            <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label className="font-semibold">Phone</Label>
            <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label className="font-semibold">Email</Label>
            <Input value={form.email} disabled className="opacity-60" />
            <p className="text-xs text-muted-foreground">Email cannot be changed here</p>
          </div>
          <div className="space-y-2">
            <Label className="font-semibold">Professional Title</Label>
            <Input value={form.professional_title} onChange={e => setForm(f => ({ ...f, professional_title: e.target.value }))} placeholder="e.g. Senior UI Designer" />
          </div>
          <div className="space-y-2">
            <Label className="font-semibold">Experience Level</Label>
            <Select value={form.experience_level} onValueChange={v => setForm(f => ({ ...f, experience_level: v }))}>
              <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
                <SelectItem value="expert">Expert</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="font-semibold">Payment Method</Label>
            <Select value={form.payment_method} onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}>
              <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mtn_momo">MTN MoMo</SelectItem>
                <SelectItem value="vodafone_cash">Vodafone Cash</SelectItem>
                <SelectItem value="airteltigo_money">AirtelTigo Money</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="crypto">Crypto</SelectItem>
                <SelectItem value="paypal">PayPal</SelectItem>
                <SelectItem value="wise">Wise</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="font-semibold">Total Points</Label>
            <Input type="number" value={form.total_points} onChange={e => setForm(f => ({ ...f, total_points: parseInt(e.target.value) || 0 }))} />
          </div>
          <div className="space-y-2">
            <Label className="font-semibold">Monthly Points</Label>
            <Input type="number" value={form.monthly_points} onChange={e => setForm(f => ({ ...f, monthly_points: parseInt(e.target.value) || 0 }))} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label className="font-semibold">Skills (comma-separated)</Label>
            <Input value={form.skills} onChange={e => setForm(f => ({ ...f, skills: e.target.value }))} placeholder="e.g. Figma, Photoshop, Illustrator" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="font-semibold">Portfolio URL</Label>
            <Input value={form.portfolio_url} onChange={e => setForm(f => ({ ...f, portfolio_url: e.target.value }))} placeholder="https://..." />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <Label className="font-semibold">Registration Fee Paid</Label>
            <Switch checked={form.registration_fee_paid} onCheckedChange={v => setForm(f => ({ ...f, registration_fee_paid: v }))} />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <Label className="font-semibold">Account Active</Label>
            <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
