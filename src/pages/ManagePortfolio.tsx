import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Upload, ExternalLink, Image as ImageIcon, Pencil, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import SuperAdminLayout from '@/components/admin/SuperAdminLayout';

interface PortfolioItem {
  id: string;
  title: string;
  client: string;
  category: string;
  image_url: string;
  project_url: string | null;
  created_at: string;
}

const categories = [
  'Graphic Design',
  'UI/UX Design',
  'Web Development',
  'App Development',
  'IT Solutions',
  'Branding',
];

const ManagePortfolio = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newItem, setNewItem] = useState({
    title: '',
    client: '',
    category: '',
    image_url: '',
    project_url: '',
  });
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<PortfolioItem | null>(null);
  const [editForm, setEditForm] = useState({ title: '', client: '', category: '', image_url: '', project_url: '' });
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  // Check if user is admin
  useEffect(() => {
    if (authLoading) return;

    const checkAuth = async () => {
      if (!user) {
        navigate('/superadmin-login', { replace: true });
        return;
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (!roleData || !['superadmin', 'masteradmin'].includes(roleData.role)) {
        toast({
          variant: 'destructive',
          title: 'Access Denied',
          description: 'You need admin access to view this page.',
        });
        navigate('/superadmin-login', { replace: true });
        return;
      }

      fetchPortfolioItems();
    };

    checkAuth();
  }, [user, authLoading, navigate, toast]);

  const fetchPortfolioItems = async () => {
    try {
      setIsLoading(true);
      // Using 'any' cast since portfolio_items table is newly created
      const { data, error } = await (supabase as any)
        .from('portfolio_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPortfolioItems(data || []);
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      // Table might not exist yet, that's okay
      setPortfolioItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error } = await supabase.storage
      .from('portfolio-images')
      .upload(fileName, file);
    if (error) throw error;
    const { data: urlData } = supabase.storage
      .from('portfolio-images')
      .getPublicUrl(fileName);
    return urlData.publicUrl;
  };

  const handleNewImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewImageFile(file);
      setNewImagePreview(URL.createObjectURL(file));
      setNewItem(prev => ({ ...prev, image_url: '' }));
    }
  };

  const handleEditImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditImageFile(file);
      setEditImagePreview(URL.createObjectURL(file));
    }
  };

  const handleAddItem = async () => {
    if (!newItem.title || !newItem.client || !newItem.category || (!newItem.image_url && !newImageFile)) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'Please fill in all fields and provide an image.',
      });
      return;
    }

    try {
      setIsSaving(true);
      let imageUrl = newItem.image_url;
      if (newImageFile) {
        imageUrl = await uploadImage(newImageFile);
      }

      const { data, error } = await (supabase as any)
        .from('portfolio_items')
        .insert([{ ...newItem, image_url: imageUrl }])
        .select()
        .single();

      if (error) throw error;

      setPortfolioItems([data as PortfolioItem, ...portfolioItems]);
      setNewItem({ title: '', client: '', category: '', image_url: '', project_url: '' });
      setNewImageFile(null);
      setNewImagePreview(null);
      setShowForm(false);
      toast({
        title: 'Success',
        description: 'Portfolio item added successfully.',
      });
    } catch (error: any) {
      console.error('Error adding item:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to add portfolio item.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from('portfolio_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPortfolioItems(portfolioItems.filter(item => item.id !== id));
      toast({ title: 'Deleted', description: 'Portfolio item removed.' });
    } catch (error: any) {
      console.error('Error deleting item:', error);
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to delete item.' });
    }
  };

  const openEditDialog = (item: PortfolioItem) => {
    setEditItem(item);
    setEditForm({ title: item.title, client: item.client, category: item.category, image_url: item.image_url, project_url: item.project_url || '' });
    setEditImageFile(null);
    setEditImagePreview(null);
  };

  const handleUpdateItem = async () => {
    if (!editItem || !editForm.title || !editForm.client || !editForm.category || (!editForm.image_url && !editImageFile)) {
      toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please fill in all fields.' });
      return;
    }
    try {
      setIsEditing(true);
      let imageUrl = editForm.image_url;
      if (editImageFile) {
        imageUrl = await uploadImage(editImageFile);
      }
      const { error } = await (supabase as any)
        .from('portfolio_items')
        .update({ title: editForm.title, client: editForm.client, category: editForm.category, image_url: imageUrl, project_url: editForm.project_url || null })
        .eq('id', editItem.id);

      if (error) throw error;

      setPortfolioItems(portfolioItems.map(item =>
        item.id === editItem.id ? { ...item, ...editForm, image_url: imageUrl } : item
      ));
      setEditItem(null);
      setEditImageFile(null);
      setEditImagePreview(null);
      toast({ title: 'Updated', description: 'Portfolio item updated successfully.' });
    } catch (error: any) {
      console.error('Error updating item:', error);
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to update item.' });
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <SuperAdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-bold">Manage Portfolio</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Add and manage company works displayed on the website</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Add New Work
          </Button>
        </div>

        {/* Add New Item Form */}
        {showForm && (
          <Card className="glass mb-8">
            <CardHeader>
              <CardTitle>Add New Portfolio Item</CardTitle>
              <CardDescription>Fill in the details for the new work</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Project Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., TechFlow Dashboard"
                    value={newItem.title}
                    onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client">Client Name</Label>
                  <Input
                    id="client"
                    placeholder="e.g., TechFlow Inc."
                    value={newItem.client}
                    onChange={(e) => setNewItem({ ...newItem, client: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={newItem.category}
                    onValueChange={(value) => setNewItem({ ...newItem, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Image</Label>
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleNewImageSelect}
                      className="flex-1"
                    />
                  </div>
                  {!newImageFile && (
                    <Input
                      placeholder="Or paste image URL"
                      value={newItem.image_url}
                      onChange={(e) => setNewItem({ ...newItem, image_url: e.target.value })}
                    />
                  )}
                  {newImagePreview && (
                    <img src={newImagePreview} alt="Preview" className="w-full h-32 object-cover rounded-md mt-2" />
                  )}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="project_url">Project Link (Optional)</Label>
                  <Input
                    id="project_url"
                    placeholder="e.g., https://www.figma.com/... or https://example.com"
                    value={newItem.project_url}
                    onChange={(e) => setNewItem({ ...newItem, project_url: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button onClick={handleAddItem} disabled={isSaving} className="gap-2">
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  Save Item
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Portfolio Items Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : portfolioItems.length === 0 ? (
          <Card className="glass">
            <CardContent className="flex flex-col items-center justify-center py-20">
              <ImageIcon className="w-16 h-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-heading font-bold mb-2">No Portfolio Items Yet</h3>
              <p className="text-muted-foreground mb-6">Add your first work to display on the website</p>
              <Button onClick={() => setShowForm(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Add First Work
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {portfolioItems.map((item) => (
              <Card key={item.id} className="glass overflow-hidden group">
                <div className="aspect-[4/3] overflow-hidden relative">
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-80" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <span className="text-primary text-sm font-medium">{item.category}</span>
                    <h3 className="text-lg font-heading font-bold">{item.title}</h3>
                    <p className="text-muted-foreground text-sm">{item.client}</p>
                  </div>
                </div>
                <CardContent className="p-4 flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    Added {new Date(item.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => window.open(item.image_url, '_blank')}>
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteItem(item.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Portfolio Item</DialogTitle>
              <DialogDescription>Update the details for this work</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Project Title</Label>
                <Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Client Name</Label>
                <Input value={editForm.client} onChange={(e) => setEditForm({ ...editForm, client: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={editForm.category} onValueChange={(v) => setEditForm({ ...editForm, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Image</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleEditImageSelect}
                />
                {!editImageFile && (
                  <Input
                    placeholder="Or paste image URL"
                    value={editForm.image_url}
                    onChange={(e) => setEditForm({ ...editForm, image_url: e.target.value })}
                  />
                )}
                {(editImagePreview || editForm.image_url) && (
                  <img
                    src={editImagePreview || editForm.image_url}
                    alt="Preview"
                    className="w-full h-32 object-cover rounded-md mt-2"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label>Project Link (Optional)</Label>
                <Input
                  placeholder="e.g., https://www.figma.com/... or https://example.com"
                  value={editForm.project_url}
                  onChange={(e) => setEditForm({ ...editForm, project_url: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
              <Button onClick={handleUpdateItem} disabled={isEditing}>
                {isEditing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
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

export default ManagePortfolio;
