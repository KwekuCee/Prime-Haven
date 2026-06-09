import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LifeBuoy, Plus, MessageSquare, Clock, CheckCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface SupportTicket {
    id: string;
    subject: string;
    description: string;
    status: string;
    created_at: string;
}

const ClientSupport = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [search, setSearch] = useState('');

    const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
    const [newTicket, setNewTicket] = useState({ subject: '', description: '' });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (user?.email) {
            loadTickets();
        }
    }, [user]);

    const loadTickets = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('client_support_tickets')
                .select('*')
                .eq('client_email', user?.email)
                .order('created_at', { ascending: false });

            if (error) {
                // If the table doesn't exist yet, we catch it gracefully
                if (error.code === '42P01') {
                    console.warn('Support tickets table does not exist yet. Please run the SQL migration.');
                    setTickets([]);
                    return;
                }
                throw error;
            }

            setTickets((data || []) as SupportTicket[]);
        } catch (err: any) {
            console.error('Error loading tickets:', err);
            toast({ title: 'Error', description: 'Could not load your support tickets.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTicket.subject || !newTicket.description) return;
        setSubmitting(true);

        try {
            const { error } = await supabase.from('client_support_tickets').insert({
                client_email: user?.email,
                subject: newTicket.subject,
                description: newTicket.description
            });

            if (error) {
                if (error.code === '42P01') {
                    throw new Error("The support system database isn't initialized yet. Please contact your administrator.");
                }
                throw error;
            }

            toast({ title: 'Ticket Submitted', description: 'Our support team will get back to you shortly.' });
            setIsNewTicketOpen(false);
            setNewTicket({ subject: '', description: '' });
            loadTickets();
        } catch (err: any) {
            toast({ title: 'Submission Failed', description: err.message, variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusColor = (status: string) => {
        if (status === 'resolved') return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
        if (status === 'in_progress') return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
        return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
    };

    const getStatusIcon = (status: string) => {
        if (status === 'resolved') return <CheckCircle className="w-4 h-4 mr-1.5" />;
        if (status === 'in_progress') return <Clock className="w-4 h-4 mr-1.5" />;
        return <MessageSquare className="w-4 h-4 mr-1.5" />;
    };

    const filteredTickets = tickets.filter(t => 
        t.subject.toLowerCase().includes(search.toLowerCase()) || 
        t.description.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <DashboardLayout>
            <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto min-h-screen">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Help & Assistance</p>
                        <h1 className="text-3xl font-heading font-bold text-foreground">
                            Support <span className="text-primary text-gradient">Desk</span>
                        </h1>
                        <p className="text-sm text-muted-foreground mt-2 max-w-xl">
                            Need help with billing, account settings, or having issues with a designer? Open a ticket and our administration team will assist you.
                        </p>
                    </div>
                    <Button onClick={() => setIsNewTicketOpen(true)} className="gap-2 shrink-0">
                        <Plus className="w-4 h-4" /> Open New Ticket
                    </Button>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mb-6 items-center justify-between">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search your tickets..."
                            className="pl-9 h-10 text-sm bg-card/40 border-border/50"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
                    </div>
                ) : filteredTickets.length === 0 ? (
                    <div className="bg-card/30 border border-border/50 rounded-2xl p-12 text-center text-muted-foreground">
                        <LifeBuoy className="w-12 h-12 mx-auto mb-4 text-primary/40" />
                        <h3 className="text-lg font-heading font-medium text-foreground mb-2">No tickets found.</h3>
                        <p className="text-sm max-w-md mx-auto">
                            {search ? "We couldn't find any tickets matching your search." : "You haven't opened any support tickets yet."}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        <AnimatePresence>
                            {filteredTickets.map((ticket, idx) => (
                                <motion.div
                                    key={ticket.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-2xl p-5 hover:border-primary/30 transition-all"
                                >
                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="font-heading font-bold text-lg truncate">{ticket.subject}</h3>
                                                <Badge variant="outline" className={`flex items-center text-[10px] uppercase font-bold tracking-wider ${getStatusColor(ticket.status)}`}>
                                                    {getStatusIcon(ticket.status)}
                                                    {ticket.status.replace('_', ' ')}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground line-clamp-2">{ticket.description}</p>
                                        </div>
                                        <div className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                                            {format(new Date(ticket.created_at), 'MMM d, yyyy • h:mm a')}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            <Dialog open={isNewTicketOpen} onOpenChange={setIsNewTicketOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Open Support Ticket</DialogTitle>
                        <DialogDescription>
                            Describe your issue in detail. We typically respond within 24 hours.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateTicket} className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="subject">Subject</Label>
                            <Input 
                                id="subject" 
                                placeholder="E.g. Invoice discrepancy for project" 
                                value={newTicket.subject}
                                onChange={e => setNewTicket(prev => ({ ...prev, subject: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea 
                                id="description" 
                                placeholder="Please provide all relevant details..." 
                                className="min-h-[120px]"
                                value={newTicket.description}
                                onChange={e => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
                                required
                            />
                        </div>
                        <DialogFooter className="mt-6">
                            <Button type="button" variant="ghost" onClick={() => setIsNewTicketOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={submitting || !newTicket.subject || !newTicket.description}>
                                {submitting ? "Submitting..." : "Submit Ticket"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

        </DashboardLayout>
    );
};

export default ClientSupport;
