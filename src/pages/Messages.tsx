import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  Send,
  Search,
  Loader2,
  User,
  Circle,
  ArrowLeft
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

interface Designer {
  user_id: string;
  full_name: string;
  professional_title: string;
  profile_photo_url: string | null;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

interface Conversation {
  designer: Designer;
  lastMessage: Message;
  unreadCount: number;
}

const Messages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { settings } = useUserSettings();
  const [loading, setLoading] = useState(true);
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedDesigner, setSelectedDesigner] = useState<Designer | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDesignerList, setShowDesignerList] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load conversations
  useEffect(() => {
    if (!user) return;

    const loadConversations = async () => {
      try {
        setLoading(true);

        // Get all messages involving current user
        const { data: allMessages } = await supabase
          .from('messages')
          .select('*')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order('created_at', { ascending: false });

        if (!allMessages || allMessages.length === 0) {
          setLoading(false);
          return;
        }

        // Group by conversation partner
        const partnerIds = new Set<string>();
        allMessages.forEach(msg => {
          const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
          partnerIds.add(partnerId);
        });

        // Load designer profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', Array.from(partnerIds));

        const { data: designerDetails } = await supabase
          .from('designer_details')
          .select('user_id, professional_title, profile_photo_url')
          .in('user_id', Array.from(partnerIds));

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        const detailsMap = new Map(designerDetails?.map(d => [d.user_id, d]) || []);

        const convs: Conversation[] = Array.from(partnerIds).map(partnerId => {
          const profile = profileMap.get(partnerId);
          const details = detailsMap.get(partnerId);
          const partnerMessages = allMessages.filter(
            m => m.sender_id === partnerId || m.receiver_id === partnerId
          );
          const unread = partnerMessages.filter(
            m => m.receiver_id === user.id && !m.read
          ).length;

          return {
            designer: {
              user_id: partnerId,
              full_name: profile?.full_name || 'Unknown',
              professional_title: details?.professional_title || 'Designer',
              profile_photo_url: details?.profile_photo_url || null,
            },
            lastMessage: partnerMessages[0],
            unreadCount: unread,
          };
        }).sort((a, b) =>
          new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
        );

        setConversations(convs);
      } catch (error) {
        console.error('Error loading conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, [user]);

  // Load messages for selected designer
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
        // Mark unread messages as read
        const unreadIds = data
          .filter(m => m.receiver_id === user.id && !m.read)
          .map(m => m.id);
        if (unreadIds.length > 0) {
          await supabase
            .from('messages')
            .update({ read: true })
            .in('id', unreadIds);
        }
      }
    };

    loadMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages-${selectedDesigner.user_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const msg = payload.new as Message;
          if (
            (msg.sender_id === user.id && msg.receiver_id === selectedDesigner.user_id) ||
            (msg.sender_id === selectedDesigner.user_id && msg.receiver_id === user.id)
          ) {
            setMessages(prev => [...prev, msg]);
            // Mark as read if we're the receiver
            if (msg.receiver_id === user.id) {
              supabase.from('messages').update({ read: true }).eq('id', msg.id);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedDesigner]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Search designers
  const handleSearchDesigners = async () => {
    if (!searchQuery.trim() || !user) return;

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .neq('id', user.id)
      .ilike('full_name', `%${searchQuery}%`)
      .limit(10);

    if (profiles && profiles.length > 0) {
      const userIds = profiles.map(p => p.id);
      const { data: details } = await supabase
        .from('designer_details')
        .select('user_id, professional_title, profile_photo_url')
        .in('user_id', userIds);

      // Check allow_messages settings for found designers
      const { data: settingsData } = await supabase
        .from('user_settings')
        .select('user_id, allow_messages')
        .in('user_id', userIds);

      const settingsMap = new Map(settingsData?.map(s => [s.user_id, s.allow_messages]) || []);
      const detailsMap = new Map(details?.map(d => [d.user_id, d]) || []);

      const results: Designer[] = profiles
        .filter(p => settingsMap.get(p.id) !== false) // Filter out designers who disabled messaging
        .map(p => ({
          user_id: p.id,
          full_name: p.full_name || 'Unknown',
          professional_title: detailsMap.get(p.id)?.professional_title || 'Designer',
          profile_photo_url: detailsMap.get(p.id)?.profile_photo_url || null,
        }));

      setDesigners(results);
      setShowDesignerList(true);
    } else {
      setDesigners([]);
      setShowDesignerList(true);
    }
  };

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
      toast({
        title: 'Failed to send',
        description: error.message || 'Could not send message.',
        variant: 'destructive',
      });
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

  if (!settings.allow_messages) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md">
            <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-heading font-bold mb-2">Messaging Disabled</h2>
            <p className="text-muted-foreground mb-4">
              You've turned off messaging. Enable it in Settings → Privacy to start chatting with other designers.
            </p>
            <Button onClick={() => window.location.href = '/settings'}>
              Go to Settings
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 h-[calc(100vh-4rem)] lg:h-[calc(100vh-2rem)] flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <h1 className="text-2xl sm:text-3xl font-heading font-bold">Messages</h1>
          <p className="text-muted-foreground text-sm">Chat with other designers</p>
        </motion.div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 min-h-0">
          {/* Conversations List */}
          <Card className={`glass flex flex-col overflow-hidden ${selectedDesigner ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-3 border-b border-border space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Search designers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchDesigners()}
                  className="bg-card border-border text-sm"
                />
                <Button size="icon" variant="outline" onClick={handleSearchDesigners}>
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1">
              {/* Search Results */}
              {showDesignerList && (
                <div className="p-2 border-b border-border">
                  <div className="flex items-center justify-between px-2 py-1">
                    <span className="text-xs font-semibold text-muted-foreground">Search Results</span>
                    <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setShowDesignerList(false)}>
                      Close
                    </Button>
                  </div>
                  {designers.length > 0 ? (
                    designers.map(d => (
                      <button
                        key={d.user_id}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors text-left"
                        onClick={() => {
                          setSelectedDesigner(d);
                          setShowDesignerList(false);
                          setSearchQuery('');
                        }}
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                          {getInitials(d.full_name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{d.full_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{d.professional_title}</p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground p-3">No designers found</p>
                  )}
                </div>
              )}

              {/* Existing Conversations */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : conversations.length > 0 ? (
                <div className="p-2 space-y-1">
                  {conversations.map(conv => (
                    <button
                      key={conv.designer.user_id}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                        selectedDesigner?.user_id === conv.designer.user_id
                          ? 'bg-primary/10 border border-primary/30'
                          : 'hover:bg-secondary/50'
                      }`}
                      onClick={() => setSelectedDesigner(conv.designer)}
                    >
                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                          {getInitials(conv.designer.full_name)}
                        </div>
                        {conv.unreadCount > 0 && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <span className="text-[10px] font-bold text-primary-foreground">{conv.unreadCount}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-sm truncate">{conv.designer.full_name}</p>
                          <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-2">
                            {formatTime(conv.lastMessage.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.lastMessage.sender_id === user?.id ? 'You: ' : ''}
                          {conv.lastMessage.content}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <MessageSquare className="w-10 h-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No conversations yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Search for a designer to start chatting</p>
                </div>
              )}
            </ScrollArea>
          </Card>

          {/* Chat Area */}
          <Card className={`glass md:col-span-2 flex flex-col overflow-hidden ${!selectedDesigner ? 'hidden md:flex' : 'flex'}`}>
            {selectedDesigner ? (
              <>
                {/* Chat Header */}
                <div className="p-3 sm:p-4 border-b border-border flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden flex-shrink-0"
                    onClick={() => setSelectedDesigner(null)}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                    {getInitials(selectedDesigner.full_name)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{selectedDesigner.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{selectedDesigner.professional_title}</p>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-3">
                    {messages.map(msg => {
                      const isOwn = msg.sender_id === user?.id;
                      return (
                        <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 ${
                              isOwn
                                ? 'bg-primary text-primary-foreground rounded-br-md'
                                : 'bg-secondary text-secondary-foreground rounded-bl-md'
                            }`}
                          >
                            <p className="text-sm break-words">{msg.content}</p>
                            <p className={`text-[10px] mt-1 ${isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                              {formatTime(msg.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Input */}
                <div className="p-3 sm:p-4 border-t border-border">
                  <div className="flex gap-2">
                    <Input
                      ref={inputRef}
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      className="bg-card border-border"
                      disabled={sending}
                    />
                    <Button
                      size="icon"
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sending}
                    >
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-heading font-bold text-lg mb-1">Select a conversation</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose a designer or search for one to start chatting
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Messages;
