import { useState, useEffect } from 'react';
import { UserSquare, Search, ExternalLink, Mail, Phone, ShoppingBag, Download, Layout } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface Client {
    email: string;
    name: string;
    whatsapp: string | null;
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

    useEffect(() => {
        loadClients();
    }, []);

    const loadClients = async () => {
        setLoading(true);
        try {
            // 1. Fetch data from client_projects (active work)
            const { data: projects, error: projectsError } = await supabase
                .from('client_projects')
                .select('*')
                .order('created_at', { ascending: false });

            if (projectsError) throw projectsError;

            // 2. Aggregate unique clients
            const clientsMap = new Map<string, Client>();

            (projects || []).forEach(p => {
                const email = (p.client_email || 'anonymous@youthquake.forge').toLowerCase();
                if (!clientsMap.has(email)) {
                    clientsMap.set(email, {
                        email: email,
                        name: p.client_name || 'Individual Client',
                        whatsapp: p.client_whatsapp || null,
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
                    client.name = p.client_name || client.name; // Keep most recent name
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
                                    <p className="text-xs text-muted-foreground">{selectedClient.email}</p>
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
                                                    <div className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{client.name}</div>
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
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-[10px] font-bold uppercase tracking-tight hover:bg-primary/20 hover:text-primary"
                                                onClick={() => setSelectedClient(client)}
                                            >
                                                Details <ExternalLink className="w-3 h-3 ml-1" />
                                            </Button>
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
        </div>
    );
};

export default ManageClients;
