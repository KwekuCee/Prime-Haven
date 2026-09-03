import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Plus, Trash2, Loader2, DollarSign, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import SuperAdminLayout from '@/components/admin/SuperAdminLayout';

interface PricingItem {
  id: string;
  service_type: string;
  service_label: string;
  tier: string;
  price: number;
  description: string;
  features: string[];
  is_active: boolean;
  discord_category: string;
}

const tierLabels: Record<string, string> = { basic: 'Basic', standard: 'Standard', premium: 'Premium' };

const ManagePricing = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [pricing, setPricing] = useState<PricingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<PricingItem | null>(null);
  const [editFeatures, setEditFeatures] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newService, setNewService] = useState({
    service_label: '',
    service_type: '',
    tier: 'standard',
    price: 0,
    description: '',
    features: '',
    discord_category: 'graphic-design',
    is_active: true,
  });

  useEffect(() => {
    if (!authLoading && !user) navigate('/superadmin-login');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    const { data } = await supabase
      .from('service_pricing')
      .select('*')
      .order('service_type')
      .order('price');
    setPricing((data as PricingItem[]) || []);
    setLoading(false);
  };

  const handleSave = async (item: PricingItem) => {
    setSaving(item.id);
    const { error } = await supabase
      .from('service_pricing')
      .update({
        price: item.price,
        description: item.description,
        features: item.features,
        is_active: item.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Saved!', description: `${item.service_label} (${tierLabels[item.tier]}) updated.` });
    }
    setSaving(null);
  };

  const handlePriceChange = (id: string, newPrice: string) => {
    setPricing(prev => prev.map(p => p.id === id ? { ...p, price: Number(newPrice) || 0 } : p));
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    setPricing(prev => prev.map(p => p.id === id ? { ...p, is_active: isActive } : p));
    await supabase.from('service_pricing').update({ is_active: isActive, updated_at: new Date().toISOString() }).eq('id', id);
    toast({ title: isActive ? 'Enabled' : 'Disabled' });
  };

  const openEdit = (item: PricingItem) => {
    setEditItem({ ...item });
    setEditFeatures((item.features || []).join('\n'));
  };

  const saveEdit = async () => {
    if (!editItem) return;
    const features = editFeatures.split('\n').map(f => f.trim()).filter(Boolean);
    const updated = { ...editItem, features };
    setSaving(editItem.id);
    const { error } = await supabase
      .from('service_pricing')
      .update({
        price: updated.price,
        description: updated.description,
        features,
        service_label: updated.service_label,
        is_active: updated.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editItem.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Saved!' });
      fetchPricing();
    }
    setSaving(null);
    setEditItem(null);
  };

  const slugify = (v: string) => v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const createService = async () => {
    const label = newService.service_label.trim();
    const type = (newService.service_type.trim() || slugify(label));
    if (!label || !type) {
      toast({ title: 'Missing details', description: 'A service name is required.', variant: 'destructive' });
      return;
    }
    if (!(newService.price >= 0)) {
      toast({ title: 'Invalid price', description: 'Enter a price in US dollars.', variant: 'destructive' });
      return;
    }
    setCreating(true);
    const { error } = await supabase.from('service_pricing').insert({
      service_type: type,
      service_label: label,
      tier: newService.tier,
      price: newService.price,
      description: newService.description || null,
      features: newService.features.split('\n').map(f => f.trim()).filter(Boolean),
      discord_category: newService.discord_category,
      is_active: newService.is_active,
    });
    setCreating(false);
    if (error) {
      toast({ title: 'Could not add service', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Service added', description: `${label} is now available on the Start a Project pages.` });
    setAddOpen(false);
    setNewService({ service_label: '', service_type: '', tier: 'standard', price: 0, description: '', features: '', discord_category: 'graphic-design', is_active: true });
    fetchPricing();
  };

  const deleteService = async (item: PricingItem) => {
    const { error } = await supabase.from('service_pricing').delete().eq('id', item.id);
    if (error) {
      toast({ title: 'Could not remove', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Removed', description: `${item.service_label} (${tierLabels[item.tier] || item.tier}) deleted.` });
    fetchPricing();
  };

  // Group by service type
  const grouped = pricing.reduce<Record<string, PricingItem[]>>((acc, item) => {
    if (!acc[item.service_type]) acc[item.service_type] = [];
    acc[item.service_type].push(item);
    return acc;
  }, {});

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
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-bold">Service Pricing</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Prices are in US dollars. Active services show on the Start a Project pages.</p>
          </div>
          <Button onClick={() => setAddOpen(true)} className="gap-2 self-start sm:self-auto">
            <Plus className="w-4 h-4" /> Add Service
          </Button>
        </div>

        {/* Pricing Cards by Service */}
        {Object.entries(grouped).map(([serviceType, items]) => (
          <div key={serviceType} className="rounded-xl border border-border/50 bg-card/50">
            <div className="p-4 sm:p-5 border-b border-border/50">
              <h2 className="text-base font-bold flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                {items[0]?.service_label || serviceType}
              </h2>
            </div>
            <div className="p-4 sm:p-5 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-semibold">Tier</TableHead>
                    <TableHead className="text-xs font-semibold">Price (USD)</TableHead>
                    <TableHead className="text-xs font-semibold">Description</TableHead>
                    <TableHead className="text-xs font-semibold">Features</TableHead>
                    <TableHead className="text-xs font-semibold">Active</TableHead>
                    <TableHead className="text-xs font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.sort((a, b) => a.price - b.price).map(item => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge variant={item.tier === 'premium' ? 'default' : 'outline'}>
                          {tierLabels[item.tier] || item.tier}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.price}
                          onChange={e => handlePriceChange(item.id, e.target.value)}
                          className="w-28"
                        />
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                        {item.description}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {(item.features || []).length} features
                      </TableCell>
                      <TableCell>
                        <Switch checked={item.is_active} onCheckedChange={v => handleToggleActive(item.id, v)} />
                      </TableCell>
                      <TableCell className="space-x-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(item)}>Edit</Button>
                        <Button size="sm" onClick={() => handleSave(item)} disabled={saving === item.id}>
                          {saving === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteService(item)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ))}

        {/* Add Service Dialog */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add a Service</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Service Name</Label>
                <Input value={newService.service_label} onChange={e => setNewService({ ...newService, service_label: e.target.value })} placeholder="Brand Identity Design" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Internal Key</Label>
                  <Input value={newService.service_type} onChange={e => setNewService({ ...newService, service_type: e.target.value })} placeholder={slugify(newService.service_label) || 'brand-identity'} />
                </div>
                <div className="space-y-2">
                  <Label>Tier</Label>
                  <Select value={newService.tier} onValueChange={v => setNewService({ ...newService, tier: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Price (USD)</Label>
                  <Input type="number" min={0} value={newService.price} onChange={e => setNewService({ ...newService, price: Number(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={newService.discord_category} onValueChange={v => setNewService({ ...newService, discord_category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="graphic-design">Graphic Design</SelectItem>
                      <SelectItem value="app-design">UI/UX Design</SelectItem>
                      <SelectItem value="web-dev">Web Development</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={newService.description} onChange={e => setNewService({ ...newService, description: e.target.value })} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Features (one per line)</Label>
                <Textarea value={newService.features} onChange={e => setNewService({ ...newService, features: e.target.value })} rows={5} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                <div>
                  <div className="text-sm font-medium">Available to clients</div>
                  <div className="text-xs text-muted-foreground">Shows on both Start a Project pages</div>
                </div>
                <Switch checked={newService.is_active} onCheckedChange={v => setNewService({ ...newService, is_active: v })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={createService} disabled={creating}>
                {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Add Service
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit {editItem?.service_label} — {tierLabels[editItem?.tier || '']}</DialogTitle>
            </DialogHeader>
            {editItem && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Service Label</Label>
                  <Input value={editItem.service_label} onChange={e => setEditItem({ ...editItem, service_label: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Price (USD)</Label>
                  <Input type="number" value={editItem.price} onChange={e => setEditItem({ ...editItem, price: Number(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={editItem.description || ''} onChange={e => setEditItem({ ...editItem, description: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Features (one per line)</Label>
                  <Textarea value={editFeatures} onChange={e => setEditFeatures(e.target.value)} rows={6} placeholder="Feature 1&#10;Feature 2&#10;Feature 3" />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
              <Button onClick={saveEdit} disabled={saving === editItem?.id}>
                {saving === editItem?.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      </div>
    </SuperAdminLayout>
  );
};

export default ManagePricing;
