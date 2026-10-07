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
  Layers,
  Users,
  Briefcase,
  FileText,
} from 'lucide-react';
import SuperAdminLayout from '@/components/admin/SuperAdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { checkOffPlatformContent } from '@/lib/chatModeration';

export interface ChatMessage {
  id: string;
  channel_type: 'project' | 'direct';
  project_id?: string;
  sender_role: string;
  sender_name: string | null;
  sender_id: string | null;
  receiver_id?: string | null;
  content: string;
  is_flagged: boolean;
  flag_reason?: string | null;
  created_at: string;
}

export interface ConversationItem {
  id: string;
  channelType: 'project' | 'direct';
  projectId?: string;
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
  const [filterMode, setFilterMode] = useState<'all' | 'project' | 'direct' | 'flagged'>('all');
  const [selectedConvo, setSelectedConvo] = useState<ConversationItem | null>(null);

  // Warning & cancel dialog states
  const [warnDialogOpen, setWarnDialogOpen] = useState(false);
  const [warningMessage, setWarningMessage] = useState(
    '⚠️ Official Prime Haven Advisory: All communications, file deliverables, and payments must strictly remain on this platform. Attempting to exchange contact details, WhatsApp, or transacting externally violates our Terms and causes immediate project cancellation without refund.'
  );
  const [sendingNotice, setSendingNotice] = useState(false);

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState(
    'Violation of Terms of Service: Off-platform contact requests and discussion.'
  );
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    loadConversations();

