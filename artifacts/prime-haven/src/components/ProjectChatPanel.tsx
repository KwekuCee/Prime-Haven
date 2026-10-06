import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldAlert, Send, Loader2, AlertTriangle, AlertCircle, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { checkOffPlatformContent, ModerationResult, OFF_PLATFORM_WARNING_MESSAGE } from '@/lib/chatModeration';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Msg {
  id: string;
  sender_role: 'client' | 'designer' | 'admin';
  sender_name: string | null;
  sender_id: string | null;
  content: string;
  is_flagged?: boolean;
  flag_reason?: string | null;
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
  const [warningDialogOpen, setWarningDialogOpen] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<{ text: string; mod: ModerationResult } | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('project_chat_messages')
        .select('id, sender_role, sender_name, sender_id, content, is_flagged, flag_reason, created_at')
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

  const sendMessageWithFlag = async (text: string, isFlagged: boolean, flagReason: string | null) => {
    if (!user) return;
    setSending(true);
    try {
      const { error } = await supabase.from('project_chat_messages').insert({
        project_id: projectId,
        sender_role: role,
        sender_id: user.id,
        sender_name: (senderName || user.email || role).slice(0, 120),
        content: text,
        is_flagged: isFlagged,
        flag_reason: flagReason,
      });
      if (error) throw error;
      setContent('');
      setPendingMessage(null);
      setWarningDialogOpen(false);

      // Fire-and-forget email notification via Arkesel (stub if key missing)
      supabase.functions
        .invoke('notify-project-message', {
          body: { projectId, content: text, senderRole: role, isFlagged, flagReason },
        })
        .catch((err) => console.warn('notify-project-message failed:', err));
    } catch (err: any) {
      console.error('send chat error:', err);
      alert(err?.message || 'Could not send message');
    } finally {
      setSending(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !user) return;
    const text = content.trim().slice(0, 2000);

    // Detect off-platform communication / external contact details
    const mod = checkOffPlatformContent(text);

    if (mod.isFlagged) {
      setPendingMessage({ text, mod });
      setWarningDialogOpen(true);
      return;
    }

    await sendMessageWithFlag(text, false, null);
  };

  const handleConfirmFlaggedSend = async () => {
    if (!pendingMessage) return;
    await sendMessageWithFlag(
      pendingMessage.text,
      true,
      pendingMessage.mod.reasons.join('; ')
    );
  };

  return (
    <div className="flex flex-col h-full min-h-[480px] rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border/60 bg-amber-500/10 flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
        <p className="text-[11px] leading-snug text-amber-300">
          <strong>Official Communication Channel.</strong> All project discussion must remain strictly on Prime Haven.
          Requesting or sharing phone numbers, WhatsApp, or taking conversations off-platform will trigger immediate project cancellation with <strong>NO REFUND</strong>.
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
                className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    mine
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/40 text-foreground'
                  } ${m.is_flagged ? 'ring-2 ring-red-500/50' : ''}`}
                >
                  {!mine && (
                    <p className="text-[10px] uppercase tracking-wider opacity-70 mb-0.5 font-bold">
                      {m.sender_name || m.sender_role}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {m.content}
                  </p>
                  <div className="flex items-center justify-between gap-2 mt-1 opacity-70 text-[10px]">
                    <span>{format(new Date(m.created_at), 'MMM d, HH:mm')}</span>
                    {m.is_flagged && (
                      <span className="text-red-300 font-bold flex items-center gap-1">
                        🚩 Flagged
                      </span>
                    )}
                  </div>
                </div>

                {m.is_flagged && (
                  <div className="mt-1 max-w-[80%] text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-2.5 py-1 flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>Flagged for moderation: {m.flag_reason || 'External contact request detected'}. Keep all communication on Prime Haven.</span>
                  </div>
                )}
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
          placeholder="Type a message (keep all communication on-platform)..."
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

      {/* Off-Platform Warning Dialog */}
      <Dialog open={warningDialogOpen} onOpenChange={setWarningDialogOpen}>
        <DialogContent className="sm:max-w-[480px] glass">
          <DialogHeader>
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center mb-2">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
            <DialogTitle className="text-lg font-heading text-red-500 flex items-center gap-2">
              Off-Platform Communication Warning
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Our safety filter detected potential contact details or an off-platform communication request.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Policy Violation Notice:
              </p>
              <p className="leading-relaxed">
                {OFF_PLATFORM_WARNING_MESSAGE}
              </p>
            </div>

            {pendingMessage?.mod.reasons && (
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/40 space-y-1">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase">Detected Signals:</span>
                <ul className="list-disc list-inside text-[11px] text-foreground space-y-0.5">
                  {pendingMessage.mod.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
              <p>
                <strong>Warning:</strong> Moving conversations to phone, WhatsApp, email, or other channels results in <strong>immediate project cancellation with zero refund</strong>. This message will be permanently logged and flagged for Super Admin audit.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => { setWarningDialogOpen(false); setPendingMessage(null); }}>
              Edit Message
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={sending}
              onClick={handleConfirmFlaggedSend}
              className="gap-1.5"
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Send Flagged Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectChatPanel;

