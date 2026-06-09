import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Ticket, CheckCircle2, XCircle, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface PromoCode {
    id: string;
    code: string;
    discount_percent: number;
    is_active: boolean;
    expiry_date: string | null;
    created_at: string;
}

const PromoCodeManager = () => {
    const { toast } = useToast();
    const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [newCode, setNewCode] = useState({ code: '', discount: 10, expiry: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchPromoCodes();
    }, []);

    const fetchPromoCodes = async () => {
        setLoading(true);
        const { data, error } = await (supabase as any)
            .from('promo_codes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching promo codes:', error);
        } else {
            setPromoCodes(data || []);
        }
        setLoading(false);
    };

    const handleCreateCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCode.code) return;

        setIsSubmitting(true);
        const { error } = await (supabase as any).from('promo_codes').insert({
            code: newCode.code.toUpperCase().trim(),
            discount_percent: newCode.discount,
            expiry_date: newCode.expiry ? new Date(newCode.expiry).toISOString() : null
        });

        if (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } else {
            toast({ title: 'Success', description: 'Promo code created successfully.' });
            setNewCode({ code: '', discount: 10, expiry: '' });
            fetchPromoCodes();
        }
        setIsSubmitting(false);
    };

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        const { error } = await (supabase as any)
            .from('promo_codes')
            .update({ is_active: !currentStatus })
            .eq('id', id);

        if (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } else {
            fetchPromoCodes();
        }
    };

    const deleteCode = async (id: string) => {
        const { error } = await (supabase as any).from('promo_codes').delete().eq('id', id);
        if (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } else {
            toast({ title: 'Deleted', description: 'Promo code removed.' });
            fetchPromoCodes();
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Plus className="w-5 h-5 text-primary" /> Create New Promo Code
                    </CardTitle>
                    <CardDescription>Generate discount codes for clients</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleCreateCode} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="space-y-2">
                            <Label htmlFor="code">Code (e.g. SAVE20)</Label>
                            <Input
                                id="code"
                                value={newCode.code}
                                onChange={e => setNewCode({ ...newCode, code: e.target.value })}
                                placeholder="SUMMER24"
                                className="uppercase"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="discount">Discount %</Label>
                            <Input
                                id="discount"
                                type="number"
                                min="1"
                                max="100"
                                value={newCode.discount}
                                onChange={e => setNewCode({ ...newCode, discount: parseInt(e.target.value) })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="expiry">Expiry Date (Optional)</Label>
                            <Input
                                id="expiry"
                                type="date"
                                value={newCode.expiry}
                                onChange={e => setNewCode({ ...newCode, expiry: e.target.value })}
                            />
                        </div>
                        <Button type="submit" disabled={isSubmitting} className="w-full">
                            {isSubmitting ? 'Creating...' : 'Create Code'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Ticket className="w-5 h-5 text-primary" /> Active Promo Codes
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Discount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Expiry</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {promoCodes.map((pc) => (
                                <TableRow key={pc.id}>
                                    <TableCell className="font-bold">{pc.code}</TableCell>
                                    <TableCell>{pc.discount_percent}%</TableCell>
                                    <TableCell>
                                        <button onClick={() => toggleStatus(pc.id, pc.is_active)}>
                                            {pc.is_active ? (
                                                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1 cursor-pointer">
                                                    <CheckCircle2 className="w-3 h-3" /> Active
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-muted-foreground gap-1 cursor-pointer">
                                                    <XCircle className="w-3 h-3" /> Inactive
                                                </Badge>
                                            )}
                                        </button>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {pc.expiry_date ? (
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {format(new Date(pc.expiry_date), 'PPP')}
                                            </div>
                                        ) : 'No Expiry'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => deleteCode(pc.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {promoCodes.length === 0 && !loading && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No promo codes found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default PromoCodeManager;