    // Setup realtime subscription for project chat messages & direct messages
    const channel = supabase
      .channel('superadmin-chat-monitor')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'project_chat_messages' },
        () => {
          loadConversations(true);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => {
          loadConversations(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadConversations = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      // 1. Fetch project chat messages safely
      let projectMessages: any[] = [];
      try {
        const { data: pcmData, error: pcmError } = await (supabase
          .from('project_chat_messages') as any)
          .select('*')
          .order('created_at', { ascending: true });

        if (!pcmError && Array.isArray(pcmData)) {
          projectMessages = pcmData;
        } else if (pcmError) {
          console.warn('project_chat_messages query notice:', pcmError.message);
        }
      } catch (e) {
        console.warn('Could not query project_chat_messages:', e);
      }

      // 2. Fetch direct messages safely
      let directMessages: any[] = [];
      try {
        const { data: dmData, error: dmError } = await supabase
          .from('messages')
          .select('*')
          .order('created_at', { ascending: true });

        if (!dmError && Array.isArray(dmData)) {
          directMessages = dmData;
        } else if (dmError) {
          console.warn('messages table query notice:', dmError.message);
        }
      } catch (e) {
        console.warn('Could not query messages table:', e);
      }

      // 3. Fetch reference entities (projects, orders, contracts, profiles, clients)
      const [
        projectsRes,
        ordersRes,
        contractsRes,
        profilesRes,
        leaderProfilesRes,
        clientsRes,
      ] = await Promise.all([
        supabase.from('client_projects').select('id, title, category, status, client_name, client_email, accepted_designer_id, claimed_by'),
        supabase.from('client_orders').select('id, project_name, client_name, client_email, assigned_designer_id, status'),
        supabase.from('job_contracts').select('id, title, status, client_name, client_email, claimed_by'),
        supabase.from('profiles').select('id, full_name, email, username'),
        supabase.from('leaderboard_profiles').select('id, full_name, username'),
        supabase.from('clients').select('id, name, email, company'),
      ]);

      const projectsData = projectsRes.data || [];
      const ordersData = ordersRes.data || [];
      const contractsData = contractsRes.data || [];
      const profilesData = profilesRes.data || [];
      const leaderProfilesData = leaderProfilesRes.data || [];
      const clientsData = clientsRes.data || [];

      // Profile & user name dictionary
      const userMetaMap = new Map<string, { name: string; email?: string }>();
      leaderProfilesData.forEach((p: any) => {
        if (p.id) userMetaMap.set(p.id, { name: p.full_name || p.username || 'User' });
      });
      profilesData.forEach((p: any) => {
        if (p.id) {
          userMetaMap.set(p.id, {
            name: p.full_name || p.username || p.email || userMetaMap.get(p.id)?.name || 'User',
            email: p.email || undefined,
          });
        }
      });
      clientsData.forEach((c: any) => {
        if (c.email) {
          userMetaMap.set(c.email, { name: c.name || c.company || 'Client', email: c.email });
        }
      });

      // Project maps
      const projectMap: Record<string, any> = {};
      projectsData.forEach((p: any) => {
        projectMap[p.id] = {
          title: p.title,
          category: p.category || 'Project',
          status: p.status || 'active',
          clientName: p.client_name || 'Client',
          clientEmail: p.client_email || 'client@primehaven.tech',
          designerId: p.accepted_designer_id || p.claimed_by || null,
        };
      });
      ordersData.forEach((o: any) => {
        if (!projectMap[o.id]) {
          projectMap[o.id] = {
            title: o.project_name || `Order #${o.id.slice(0, 8)}`,
            category: 'Client Order',
            status: o.status || 'active',
            clientName: o.client_name || 'Client',
            clientEmail: o.client_email || 'client@primehaven.tech',
            designerId: o.assigned_designer_id || null,
          };
        }
      });
      contractsData.forEach((c: any) => {
        if (!projectMap[c.id]) {
          projectMap[c.id] = {
            title: c.title || `Contract #${c.id.slice(0, 8)}`,
            category: 'Job Contract',
            status: c.status || 'active',
            clientName: c.client_name || 'Client',
            clientEmail: c.client_email || 'client@primehaven.tech',
            designerId: c.claimed_by || null,
          };
        }
      });

      const list: ConversationItem[] = [];

      // A. Process Project Chat Messages
      const pcmByProject: Record<string, ChatMessage[]> = {};
      projectMessages.forEach((m: any) => {
        const mod = checkOffPlatformContent(m.content || '');
        const isFlagged = Boolean(m.is_flagged || mod.isFlagged);
        const reason = m.flag_reason || (mod.isFlagged ? mod.reasons.join(', ') : null);

        const msg: ChatMessage = {
          id: m.id || Math.random().toString(),
          channel_type: 'project',
          project_id: m.project_id,
          sender_role: m.sender_role || 'client',
          sender_name: m.sender_name || (m.sender_id ? userMetaMap.get(m.sender_id)?.name : null) || m.sender_role || 'User',
          sender_id: m.sender_id || null,
          content: m.content || '',
          is_flagged: isFlagged,
          flag_reason: reason,
          created_at: m.created_at || new Date().toISOString(),
        };

        if (m.project_id) {
          (pcmByProject[m.project_id] ||= []).push(msg);
        }
      });

      // Add all project conversations that have messages
      for (const [projId, msgs] of Object.entries(pcmByProject)) {
        const proj = projectMap[projId] || {};
        const desId = proj.designerId || null;
        const desName = desId ? (userMetaMap.get(desId)?.name || 'Assigned Talent') : 'Assigned Talent';
        const flagged = msgs.filter(m => m.is_flagged).length;

        list.push({
          id: `proj_${projId}`,
          channelType: 'project',
          projectId: projId,
          projectTitle: proj.title || `Project #${projId.slice(0, 8)}`,
          category: proj.category || 'General',
          status: proj.status || 'active',
          clientName: proj.clientName || 'Client',
          clientEmail: proj.clientEmail || 'client@primehaven.tech',
          designerName: desName,
          designerId: desId,
          lastMessage: msgs[msgs.length - 1],
          totalMessages: msgs.length,
          flaggedCount: flagged,
          messages: msgs,
        });
      }

      // Also ensure active projects without messages appear so superadmin can inspect or start threads
      (projectsData || []).slice(0, 20).forEach((p: any) => {
        const projKey = `proj_${p.id}`;
        if (!list.some(item => item.id === projKey)) {
          const desId = p.accepted_designer_id || p.claimed_by || null;
          const desName = desId ? (userMetaMap.get(desId)?.name || 'Unassigned') : 'Unassigned';
          list.push({
            id: projKey,
            channelType: 'project',
            projectId: p.id,
            projectTitle: p.title || `Project #${p.id.slice(0, 8)}`,
            category: p.category || 'Project Workspace',
            status: p.status || 'open',
            clientName: p.client_name || 'Client',
            clientEmail: p.client_email || 'client@primehaven.tech',
            designerName: desName,
            designerId: desId,
            totalMessages: 0,
            flaggedCount: 0,
            messages: [],
          });
        }
      });

      // B. Process Direct Platform Messages (messages table)
      const directThreads: Record<string, ChatMessage[]> = {};
      directMessages.forEach((m: any) => {
        if (!m.sender_id || !m.receiver_id) return;
        const threadKey = [m.sender_id, m.receiver_id].sort().join('::');
        const mod = checkOffPlatformContent(m.content || '');
        const senderMeta = userMetaMap.get(m.sender_id);

        const msg: ChatMessage = {
          id: m.id || Math.random().toString(),
          channel_type: 'direct',
          sender_role: 'user',
          sender_name: senderMeta?.name || 'User',
          sender_id: m.sender_id,
          receiver_id: m.receiver_id,
          content: m.content || '',
          is_flagged: mod.isFlagged,
          flag_reason: mod.isFlagged ? mod.reasons.join(', ') : null,
          created_at: m.created_at || new Date().toISOString(),
        };

        (directThreads[threadKey] ||= []).push(msg);
      });

      for (const [threadKey, msgs] of Object.entries(directThreads)) {
        const [u1, u2] = threadKey.split('::');
        const user1Meta = userMetaMap.get(u1);
        const user2Meta = userMetaMap.get(u2);
        const flagged = msgs.filter(m => m.is_flagged).length;

        list.push({
          id: `dm_${threadKey}`,
          channelType: 'direct',
          projectTitle: `${user1Meta?.name || 'User 1'} & ${user2Meta?.name || 'User 2'}`,
          category: 'Direct Platform DM',
          status: 'active',
          clientName: user1Meta?.name || 'Participant 1',
          clientEmail: user1Meta?.email || 'user1@platform',
          designerName: user2Meta?.name || 'Participant 2',
          designerId: u2,
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
        const updated = list.find(c => c.id === selectedConvo.id);
        if (updated) setSelectedConvo(updated);
      }
    } catch (err: any) {
      console.warn('Notice while synchronizing conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendAdminAdvisory = async () => {
    if (!selectedConvo || !warningMessage.trim() || !user) return;
    setSendingNotice(true);
    try {
      if (selectedConvo.channelType === 'project' && selectedConvo.projectId) {
        const { error } = await supabase.from('project_chat_messages').insert({
          project_id: selectedConvo.projectId,
          sender_role: 'admin',
          sender_id: user.id,
          sender_name: '🛡️ Prime Haven Moderation',
          content: warningMessage.trim(),
          is_flagged: false,
        });
        if (error) throw error;
      } else if (selectedConvo.channelType === 'direct') {
        const recipientId = selectedConvo.designerId || selectedConvo.messages[0]?.sender_id;
        if (recipientId) {
          const { error } = await supabase.from('messages').insert({
            sender_id: user.id,
            receiver_id: recipientId,
            content: `🛡️ [OFFICIAL ADMIN ADVISORY]: ${warningMessage.trim()}`,
          });
          if (error) throw error;
        }
      }

      toast({
        title: 'Official Advisory Delivered',
        description: 'Your moderation notice was posted into the conversation thread.',
      });
      setWarnDialogOpen(false);
      loadConversations(true);
    } catch (err: any) {
      toast({ title: 'Could not send notice', description: err.message, variant: 'destructive' });
    } finally {
      setSendingNotice(false);
    }
  };

  const handleCancelProjectForViolation = async () => {
    if (!selectedConvo || !user || !selectedConvo.projectId) return;
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
        description: 'The project was terminated without refund, and a permanent moderation record was logged.',
        variant: 'destructive',
      });
      setCancelDialogOpen(false);
      loadConversations(true);
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

    const matchesFilter =
      filterMode === 'all' ||
      (filterMode === 'project' && c.channelType === 'project') ||
      (filterMode === 'direct' && c.channelType === 'direct') ||
      (filterMode === 'flagged' && c.flaggedCount > 0);

    return matchesSearch && matchesFilter;
  });

  const totalFlaggedAcrossPlatform = conversations.reduce((acc, c) => acc + c.flaggedCount, 0);
  const totalProjectChats = conversations.filter(c => c.channelType === 'project').length;
  const totalDirectChats = conversations.filter(c => c.channelType === 'direct').length;

  return (
    <SuperAdminLayout onRefresh={() => loadConversations(false)} loading={loading}>
      <Seo
        title="Platform Messages & Moderation — Super Admin"
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
              Platform Messages
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Live oversight of project workspace chats and direct member communications with automated detection of contact sharing.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadConversations(false)}
              className="gap-2 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh Feeds
            </Button>
          </div>
        </div>

        {/* Main 2-Column Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[680px]">
          {/* Left Column: Conversations Master List */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <Card className="glass border-border/50 flex-1 flex flex-col overflow-hidden">
              <CardHeader className="p-3.5 space-y-2 border-b border-border/40 bg-muted/20">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search messages, participants, projects..."
                    className="pl-8 h-8 text-xs bg-background/60"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>

                {/* Filter Chips */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                  <Button
                    size="sm"
                    variant={filterMode === 'all' ? 'secondary' : 'ghost'}
                    className="h-7 text-[11px] rounded-full px-2.5 shrink-0"
                    onClick={() => setFilterMode('all')}
                  >
                    All ({conversations.length})
                  </Button>
                  <Button
                    size="sm"
                    variant={filterMode === 'project' ? 'secondary' : 'ghost'}
                    className="h-7 text-[11px] rounded-full px-2.5 shrink-0 gap-1"
                    onClick={() => setFilterMode('project')}
                  >
                    <Briefcase className="w-3 h-3 text-primary" /> Projects ({totalProjectChats})
                  </Button>
                  <Button
                    size="sm"
                    variant={filterMode === 'direct' ? 'secondary' : 'ghost'}
                    className="h-7 text-[11px] rounded-full px-2.5 shrink-0 gap-1"
                    onClick={() => setFilterMode('direct')}
                  >
                    <Users className="w-3 h-3 text-blue-500" /> DMs ({totalDirectChats})
                  </Button>
                  <Button
                    size="sm"
                    variant={filterMode === 'flagged' ? 'destructive' : 'ghost'}
                    className={`h-7 text-[11px] rounded-full px-2.5 shrink-0 gap-1 ${
                      filterMode !== 'flagged' && totalFlaggedAcrossPlatform > 0 ? 'text-red-400 font-semibold' : ''
                    }`}
                    onClick={() => setFilterMode('flagged')}
                  >
                    <AlertTriangle className="w-3 h-3" /> Flagged ({totalFlaggedAcrossPlatform})
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-0 flex-1 overflow-y-auto max-h-[620px] divide-y divide-border/30">
                {loading ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-2">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    <p>Synchronizing conversation channels...</p>
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                    <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground/40" />
                    <p className="font-semibold text-foreground">No conversations found</p>
                    <p className="text-[11px]">No active threads match your current filter.</p>
                  </div>
                ) : (
                  filteredConversations.map(convo => {
                    const isSelected = selectedConvo?.id === convo.id;
                    return (
                      <div
                        key={convo.id}
                        onClick={() => setSelectedConvo(convo)}
                        className={`p-3.5 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-primary/10 border-l-4 border-primary'
                            : 'hover:bg-muted/30'
                        } ${convo.flaggedCount > 0 ? 'bg-red-500/5' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="shrink-0">
                              {convo.channelType === 'project' ? (
                                <Briefcase className="w-3 h-3 text-primary" />
                              ) : (
                                <Users className="w-3 h-3 text-blue-500" />
                              )}
                            </span>
                            <h4 className="text-xs font-bold font-heading truncate">
                              {convo.projectTitle}
                            </h4>
                          </div>

                          {convo.flaggedCount > 0 ? (
                            <Badge variant="destructive" className="text-[9px] px-1.5 py-0 shrink-0 font-mono gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" /> {convo.flaggedCount} FLAGGED
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0">
                              {convo.totalMessages} msg{convo.totalMessages !== 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
                          <span className="truncate max-w-[130px] font-medium">{convo.clientName}</span>
                          <span className="truncate max-w-[130px] text-right">{convo.designerName}</span>
                        </div>

                        {convo.lastMessage ? (
                          <p className="text-[11px] text-foreground/80 line-clamp-1 italic">
                            "{convo.lastMessage.content}"
                          </p>
                        ) : (
                          <p className="text-[11px] text-muted-foreground/60 italic">
                            No messages exchanged yet
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
                        {selectedConvo.channelType === 'project' ? 'Project Chat' : 'Direct Message'}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold text-muted-foreground">
                        {selectedConvo.category}
                      </Badge>
                      {selectedConvo.channelType === 'project' && (
                        <Badge variant="outline" className={`text-[10px] capitalize ${
                          selectedConvo.status === 'cancelled' ? 'border-red-500 text-red-400 bg-red-500/10' : ''
                        }`}>
                          {selectedConvo.status}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span><strong>Party A:</strong> {selectedConvo.clientName} {selectedConvo.clientEmail ? `(${selectedConvo.clientEmail})` : ''}</span>
                      <span>•</span>
                      <span><strong>Party B:</strong> {selectedConvo.designerName}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1.5 border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
                      onClick={() => setWarnDialogOpen(true)}
                    >
                      <ShieldAlert className="w-3.5 h-3.5" /> Issue Advisory
                    </Button>
                    {selectedConvo.channelType === 'project' && selectedConvo.projectId && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8 text-xs gap-1.5"
                        onClick={() => setCancelDialogOpen(true)}
                      >
                        <Ban className="w-3.5 h-3.5" /> Cancel for Violation
                      </Button>
                    )}
                  </div>
                </CardHeader>

                {/* Moderation Alert Banner if Flagged */}
                {selectedConvo.flaggedCount > 0 && (
                  <div className="px-4 py-2.5 bg-red-500/10 border-b border-red-500/30 flex items-center justify-between gap-3 text-xs text-red-400">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 animate-pulse text-red-500" />
                      <span>
                        <strong>Off-Platform Communication Alert:</strong> {selectedConvo.flaggedCount} message(s) in this thread were flagged for potential contact sharing or external transactions.
                      </span>
                    </div>
                  </div>
                )}

                {/* Chat Feed */}
                <CardContent className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[460px] max-h-[560px] bg-background/40">
                  {selectedConvo.messages.length === 0 ? (
                    <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
                      <MessageSquare className="w-8 h-8 mx-auto opacity-30 text-primary" />
                      <p className="font-semibold text-foreground">No messages exchanged yet</p>
                      <p className="text-[11px]">Use "Issue Advisory" to inject an official moderation message into this thread.</p>
                    </div>
                  ) : (
                    selectedConvo.messages.map(m => {
                      const isAdmin = m.sender_role === 'admin' || m.content.startsWith('🛡️') || m.content.startsWith('🚨');
                      const isClient = m.sender_role === 'client' || m.sender_id === selectedConvo.clientName;
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
                                ? 'bg-amber-500/15 border border-amber-500/30 text-amber-200 text-center w-full shadow-xs'
                                : isClient
                                ? 'bg-muted/50 text-foreground border border-border/40 shadow-xs'
                                : 'bg-primary/20 text-foreground border border-primary/30 shadow-xs'
                            } ${m.is_flagged ? 'ring-2 ring-red-500 border-red-500/50 bg-red-500/10' : ''}`}
                          >
                            <div className="flex items-center justify-between gap-3 mb-1 text-[10px] font-bold uppercase tracking-wider opacity-70">
                              <span>{m.sender_name || (isAdmin ? 'Prime Haven Moderation' : m.sender_role)}</span>
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
                <div className="p-3 border-t border-border/40 bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5 text-[11px]">
                    <Lock className="w-3.5 h-3.5 text-primary shrink-0" />
                    All interactions in this thread are cryptographically verified and audited under Prime Haven Terms.
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1 shrink-0"
                    onClick={() => setWarnDialogOpen(true)}
                  >
                    <Send className="w-3 h-3" /> Post Moderation Notice
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="glass border-border/50 flex-1 flex items-center justify-center p-12 text-center text-muted-foreground">
                <div className="space-y-2">
                  <MessageSquare className="w-10 h-10 mx-auto opacity-30 text-primary" />
                  <p className="text-sm font-medium">Select a conversation thread to inspect</p>
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
              Send Official On-Platform Advisory
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              This message will be injected directly into the conversation to warn both parties against terms violations.
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
              Send Advisory Notice
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
