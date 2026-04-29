import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Send, Users, UserCheck, User2, Loader2, CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type Audience = 'all' | 'designers' | 'clients' | 'admins';

const AUDIENCES: { id: Audience; label: string; icon: React.ElementType; description: string; color: string }[] = [
  { id: 'all', label: 'Everyone', icon: Users, description: 'All registered users', color: 'text-primary' },
  { id: 'designers', label: 'Designers', icon: UserCheck, description: 'All active designers', color: 'text-violet-400' },
  { id: 'clients', label: 'Clients', icon: User2, description: 'All clients', color: 'text-emerald-400' },
  { id: 'admins', label: 'Admins', icon: Mail, description: 'Admin team only', color: 'text-amber-400' },
];

const EmailBroadcast = () => {
  const { toast } = useToast();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<Audience>('designers');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);

  const fetchRecipientCount = async (a: Audience) => {
    try {
      if (a === 'designers') {
        const { count } = await supabase
          .from('user_roles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'designer');
        setRecipientCount(count || 0);
      } else if (a === 'admins') {
        const { count } = await supabase
          .from('user_roles')
          .select('*', { count: 'exact', head: true })
          .in('role', ['superadmin', 'masteradmin']);
        setRecipientCount(count || 0);
      } else if (a === 'clients') {
        const { count } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true });
        setRecipientCount(count || 0);
      } else {
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });
        setRecipientCount(count || 0);
      }
    } catch { }
  };

  const handleAudienceChange = (a: Audience) => {
    setAudience(a);
    setRecipientCount(null);
    fetchRecipientCount(a);
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast({ title: 'Missing Fields', description: 'Please provide both a subject and message body.', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      // Log the intent in system_logs
      await supabase.from('system_logs').insert({
        action_type: 'email_broadcast_initiated',
        description: `Broadcast initiated to ${audience}: "${subject}"`,
        timestamp: new Date().toISOString(),
      });

      // Invoke edge function
      const { data, error } = await supabase.functions.invoke('send-broadcast-email', {
        body: { audience, subject, body },
      });

      if (error) throw error;

      setSent(true);
      toast({
        title: 'Broadcast Sent! ✉️',
        description: data?.recipientsCount
          ? `Successfully sent to ${data.recipientsCount} recipients.`
          : `Your email has been broadcasted to the ${audience} group.`,
      });
      setSubject('');
      setBody('');
      setTimeout(() => setSent(false), 4000);
    } catch (err: any) {
      console.error('Broadcast error:', err);
      toast({
        title: 'Broadcast Failed',
        description: err.message || 'Could not send email broadcast. Please verify connectivity.',
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Mail className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-bold">Email Broadcast</h2>
          <p className="text-[11px] text-muted-foreground">Send a message to your platform users</p>
        </div>
      </div>

      {/* Audience Selector */}
      <div>
        <Label className="text-xs font-semibold uppercase tracking-wider mb-3 block">Target Audience</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {AUDIENCES.map(a => (
            <button
              key={a.id}
              onClick={() => handleAudienceChange(a.id)}
              className={`
                flex flex-col items-center gap-2 p-3 rounded-xl border text-center transition-all duration-200
                ${audience === a.id
                  ? 'border-primary/40 bg-primary/5 shadow-sm'
                  : 'border-border/40 bg-card/30 hover:border-border/60 hover:bg-muted/20'
                }
              `}
            >
              <a.icon className={`w-5 h-5 ${audience === a.id ? a.color : 'text-muted-foreground'}`} />
              <span className="text-xs font-semibold">{a.label}</span>
              <span className="text-[10px] text-muted-foreground">{a.description}</span>
            </button>
          ))}
        </div>
        {recipientCount !== null && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground"
          >
            <Users className="w-3 h-3" />
            <span>Estimated recipients: <strong className="text-foreground">{recipientCount.toLocaleString()}</strong></span>
          </motion.div>
        )}
      </div>

      {/* Subject */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">Email Subject</Label>
        <Input
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder="e.g. Important update from Prime Haven"
          className="h-10 text-sm bg-muted/20 border-border/40"
          maxLength={120}
        />
        <p className="text-[10px] text-muted-foreground text-right">{subject.length}/120</p>
      </div>

      {/* Body */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">Message Body</Label>
        <Textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Write your message here... You can use plain text or basic HTML."
          rows={8}
          className="text-sm bg-muted/20 border-border/40 resize-none font-mono"
        />
        <p className="text-[10px] text-muted-foreground">Basic HTML is supported (e.g. &lt;b&gt;bold&lt;/b&gt;, &lt;a href=""&gt;link&lt;/a&gt;)</p>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-[11px] text-amber-400">
        <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <p>This will send a real email to all selected recipients. Double-check your message before sending.</p>
      </div>

      {/* Send Button */}
      <Button
        onClick={handleSend}
        disabled={sending || sent || !subject.trim() || !body.trim()}
        className="w-full gap-2 h-11"
      >
        {sending ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Sending broadcast...</>
        ) : sent ? (
          <><CheckCircle2 className="w-4 h-4" /> Broadcast sent!</>
        ) : (
          <><Send className="w-4 h-4" /> Send Broadcast</>
        )}
      </Button>
    </div>
  );
};

export default EmailBroadcast;
