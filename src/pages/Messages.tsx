import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare, Send, Loader2, ArrowLeft, Hash, Users, Circle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/DashboardLayout';
import { useUserSettings } from '@/contexts/UserSettingsContext';
import { useNotificationSound } from '@/hooks/useNotificationSound';

interface Designer {
  user_id: string;
  full_name: string;
  professional_title: string;
  profile_photo_url: string | null;
  is_online?: boolean;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

interface ConversationMeta {
  partnerId: string;
  lastMessage: Message | null;
  unreadCount: number;
}

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load same-profession peers + conversation metadata
  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setLoading(true);
      try {
        // Get my professional title
        const { data: myDetails } = await supabase
          .from('designer_details')
          .select('professional_title')
          .eq('user_id', user.id)
          .maybeSingle();

        const title = myDetails?.professional_title || '';
        setMyTitle(title);

        // Get all designers (same profession first, then others)
        const { data: allDetails } = await supabase
          .from('designer_details')
          .select('user_id, professional_title, profile_photo_url')
          .neq('user_id', user.id);

        if (!allDetails) { setLoading(false); return; }

        const userIds = allDetails.map(d => d.user_id);

        // Get profiles and settings in parallel
        const [profilesRes, settingsRes, messagesRes] = await Promise.all([
          supabase.from('profiles').select('id, full_name').in('id', userIds),
          supabase.from('user_settings').select('user_id, allow_messages').in('user_id', userIds),
          supabase.from('messages').select('*')
            .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
            .order('created_at', { ascending: false }),
        ]);

        const profileMap = new Map(profilesRes.data?.map(p => [p.id, p]) || []);
        const settingsMap = new Map(settingsRes.data?.map(s => [s.user_id, s.allow_messages]) || []);

        // Build peer list - filter out those who disabled messaging
        const peerList: Designer[] = allDetails
          .filter(d => settingsMap.get(d.user_id) !== false)
          .map(d => ({
            user_id: d.user_id,
            full_name: profileMap.get(d.user_id)?.full_name || 'Unknown',
            professional_title: d.professional_title || 'Designer',
            profile_photo_url: d.profile_photo_url || null,
          }))
          .sort((a, b) => {
            // Same profession first
            const aMatch = title && a.professional_title?.toLowerCase() === title.toLowerCase();
            const bMatch = title && b.professional_title?.toLowerCase() === title.toLowerCase();
            if (aMatch && !bMatch) return -1;
            if (!aMatch && bMatch) return 1;
            return a.full_name.localeCompare(b.full_name);
          });

        setPeers(peerList);

        // Build conversation metadata
        const allMsgs = messagesRes.data || [];
        const metaMap = new Map<string, ConversationMeta>();
        
        for (const peer of peerList) {
          const peerMsgs = allMsgs.filter(
            m => m.sender_id === peer.user_id || m.receiver_id === peer.user_id
          );
          const unread = peerMsgs.filter(m => m.receiver_id === user.id && !m.read).length;
          metaMap.set(peer.user_id, {
            partnerId: peer.user_id,
            lastMessage: peerMsgs[0] || null,
            unreadCount: unread,
          });
        }
        setConversationMeta(metaMap);
      } catch (error) {
        console.error('Error loading peers:', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  // Load messages for selected designer + realtime
  useEffect(() => {
    if (!user || !selectedDesigner) return;

    const loadMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${selectedDesigner.user_id}),and(sender_id.eq.${selectedDesigner.user_id},receiver_id.eq.${user.id})`
        )
        .order('created_at', { ascending: true });

      if (data) {
        setMessages(data);
        const unreadIds = data
          .filter(m => m.receiver_id === user.id && !m.read)
          .map(m => m.id);
        if (unreadIds.length > 0) {
          await supabase.from('messages').update({ read: true }).in('id', unreadIds);
          // Update local meta
          setConversationMeta(prev => {
            const next = new Map(prev);
            const meta = next.get(selectedDesigner.user_id);
            if (meta) next.set(selectedDesigner.user_id, { ...meta, unreadCount: 0 });
            return next;
          });
        }
      }
    };

    loadMessages();

    const channel = supabase
      .channel(`messages-${selectedDesigner.user_id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        const msg = payload.new as Message;
        if (
          (msg.sender_id === user.id && msg.receiver_id === selectedDesigner.user_id) ||
          (msg.sender_id === selectedDesigner.user_id && msg.receiver_id === user.id)
        ) {
          setMessages(prev => [...prev, msg]);
          if (msg.receiver_id === user.id) {
            supabase.from('messages').update({ read: true }).eq('id', msg.id);
          }
          if (msg.sender_id !== user.id) {
            playSound();
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, selectedDesigner, playSound]);

  // Global notification sound for messages from non-selected conversations
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('global-msg-notify')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        const msg = payload.new as Message;
        if (msg.receiver_id === user.id && msg.sender_id !== selectedDesigner?.user_id) {
          playSound();
          // Update unread count in meta
          setConversationMeta(prev => {
            const next = new Map(prev);
            const meta = next.get(msg.sender_id);
            if (meta) {
              next.set(msg.sender_id, {
                ...meta,
                lastMessage: msg,
                unreadCount: meta.unreadCount + 1,
              });
            }
            return next;
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, selectedDesigner, playSound]);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !selectedDesigner || sending) return;
    setSending(true);
    try {
      const { error } = await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: selectedDesigner.user_id,
        content: newMessage.trim(),
      });
      if (error) throw error;
      setNewMessage('');
      inputRef.current?.focus();
    } catch (error: any) {
      toast({ title: 'Failed to send', description: error.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatMessageDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Group messages by date
  const groupedMessages = messages.reduce<{ date: string; msgs: Message[] }[]>((acc, msg) => {
    const dateKey = new Date(msg.created_at).toDateString();
    const last = acc[acc.length - 1];
    if (last && last.date === dateKey) {
      last.msgs.push(msg);
    } else {
      acc.push({ date: dateKey, msgs: [msg] });
    }
    return acc;
  }, []);

  // Sort peers: those with conversations first (by recency), then same profession, then others
  const sortedPeers = [...peers].sort((a, b) => {
    const metaA = conversationMeta.get(a.user_id);
    const metaB = conversationMeta.get(b.user_id);
    const hasConvA = !!metaA?.lastMessage;
    const hasConvB = !!metaB?.lastMessage;
    // Conversations first
    if (hasConvA && !hasConvB) return -1;
    if (!hasConvA && hasConvB) return 1;
    if (hasConvA && hasConvB) {
      return new Date(metaB!.lastMessage!.created_at).getTime() - new Date(metaA!.lastMessage!.created_at).getTime();
    }
    return 0;
  });

  const sameProfessionPeers = sortedPeers.filter(
    p => myTitle && p.professional_title?.toLowerCase() === myTitle.toLowerCase()
  );
  const otherPeers = sortedPeers.filter(
    p => !myTitle || p.professional_title?.toLowerCase() !== myTitle.toLowerCase()
  );

  if (!settings.allow_messages) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md">
            <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-heading font-bold mb-2">Messaging Disabled</h2>
            <p className="text-muted-foreground mb-4">
              Enable messaging in Settings → Privacy to start chatting.
            </p>
            <Button onClick={() => window.location.href = '/settings'}>Go to Settings</Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const renderPeerItem = (peer: Designer) => {
    const meta = conversationMeta.get(peer.user_id);
    const isSelected = selectedDesigner?.user_id === peer.user_id;
    return (
      <button
        key={peer.user_id}
        className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded transition-colors text-left group ${
          isSelected
            ? 'bg-muted text-foreground'
            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
        }`}
        onClick={() => setSelectedDesigner(peer)}
      >
        <div className="relative flex-shrink-0">
          {peer.profile_photo_url ? (
            <img src={peer.profile_photo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
              {getInitials(peer.full_name)}
            </div>
          )}
        </div>
        <span className="text-sm truncate flex-1">{peer.full_name}</span>
        {(meta?.unreadCount ?? 0) > 0 && (
          <Badge variant="default" className="h-5 min-w-[20px] px-1.5 text-[10px] font-bold rounded-full">
            {meta!.unreadCount}
          </Badge>
        )}
      </button>
    );
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-4rem)] lg:h-[calc(100vh-2rem)] flex overflow-hidden">
        {/* Discord-style Channel/User sidebar */}
        <div className={`w-60 bg-card/80 border-r border-border flex flex-col flex-shrink-0 ${selectedDesigner ? 'hidden md:flex' : 'flex'}`}>
          {/* Header */}
          <div className="p-3 border-b border-border flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-bold text-sm">Direct Messages</h2>
          </div>

          <ScrollArea className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : (
              <div className="p-2 space-y-3">
                {/* Same profession section */}
                {sameProfessionPeers.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 px-2 mb-1">
                      <Users className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        {myTitle || 'Your Team'}
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-auto">{sameProfessionPeers.length}</span>
                    </div>
                    <div className="space-y-0.5">
                      {sameProfessionPeers.map(renderPeerItem)}
                    </div>
                  </div>
                )}

                {/* Other designers */}
                {otherPeers.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 px-2 mb-1">
                      <Hash className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Other Designers
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-auto">{otherPeers.length}</span>
                    </div>
                    <div className="space-y-0.5">
                      {otherPeers.map(renderPeerItem)}
                    </div>
                  </div>
                )}

                {peers.length === 0 && (
                  <div className="text-center py-8 px-4">
                    <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No designers available</p>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Chat area */}
        <div className={`flex-1 flex flex-col min-w-0 ${!selectedDesigner ? 'hidden md:flex' : 'flex'}`}>
          {selectedDesigner ? (
            <>
              {/* Chat header */}
              <div className="h-12 border-b border-border flex items-center gap-3 px-4 bg-card/40 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden flex-shrink-0 h-8 w-8"
                  onClick={() => setSelectedDesigner(null)}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="flex items-center gap-2.5 min-w-0">
                  {selectedDesigner.profile_photo_url ? (
                    <img src={selectedDesigner.profile_photo_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                      {getInitials(selectedDesigner.full_name)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{selectedDesigner.full_name}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{selectedDesigner.professional_title}</span>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  {/* Welcome block */}
                  <div className="pb-4 border-b border-border mb-4">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xl font-bold mx-auto mb-3">
                      {getInitials(selectedDesigner.full_name)}
                    </div>
                    <h3 className="font-heading font-bold text-lg text-center">{selectedDesigner.full_name}</h3>
                    <p className="text-sm text-muted-foreground text-center">
                      This is the beginning of your conversation with <strong>{selectedDesigner.full_name}</strong>.
                    </p>
                  </div>

                  {groupedMessages.map(group => (
                    <div key={group.date}>
                      <div className="flex items-center gap-2 my-3">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-[11px] text-muted-foreground font-semibold px-2">
                          {formatMessageDate(group.msgs[0].created_at)}
                        </span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                      {group.msgs.map((msg, idx) => {
                        const isOwn = msg.sender_id === user?.id;
                        const senderName = isOwn ? 'You' : selectedDesigner.full_name;
                        // Show avatar/name if first msg or different sender from previous
                        const prevMsg = idx > 0 ? group.msgs[idx - 1] : null;
                        const showHeader = !prevMsg || prevMsg.sender_id !== msg.sender_id;
                        
                        return (
                          <div
                            key={msg.id}
                            className={`group flex gap-3 px-2 py-0.5 hover:bg-muted/30 rounded ${showHeader ? 'mt-3' : ''}`}
                          >
                            {showHeader ? (
                              <div className="w-10 flex-shrink-0 pt-0.5">
                                {isOwn ? (
                                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                                    You
                                  </div>
                                ) : selectedDesigner.profile_photo_url ? (
                                  <img src={selectedDesigner.profile_photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                                    {getInitials(selectedDesigner.full_name)}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="w-10 flex-shrink-0 flex items-center justify-center">
                                <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              {showHeader && (
                                <div className="flex items-baseline gap-2 mb-0.5">
                                  <span className={`text-sm font-bold ${isOwn ? 'text-primary' : 'text-foreground'}`}>
                                    {senderName}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground">
                                    {formatTime(msg.created_at)}
                                  </span>
                                </div>
                              )}
                              <p className="text-sm break-words text-foreground/90">{msg.content}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="p-3 border-t border-border bg-card/40">
                <div className="flex gap-2 items-center bg-muted/50 rounded-lg px-3 py-1">
                  <Input
                    ref={inputRef}
                    placeholder={`Message ${selectedDesigner.full_name}`}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    className="border-0 bg-transparent shadow-none focus-visible:ring-0 px-0"
                    disabled={sending}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sending}
                    className="h-8 w-8 flex-shrink-0"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="font-heading font-bold text-lg mb-1">No conversation selected</h3>
                <p className="text-sm text-muted-foreground">Pick a designer from the list to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Messages;
