import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Search, Loader2, User, UserCheck, ShieldAlert, Clock, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

interface Conversation {
    sender_id: string;
    receiver_id: string;
    last_message: string;
    last_message_at: string;
    sender_name: string;
    receiver_name: string;
    sender_role: string;
    receiver_role: string;
}

const AdminMessagingHub = () => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchConversations = async () => {
            setLoading(true);
            try {
                // Fetch last messages grouped by pairs
                // Since Supabase doesn't support GROUP BY easily in JS client for complex queries,
                // we'll fetch recent messages and deduplicate in JS.
                const { data: messages, error } = await supabase
                    .from('messages')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(200);

                if (error) throw error;

                // Deduplicate conversations (A <-> B)
                const uniquePairs = new Map<string, any>();
                messages?.forEach(m => {
                    const pairId = [m.sender_id, m.receiver_id].sort().join(':');
                    if (!uniquePairs.has(pairId)) {
                        uniquePairs.set(pairId, m);
                    }
                });

                // Get user details for all involved IDs
                const userIds = Array.from(new Set(messages?.flatMap(m => [m.sender_id, m.receiver_id]) || []));
                const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
                const { data: roles } = await supabase.from('user_roles').select('user_id, role').in('user_id', userIds);

                const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
                const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

                const finalConversations: Conversation[] = Array.from(uniquePairs.values()).map(m => ({
                    sender_id: m.sender_id,
                    receiver_id: m.receiver_id,
                    last_message: m.content,
                    last_message_at: m.created_at,
                    sender_name: profileMap.get(m.sender_id) || 'Unknown',
                    receiver_name: profileMap.get(m.receiver_id) || 'Unknown',
                    sender_role: roleMap.get(m.sender_id) || 'user',
                    receiver_role: roleMap.get(m.receiver_id) || 'user'
                }));

                setConversations(finalConversations);
            } catch (err) {
                console.error('Error fetching admin conversations:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchConversations();
    }, []);

    const filtered = conversations.filter(c =>
        c.sender_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.receiver_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.last_message.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-heading font-bold">Messaging Hub</h2>
                    <p className="text-xs text-muted-foreground mt-1">Monitor all platform communications and inter-user interactions</p>
                </div>
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                        placeholder="Search users or messages..."
                        className="pl-9 h-9 text-xs"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                        <Card key={i} className="animate-pulse bg-card/50 border-border/40">
                            <CardContent className="p-4 h-32" />
                        </Card>
                    ))
                ) : filtered.length > 0 ? (
                    filtered.map((c, i) => (
                        <motion.div
                            key={`${c.sender_id}-${c.receiver_id}`}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                        >
                            <Card className="h-full bg-card/40 border-border/40 hover:border-primary/30 transition-all group cursor-pointer overflow-hidden backdrop-blur-sm">
                                <CardContent className="p-4 flex flex-col h-full">
                                    {/* Users Header */}
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center -space-x-2">
                                            <div className="w-8 h-8 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center text-[10px] font-bold text-primary z-10" title={c.sender_name}>
                                                {c.sender_name.charAt(0)}
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-blue-500/20 border-2 border-background flex items-center justify-center text-[10px] font-bold text-blue-400 z-0" title={c.receiver_name}>
                                                {c.receiver_name.charAt(0)}
                                            </div>
                                        </div>
                                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {format(new Date(c.last_message_at), 'MMM d, HH:mm')}
                                        </div>
                                    </div>

                                    <div className="flex-1 space-y-3">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-bold">{c.sender_name}</span>
                                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                            <span className="text-xs font-bold">{c.receiver_name}</span>
                                        </div>

                                        <div className="p-2.5 rounded-xl bg-background/40 border border-border/30 italic text-[11px] text-muted-foreground line-clamp-2">
                                            "{c.last_message}"
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
                                        <div className="flex gap-1.5">
                                            <Badge variant="outline" className={`text-[9px] uppercase px-1.5 ${c.sender_role === 'superadmin' ? 'border-primary text-primary' : 'border-border'}`}>
                                                {c.sender_role}
                                            </Badge>
                                            <Badge variant="outline" className={`text-[9px] uppercase px-1.5 ${c.receiver_role === 'superadmin' ? 'border-primary text-primary' : 'border-border'}`}>
                                                {c.receiver_role}
                                            </Badge>
                                        </div>
                                        <div className="w-6 h-6 rounded-lg bg-muted/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center space-y-3">
                        <ShieldAlert className="w-12 h-12 text-muted/30 mx-auto" />
                        <p className="text-sm text-muted-foreground font-medium">No conversations found matching your search</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminMessagingHub;
