import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, FileCheck, DollarSign, Shield, Settings, LogOut, Search,
  CheckCircle, XCircle, Download, UserCheck, Clock, Award, ChevronRight,
  RefreshCw, Activity, Crown, Star, ThumbsUp, ImageIcon, Edit
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { SubmissionFilesDialog } from '@/components/admin/SubmissionFilesDialog';
import { AdminNavigation } from '@/components/admin/AdminNavigation';
import { format } from 'date-fns';

interface CategoryAdminDashboardProps {
  category: 'uiux' | 'web';
  categoryLabel: string;
  serviceTypes: string[];
}

const CategoryAdminDashboard = ({ category, categoryLabel, serviceTypes }: CategoryAdminDashboardProps) => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [initialAuthCheck, setInitialAuthCheck] = useState(true);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [viewFilesSubmission, setViewFilesSubmission] = useState<any>(null);
  const [rejectSubmission, setRejectSubmission] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [clientRejectSubmission, setClientRejectSubmission] = useState<any>(null);
  const [clientRejectionReason, setClientRejectionReason] = useState('');
  const [correctionRequestSubmission, setCorrectionRequestSubmission] = useState<any>(null);
  const [correctionNote, setCorrectionNote] = useState('');
  const [systemSettings, setSystemSettings] = useState<any>({
    ph_approval_points: { value: 15 },
    client_acceptance_points: { value: 40 },
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [
        { data: profilesData },
        { data: designerDetailsData },
        { data: rolesData },
        { data: submissionsData },
        { data: settingsData }
      ] = await Promise.all([
        supabase.from('profiles').select('id, email, full_name, phone, is_active, created_at').order('created_at', { ascending: false }),
        supabase.from('designer_details').select('*'),
        supabase.from('user_roles').select('user_id, role'),
        supabase.from('submissions').select('*').in('service_type', serviceTypes).order('created_at', { ascending: false }),
        supabase.from('system_settings').select('key, value'),
      ]);

      const profilesMap = new Map((profilesData || []).map((p: any) => [p.id, p]));
      const designerDetailsMap = new Map((designerDetailsData || []).map((d: any) => [d.user_id, d]));

      const processedUsers = (profilesData || []).map((u: any) => ({
        ...u,
        designer_details: designerDetailsMap.get(u.id),
        user_roles: (rolesData || []).filter((r: any) => r.user_id === u.id),
      }));

      const processedSubmissions = (submissionsData || []).map((s: any) => {
        const designer = profilesMap.get(s.designer_id);
        return {
          ...s,
          designer_name: designer?.full_name || 'Unknown',
          designer_email: designer?.email || '',
        };
      });

      setUsers(processedUsers);
      setSubmissions(processedSubmissions);

      if (settingsData) {
        const settings: any = {};
        settingsData.forEach((item: any) => { settings[item.key] = item.value; });
        setSystemSettings((prev: any) => ({ ...prev, ...settings }));
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({ title: 'Load Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [serviceTypes, toast]);

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
      const phPoints = systemSettings.ph_approval_points?.value || 15;

      await supabase.from('submissions').update({
        ph_approved: true, ph_approved_at: new Date().toISOString(), ph_approved_by: user?.id,
        points_awarded: (submission.points_awarded || 0) + phPoints, status: 'ph_approved',
        updated_at: new Date().toISOString()
      }).eq('id', submissionId);

      const { data: designerData } = await supabase.from('designer_details').select('total_points, monthly_points').eq('user_id', submission.designer_id).maybeSingle();
      if (designerData) {
        await supabase.from('designer_details').update({
          total_points: (designerData.total_points || 0) + phPoints,
          monthly_points: (designerData.monthly_points || 0) + phPoints,
          updated_at: new Date().toISOString()
        }).eq('user_id', submission.designer_id);
      }

      if (user) {
        await supabase.from('system_logs').insert({ action_type: 'ph_approval', admin_id: user.id, description: `[${categoryLabel}] PH approved: ${submission.project_name} (+${phPoints} pts)`, timestamp: new Date().toISOString() });
      }

      toast({ title: 'PH Approved', description: `+${phPoints} points awarded.` });
      await loadData();
    } catch (error: any) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); }
  };

  const handleClientAcceptance = async (submissionId: string) => {
    try {
      const submission = submissions.find((s: any) => s.id === submissionId);
      if (!submission) throw new Error('Submission not found');
      // Use service-type-specific points
      const servicePointsMap: Record<string, number> = { logo: 45, branding: 50, uiux: 65, web: 65, print: 20, flyer: 40 };
      const clientPoints = servicePointsMap[submission.service_type] || systemSettings.client_acceptance_points?.value || 40;

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

      if (user) {
        await supabase.from('system_logs').insert({ action_type: 'client_acceptance', admin_id: user.id, description: `[${categoryLabel}] Client accepted: ${submission.project_name} (+${clientPoints} pts)`, timestamp: new Date().toISOString() });
      }

      toast({ title: 'Client Accepted', description: `+${clientPoints} additional points!` });
      await loadData();
    } catch (error: any) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); }
  };

  const handleRejectSubmission = async () => {
    if (!rejectSubmission || !rejectionReason.trim()) return;
    try {
      await supabase.from('submissions').update({ status: 'rejected', rejection_reason: rejectionReason.trim(), updated_at: new Date().toISOString() } as any).eq('id', rejectSubmission.id);
      if (user) { await supabase.from('system_logs').insert({ action_type: 'submission_rejected', admin_id: user.id, description: `[${categoryLabel}] Rejected: ${rejectSubmission.project_name}`, timestamp: new Date().toISOString() }); }
      toast({ title: 'Rejected' });
      setRejectSubmission(null); setRejectionReason('');
      await loadData();
    } catch (error: any) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); }
  };

  const handleClientRejection = async () => {
    if (!clientRejectSubmission || !clientRejectionReason.trim()) return;
    try {
      await supabase.from('submissions').update({ status: 'client_rejected', rejection_reason: clientRejectionReason.trim(), updated_at: new Date().toISOString() } as any).eq('id', clientRejectSubmission.id);
      if (user) { await supabase.from('system_logs').insert({ action_type: 'client_rejected', admin_id: user.id, description: `[${categoryLabel}] Client rejected: ${clientRejectSubmission.project_name}`, timestamp: new Date().toISOString() }); }
      toast({ title: 'Client Rejected', description: 'PH points retained.' });
      setClientRejectSubmission(null); setClientRejectionReason('');
      await loadData();
    } catch (error: any) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); }
  };

  const handleRequestCorrection = async (submission: any) => {
    try {
      await supabase.from('submissions').update({ status: 'correction_requested', updated_at: new Date().toISOString() } as any).eq('id', submission.id);
      if (user) { await supabase.from('system_logs').insert({ action_type: 'correction_requested', admin_id: user.id, description: `[${categoryLabel}] Requested correction: ${submission.project_name}`, timestamp: new Date().toISOString() }); }
      toast({ title: 'Correction Requested', description: 'Designer will be notified.' });
      await loadData();
    } catch (error: any) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); }
  };

  const filteredSubmissions = useMemo(() => {
    let filtered = submissions;
    if (selectedStatus !== 'all') {
      if (selectedStatus === 'pending') filtered = filtered.filter((s: any) => !s.ph_approved && s.status !== 'rejected');
      else if (selectedStatus === 'ph_approved') filtered = filtered.filter((s: any) => s.ph_approved && !s.client_accepted);
      else if (selectedStatus === 'approved') filtered = filtered.filter((s: any) => s.client_accepted);
      else filtered = filtered.filter((s: any) => s.status === selectedStatus);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((s: any) => s.project_name.toLowerCase().includes(q) || s.designer_name.toLowerCase().includes(q));
    }
    return filtered;
  }, [submissions, selectedStatus, searchQuery]);

  const pendingCount = submissions.filter((s: any) => !s.ph_approved && s.status !== 'rejected').length;

  const handleLogout = async () => { await signOut(); navigate('/login'); };

  if (initialAuthCheck || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">{initialAuthCheck ? 'Checking access...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                  <Crown className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
                    {categoryLabel} Admin
                    <Badge variant="secondary" className="text-xs font-semibold">
                      <Shield className="w-3 h-3 mr-1" />
                      Admin
                    </Badge>
                  </h1>
                  <p className="text-sm text-muted-foreground font-medium">{categoryLabel} submissions management</p>
                </div>
              </div>
              <AdminNavigation />
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={() => loadData()} disabled={loading}>
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">A</span>
                    </div>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate('/superadmin')}>Main Dashboard</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/dashboard')}>User View</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="glass border-l-4 border-l-primary">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Total Submissions</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{submissions.length}</div></CardContent>
          </Card>
          <Card className="glass border-l-4 border-l-blue-500">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Pending Review</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{pendingCount}</div></CardContent>
          </Card>
          <Card className="glass border-l-4 border-l-green-500">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Approved</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{submissions.filter((s: any) => s.client_accepted).length}</div></CardContent>
          </Card>
        </div>

        {/* Submissions Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="font-bold">{categoryLabel} Submissions</CardTitle>
                <CardDescription className="font-medium">PH Check → Client Acceptance workflow</CardDescription>
              </div>
              <div className="flex gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input placeholder="Search..." className="pl-9 w-[200px]" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="ph_approved">Awaiting Client</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="client_rejected">Client Rejected</SelectItem>
                    <SelectItem value="correction_requested">Correction Requested</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredSubmissions.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Project</TableHead>
                      <TableHead className="font-semibold">Designer</TableHead>
                      <TableHead className="font-semibold">Service</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Points</TableHead>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="text-right font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubmissions.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-semibold">
                          {s.project_name}
                          {s.parent_submission_id && <Badge variant="outline" className="ml-2 text-xs">Correction</Badge>}
                        </TableCell>
                        <TableCell>
                          <p className="font-semibold">{s.designer_name}</p>
                          <p className="text-xs text-muted-foreground">{s.designer_email}</p>
                        </TableCell>
                        <TableCell><Badge variant="outline">{s.service_type}</Badge></TableCell>
                        <TableCell>
                          {s.client_accepted ? (
                            <Badge className="bg-green-500/20 text-green-500">Complete</Badge>
                          ) : s.status === 'client_rejected' ? (
                            <Badge variant="destructive">Client Rejected</Badge>
                          ) : s.status === 'correction_requested' ? (
                            <Badge className="bg-amber-500/20 text-amber-500">Correction Requested</Badge>
                          ) : s.ph_approved ? (
                            <Badge className="bg-blue-500/20 text-blue-500">Awaiting Client</Badge>
                          ) : s.status === 'rejected' ? (
                            <Badge variant="destructive">Rejected</Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-500 border-amber-500">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell><span className="font-bold text-primary">{s.points_awarded || 0}</span></TableCell>
                        <TableCell className="font-medium">{format(new Date(s.created_at), 'MMM d, yyyy')}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {s.files_urls?.length > 0 && (
                              <Button size="sm" variant="outline" onClick={() => setViewFilesSubmission(s)}>
                                <ImageIcon className="w-3 h-3 mr-1" />View
                              </Button>
                            )}
                            {!s.ph_approved && s.status !== 'rejected' && (
                              <>
                                <Button size="sm" variant="outline" className="border-green-500 text-green-500 hover:bg-green-500 hover:text-white" onClick={() => handlePHApproval(s.id)}>
                                  <CheckCircle className="w-3 h-3 mr-1" />PH Approve
                                </Button>
                                <Button size="sm" variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => { setRejectSubmission(s); setRejectionReason(''); }}>
                                  <XCircle className="w-3 h-3" />
                                </Button>
                              </>
                            )}
                            {s.ph_approved && !s.client_accepted && s.status !== 'client_rejected' && (
                              <>
                                <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={() => handleClientAcceptance(s.id)}>
                                  <ThumbsUp className="w-3 h-3 mr-1" />Accept
                                </Button>
                                <Button size="sm" variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => { setClientRejectSubmission(s); setClientRejectionReason(''); }}>
                                  <XCircle className="w-3 h-3 mr-1" />Client Reject
                                </Button>
                              </>
                            )}
                            {s.status === 'client_rejected' && (
                              <Button size="sm" variant="outline" className="border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-white" onClick={() => handleRequestCorrection(s)}>
                                <Edit className="w-3 h-3 mr-1" />Request Correction
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileCheck className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No submissions found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <SubmissionFilesDialog open={!!viewFilesSubmission} onOpenChange={open => !open && setViewFilesSubmission(null)} submission={viewFilesSubmission} />

      {/* Reject Dialog */}
      <Dialog open={!!rejectSubmission} onOpenChange={open => { if (!open) { setRejectSubmission(null); setRejectionReason(''); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Submission</DialogTitle><DialogDescription>Provide feedback for "{rejectSubmission?.project_name}"</DialogDescription></DialogHeader>
          <div className="py-4"><Label>Rejection Reason</Label><Textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} className="mt-2 min-h-[100px]" placeholder="Explain why..." /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectSubmission(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRejectSubmission} disabled={!rejectionReason.trim()}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Client Reject Dialog */}
      <Dialog open={!!clientRejectSubmission} onOpenChange={open => { if (!open) { setClientRejectSubmission(null); setClientRejectionReason(''); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Client Rejection</DialogTitle><DialogDescription>PH points will be retained for "{clientRejectSubmission?.project_name}"</DialogDescription></DialogHeader>
          <div className="py-4"><Label>Rejection Reason</Label><Textarea value={clientRejectionReason} onChange={e => setClientRejectionReason(e.target.value)} className="mt-2 min-h-[100px]" /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClientRejectSubmission(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleClientRejection} disabled={!clientRejectionReason.trim()}>Client Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoryAdminDashboard;
