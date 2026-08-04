import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Send, Loader2, ArrowLeft, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/DashboardLayout';
import { useUserSettings } from '@/contexts/UserSettingsContext';
import { useNotificationSound } from '@/hooks/useNotificationSound';

interface Designer { user_id: string; full_name: string; professional_title: string; profile_photo_url: string | null; }
interface Message { id: string; sender_id: string; receiver_id: string; content: string; read: boolean | null; created_at: string; }
interface ConversationMeta { partnerId: string; lastMessage: Message | null; unreadCount: number; }

const Messages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { settings } = useUserSettings();
  const playSound = useNotificationSound();
  const [loading, setLoading] = useState(true);
  const [peers, setPeers] = useState<Designer[]>([]);
  const [conversationMeta, setConversationMeta] = useState<Map<string, ConversationMeta>>(new Map());
  const [selectedDesigner, setSelectedDesigner] = useState<Designer | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [myTitle, setMyTitle] = useState('');
  const [myProfile, setMyProfile] = useState<{ full_name: string | null } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollToBottom = useCallback(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, []);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      try {
        // 0. Check if user is a client
        const { data: clientData } = await supabase.from('clients').select('id, name').eq('email', user.email ?? '').maybeSingle();
        const isClientUser = !!clientData;

        // 1. Get my own title (for fallback/sorting)
        const { data: myProfileData } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
        setMyProfile(myProfileData);

        const { data: myDetails } = await supabase.from('designer_details').select('professional_title').eq('user_id', user.id).maybeSingle();
        const title = myDetails?.professional_title || (isClientUser ? 'Client' : '');
        setMyTitle(title);

        let finalPeers: Designer[] = [];

        const normalizeCategory = (title: string | null): string => {
          const t = (title || '').toLowerCase();
          if (t.includes('ui') || t.includes('ux') || t.includes('app')) return 'UI/UX Designer';
          if (t.includes('web') || t.includes('dev') || t.includes('frontend') || t.includes('fullstack') || t.includes('full-stack') || t.includes('backend')) return 'Web Developer';
          return 'Graphic Designer';
        };

        const myCategory = normalizeCategory(title);

        if (isClientUser) {
          // 2. Client Mode: Find designers linked to their projects
          // Get designer IDs from submissions belonging to this client's orders
          const { data: myOrders } = await supabase.from('client_orders').select('id').eq('client_email', user.email ?? '');
          const orderIds = (myOrders || []).map(o => o.id);

          const { data: submissions } = await supabase.from('submissions').select('designer_id').in('client_ref', orderIds);
          const designerIds = Array.from(new Set((submissions || []).map(s => s.designer_id)));

          if (designerIds.length > 0) {
            const { data: designers } = await supabase.from('leaderboard_designer_details').select('user_id, professional_title, profile_photo_url').in('user_id', designerIds);
            const { data: profiles } = await supabase.from('leaderboard_profiles').select('id, full_name').in('id', designerIds);

            const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
            finalPeers = (designers || []).map(d => ({
              user_id: d.user_id,
              full_name: profileMap.get(d.user_id) || 'Unknown Designer',
              professional_title: d.professional_title || 'Designer',
              profile_photo_url: d.profile_photo_url || null
            }));
          }
        } else {
          // 3. Designer Mode: Show other designers in SAME CATEGORY + their own clients
          // Fetch all designers
          const { data: allDesigners } = await supabase
            .from('leaderboard_designer_details')
            .select('user_id, professional_title, profile_photo_url')
            .neq('user_id', user.id);
          const { data: designerProfiles } = await supabase
            .from('leaderboard_profiles')
            .select('id, full_name')
            .in('id', allDesigners?.map(d => d.user_id) || []);

          const dProfileMap = new Map(designerProfiles?.map(p => [p.id, p.full_name]) || []);
          const designerList: Designer[] = (allDesigners || [])
            .filter(d => normalizeCategory(d.professional_title) === myCategory)
            .map(d => ({
              user_id: d.user_id,
              full_name: dProfileMap.get(d.user_id) || 'Unknown',
              professional_title: d.professional_title || 'Designer',
              profile_photo_url: d.profile_photo_url || null,
            }));

          // Fetch clients this designer has worked for
          const { data: mySubmissions } = await supabase.from('submissions').select('client_ref').eq('designer_id', user.id);
          const clientRefs = Array.from(new Set((mySubmissions || []).map(s => s.client_ref).filter((r): r is string => r !== null)));

          let clientList: Designer[] = [];
          if (clientRefs.length > 0) {
            const { data: orders } = await supabase.from('client_orders').select('client_email').in('id', clientRefs);
            const clientEmails = Array.from(new Set((orders || []).map(o => o.client_email)));

            if (clientEmails.length > 0) {
              const { data: clients } = await supabase.from('clients').select('id, name, company, email').in('email', clientEmails);
              const { data: authUsers } = await supabase.from('profiles').select('id, email').in('email', clientEmails);
              const authMap = new Map(authUsers?.map(a => [a.email, a.id]) || []);

              clientList = (clients || []).map(c => ({
                user_id: authMap.get(c.email ?? '') || '',
                full_name: c.name || 'Client',
                professional_title: c.company || 'Business',
                profile_photo_url: (c as any).profile_photo_url || null
              })).filter(c => c.user_id !== '');
            }
          }
          finalPeers = [...designerList, ...clientList];
        }

        setPeers(finalPeers);

        // 4. Load messages and metadata
        const peerIds = finalPeers.map(p => p.user_id);
        const { data: allMsgs } = await supabase.from('messages').select('*').or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`).order('created_at', { ascending: false });

        const metaMap = new Map<string, ConversationMeta>();
        for (const peer of finalPeers) {
          const peerMsgs = (allMsgs || []).filter(m => m.sender_id === peer.user_id || m.receiver_id === peer.user_id);
          metaMap.set(peer.user_id, { partnerId: peer.user_id, lastMessage: peerMsgs[0] || null, unreadCount: peerMsgs.filter(m => m.receiver_id === user.id && !m.read).length });
        }
        setConversationMeta(metaMap);
      } catch (error) { console.error('Error loading messaging peers:', error); }
      finally { setLoading(false); }
    };
    load();
  }, [user]);

  useEffect(() => {
    if (!user || !selectedDesigner) return;
    const loadMessages = async () => {
      const { data } = await supabase.from('messages').select('*').or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedDesigner.user_id}),and(sender_id.eq.${selectedDesigner.user_id},receiver_id.eq.${user.id})`).order('created_at', { ascending: true });
      if (data) {
        setMessages(data);
        const unreadIds = data.filter(m => m.receiver_id === user.id && !m.read).map(m => m.id);
        if (unreadIds.length > 0) {
          await supabase.from('messages').update({ read: true }).in('id', unreadIds);
          setConversationMeta(prev => { const next = new Map(prev); const meta = next.get(selectedDesigner.user_id); if (meta) next.set(selectedDesigner.user_id, { ...meta, unreadCount: 0 }); return next; });
        }
      }
    };
    loadMessages();
    const channel = supabase.channel(`messages-${selectedDesigner.user_id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
      const msg = payload.new as Message;
      if ((msg.sender_id === user.id && msg.receiver_id === selectedDesigner.user_id) || (msg.sender_id === selectedDesigner.user_id && msg.receiver_id === user.id)) {
        setMessages(prev => [...prev, msg]);
        if (msg.receiver_id === user.id) supabase.from('messages').update({ read: true }).eq('id', msg.id);
        if (msg.sender_id !== user.id) playSound();
      }
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, selectedDesigner, playSound]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('global-msg-notify').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
      const msg = payload.new as Message;
      if (msg.receiver_id === user.id && msg.sender_id !== selectedDesigner?.user_id) {
        playSound();
        setConversationMeta(prev => { const next = new Map(prev); const meta = next.get(msg.sender_id); if (meta) next.set(msg.sender_id, { ...meta, lastMessage: msg, unreadCount: meta.unreadCount + 1 }); return next; });
      }
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, selectedDesigner, playSound]);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !selectedDesigner || sending) return;
    setSending(true);
    try {
      const { error } = await supabase.from('messages').insert({ sender_id: user.id, receiver_id: selectedDesigner.user_id, content: newMessage.trim() });
      if (error) throw error;

      // 2. Notify recipient via email
      supabase.functions.invoke('notify-new-message', {
        body: {
          senderId: user.id,
          senderName: myProfile?.full_name || 'Someone',
          receiverId: selectedDesigner.user_id,
          content: newMessage.trim().slice(0, 100) + (newMessage.length > 100 ? '...' : '')
        }
      }).catch(err => console.error('Failed to send message email notification:', err));

      setNewMessage(''); inputRef.current?.focus();
    } catch (err) { const error = err as Error; toast({ title: 'Failed to send', description: error?.message || 'Unknown error', variant: 'destructive' }); }
    finally { setSending(false); }
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr); const now = new Date(); const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
    if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday'; if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };
  const formatMessageDate = (dateStr: string) => new Date(dateStr).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const groupedMessages = messages.reduce<{ date: string; msgs: Message[] }[]>((acc, msg) => {
    const dateKey = new Date(msg.created_at).toDateString();
    const last = acc[acc.length - 1];
    if (last && last.date === dateKey) { last.msgs.push(msg); } else { acc.push({ date: dateKey, msgs: [msg] }); }
    return acc;
  }, []);

  const sortedPeers = [...peers].sort((a, b) => {
    const metaA = conversationMeta.get(a.user_id); const metaB = conversationMeta.get(b.user_id);
    const hasA = !!metaA?.lastMessage; const hasB = !!metaB?.lastMessage;
    if (hasA && !hasB) return -1; if (!hasA && hasB) return 1;
    if (hasA && hasB) return new Date(metaB!.lastMessage!.created_at).getTime() - new Date(metaA!.lastMessage!.created_at).getTime();
    return 0;
  });

  if (!settings.allow_messages) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-sm">
            <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-6 h-6 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-heading font-bold mb-1">Messaging Disabled</h2>
            <p className="text-xs text-muted-foreground mb-4">Enable messaging in Settings → Privacy</p>
            <Button size="sm" className="text-xs" onClick={() => window.location.href = '/settings'}>Go to Settings</Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const renderPeerItem = (peer: Designer) => {
    const meta = conversationMeta.get(peer.user_id);
    const isSelected = selectedDesigner?.user_id === peer.user_id;
    return (
      <button key={peer.user_id} className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all text-left ${isSelected ? 'bg-primary/5 border border-primary/15' : 'hover:bg-muted/20 border border-transparent'}`} onClick={() => setSelectedDesigner(peer)}>
        <div className="flex-shrink-0">
          {peer.profile_photo_url ? (
            <img src={peer.profile_photo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">{getInitials(peer.full_name)}</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium truncate block">{peer.full_name}</span>
          <span className="text-[9px] text-muted-foreground truncate block">{peer.professional_title}</span>
        </div>
        {(meta?.unreadCount ?? 0) > 0 && <Badge variant="default" className="h-4 min-w-[16px] px-1 text-[8px] font-bold rounded-full">{meta!.unreadCount}</Badge>}
      </button>
    );
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-3.5rem)] flex overflow-hidden">
        {/* Sidebar */}
        <div className={`w-56 border-r border-border/60 bg-card/20 flex flex-col flex-shrink-0 ${selectedDesigner ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-3 border-b border-border/40 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <h2 className="text-xs font-heading font-bold">{myTitle === 'Client' ? 'Talk to the Designer' : 'Conversations'}</h2>
          </div>
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
            ) : (
              <div className="p-2 space-y-0.5">
                {sortedPeers.length > 0 ? sortedPeers.map(renderPeerItem) : (
                  <div className="text-center py-8 px-4">
                    <Users className="w-6 h-6 text-muted mx-auto mb-2" />
                    <p className="text-[10px] text-muted-foreground">No designers available</p>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Chat */}
        <div className={`flex-1 flex flex-col min-w-0 ${!selectedDesigner ? 'hidden md:flex' : 'flex'}`}>
          {selectedDesigner ? (
            <>
              <div className="h-12 border-b border-border/40 flex items-center gap-3 px-4 bg-card/20 flex-shrink-0">
                <Button variant="ghost" size="icon" className="md:hidden h-7 w-7" onClick={() => setSelectedDesigner(null)}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="flex items-center gap-2.5 min-w-0">
                  {selectedDesigner.profile_photo_url ? (
                    <img src={selectedDesigner.profile_photo_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">{getInitials(selectedDesigner.full_name)}</div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">{selectedDesigner.full_name}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{selectedDesigner.professional_title}</span>
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  <div className="pb-4 border-b border-border/40 mb-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold mx-auto mb-2">{getInitials(selectedDesigner.full_name)}</div>
                    <h3 className="text-sm font-heading font-bold">{selectedDesigner.full_name}</h3>
                    <p className="text-[10px] text-muted-foreground">Start of your conversation</p>
                  </div>
                  {groupedMessages.map(group => (
                    <div key={group.date}>
                      <div className="flex items-center gap-2 my-3">
                        <div className="flex-1 h-px bg-border/40" />
                        <span className="text-[9px] text-muted-foreground font-semibold px-2">{formatMessageDate(group.msgs[0].created_at)}</span>
                        <div className="flex-1 h-px bg-border/40" />
                      </div>
                      {group.msgs.map((msg, idx) => {
                        const isOwn = msg.sender_id === user?.id;
                        const prevMsg = idx > 0 ? group.msgs[idx - 1] : null;
                        const showHeader = !prevMsg || prevMsg.sender_id !== msg.sender_id;
                        return (
                          <div key={msg.id} className={`group flex gap-2.5 px-2 py-0.5 hover:bg-muted/10 rounded ${showHeader ? 'mt-2.5' : ''}`}>
                            {showHeader ? (
                              <div className="w-8 flex-shrink-0 pt-0.5">
                                {isOwn ? (
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[9px] font-bold">You</div>
                                ) : selectedDesigner.profile_photo_url ? (
                                  <img src={selectedDesigner.profile_photo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[9px] font-bold">{getInitials(selectedDesigner.full_name)}</div>
                                )}
                              </div>
                            ) : (
                              <div className="w-8 flex-shrink-0 flex items-center justify-center">
                                <span className="text-[8px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              {showHeader && (
                                <div className="flex items-baseline gap-2 mb-0.5">
                                  <span className={`text-xs font-bold ${isOwn ? 'text-primary' : ''}`}>{isOwn ? 'You' : selectedDesigner.full_name}</span>
                                  <span className="text-[9px] text-muted-foreground">{formatTime(msg.created_at)}</span>
                                </div>
                              )}
                              <p className="text-xs break-words text-foreground/90">{msg.content}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              <div className="p-3 border-t border-border/40 bg-card/20">
                <div className="flex gap-2 items-center bg-muted/20 rounded-xl px-3 py-1.5 border border-border/40">
                  <Input ref={inputRef} placeholder={`Message ${selectedDesigner.full_name}`} value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()} className="border-0 bg-transparent shadow-none focus-visible:ring-0 px-0 text-xs h-8" disabled={sending} />
                  <Button size="icon" variant="ghost" onClick={handleSendMessage} disabled={!newMessage.trim() || sending} className="h-7 w-7 flex-shrink-0">
                    {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted/20 flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="w-6 h-6 text-muted" />
                </div>
                <h3 className="text-sm font-heading font-bold mb-1">No conversation selected</h3>
                <p className="text-[10px] text-muted-foreground">{myTitle === 'Client' ? 'Pick a designer to start chatting' : 'Select a person to message'}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Messages;
