import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
    Plus, Search, Edit, Trash2, Power, PowerOff,
    Link as LinkIcon, Image as ImageIcon, Timer,
    MoreHorizontal, CheckCircle2, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface SitePromo {
    id: string;
    title: string;
    description: string | null;
    image_url: string | null;
    link_url: string | null;
    delay_ms: number;
    is_active: boolean;
    target_audience: string;
    created_at: string;
}

const ManageSitePromos = () => {
    const [promos, setPromos] = useState<SitePromo[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [editingPromo, setEditingPromo] = useState<SitePromo | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        image_url: '',
        link_url: '',
        delay_ms: '2500',
        target_audience: 'all'
    });

    useEffect(() => {
        fetchPromos();
    }, []);

    const fetchPromos = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('site_promos')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            toast.error('Failed to fetch promos');
        } else {
            setPromos(data || []);
        }
        setLoading(false);
    };

    const handleToggleActive = async (id: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from('site_promos')
            .update({ is_active: !currentStatus })
            .eq('id', id);

        if (error) {
            toast.error('Failed to update status');
        } else {
            setPromos(promos.map(p => p.id === id ? { ...p, is_active: !currentStatus } : p));
            toast.success(`Promo ${!currentStatus ? 'activated' : 'deactivated'}`);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this promo?')) return;

        const { error } = await supabase
            .from('site_promos')
            .delete()
            .eq('id', id);

        if (error) {
            toast.error('Failed to delete promo');
        } else {
            setPromos(promos.filter(p => p.id !== id));
            toast.success('Promo deleted');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const payload = {
            title: formData.title,
            description: formData.description || null,
            image_url: formData.image_url || null,
            link_url: formData.link_url || null,
            delay_ms: parseInt(formData.delay_ms) || 2500,
            target_audience: formData.target_audience
        };

        let error;
        if (editingPromo) {
            const { error: err } = await supabase
                .from('site_promos')
                .update(payload)
                .eq('id', editingPromo.id);
            error = err;
        } else {
            const { error: err } = await supabase
                .from('site_promos')
                .insert([payload]);
            error = err;
        }

        if (error) {
            toast.error(error.message);
        } else {
            toast.success(editingPromo ? 'Promo updated' : 'Promo created');
            setIsAddDialogOpen(false);
            setEditingPromo(null);
            setFormData({ title: '', description: '', image_url: '', link_url: '', delay_ms: '2500', target_audience: 'all' });
            fetchPromos();
        }
        setIsSubmitting(false);
    };

    const handleEdit = (promo: SitePromo) => {
        setEditingPromo(promo);
        setFormData({
            title: promo.title,
            description: promo.description || '',
            image_url: promo.image_url || '',
            link_url: promo.link_url || '',
            delay_ms: promo.delay_ms.toString(),
            target_audience: promo.target_audience
        });
        setIsAddDialogOpen(true);
    };

    const filteredPromos = promos.filter(p =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative w-full sm:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search promos..."
                        className="pl-10 h-10 bg-background/50"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button onClick={() => { setEditingPromo(null); setIsAddDialogOpen(true); }} className="w-full sm:w-auto">
                    <Plus className="w-4 h-4 mr-2" /> Create Promo
                </Button>
            </div>

            <div className="rounded-xl border border-border/50 overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow>
                            <TableHead>Promotion</TableHead>
                            <TableHead>Timing</TableHead>
                            <TableHead>Target</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8">Loading promos...</TableCell>
                            </TableRow>
                        ) : filteredPromos.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                    No promotions found. Create your first one!
                                </TableCell>
                            </TableRow>
                        ) : filteredPromos.map((promo) => (
                            <TableRow key={promo.id} className="hover:bg-muted/20 transition-colors">
                                <TableCell>
                                    <div className="flex items-center gap-4">
                                        {promo.image_url ? (
                                            <img src={promo.image_url} alt="" className="w-12 h-12 rounded-lg object-cover border border-border/50" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <ImageIcon className="w-6 h-6 text-primary" />
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-bold text-sm">{promo.title}</p>
                                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{promo.description || 'No description'}</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1.5 text-xs">
                                        <Timer className="w-3.5 h-3.5 text-muted-foreground" />
                                        {(promo.delay_ms / 1000).toFixed(1)}s Delay
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="capitalize text-[10px]">
                                        {promo.target_audience}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge className={promo.is_active ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" : "bg-muted text-muted-foreground"}>
                                        {promo.is_active ? 'Active' : 'Inactive'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={() => handleToggleActive(promo.id, promo.is_active)}
                                        >
                                            {promo.is_active ? <PowerOff className="w-4 h-4 text-amber-500" /> : <Power className="w-4 h-4 text-emerald-500" />}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={() => handleEdit(promo)}
                                        >
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => handleDelete(promo.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent className="sm:max-w-xl glass-card border-primary/20">
                    <DialogHeader>
                        <DialogTitle>{editingPromo ? 'Edit Promotion' : 'Create New Promotion'}</DialogTitle>
                        <DialogDescription>
                            Configure the timed pop-up for your website visitors.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Title *</Label>
                                <Input
                                    id="title"
                                    placeholder="e.g. 50% Off Summer Sale"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="delay">Appearance Delay (ms)</Label>
                                <Input
                                    id="delay"
                                    type="number"
                                    placeholder="2500"
                                    value={formData.delay_ms}
                                    onChange={e => setFormData({ ...formData, delay_ms: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                placeholder="Details about the offer..."
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="min-h-[80px]"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="image_url">Image URL (Optional)</Label>
                            <Input
                                id="image_url"
                                placeholder="https://example.com/promo.jpg"
                                value={formData.image_url}
                                onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="link_url">Link URL (Optional)</Label>
                            <Input
                                id="link_url"
                                placeholder="/register or https://..."
                                value={formData.link_url}
                                onChange={e => setFormData({ ...formData, link_url: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Target Audience</Label>
                            <div className="flex flex-wrap gap-2 pt-1">
                                {['all', 'visitors', 'users', 'freelancers'].map(audience => (
                                    <Button
                                        key={audience}
                                        type="button"
                                        variant={formData.target_audience === audience ? 'primary' : 'outline'}
                                        size="sm"
                                        onClick={() => setFormData({ ...formData, target_audience: audience })}
                                        className="capitalize h-8 text-[10px]"
                                    >
                                        {audience}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <DialogFooter className="pt-4">
                            <Button variant="ghost" type="button" onClick={() => setIsAddDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting} className="glow-primary">
                                {isSubmitting ? 'Saving...' : editingPromo ? 'Update Promo' : 'Create Promo'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ManageSitePromos;
