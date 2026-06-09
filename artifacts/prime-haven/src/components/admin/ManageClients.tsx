import { useState, useEffect } from 'react';
import { UserSquare, Search, ExternalLink, Mail, Edit, Download, Layout, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface Client {
    email: string;
    name: string;
    whatsapp: string | null;
    businessName: string | null;
    projectCount: number;
    totalSpent: number;
    latestProjectAt: string;
    projects: any[];
}

const ManageClients = () => {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editWhatsApp, setEditWhatsApp] = useState('');
    const [editBusinessName, setEditBusinessName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        loadClients();
    }, []);

    const loadClients = async () => {
        setLoading(true);
        try {
            // 1. Fetch data from clients table (primary registry)
            const { data: clientRegistry, error: registryError } = await supabase
                .from('clients')
                .select('*');

            if (registryError) throw registryError;

            // 2. Fetch data from client_projects (active work)
            const { data: projects, error: projectsError } = await supabase
                .from('client_projects')
                .select('*')
                .order('created_at', { ascending: false });

            if (projectsError) throw projectsError;

            // 3. Aggregate unique clients
            const clientsMap = new Map<string, Client>();

            // Initialize from registry
            (clientRegistry || []).forEach(c => {
                const email = (c.email || '').toLowerCase();
                if (email) {
                    clientsMap.set(email, {
                        email: email,
                        name: c.name || 'Individual Client',
                        whatsapp: c.whatsapp || null,
                        businessName: c.company || null,
                        projectCount: 0,
                        totalSpent: 0,
                        latestProjectAt: c.created_at || new Date().toISOString(),
                        projects: []
                    });
                }
            });

            // Add/Update from projects
            (projects || []).forEach(p => {
                const email = (p.client_email || 'anonymous@youthquake.forge').toLowerCase();
                if (!clientsMap.has(email)) {
                    clientsMap.set(email, {
                        email: email,
                        name: p.client_name || 'Individual Client',
                        whatsapp: p.client_whatsapp || null,
                        businessName: null,
                        projectCount: 0,
                        totalSpent: 0,
                        latestProjectAt: p.created_at,
                        projects: []
                    });
                }

                const client = clientsMap.get(email)!;
                client.projectCount++;
                client.projects.push(p);

                // Use budget if available (attempt to parse number)
                const budgetValue = parseFloat(p.budget?.replace(/[^0-9.]/g, '') || '0');
                client.totalSpent += isNaN(budgetValue) ? 0 : budgetValue;

                if (new Date(p.created_at) > new Date(client.latestProjectAt)) {
                    client.latestProjectAt = p.created_at;
                    // Only update name if it wasn't already set from registry or is more recent
                    if (!client.businessName) client.name = p.client_name || client.name;
                }
            });

            setClients(Array.from(clientsMap.values()));
        } catch (error) {
            console.error('Error loading clients:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleEditClient = (client: Client) => {
        setEditingClient(client);
        setEditName(client.name);
        setEditEmail(client.email);
        setEditWhatsApp(client.whatsapp || '');
        setEditBusinessName(client.businessName || '');
    };

    const handleSaveClient = async () => {
        if (!editingClient) return;

        setIsSaving(true);
        try {
            // 1. Update clients table
            const { error: clientUpdateError } = await supabase
                .from('clients')
                .update({
                    name: editName,
                    email: editEmail,
                    whatsapp: editWhatsApp,
                    company: editBusinessName,
                    updated_at: new Date().toISOString()
                })
                .eq('email', editingClient.email);

            if (clientUpdateError) throw clientUpdateError;

            // 2. Update client_projects table
            const { error: projectsUpdateError } = await supabase
                .from('client_projects')
                .update({
                    client_name: editName,
                    client_email: editEmail,
                    client_whatsapp: editWhatsApp
                })
                .eq('client_email', editingClient.email);

            if (projectsUpdateError) throw projectsUpdateError;

            toast({
                title: "Success",
                description: "Client details updated successfully across all records.",
            });

            // Update local state
            setClients(prev => prev.map(c =>
                c.email === editingClient.email
                    ? { ...c, name: editName, email: editEmail, whatsapp: editWhatsApp, businessName: editBusinessName }
                    : c
            ));

            if (selectedClient?.email === editingClient.email) {
                setSelectedClient(prev => prev ? { ...prev, name: editName, email: editEmail, whatsapp: editWhatsApp, businessName: editBusinessName } : null);
            }

            setEditingClient(null);
        } catch (error: any) {
            console.error('Error updating client:', error);
            toast({
                title: "Error",
                description: error.message || "Failed to update client details",
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    const exportClientsCSV = () => {
        const headers = ['Name', 'Email', 'WhatsApp', 'Projects', 'Est. Value', 'Last Project'];
        const rows = filteredClients.map(c => [
            c.name,
            c.email,
            c.whatsapp || 'N/A',
            c.projectCount,
            `GH₵${c.totalSpent.toFixed(2)}`,
            format(new Date(c.latestProjectAt), 'yyyy-MM-dd')
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `clients_export_${format(new Date(), 'yyyyMMdd')}.csv`;
        link.click();
    };

    if (selectedClient) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedClient(null)}>
                        ← Back to All Clients
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => handleEditClient(selectedClient)}>
                            <Edit className="w-3.5 h-3.5" /> Edit Details
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => window.open(`mailto:${selectedClient.email}`)}>
                            <Mail className="w-3.5 h-3.5" /> Email Client
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="md:col-span-1 glass-card border-white/5">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-bold">Client Profile</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary text-xl font-bold">
                                    {selectedClient.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{selectedClient.name}</h3>
                                    <p className="text-xs text-muted-foreground">{selectedClient.businessName || 'Individual Client'}</p>
                                    <p className="text-[10px] text-muted-foreground mt-1">{selectedClient.email}</p>
                                </div>
                            </div>

                            <div className="space-y-2 pt-2 border-t border-white/5">
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">WhatsApp:</span>
                                    <span className="font-medium">{selectedClient.whatsapp || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Total Projects:</span>
                                    <span className="font-bold">{selectedClient.projectCount}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Est. Lifetime Value:</span>
                                    <span className="text-primary font-bold">GH₵{selectedClient.totalSpent.toFixed(2)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="md:col-span-2 glass-card border-white/5">
                        <CardHeader className="pb-3 border-b border-white/5">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Layout className="w-4 h-4" /> Project History
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent border-white/5">
                                        <TableHead className="text-[10px] uppercase">Project Title</TableHead>
                                        <TableHead className="text-[10px] uppercase">Category</TableHead>
                                        <TableHead className="text-[10px] uppercase">Status</TableHead>
                                        <TableHead className="text-[10px] uppercase text-right">Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {selectedClient.projects.map((p) => (
                                        <TableRow key={p.id} className="border-white/5">
                                            <TableCell className="text-sm font-medium">{p.title}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-[10px] capitalize font-medium">{p.category?.replace('-', ' ')}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    className={`text-[10px] font-bold ${p.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                        p.status === 'in_progress' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                            'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                        }`}
                                                >
                                                    {p.status.replace('_', ' ')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground text-right">
                                                {format(new Date(p.created_at), 'MMM d, yyyy')}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="rounded-xl border border-white/5 bg-card/50 shadow-2xl backdrop-blur-xl">
                <div className="p-4 sm:p-5 border-b border-white/5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-bold flex items-center gap-2">
                                <UserSquare className="w-4 h-4 text-primary" />
                                Client Directory ({clients.length})
                            </h2>
                            <p className="text-xs text-muted-foreground mt-0.5">Aggregate view of unique client profiles</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
                                <Input
                                    placeholder="Search clients..."
                                    className="pl-8 h-8 text-sm w-full sm:w-48 bg-white/5 border-white/10"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Button variant="outline" size="sm" className="h-8 text-xs border-white/10 text-muted-foreground hover:text-foreground" onClick={exportClientsCSV}>
                                <Download className="w-3.5 h-3.5 mr-1" />Export
                            </Button>
                            <Button size="sm" className="h-8 text-xs bg-primary hover:bg-primary/90 shadow-[0_0_20px_hsla(16,99%,55%,0.3)]" onClick={() => loadClients()}>
                                <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Refresh
                            </Button>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-muted-foreground">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-sm">Consolidating client data...</p>
                    </div>
                ) : filteredClients.length > 0 ? (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-white/5">
                                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Client</TableHead>
                                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">WhatsApp</TableHead>
                                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Projects</TableHead>
                                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Est. LTV</TableHead>
                                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Last Active</TableHead>
                                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredClients.map((client) => (
                                    <TableRow key={client.email} className="border-white/5 hover:bg-white/5 transition-colors group">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-primary group-hover:scale-110 transition-transform">
                                                    {client.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-sm font-semibold truncate group-hover:text-primary transition-colors flex items-center gap-2">
                                                        {client.name}
                                                        {client.businessName && (
                                                            <span className="text-[10px] font-normal text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded border border-white/5 truncate max-w-[120px]">
                                                                {client.businessName}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground truncate">{client.email}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs font-medium text-muted-foreground">{client.whatsapp || '—'}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="bg-white/5 text-[10px] font-bold">{client.projectCount} Jobs</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm font-bold text-emerald-500/80">GH₵{client.totalSpent.toFixed(2)}</div>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {format(new Date(client.latestProjectAt), 'MMM d, yyyy')}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 p-0 flex items-center justify-center hover:bg-primary/20 hover:text-primary"
                                                    onClick={() => handleEditClient(client)}
                                                >
                                                    <Edit className="w-3 h-3" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 text-[10px] font-bold uppercase tracking-tight hover:bg-primary/20 hover:text-primary"
                                                    onClick={() => setSelectedClient(client)}
                                                >
                                                    Details <ExternalLink className="w-3 h-3 ml-1" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="text-center py-20 text-muted-foreground">
                        <UserSquare className="w-16 h-16 mx-auto mb-4 opacity-10" />
                        <p className="text-lg font-semibold text-foreground/50 italic">No client history found</p>
                        <p className="text-xs mt-1">Once clients place orders, they will appear here</p>
                    </div>
                )}
            </div>

            {/* Edit Client Dialog */}
            <Dialog open={!!editingClient} onOpenChange={(open) => !open && setEditingClient(null)}>
                <DialogContent className="glass-card border-white/10 sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Edit Client Details</DialogTitle>
                        <DialogDescription className="text-xs">
                            Update details for <span className="text-primary font-bold">{editingClient?.email}</span>.
                            This will update all associated projects.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name" className="text-xs">Full Name</Label>
                                <Input
                                    id="name"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="bg-white/5 border-white/10"
                                    placeholder="Client Full Name"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="business" className="text-xs">Business Name</Label>
                                <Input
                                    id="business"
                                    value={editBusinessName}
                                    onChange={(e) => setEditBusinessName(e.target.value)}
                                    className="bg-white/5 border-white/10"
                                    placeholder="Company Name"
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email" className="text-xs">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                value={editEmail}
                                onChange={(e) => setEditEmail(e.target.value)}
                                className="bg-white/5 border-white/10"
                                placeholder="client@example.com"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="whatsapp" className="text-xs">WhatsApp Number</Label>
                            <Input
                                id="whatsapp"
                                value={editWhatsApp}
                                onChange={(e) => setEditWhatsApp(e.target.value)}
                                className="bg-white/5 border-white/10"
                                placeholder="WhatsApp number"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setEditingClient(null)} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-primary hover:bg-primary/90"
                            onClick={handleSaveClient}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <>
                                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-3.5 h-3.5 mr-2" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ManageClients;
