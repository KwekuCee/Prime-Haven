import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldAlert, Send, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface Msg {
  id: string;
  sender_role: 'client' | 'designer' | 'admin';
  sender_name: string | null;
  sender_id: string | null;
  content: string;
  created_at: string;
}

interface Props {
  projectId: string;
  /** Role of the currently logged-in user inside this chat */
  role: 'client' | 'designer';
  /** Display name for outgoing messages */
  senderName?: string;
}

const ProjectChatPanel = ({ projectId, role, senderName }: Props) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [content, setContent] = useState('');
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('project_chat_messages')
        .select('id, sender_role, sender_name, sender_id, content, created_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })
        .limit(300);
      if (!cancelled) {
        setMessages((data || []) as Msg[]);
        setLoading(false);
      }
    };
    load();

    const channel = supabase
      .channel(`project-chat-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'project_chat_messages',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Msg]);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !user) return;
    const text = content.trim().slice(0, 2000);
    setSending(true);
    try {
      const { error } = await supabase.from('project_chat_messages').insert({
        project_id: projectId,
        sender_role: role,
        sender_id: user.id,
        sender_name: (senderName || user.email || role).slice(0, 120),
        content: text,
      });
      if (error) throw error;
      setContent('');

      // Fire-and-forget email notification via Arkesel (stub if key missing)
      supabase.functions
        .invoke('notify-project-message', {
          body: { projectId, content: text, senderRole: role },
        })
        .catch((err) => console.warn('notify-project-message failed:', err));
    } catch (err: any) {
      console.error('send chat error:', err);
      alert(err?.message || 'Could not send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[480px] rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border/60 bg-amber-500/5 flex items-start gap-2">
        <ShieldAlert className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
        <p className="text-[11px] leading-snug text-amber-200/90">
          <strong>Keep it on-platform.</strong> All project communication must stay
          here for your protection. Sharing phone numbers, WhatsApp, or moving the
          conversation off Prime Haven violates our terms and forfeits dispute
          protection.
        </p>
      </div>

      <div ref={scrollerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-12">
            No messages yet. Say hello 👋
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === user?.id;
            return (
              <div
                key={m.id}
                className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[78%] rounded-2xl px-3.5 py-2 ${
                    mine
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/40 text-foreground'
                  }`}
                >
                  {!mine && (
                    <p className="text-[10px] uppercase tracking-wider opacity-60 mb-0.5 font-semibold">
                      {m.sender_name || m.sender_role}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {m.content}
                  </p>
                  <p className="text-[10px] opacity-60 mt-1">
                    {format(new Date(m.created_at), 'MMM d, HH:mm')}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form
        onSubmit={handleSend}
        className="p-3 border-t border-border/60 flex gap-2"
      >
        <Input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type a message…"
          maxLength={2000}
          disabled={sending}
          className="flex-1"
        />
        <Button type="submit" disabled={sending || !content.trim()}>
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </form>
    </div>
  );
};

export default ProjectChatPanel;
