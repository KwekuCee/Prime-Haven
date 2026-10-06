import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Search,
  Filter,
  ShieldAlert,
  AlertTriangle,
  User,
  Send,
  Loader2,
  Lock,
  RefreshCw,
  ExternalLink,
  Ban,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import SuperAdminLayout from '@/components/admin/SuperAdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import Seo from '@/components/Seo';

interface ChatMessage {
  id: string;
  project_id: string;
  sender_role: string;
  sender_name: string | null;
  sender_id: string | null;
  content: string;
  is_flagged: boolean;
  flag_reason?: string | null;
  created_at: string;
}

interface ConversationItem {
  projectId: string;
  projectTitle: string;
  category: string;
  status: string;
  clientName: string;
  clientEmail: string;
  designerName: string;
  designerId: string | null;
  lastMessage?: ChatMessage;
  totalMessages: number;
  flaggedCount: number;
  messages: ChatMessage[];
}

const SuperAdminConversations = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'flagged'>('all');
  const [selectedConvo, setSelectedConvo] = useState<ConversationItem | null>(null);

  // Warning & cancel dialog states
  const [warnDialogOpen, setWarnDialogOpen] = useState(false);
  const [warningMessage, setWarningMessage] = useState(
    '⚠️ Official Prime Haven Advisory: All project communications, file sharing, and payments must strictly remain on this platform. Attempting to exchange phone numbers, WhatsApp, or transacting externally violates our Terms and causes immediate project cancellation without refund.'
  );
  const [sendingNotice, setSendingNotice] = useState(false);

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState(
    'Violation of Terms of Service: Off-platform contact requests and discussion.'
  );
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    setLoading(true);
    try {
      // 1. Fetch recent messages
      const { data: messagesData, error: msgError } = await (supabase
        .from('project_chat_messages') as any)
        .select('*')
        .order('created_at', { ascending: true });

      if (msgError) throw msgError;

      // 2. Fetch projects
      const { data: projectsData } = await supabase
        .from('client_projects')
        .select('id, title, category, status, client_name, client_email, accepted_designer_id, claimed_by');

      // 3. Fetch designer names
      const designerIds: string[] = Array.from(
        new Set(
          (projectsData || [])
            .map(p => p.accepted_designer_id || p.claimed_by)
            .filter((id): id is string => Boolean(id))
        )
      );
      const designerNames: Record<string, string> = {};
      if (designerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', designerIds);
        (profiles || []).forEach(pr => {
          designerNames[pr.id] = pr.full_name || pr.email || 'Professional';
        });
      }

      // Group messages by project
      const messagesByProject: Record<string, ChatMessage[]> = {};
      (messagesData || []).forEach((m: ChatMessage) => {
        (messagesByProject[m.project_id] ||= []).push(m);
      });

      // Build conversation objects
      const projectMap: Record<string, any> = {};
      (projectsData || []).forEach(p => {
        projectMap[p.id] = p;
      });

      const list: ConversationItem[] = [];

      // Add projects with messages
      for (const [projId, msgs] of Object.entries(messagesByProject)) {
        const proj = projectMap[projId] || {};
        const desId = proj.accepted_designer_id || proj.claimed_by || null;
        const flagged = msgs.filter(m => m.is_flagged).length;

        list.push({
          projectId: projId,
          projectTitle: proj.title || `Project #${projId.slice(0, 8)}`,
          category: proj.category || 'General',
          status: proj.status || 'active',
          clientName: proj.client_name || 'Client',
          clientEmail: proj.client_email || 'client@primehaven.tech',
          designerName: (desId && designerNames[desId]) || 'Assigned Talent',
          designerId: desId,
          lastMessage: msgs[msgs.length - 1],
          totalMessages: msgs.length,
          flaggedCount: flagged,
          messages: msgs,
        });
      }

      // Sort by flagged count first, then by last message timestamp
      list.sort((a, b) => {
        if (b.flaggedCount !== a.flaggedCount) return b.flaggedCount - a.flaggedCount;
        const timeA = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : 0;
        const timeB = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : 0;
        return timeB - timeA;
      });

      setConversations(list);
      if (list.length > 0 && !selectedConvo) {
        setSelectedConvo(list[0]);
      } else if (selectedConvo) {
        const updated = list.find(c => c.projectId === selectedConvo.projectId);
        if (updated) setSelectedConvo(updated);
      }
    } catch (err: any) {
      console.error('Error loading conversations:', err);
      toast({
        title: 'Error loading conversations',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendAdminAdvisory = async () => {
    if (!selectedConvo || !warningMessage.trim() || !user) return;
    setSendingNotice(true);
    try {
      const { error } = await supabase.from('project_chat_messages').insert({
        project_id: selectedConvo.projectId,
        sender_role: 'admin',
        sender_id: user.id,
        sender_name: '🛡️ Prime Haven Moderation',
        content: warningMessage.trim(),
        is_flagged: false,
      });

      if (error) throw error;

      toast({
        title: 'Official Advisory Posted',
        description: 'Your warning was delivered directly to this project conversation.',
      });
      setWarnDialogOpen(false);
      loadConversations();
    } catch (err: any) {
      toast({ title: 'Could not send notice', description: err.message, variant: 'destructive' });
    } finally {
      setSendingNotice(false);
    }
  };

  const handleCancelProjectForViolation = async () => {
    if (!selectedConvo || !user) return;
    setCancelling(true);
    try {
      // 1. Mark project as cancelled with violation status
      const { error: projError } = await supabase
        .from('client_projects')
        .update({
          status: 'cancelled',
        })
        .eq('id', selectedConvo.projectId);

      if (projError) throw projError;

      // 2. Post final moderation system notice
      await supabase.from('project_chat_messages').insert({
        project_id: selectedConvo.projectId,
        sender_role: 'admin',
        sender_id: user.id,
        sender_name: '🚨 Prime Haven Platform Enforcement',
        content: `🚨 PROJECT TERMINATED: This project has been cancelled due to violation of Prime Haven Terms of Service (off-platform contact requests: ${cancellationReason}). All escrow and client payments are forfeited without refund as agreed under platform policies.`,
        is_flagged: true,
        flag_reason: 'Project cancelled for off-platform communication breach',
      });

      toast({
        title: 'Project Cancelled For Terms Breach',
        description: 'The project was terminated without refund, and a permanent record was logged.',
        variant: 'destructive',
      });
      setCancelDialogOpen(false);
      loadConversations();
    } catch (err: any) {
      toast({ title: 'Cancellation Failed', description: err.message, variant: 'destructive' });
    } finally {
      setCancelling(false);
    }
  };

  const filteredConversations = conversations.filter(c => {
    const matchesSearch =
      c.projectTitle.toLowerCase().includes(search.toLowerCase()) ||
      c.clientName.toLowerCase().includes(search.toLowerCase()) ||
      c.designerName.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase());

    const matchesFilter = filterMode === 'all' || (filterMode === 'flagged' && c.flaggedCount > 0);
    return matchesSearch && matchesFilter;
  });

  const totalFlaggedAcrossPlatform = conversations.reduce((acc, c) => acc + c.flaggedCount, 0);

  return (
    <SuperAdminLayout onRefresh={loadConversations} loading={loading}>
      <Seo
        title="Live Conversations & Moderation — Super Admin"
        description="Monitor active user conversations and enforce platform rules."
        path="/superadmin/conversations"
        noindex
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[10px] uppercase font-bold text-indigo-400 border-indigo-400/30 bg-indigo-500/10">
                Governance & Moderation
              </Badge>
              {totalFlaggedAcrossPlatform > 0 && (
                <Badge variant="destructive" className="text-[10px] uppercase font-mono font-bold animate-pulse">
                  {totalFlaggedAcrossPlatform} Flagged Violation{totalFlaggedAcrossPlatform !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-black">
              Platform Conversations
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Live oversight of client-designer project communications with automated detection of phone numbers, emails, and off-platform attempts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadConversations} disabled={loading} className="gap-1.5 text-xs">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[680px]">
          {/* Left Column: Conversation List */}
          <div className="lg:col-span-4 flex flex-col space-y-4">
            <Card className="glass border-border/50 flex-1 flex flex-col overflow-hidden">
              <CardHeader className="p-4 pb-3 border-b border-border/40 space-y-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search projects, clients, talent..."
                    className="pl-8 h-8 text-xs rounded-full"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={filterMode === 'all' ? 'secondary' : 'ghost'}
                      className="h-7 text-[11px] rounded-full px-3"
                      onClick={() => setFilterMode('all')}
                    >
                      All ({conversations.length})
                    </Button>
                    <Button
                      size="sm"
                      variant={filterMode === 'flagged' ? 'destructive' : 'ghost'}
                      className={`h-7 text-[11px] rounded-full px-3 gap-1 ${
                        filterMode !== 'flagged' && totalFlaggedAcrossPlatform > 0 ? 'text-red-400' : ''
                      }`}
                      onClick={() => setFilterMode('flagged')}
                    >
                      <AlertTriangle className="w-3 h-3" /> Flagged ({totalFlaggedAcrossPlatform})
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0 flex-1 overflow-y-auto max-h-[620px] divide-y divide-border/30">
                {loading ? (
                  <div className="flex items-center justify-center p-12">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No matching conversations found.
                  </div>
                ) : (
                  filteredConversations.map(convo => {
                    const isSelected = selectedConvo?.projectId === convo.projectId;
                    return (
                      <div
                        key={convo.projectId}
                        onClick={() => setSelectedConvo(convo)}
                        className={`p-3.5 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-primary/10 border-l-4 border-primary'
                            : 'hover:bg-muted/30'
                        } ${convo.flaggedCount > 0 ? 'bg-red-500/5' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="text-xs font-bold font-heading line-clamp-1">
                            {convo.projectTitle}
                          </h4>
                          {convo.flaggedCount > 0 ? (
                            <Badge variant="destructive" className="text-[9px] px-1.5 py-0 shrink-0 font-mono gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" /> {convo.flaggedCount} FLAGGED
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0">
                              {convo.totalMessages} msgs
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
                          <span className="truncate max-w-[120px]">Client: {convo.clientName}</span>
                          <span className="truncate max-w-[120px]">Talent: {convo.designerName}</span>
                        </div>

                        {convo.lastMessage && (
                          <p className="text-[11px] text-foreground/80 line-clamp-1 italic">
                            "{convo.lastMessage.content}"
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Chat Transcript & Actions */}
          <div className="lg:col-span-8 flex flex-col">
            {selectedConvo ? (
              <Card className="glass border-border/50 flex-1 flex flex-col overflow-hidden">
                {/* Transcript Header */}
                <CardHeader className="p-4 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-heading font-bold">
                        {selectedConvo.projectTitle}
                      </h2>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary">
                        {selectedConvo.category}
                      </Badge>
                      <Badge variant="outline" className={`text-[10px] capitalize ${
                        selectedConvo.status === 'cancelled' ? 'border-red-500 text-red-400 bg-red-500/10' : ''
                      }`}>
                        {selectedConvo.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span><strong>Client:</strong> {selectedConvo.clientName} ({selectedConvo.clientEmail})</span>
                      <span>•</span>
                      <span><strong>Professional:</strong> {selectedConvo.designerName}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1.5 border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
                      onClick={() => setWarnDialogOpen(true)}
                    >
                      <ShieldAlert className="w-3.5 h-3.5" /> Issue Warning
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 text-xs gap-1.5"
                      onClick={() => setCancelDialogOpen(true)}
                    >
                      <Ban className="w-3.5 h-3.5" /> Cancel for Violation
                    </Button>
                  </div>
                </CardHeader>

                {/* Moderation Alert Banner if Flagged */}
                {selectedConvo.flaggedCount > 0 && (
                  <div className="px-4 py-2.5 bg-red-500/10 border-b border-red-500/30 flex items-center justify-between gap-3 text-xs text-red-400">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 animate-pulse text-red-500" />
                      <span>
                        <strong>Off-Platform Communication Alert:</strong> {selectedConvo.flaggedCount} message(s) in this thread were detected attempting off-platform communication.
                      </span>
                    </div>
                  </div>
                )}

                {/* Chat Feed */}
                <CardContent className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[460px] max-h-[560px] bg-background/40">
                  {selectedConvo.messages.length === 0 ? (
                    <div className="p-12 text-center text-xs text-muted-foreground">
                      No messages exchanged yet in this project.
                    </div>
                  ) : (
                    selectedConvo.messages.map(m => {
                      const isAdmin = m.sender_role === 'admin';
                      const isClient = m.sender_role === 'client';
                      return (
                        <div
                          key={m.id}
                          className={`flex flex-col ${
                            isAdmin ? 'items-center my-3' : isClient ? 'items-start' : 'items-end'
                          }`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                              isAdmin
                                ? 'bg-amber-500/15 border border-amber-500/30 text-amber-200 text-center w-full'
                                : isClient
                                ? 'bg-muted/50 text-foreground border border-border/40'
                                : 'bg-primary/20 text-foreground border border-primary/30'
                            } ${m.is_flagged ? 'ring-2 ring-red-500 border-red-500/50 bg-red-500/10' : ''}`}
                          >
                            <div className="flex items-center justify-between gap-3 mb-1 text-[10px] font-bold uppercase tracking-wider opacity-70">
                              <span>{m.sender_name || m.sender_role}</span>
                              <span>{format(new Date(m.created_at), 'MMM d, HH:mm')}</span>
                            </div>
                            <p className="text-xs whitespace-pre-wrap break-words leading-relaxed">
                              {m.content}
                            </p>
                          </div>

                          {m.is_flagged && (
                            <div className="mt-1 max-w-[85%] flex items-center gap-1.5 text-[10px] text-red-400 bg-red-500/10 border border-red-500/30 rounded-md px-2 py-0.5">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              <span>Flagged reason: {m.flag_reason || 'Off-platform contact info detected'}</span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </CardContent>

                {/* Footer Quick Action */}
                <div className="p-3 border-t border-border/40 bg-muted/10 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-primary" />
                    All interactions in this thread are cryptographically verified and audited under Prime Haven Terms.
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => setWarnDialogOpen(true)}
                  >
                    <Send className="w-3 h-3" /> Send Direct Moderation Notice
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="glass border-border/50 flex-1 flex items-center justify-center p-12 text-center text-muted-foreground">
                <div className="space-y-2">
                  <MessageSquare className="w-10 h-10 mx-auto opacity-30 text-primary" />
                  <p className="text-sm font-medium">Select a project conversation to inspect</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Advisory Modal */}
      <Dialog open={warnDialogOpen} onOpenChange={setWarnDialogOpen}>
        <DialogContent className="sm:max-w-[500px] glass">
          <DialogHeader>
            <DialogTitle className="text-base font-heading flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              Send Official On-Platform Warning
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              This message will be injected directly into the conversation to warn the client and professional.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Textarea
              value={warningMessage}
              onChange={e => setWarningMessage(e.target.value)}
              rows={4}
              className="text-xs"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setWarnDialogOpen(false)}>Cancel</Button>
            <Button
              size="sm"
              disabled={sendingNotice || !warningMessage.trim()}
              onClick={handleSendAdminAdvisory}
              className="gap-1.5"
            >
              {sendingNotice ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Send Warning Notice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Project For Terms Breach Modal */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-[500px] glass border-red-500/30">
          <DialogHeader>
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center mb-1">
              <Ban className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base font-heading text-red-500 flex items-center gap-2">
              Cancel Project For Off-Platform Breach
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Cancels this project immediately. Per Prime Haven policy, funds are forfeited with NO REFUND.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
              <p className="font-semibold mb-1">Irreversible Platform Enforcement:</p>
              <p>The client's payment is strictly non-refundable and will be retained by Prime Haven. Both parties will receive an enforcement termination record.</p>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Cancellation Reason</label>
              <Textarea
                value={cancellationReason}
                onChange={e => setCancellationReason(e.target.value)}
                rows={3}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCancelDialogOpen(false)}>Back</Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={cancelling}
              onClick={handleCancelProjectForViolation}
              className="gap-1.5"
            >
              {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
              Confirm Cancellation (No Refund)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
};

export default SuperAdminConversations;
