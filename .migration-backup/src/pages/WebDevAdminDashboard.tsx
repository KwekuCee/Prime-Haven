import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Code, Command, Server, Globe, CheckCircle,
  XCircle, Search, Clock, ExternalLink, ImageIcon,
  TerminalSquare, ThumbsUp, GitBranch, Settings, AlertTriangle, Edit
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { SubmissionFilesDialog } from '@/components/admin/SubmissionFilesDialog';
import SuperAdminLayout from '@/components/admin/SuperAdminLayout';
import { format } from 'date-fns';

const WEBDEV_SERVICES = ['web-development', 'backend', 'fullstack', 'ecommerce-dev', 'web', 'ecommerce'];

const WebDevAdminDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [initialAuthCheck, setInitialAuthCheck] = useState(true);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [viewFilesSubmission, setViewFilesSubmission] = useState<any>(null);
  const [previewLinkUrl, setPreviewLinkUrl] = useState<string | null>(null);

  // Dialog States
  const [rejectSubmission, setRejectSubmission] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [clientRejectSubmission, setClientRejectSubmission] = useState<any>(null);
  const [clientRejectionReason, setClientRejectionReason] = useState('');
  const [correctionRequestSubmission, setCorrectionRequestSubmission] = useState<any>(null);
  const [correctionNote, setCorrectionNote] = useState('');

  const [systemSettings, setSystemSettings] = useState<any>({
    ph_approval_points: { value: 15 },
    client_acceptance_points: { value: 80 },
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [
        { data: profilesData },
        { data: submissionsData },
        { data: settingsData }
      ] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email'),
        supabase.from('submissions').select('*').in('service_type', WEBDEV_SERVICES).order('created_at', { ascending: false }),
        supabase.from('system_settings').select('key, value'),
      ]);

      const profilesMap = new Map((profilesData || []).map((p: any) => [p.id, p]));
      const processedSubmissions = (submissionsData || []).map((s: any) => ({
        ...s,
        designer_name: profilesMap.get(s.designer_id)?.full_name || 'Unknown',
        designer_email: profilesMap.get(s.designer_id)?.email || '',
      }));

      setSubmissions(processedSubmissions);

      if (settingsData) {
        const settings: any = {};
        settingsData.forEach((item: any) => { settings[item.key] = item.value; });
        setSystemSettings((prev: any) => ({ ...prev, ...settings }));
      }
    } catch (error: any) {
      toast({ title: 'Load Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (authLoading) return;
    const checkAccess = async () => {
      if (!user) { navigate('/superadmin-login', { replace: true }); return; }
      try {
        const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
        if (!roleData || !['superadmin', 'masteradmin'].includes(roleData.role)) {
          navigate('/dashboard', { replace: true }); return;
        }
        setInitialAuthCheck(false);
        await loadData();
      } catch { navigate('/superadmin-login', { replace: true }); }
    };
    checkAccess();
  }, [user, authLoading, navigate, loadData]);

  const handlePHApproval = async (submissionId: string) => {
    try {
      const submission = submissions.find((s: any) => s.id === submissionId);
      if (!submission) throw new Error('Submission not found');
      const isCorrection = !!submission.parent_submission_id;
      const phPoints = isCorrection ? 0 : (systemSettings.ph_approval_points?.value || 15);

      await supabase.from('submissions').update({
        ph_approved: true, ph_approved_at: new Date().toISOString(), ph_approved_by: user?.id,
        points_awarded: (submission.points_awarded || 0) + phPoints, status: 'ph_approved',
        updated_at: new Date().toISOString()
      }).eq('id', submissionId);

      if (phPoints > 0) {
        const { data: designerData } = await supabase.from('designer_details').select('total_points, monthly_points').eq('user_id', submission.designer_id).maybeSingle();
        if (designerData) {
          await supabase.from('designer_details').update({
            total_points: (designerData.total_points || 0) + phPoints,
            monthly_points: (designerData.monthly_points || 0) + phPoints,
            updated_at: new Date().toISOString()
          }).eq('user_id', submission.designer_id);
        }
      }
      if (user) await supabase.from('system_logs').insert({ action_type: 'ph_approval', admin_id: user.id, description: `[Web Dept] Approved: ${submission.project_name} (+${phPoints} pts)`, timestamp: new Date().toISOString() });
      toast({ title: 'Approved', description: `+${phPoints} points awarded.` });
      await loadData();
    } catch (error: any) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); }
  };

  const handleClientAcceptance = async (submissionId: string) => {
    try {
      const submission = submissions.find((s: any) => s.id === submissionId);
      if (!submission) throw new Error('Submission not found');
      const clientPoints = systemSettings.client_acceptance_points?.value || 80;

      await supabase.from('submissions').update({
        client_accepted: true, client_accepted_at: new Date().toISOString(), client_accepted_by: user?.id,
        points_awarded: (submission.points_awarded || 0) + clientPoints, status: 'approved',
        final_approval_date: new Date().toISOString(), updated_at: new Date().toISOString()
      }).eq('id', submissionId);

      const { data: designerData } = await supabase.from('designer_details').select('total_points, monthly_points').eq('user_id', submission.designer_id).maybeSingle();
      if (designerData) {
        await supabase.from('designer_details').update({
          total_points: (designerData.total_points || 0) + clientPoints,
          monthly_points: (designerData.monthly_points || 0) + clientPoints,
          updated_at: new Date().toISOString()
        }).eq('user_id', submission.designer_id);
      }
      if (user) await supabase.from('system_logs').insert({ action_type: 'client_acceptance', admin_id: user.id, description: `[Web Dept] Client accepted: ${submission.project_name} (+${clientPoints} pts)`, timestamp: new Date().toISOString() });
      toast({ title: 'Client Accepted', description: `+${clientPoints} additional points!` });
      await loadData();
    } catch (error: any) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); }
  };

  const handleRejectSubmission = async () => {
    if (!rejectSubmission || !rejectionReason.trim()) return;
    try {
      await supabase.from('submissions').update({ status: 'rejected', rejection_reason: rejectionReason.trim(), updated_at: new Date().toISOString() } as any).eq('id', rejectSubmission.id);
      if (user) await supabase.from('system_logs').insert({ action_type: 'submission_rejected', admin_id: user.id, description: `[Web Dept] Rejected: ${rejectSubmission.project_name}`, timestamp: new Date().toISOString() });
      toast({ title: 'Rejected' });
      setRejectSubmission(null); setRejectionReason('');
      await loadData();
    } catch (error: any) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); }
  };

  const handleClientRejection = async () => {
    if (!clientRejectSubmission || !clientRejectionReason.trim()) return;
    try {
      await supabase.from('submissions').update({ status: 'client_rejected', rejection_reason: clientRejectionReason.trim(), updated_at: new Date().toISOString() } as any).eq('id', clientRejectSubmission.id);
      if (user) await supabase.from('system_logs').insert({ action_type: 'client_rejected', admin_id: user.id, description: `[Web Dept] Client rejected: ${clientRejectSubmission.project_name}`, timestamp: new Date().toISOString() });
      toast({ title: 'Client Rejected', description: 'Points retained.' });
      setClientRejectSubmission(null); setClientRejectionReason('');
      await loadData();
    } catch (error: any) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); }
  };

  const handleRequestCorrectionWithNote = async () => {
    if (!correctionRequestSubmission) return;
    if (!correctionNote.trim()) { toast({ title: 'Note Required', description: 'Please provide a correction note.', variant: 'destructive' }); return; }
    try {
      await supabase.from('submissions').update({ status: 'correction_requested', rejection_reason: correctionNote.trim(), updated_at: new Date().toISOString() } as any).eq('id', correctionRequestSubmission.id);
      if (user) await supabase.from('system_logs').insert({ action_type: 'correction_requested', admin_id: user.id, description: `[Web Dept] Requested correction: ${correctionRequestSubmission.project_name} — Note: ${correctionNote.trim()}`, timestamp: new Date().toISOString() });
      toast({ title: 'Correction Requested', description: 'Developer notified.' });
      setCorrectionRequestSubmission(null); setCorrectionNote('');
      await loadData();
    } catch (error: any) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); }
  };

  const handleRevokeSubmission = async (submissionId: string) => {
    try {
      const submission = submissions.find((s: any) => s.id === submissionId);
      if (!submission) throw new Error('Submission not found');
      const pointsToRevoke = submission.points_awarded || 0;
      await supabase.from('submissions').update({
        status: 'rejected', points_awarded: 0, rejection_reason: 'Submission revoked', updated_at: new Date().toISOString()
      } as any).eq('id', submissionId);

      if (pointsToRevoke > 0) {
        const { data: designerData } = await supabase.from('designer_details').select('total_points, monthly_points').eq('user_id', submission.designer_id).maybeSingle();
        if (designerData) {
          await supabase.from('designer_details').update({
            total_points: Math.max(0, (designerData.total_points || 0) - pointsToRevoke),
            monthly_points: Math.max(0, (designerData.monthly_points || 0) - pointsToRevoke),
            updated_at: new Date().toISOString()
          }).eq('user_id', submission.designer_id);
        }
      }
      if (user) await supabase.from('system_logs').insert({ action_type: 'submission_revoked', admin_id: user.id, description: `[Web Dept] Revoked: ${submission.project_name} (−${pointsToRevoke} pts)`, timestamp: new Date().toISOString() });
      toast({ title: 'Revoked', description: `${pointsToRevoke} points deducted.` });
      await loadData();
    } catch (error: any) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); }
  };

  const filteredSubmissions = useMemo(() => {
    let filtered = submissions;
    if (selectedStatus !== 'all') {
      if (selectedStatus === 'pending') filtered = filtered.filter(s => !s.ph_approved && s.status !== 'rejected');
      else if (selectedStatus === 'ph_approved') filtered = filtered.filter(s => s.ph_approved && !s.client_accepted);
      else if (selectedStatus === 'approved') filtered = filtered.filter(s => s.client_accepted);
      else filtered = filtered.filter(s => s.status === selectedStatus);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(s => s.project_name.toLowerCase().includes(q) || s.designer_name.toLowerCase().includes(q));
    }
    return filtered;
  }, [submissions, selectedStatus, searchQuery]);

  const stats = {
    total: submissions.length,
    active: submissions.filter(s => s.status !== 'approved' && s.status !== 'rejected').length,
    repos: submissions.filter(s => s.design_link?.includes('github') || s.design_link?.includes('gitlab')).length,
    pending: submissions.filter(s => !s.ph_approved && s.status !== 'rejected').length,
  };

  if (initialAuthCheck || loading) return <SuperAdminLayout><div className="flex items-center justify-center py-32"><div className="w-10 h-10 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" /></div></SuperAdminLayout>;

  return (
    <SuperAdminLayout onRefresh={() => loadData()} loading={loading}>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-heading font-bold text-emerald-500 mb-1 flex items-center gap-2">
            <TerminalSquare /> Web Development Infrastructure
          </h1>
          <p className="text-xs text-muted-foreground">Codebase review, hosting environments, and technical Q&A.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="rounded-xl border border-border/50 bg-card/80 p-5 hover:border-emerald-500/50 transition-colors">
            <div className="flex justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Deployments</span>
              <Globe className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-3xl font-bold tracking-tight">{stats.total}</div>
          </div>
          <div className="rounded-xl border border-border/50 bg-card/80 p-5 hover:border-primary/50 transition-colors">
            <div className="flex justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Active Environments</span>
              <Server className="w-4 h-4 text-primary" />
            </div>
            <div className="text-3xl font-bold tracking-tight">{stats.active}</div>
          </div>
          <div className="rounded-xl border border-border/50 bg-card/80 p-5 hover:border-blue-500/50 transition-colors">
            <div className="flex justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Repositories</span>
              <GitBranch className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-3xl font-bold tracking-tight">{stats.repos}</div>
          </div>
          <div className="rounded-xl border border-border/50 bg-card/80 p-5 hover:border-amber-500/50 transition-colors">
            <div className="flex justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">PRs to Review</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-3xl font-bold tracking-tight">{stats.pending}</div>
          </div>
        </div>

        <div className="rounded-xl border border-border/50 bg-card/50 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-border/50 bg-card/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div><h2 className="text-base font-bold flex items-center gap-2"><Code className="w-4 h-4 text-emerald-500" /> Production Control</h2></div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
                <Input placeholder="Search repositories..." className="pl-8 h-8 text-sm w-full sm:w-48 bg-card/50" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="h-8 text-sm w-full sm:w-40 bg-card/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  <SelectItem value="pending">Code Review</SelectItem>
                  <SelectItem value="ph_approved">Staging Server</SelectItem>
                  <SelectItem value="approved">Production Live</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-card/40 border-b border-border/30">
                    <TableHead>Project ID</TableHead>
                    <TableHead>Developer</TableHead>
                    <TableHead>Tech Stack / Module</TableHead>
                    <TableHead>Repository URL</TableHead>
                    <TableHead>Build Status</TableHead>
                    <TableHead>Commit Time</TableHead>
                    <TableHead className="text-right">Operations</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubmissions.length > 0 ? filteredSubmissions.map((s: any) => (
                    <TableRow key={s.id} className="border-border/30">
                      <TableCell className="font-mono text-xs">{s.project_name}</TableCell>
                      <TableCell>
                        <p className="font-semibold text-sm">{s.designer_name}</p>
                        <p className="text-[10px] text-muted-foreground">{s.designer_email}</p>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px] bg-primary/5">{s.service_type}</Badge></TableCell>
                      <TableCell>
                        {s.design_link ? (
                          <a href={s.design_link} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[11px] text-emerald-500 hover:text-emerald-400 max-w-[140px] truncate bg-emerald-500/10 px-2 py-1 rounded">
                            <Command className="w-3 h-3 shrink-0" />
                            {s.design_link.replace('https://', '').replace(/www\./, '')}
                          </a>
                        ) : <span className="text-[10px] text-muted-foreground opacity-50">Local Source Code</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${s.client_accepted ? 'border-emerald-500 text-emerald-500' :
                          s.ph_approved ? 'border-blue-500 text-blue-500' :
                            s.status === 'rejected' ? 'border-red-500 text-red-500' :
                              'border-amber-500 text-amber-500'
                          }`}>
                          {s.client_accepted ? 'LIVE' : s.ph_approved ? 'STAGING' : s.status || 'REVIEW'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(s.created_at), 'MMM d, yy HH:mm')}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                              <Settings className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52 bg-card/95 backdrop-blur-xl border-border/50">
                            <DropdownMenuLabel className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Review Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-border/50" />
                            {s.design_link && (
                              <DropdownMenuItem className="text-xs cursor-pointer focus:bg-primary/10 transition-colors" onClick={() => setPreviewLinkUrl(s.design_link)}>
                                <ExternalLink className="w-3.5 h-3.5 mr-2 text-primary" /> Inspect Web Link
                              </DropdownMenuItem>
                            )}
                            {s.files_urls?.length > 0 && (
                              <DropdownMenuItem className="text-xs cursor-pointer focus:bg-primary/10 transition-colors" onClick={() => setViewFilesSubmission(s)}>
                                <ImageIcon className="w-3.5 h-3.5 mr-2 text-primary" /> Inspect Files
                              </DropdownMenuItem>
                            )}
                            {(s.design_link || s.files_urls?.length > 0) && <DropdownMenuSeparator className="bg-border/50" />}
                            {!s.ph_approved && s.status !== 'rejected' && (
                              <>
                                <DropdownMenuItem className="text-xs cursor-pointer focus:bg-emerald-500/10 text-emerald-500 transition-colors" onClick={() => handlePHApproval(s.id)}>
                                  <CheckCircle className="w-3.5 h-3.5 mr-2" /> QA Override Pass
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-xs cursor-pointer focus:bg-red-500/10 text-red-500 transition-colors" onClick={() => { setRejectSubmission(s); setRejectionReason(''); }}>
                                  <XCircle className="w-3.5 h-3.5 mr-2" /> QA Reject & Return
                                </DropdownMenuItem>
                              </>
                            )}
                            {s.ph_approved && !s.client_accepted && s.status !== 'client_rejected' && (
                              <>
                                <DropdownMenuItem className="text-xs cursor-pointer focus:bg-emerald-500/10 text-emerald-500 transition-colors" onClick={() => handleClientAcceptance(s.id)}>
                                  <ThumbsUp className="w-3.5 h-3.5 mr-2" /> Mark Client Accepted
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-xs cursor-pointer focus:bg-red-500/10 text-red-500 transition-colors" onClick={() => { setClientRejectSubmission(s); setClientRejectionReason(''); }}>
                                  <XCircle className="w-3.5 h-3.5 mr-2" /> Mark Client Rejected
                                </DropdownMenuItem>
                              </>
                            )}
                            {s.status === 'client_rejected' && (
                              <>
                                <DropdownMenuItem className="text-xs cursor-pointer focus:bg-amber-500/10 text-amber-500 transition-colors" onClick={() => { setCorrectionRequestSubmission(s); setCorrectionNote(''); }}>
                                  <Edit className="w-3.5 h-3.5 mr-2" /> Request Correction
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-xs cursor-pointer focus:bg-red-500/10 text-red-500 transition-colors" onClick={() => { setRejectSubmission(s); setRejectionReason(''); }}>
                                  <XCircle className="w-3.5 h-3.5 mr-2" /> Final Reject
                                </DropdownMenuItem>
                              </>
                            )}
                            {s.status === 'correction_requested' && (
                              <DropdownMenuItem className="text-xs cursor-pointer focus:bg-red-500/10 text-red-500 transition-colors" onClick={() => { setRejectSubmission(s); setRejectionReason(''); }}>
                                <XCircle className="w-3.5 h-3.5 mr-2" /> Cancel & Reject
                              </DropdownMenuItem>
                            )}
                            {s.status !== 'rejected' && (s.points_awarded || 0) > 0 && (
                              <>
                                <DropdownMenuSeparator className="bg-border/50" />
                                <DropdownMenuItem className="text-xs cursor-pointer focus:bg-red-500/10 text-red-500 transition-colors" onClick={() => handleRevokeSubmission(s.id)}>
                                  <AlertTriangle className="w-3.5 h-3.5 mr-2" /> Revoke Approval
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground"><Server className="w-8 h-8 mx-auto mb-2 opacity-30" />No commits found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      <SubmissionFilesDialog open={!!viewFilesSubmission} onOpenChange={open => !open && setViewFilesSubmission(null)} submission={viewFilesSubmission} />

      {/* Reject Dialog */}
      <Dialog open={!!rejectSubmission} onOpenChange={open => { if (!open) setRejectSubmission(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Code / Log Issue</DialogTitle></DialogHeader>
          <div className="py-4"><Label>QA Finding / Rejection Reason</Label><Textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} className="mt-2 text-sm font-mono w-full min-h-[120px]" placeholder="// explain why build failed..." /></div>
          <DialogFooter><Button variant="outline" onClick={() => setRejectSubmission(null)}>Cancel</Button><Button variant="destructive" onClick={handleRejectSubmission} disabled={!rejectionReason.trim()}>Return Draft to Talent</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Client Reject Dialog */}
      <Dialog open={!!clientRejectSubmission} onOpenChange={open => { if (!open) setClientRejectSubmission(null); }}>
        <DialogContent><DialogHeader><DialogTitle>Client Rejection</DialogTitle><DialogDescription>PH points will be retained for this work</DialogDescription></DialogHeader>
          <div className="py-4"><Label>Client Feedback</Label><Textarea value={clientRejectionReason} onChange={e => setClientRejectionReason(e.target.value)} className="mt-2 min-h-[100px]" /></div>
          <DialogFooter><Button variant="outline" onClick={() => setClientRejectSubmission(null)}>Cancel</Button><Button variant="destructive" onClick={handleClientRejection} disabled={!clientRejectionReason.trim()}>Client Reject</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Correction Request Dialog */}
      <Dialog open={!!correctionRequestSubmission} onOpenChange={open => { if (!open) setCorrectionRequestSubmission(null); }}>
        <DialogContent><DialogHeader><DialogTitle>Request Correction</DialogTitle></DialogHeader>
          <div className="py-4"><Label>Correction Instructions</Label><Textarea value={correctionNote} onChange={e => setCorrectionNote(e.target.value)} className="mt-2 min-h-[100px]" /></div>
          <DialogFooter><Button variant="outline" onClick={() => setCorrectionRequestSubmission(null)}>Cancel</Button><Button className="bg-amber-500 hover:bg-amber-600 text-white" onClick={handleRequestCorrectionWithNote} disabled={!correctionNote.trim()}><Edit className="w-4 h-4 mr-2" />Request Correction</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Preview Dialog */}
      <Dialog open={!!previewLinkUrl} onOpenChange={(open) => !open && setPreviewLinkUrl(null)}>
        <DialogContent className="max-w-5xl h-[80vh] p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-2 flex-shrink-0"><div className="flex items-center justify-between"><DialogTitle className="text-sm font-medium truncate max-w-md">{previewLinkUrl}</DialogTitle><Button size="sm" variant="outline" onClick={() => window.open(previewLinkUrl!, '_blank')} className="ml-4 shrink-0">Open in New Tab</Button></div></DialogHeader>
          <div className="flex-1 px-6 pb-6"><iframe src={previewLinkUrl || ''} className="w-full h-full rounded-lg border border-border" sandbox="allow-scripts allow-same-origin allow-popups allow-forms" title="Link Preview" /></div>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
};

export default WebDevAdminDashboard;
