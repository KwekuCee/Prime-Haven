import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Mail, Send, Users, UserCheck, User2, Loader2, CheckCircle2, AlertCircle, UserSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type Audience = 'all' | 'designers' | 'clients' | 'admins' | 'individual';

const AUDIENCES: { id: Audience; label: string; icon: React.ElementType; description: string; color: string }[] = [
  { id: 'all', label: 'Everyone', icon: Users, description: 'All registered users', color: 'text-primary' },
  { id: 'designers', label: 'Designers', icon: UserCheck, description: 'All active designers', color: 'text-violet-400' },
  { id: 'clients', label: 'Clients', icon: User2, description: 'All clients', color: 'text-emerald-400' },
  { id: 'admins', label: 'Admins', icon: Mail, description: 'Admin team only', color: 'text-amber-400' },
  { id: 'individual', label: 'Single User', icon: UserSearch, description: 'Pick one user', color: 'text-sky-400' },
];

interface UserOption { id: string; email: string; name: string; source: 'profile' | 'client'; }

const EmailBroadcast = () => {
  const { toast } = useToast();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<Audience>('designers');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);

  // Single user picker state
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [pickedUserId, setPickedUserId] = useState<string>('');
  const [userQuery, setUserQuery] = useState('');

  const fetchRecipientCount = async (a: Audience) => {
    try {
      if (a === 'designers') {
        const { count } = await supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'designer');
        setRecipientCount(count || 0);
      } else if (a === 'admins') {
        const { count } = await supabase.from('user_roles').select('*', { count: 'exact', head: true }).in('role', ['superadmin', 'masteradmin']);
        setRecipientCount(count || 0);
      } else if (a === 'clients') {
        const { count } = await supabase.from('clients').select('*', { count: 'exact', head: true });
        setRecipientCount(count || 0);
      } else if (a === 'individual') {
        setRecipientCount(pickedUserId ? 1 : 0);
      } else {
        const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        setRecipientCount(count || 0);
      }
    } catch { /* ignore */ }
  };

  const handleAudienceChange = (a: Audience) => {
    setAudience(a);
    setRecipientCount(null);
    fetchRecipientCount(a);
  };

  // Load users for the picker on demand
  useEffect(() => {
    if (audience !== 'individual' || allUsers.length > 0) return;
    let cancelled = false;
    (async () => {
      setUsersLoading(true);
      try {
        const [profilesRes, clientsRes] = await Promise.all([
          supabase.from('profiles').select('id, email, full_name').order('full_name', { ascending: true }).limit(1000),
          supabase.from('clients').select('id, email, name').order('name', { ascending: true }).limit(1000),
        ]);
        if (cancelled) return;
        const profileUsers: UserOption[] = (profilesRes.data || [])
          .filter((p: any) => p.email)
          .map((p: any) => ({ id: p.id, email: p.email, name: p.full_name || p.email, source: 'profile' as const }));
        const clientUsers: UserOption[] = (clientsRes.data || [])
          .filter((c: any) => c.email && !profileUsers.some(u => u.email === c.email))
          .map((c: any) => ({ id: c.id, email: c.email, name: c.name || c.email, source: 'client' as const }));
        setAllUsers([...profileUsers, ...clientUsers]);
      } finally {
        if (!cancelled) setUsersLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [audience, allUsers.length]);

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return allUsers.slice(0, 50);
    return allUsers.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)).slice(0, 50);
  }, [allUsers, userQuery]);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast({ title: 'Missing Fields', description: 'Please provide both a subject and message body.', variant: 'destructive' });
      return;
    }
    if (audience === 'individual' && !pickedUserId) {
      toast({ title: 'Pick a user', description: 'Please select a recipient first.', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      await supabase.from('system_logs').insert({
        action_type: 'email_broadcast_initiated',
        description: `Broadcast initiated to ${audience}${audience === 'individual' ? ` (user ${pickedUserId})` : ''}: "${subject}"`,
        timestamp: new Date().toISOString(),
      });

      const { data, error } = await supabase.functions.invoke('send-broadcast-email', {
        body: { audience, subject, body, userId: audience === 'individual' ? pickedUserId : undefined },
      });
      if (error) throw error;

      setSent(true);
      toast({
        title: 'Broadcast Sent! ✉️',
        description: data?.recipientsCount
          ? `Successfully sent to ${data.sentCount ?? data.recipientsCount} recipient${(data.sentCount ?? data.recipientsCount) === 1 ? '' : 's'}.`
          : 'Email sent.',
      });
      setSubject('');
      setBody('');
      setTimeout(() => setSent(false), 4000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not send email broadcast.';
      console.error('Broadcast error:', err);
      toast({ title: 'Broadcast Failed', description: message, variant: 'destructive' });
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

      <div>
        <Label className="text-xs font-semibold uppercase tracking-wider mb-3 block">Target Audience</Label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {AUDIENCES.map(a => (
            <button
              key={a.id}
              type="button"
              onClick={() => handleAudienceChange(a.id)}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-center transition-all duration-200 ${
                audience === a.id ? 'border-primary/40 bg-primary/5 shadow-sm' : 'border-border/40 bg-card/30 hover:border-border/60 hover:bg-muted/20'
              }`}
            >
              <a.icon className={`w-5 h-5 ${audience === a.id ? a.color : 'text-muted-foreground'}`} />
              <span className="text-xs font-semibold">{a.label}</span>
              <span className="text-[10px] text-muted-foreground">{a.description}</span>
            </button>
          ))}
        </div>
        {recipientCount !== null && audience !== 'individual' && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Users className="w-3 h-3" />
            <span>Estimated recipients: <strong className="text-foreground">{recipientCount.toLocaleString()}</strong></span>
          </motion.div>
        )}
      </div>

      {audience === 'individual' && (
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Select Recipient</Label>
          <Input
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            placeholder={usersLoading ? 'Loading users…' : 'Search by name or email'}
            className="h-10 text-sm bg-muted/20 border-border/40"
          />
          <div className="max-h-56 overflow-y-auto rounded-xl border border-border/40 bg-card/30 divide-y divide-border/30">
            {usersLoading ? (
              <div className="p-3 text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Loading…</div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-3 text-xs text-muted-foreground">No users match your search.</div>
            ) : (
              filteredUsers.map(u => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setPickedUserId(u.id)}
                  className={`w-full text-left p-2.5 text-xs hover:bg-muted/30 transition-colors flex items-center justify-between ${pickedUserId === u.id ? 'bg-primary/10' : ''}`}
                >
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{u.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{u.email}</div>
                  </div>
                  {pickedUserId === u.id && <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">Email Subject</Label>
        <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Important update from Prime Haven" className="h-10 text-sm bg-muted/20 border-border/40" maxLength={120} />
        <p className="text-[10px] text-muted-foreground text-right">{subject.length}/120</p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">Message Body</Label>
        <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write your message here... You can use plain text or basic HTML." rows={8} className="text-sm bg-muted/20 border-border/40 resize-none font-mono" />
        <p className="text-[10px] text-muted-foreground">Basic HTML is supported (e.g. &lt;b&gt;bold&lt;/b&gt;, &lt;a href=""&gt;link&lt;/a&gt;)</p>
      </div>

      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-[11px] text-amber-400">
        <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <p>This will send a real email to all selected recipients. Double-check your message before sending.</p>
      </div>

      <Button onClick={handleSend} disabled={sending || sent || !subject.trim() || !body.trim() || (audience === 'individual' && !pickedUserId)} className="w-full gap-2 h-11">
        {sending ? (<><Loader2 className="w-4 h-4 animate-spin" /> Sending broadcast...</>) : sent ? (<><CheckCircle2 className="w-4 h-4" /> Broadcast sent!</>) : (<><Send className="w-4 h-4" /> Send Broadcast</>)}
      </Button>
    </div>
  );
};

export default EmailBroadcast;
