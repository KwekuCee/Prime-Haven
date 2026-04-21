import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Loader2, Image as ImageIcon, Presentation } from 'lucide-react';

interface MarketingAsset {
  id: string;
  title: string;
  description: string;
  asset_url: string;
  asset_type: string;
  created_at: string;
}

export default function ManageMarketingAssets() {
  const { toast } = useToast();
  const [assets, setAssets] = useState<MarketingAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    asset_url: '',
    asset_type: 'image'
  });

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('marketing_assets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
            console.warn("Marketing assets table not created yet.");
            return;
        }
        throw error;
      }
      setAssets(data || []);
    } catch (error: any) {
      toast({ title: 'Error loading assets', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.asset_url) {
      toast({ title: 'Validation Error', description: 'Title and URL are required', variant: 'destructive' });
      return;
    }
    
    setSubmitting(true);
    try {
      const { error } = await supabase.from('marketing_assets').insert([formData]);
      if (error) throw error;
      
      toast({ title: 'Success', description: 'Marketing asset added successfully' });
      setFormData({ title: '', description: '', asset_url: '', asset_type: 'image' });
      fetchAssets();
    } catch (error: any) {
      toast({ title: 'Error adding asset', description: error.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;
    
    try {
      const { error } = await supabase.from('marketing_assets').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Deleted', description: 'Asset deleted successfully' });
      fetchAssets();
    } catch (error: any) {
      toast({ title: 'Error deleting asset', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Add New Marketing Asset</CardTitle>
          <CardDescription>Upload banners, logos, or copy for affiliates to use.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Asset Title</label>
                <Input 
                  placeholder="e.g. Summer Promo Banner" 
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Asset Type</label>
                <Select value={formData.asset_type} onValueChange={(val) => setFormData({...formData, asset_type: val})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image">Image / Banner</SelectItem>
                    <SelectItem value="document">Document / PDF</SelectItem>
                    <SelectItem value="copy">Social Media Copy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Asset URL / Content</label>
              <Input 
                placeholder={formData.asset_type === 'copy' ? "Enter the copy text here" : "https://link-to-your-image.com/banner.png"} 
                value={formData.asset_url}
                onChange={(e) => setFormData({...formData, asset_url: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Description (Optional)</label>
              <Textarea 
                placeholder="Instructions on how to use this asset..." 
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Add Asset
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manage Assets</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : assets.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground border border-dashed rounded-lg">
              No marketing assets added yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Preview</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map(asset => (
                  <TableRow key={asset.id}>
                    <TableCell>
                      {asset.asset_type === 'image' ? (
                        <div className="w-16 h-12 bg-muted rounded overflow-hidden flex items-center justify-center">
                          <img src={asset.asset_url} alt="preview" className="max-w-full max-h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-16 h-12 bg-muted rounded flex items-center justify-center">
                          <Presentation className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{asset.title}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">{asset.description}</div>
                    </TableCell>
                    <TableCell className="capitalize">{asset.asset_type}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(asset.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(asset.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
