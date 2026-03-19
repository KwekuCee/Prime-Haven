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

  // Group by service type
  const grouped = pricing.reduce<Record<string, PricingItem[]>>((acc, item) => {
    if (!acc[item.service_type]) acc[item.service_type] = [];
    acc[item.service_type].push(item);
    return acc;
  }, {});

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo className="h-8" />
            <div>
              <h1 className="text-2xl font-heading font-bold">Service Pricing</h1>
              <p className="text-sm text-muted-foreground">Manage prices for all service tiers</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <AdminNavigation />
        </div>

        {/* Pricing Cards by Service */}
        {Object.entries(grouped).map(([serviceType, items]) => (
          <Card key={serviceType}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                {items[0]?.service_label || serviceType}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tier</TableHead>
                    <TableHead>Price (GH₵)</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Features</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Actions</TableHead>
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}

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
                  <Label>Price (GH₵)</Label>
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
  );
};

export default ManagePricing;
