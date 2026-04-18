import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send, MessageSquare, Paperclip, ChevronLeft, Clock,
    FileText, CheckCircle2, AlertCircle, Download, Upload,
    MoreVertical, Star, ShieldCheck, User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, formatDistanceToNow, isAfter } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import DashboardLayout from '@/components/DashboardLayout';

interface OrderDetails {
    id: string;
    service_type: string;
    tier: string;
    project_status: string;
    price: number;
    description: string;
    deadline_at: string;
    client_name: string;
    assigned_designer_id: string;
}

interface Message {
    id: string;
    content: string;
    sender_id: string;
    created_at: string;
    attachments: string[];
}

const CATEGORY_LABELS: Record<string, string> = {
    'logo-design': 'Logo Design',
    'brand-identity': 'Brand Identity',
    'app-design': 'UI/UX Design',
    'web-design': 'Web Design',
    'web-development': 'Web Development',
    'print-design': 'Print Design',
    'flyer-design': 'Flyer / Poster Design',
    'social-media': 'Social Media Design',
};

const ProjectWorkspace = () => {
    const { orderId } = useParams();
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const scrollRef = useRef<HTMLDivElement>(null);

    const [order, setOrder] = useState<OrderDetails | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (orderId) {
            loadOrderData();
            subscribeToMessages();
        }
    }, [orderId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const loadOrderData = async () => {
        try {
            const { data, error } = await (supabase
                .from('client_orders') as any)
                .select('*')
                .eq('id', orderId)
                .single();

            if (error) throw error;
            setOrder(data);

            // Load messages
            const { data: msgData, error: msgError } = await (supabase
                .from('project_messages') as any)
                .select('*')
                .eq('order_id', orderId)
                .order('created_at', { ascending: true });

            if (msgError) throw msgError;
            setMessages((msgData as any) || []);
        } catch (err) {
            console.error('Error loading workspace:', err);
            toast({ title: 'Error', description: 'Could not load project workspace.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const subscribeToMessages = () => {
        const channel = supabase
            .channel(`project_${orderId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'project_messages',
                filter: `order_id=eq.${orderId}`
            }, (payload) => {
                setMessages(prev => [...prev, payload.new as Message]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newMessage.trim() || !user || !orderId) return;

        setSending(true);
        try {
            const { error } = await (supabase
                .from('project_messages') as any)
                .insert({
                    order_id: orderId,
                    sender_id: user.id,
                    content: newMessage.trim(),
                });

            if (error) throw error;
            setNewMessage('');
        } catch (err) {
            console.error('Error sending message:', err);
            toast({ title: 'Error', description: 'Failed to send message.', variant: 'destructive' });
        } finally {
            setSending(false);
        }
    };

    const getDeadlineStatus = (deadline: string) => {
        const d = new Date(deadline);
        const now = new Date();
        const isOverdue = isAfter(now, d);
        return {
            isOverdue,
            text: isOverdue ? `Overdue by ${formatDistanceToNow(d)}` : `Due in ${formatDistanceToNow(d)}`,
            color: isOverdue ? 'text-destructive' : 'text-primary'
        };
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Clock className="w-8 h-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    if (!order) {
        return (
            <DashboardLayout>
                <div className="text-center py-20">
                    <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                    <h2 className="text-xl font-bold">Project Not Found</h2>
                    <Button variant="link" onClick={() => navigate('/dashboard')}>Return to Dashboard</Button>
                </div>
            </DashboardLayout>
        );
    }

    const deadline = getDeadlineStatus(order.deadline_at);

    return (
        <DashboardLayout>
            <div className="flex flex-col h-[calc(100vh-80px)] max-w-7xl mx-auto p-4 sm:p-6 gap-6">
                {/* Workspace Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                    <div className="flex items-center gap-4">
                        <Link to="/dashboard">
                            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full bg-card/40 border border-border/50">
                                <ChevronLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                        <div>
                            <div className="flex items-center gap-2 mb-0.5">
                                <h1 className="text-xl font-heading font-bold">{CATEGORY_LABELS[order.service_type] || order.service_type}</h1>
                                <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20 capitalize">
                                    {order.project_status.replace('_', ' ')}
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                                Client: <span className="text-foreground">{order.client_name}</span>
                                <span className="opacity-30">•</span>
                                Tier: <span className="text-foreground capitalize">{order.tier}</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className={`flex flex-col items-end hidden sm:flex`}>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Timeline</p>
                            <p className={`text-xs font-bold ${deadline.color}`}>{deadline.text}</p>
                        </div>
                        <Button className="h-9 text-xs font-bold px-5 gap-2 glow-primary" onClick={() => navigate('/submit-work')}>
                            <Upload className="w-3.5 h-3.5" /> Submit Work
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
                    {/* Main Area: Chat & Info */}
                    <div className="lg:col-span-8 flex flex-col gap-6 min-h-0">
                        {/* Chat Panel */}
                        <Card className="flex-1 flex flex-col min-h-0 glass border-border/50 overflow-hidden shadow-2xl relative">
                            <div className="p-3 border-b border-border/50 bg-card/40 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                        <MessageSquare className="w-4 h-4 text-primary" />
                                    </div>
                                    <h3 className="text-xs font-bold uppercase tracking-tight">Project Messages</h3>
                                </div>
                                <Badge variant="outline" className="text-[9px] text-emerald-500 border-emerald-500/20">REAL-TIME ACTIVE</Badge>
                            </div>

                            <ScrollArea className="flex-1 p-4">
                                <div className="space-y-4">
                                    {messages.length === 0 && (
                                        <div className="text-center py-20 opacity-30">
                                            <MessageSquare className="w-10 h-10 mx-auto mb-2" />
                                            <p className="text-sm">No messages yet. Say hello to get started!</p>
                                        </div>
                                    )}
                                    {messages.map((msg) => {
                                        const isMe = msg.sender_id === user?.id;
                                        return (
                                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[85%] rounded-2xl p-3 shadow-lg ${isMe ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-card/80 border border-border/50 rounded-tl-none'}`}>
                                                    {!isMe && (
                                                        <p className="text-[10px] font-bold opacity-60 mb-1 uppercase tracking-tighter">Support / Admin</p>
                                                    )}
                                                    <p className="text-sm leading-relaxed">{msg.content}</p>
                                                    <p className={`text-[9px] mt-1.5 opacity-50 text-right`}>
                                                        {format(new Date(msg.created_at), 'HH:mm')}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={scrollRef} />
                                </div>
                            </ScrollArea>

                            <div className="p-4 border-t border-border/50 bg-card/40 shrink-0">
                                <form onSubmit={handleSendMessage} className="flex gap-2">
                                    <Input
                                        placeholder="Type your message..."
                                        value={newMessage}
                                        onChange={e => setNewMessage(e.target.value)}
                                        className="flex-1 glass bg-background/50"
                                    />
                                    <Button type="submit" disabled={sending || !newMessage.trim()} size="icon" className="shrink-0 bg-primary">
                                        <Send className="w-4 h-4" />
                                    </Button>
                                </form>
                            </div>
                        </Card>
                    </div>

                    {/* Sidebar Area: Brief & Assets */}
                    <div className="lg:col-span-4 flex flex-col gap-4 overflow-y-auto pr-1">
                        {/* Brief Card */}
                        <Card className="glass border-border/50 shrink-0">
                            <div className="p-4 border-b border-border/50 font-bold text-xs uppercase tracking-tight flex items-center gap-2">
                                <FileText className="w-4 h-4 text-primary" /> Project Brief
                            </div>
                            <CardContent className="p-4 space-y-4">
                                <div className="space-y-1">
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Client Description</p>
                                    <p className="text-xs leading-relaxed text-foreground italic bg-muted/20 p-3 rounded-lg border border-border/30">
                                        "{order.description || "Refer to messages for project requirements."}"
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 rounded-xl bg-card/60 border border-border/50">
                                        <p className="text-[9px] text-muted-foreground uppercase font-bold mb-1">Fee</p>
                                        <p className="text-sm font-bold text-primary">GH₵{order.price.toLocaleString()}</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-card/60 border border-border/50">
                                        <p className="text-[9px] text-muted-foreground uppercase font-bold mb-1">Status</p>
                                        <p className="text-sm font-bold text-foreground capitalize">{order.project_status}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Assets/Files Card */}
                        <Card className="glass border-border/50 flex-1">
                            <div className="p-4 border-b border-border/50 font-bold text-xs uppercase tracking-tight flex items-center gap-2">
                                <Paperclip className="w-4 h-4 text-primary" /> Assets & Files
                            </div>
                            <CardContent className="p-0">
                                <div className="p-8 text-center opacity-30">
                                    <Download className="w-8 h-8 mx-auto mb-2" />
                                    <p className="text-xs">No assets uploaded yet</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Security Check */}
                        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex gap-3">
                            <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
                            <div>
                                <p className="text-[11px] font-bold text-foreground">Prime Haven Payments</p>
                                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                                    Your payment for GHS {order.price.toLocaleString()} is secured. It will be released to your wallet upon client approval.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default ProjectWorkspace;
