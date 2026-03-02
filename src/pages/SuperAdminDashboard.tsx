import { useState, useEffect, useCallback, useMemo } from 'react';
import BrandLogo from '@/components/BrandLogo';
import { motion } from 'framer-motion';
import { 
  Users, 
  FileCheck, 
  DollarSign, 
  TrendingUp,
  Shield,
  Settings,
  LogOut,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Download,
  UserCheck,
  Clock,
  Award,
  ChevronRight,
  RefreshCw,
  Activity,
  Crown,
  Edit,
  Star,
  ThumbsUp,
  Save,
  ImageIcon,
  Trash2,
  AlertTriangle,
  Banknote,
  Newspaper
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { SubmissionFilesDialog } from '@/components/admin/SubmissionFilesDialog';
import { EditUserDialog } from '@/components/admin/EditUserDialog';
import { AdminNavigation } from '@/components/admin/AdminNavigation';
import ManageTestimonials from '@/components/admin/ManageTestimonials';
import ManageBlog from '@/components/admin/ManageBlog';
import { MonthlyReports } from '@/components/admin/MonthlyReports';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';

// Types
interface AdminStats {
  totalUsers: number;
  totalDesigners: number;
  totalAdmins: number;
  pendingSubmissions: number;
  totalRevenue: number;
  activeProjects: number;
  conversionRate: number;
  avgApprovalTime: number;
}

interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  registration_fee_paid: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  designer_details?: {
    id?: string;
    user_id: string;
    professional_title: string;
    experience_level: string;
    total_points: number;
    monthly_points: number;
    salary_estimated: number;
    profile_photo_url: string;
    portfolio_url: string;
    skills: string[];
    payment_method: string;
    payment_details: any;
    salary_payment_status: string;
    salary_paid_at: string | null;
    created_at?: string;
    updated_at?: string;
  };
  user_roles?: Array<{
    id?: string;
    user_id: string;
    role: string;
    created_at?: string;
  }>;
}

interface Submission {
  id: string;
  designer_id: string;
  project_name: string;
  service_type: string;
  status: string;
  points_awarded: number;
  created_at: string;
  updated_at: string;
  final_approval_date: string;
  designer_name: string;
  designer_email: string;
  client_ref: string;
  files_urls: string[];
  ph_approved: boolean;
  client_accepted: boolean;
  ph_approved_at: string | null;
  client_accepted_at: string | null;
  parent_submission_id?: string | null;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface Payment {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  status: string;
  transaction_id: string;
  created_at: string;
  user_name: string;
  description: string;
  metadata: any;
  profiles?: {
    full_name: string;
  };
}

interface SystemLog {
  id: string;
  action_type: string;
  admin_id: string;
  description: string;
  timestamp: string;
  ip_address: string;
  user_agent: string;
  profiles?: {
    full_name: string;
  };
}

interface SystemSettings {
  monthly_revenue: { amount: number; currency: string; month: number | null; year: number | null };
  ph_approval_points: { value: number };
  client_acceptance_points: { value: number };
  revenue_share_percentage: { value: number };
  monthly_revenue_by_category?: { graphic: number; uiux: number; web: number };
  correction_points?: { value: number } | number;
}

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [initialAuthCheck, setInitialAuthCheck] = useState(true);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalDesigners: 0,
    totalAdmins: 0,
    pendingSubmissions: 0,
    totalRevenue: 0,
    activeProjects: 0,
    conversionRate: 0,
    avgApprovalTime: 0
  });
  const [users, setUsers] = useState<User[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    monthly_revenue: { amount: 0, currency: 'GHS', month: null, year: null },
    ph_approval_points: { value: 15 },
    client_acceptance_points: { value: 40 },
    revenue_share_percentage: { value: 50 }
  });
  const [isRevenueModalOpen, setIsRevenueModalOpen] = useState(false);
  const [revenueInput, setRevenueInput] = useState('');
  const [revenueByCategory, setRevenueByCategory] = useState({ graphic: '', uiux: '', web: '' });
  const [viewFilesSubmission, setViewFilesSubmission] = useState<Submission | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [rejectSubmission, setRejectSubmission] = useState<Submission | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [giftPointsUser, setGiftPointsUser] = useState<User | null>(null);
  const [giftPointsAmount, setGiftPointsAmount] = useState('');
  const [giftPointsReason, setGiftPointsReason] = useState('');
  const [isResettingPoints, setIsResettingPoints] = useState(false);
  const [clientRejectSubmission, setClientRejectSubmission] = useState<Submission | null>(null);
  const [clientRejectionReason, setClientRejectionReason] = useState('');
  const [editUser, setEditUser] = useState<User | null>(null);
  // Load system settings
  const loadSystemSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value');
      
      if (error) throw error;
      
      if (data) {
        const settings: any = {};
        data.forEach((item: any) => {
          settings[item.key] = item.value;
        });
        setSystemSettings(prev => ({ ...prev, ...settings }));
      }
    } catch (error) {
      console.error('Error loading system settings:', error);
    }
  }, []);

  // Safe loader that fetches all relevant data from Supabase
  const loadDashboardDataSafe = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch data separately to avoid foreign key relationship errors
      const [
        { data: profilesData, error: profilesError },
        { data: designerDetailsData, error: designerDetailsError },
        { data: rolesData, error: rolesError },
        { data: submissionsData, error: submissionsError },
        { data: paymentsData, error: paymentsError },
        { data: logsData, error: logsError }
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, email, full_name, phone, registration_fee_paid, is_active, created_at, updated_at')
          .order('created_at', { ascending: false }),

        supabase
          .from('designer_details')
          .select('*'),

        supabase
          .from('user_roles')
          .select('user_id, role'),

        supabase
          .from('submissions')
          .select('*')
          .order('created_at', { ascending: false }),

        supabase
          .from('payments')
          .select('id, user_id, amount, type, status, transaction_id, created_at')
          .order('created_at', { ascending: false }),

        supabase
          .from('system_logs')
          .select('*')
        .order('timestamp', { ascending: false })
          .limit(10)
      ]);

      if (profilesError) throw profilesError;
      if (designerDetailsError) throw designerDetailsError;
      if (rolesError) throw rolesError;

      if (submissionsError) throw submissionsError;
      if (paymentsError) throw paymentsError;

      // Create lookup maps for designer_details and user_roles
      const designerDetailsMap = new Map((designerDetailsData || []).map((d: any) => [d.user_id, d]));
      const rolesMap = new Map<string, Array<{ id?: string; user_id: string; role: string; created_at?: string }>>();
      (rolesData || []).forEach((r: any) => {
        if (!rolesMap.has(r.user_id)) {
          rolesMap.set(r.user_id, []);
        }
        rolesMap.get(r.user_id)!.push({ user_id: r.user_id, role: r.role });
      });
      const profilesMap = new Map((profilesData || []).map((p: any) => [p.id, p]));

      // Normalize users by combining data from separate queries
      const processedUsers: User[] = (profilesData || []).map((u: any) => ({
        id: u.id,
        email: u.email || '',
        full_name: u.full_name || '',
        phone: u.phone || '',
        registration_fee_paid: u.registration_fee_paid || false,
        is_active: typeof u.is_active === 'boolean' ? u.is_active : true,
        created_at: u.created_at,
        updated_at: u.updated_at,
        designer_details: designerDetailsMap.get(u.id) || undefined,
        user_roles: rolesMap.get(u.id) || []
      }));

      // Create a map of user IDs to profiles for quick lookup
      const userMap = new Map(processedUsers.map(u => [u.id, u]));

      // Normalize submissions with designer info
      const processedSubmissions: Submission[] = (submissionsData || []).map((s: any) => {
        const designer = userMap.get(s.designer_id);
        return {
          id: s.id,
          designer_id: s.designer_id,
          project_name: s.project_name || 'Untitled',
          service_type: s.service_type || 'unknown',
          status: s.status || 'pending',
          points_awarded: s.points_awarded || 0,
          created_at: s.created_at,
          updated_at: s.updated_at,
          final_approval_date: s.final_approval_date,
          designer_name: designer?.full_name || 'Unknown',
          designer_email: designer?.email || 'No email',
          client_ref: s.client_ref || '',
          files_urls: s.files_urls || [],
          ph_approved: s.ph_approved || false,
          client_accepted: s.client_accepted || false,
          ph_approved_at: s.ph_approved_at,
          client_accepted_at: s.client_accepted_at,
          parent_submission_id: s.parent_submission_id || null
        };
      });

      // Normalize payments with user lookup
      const processedPayments: Payment[] = (paymentsData || []).map((p: any) => {
        const profile = profilesMap.get(p.user_id);
        return {
          id: p.id,
          user_id: p.user_id,
          amount: p.amount || 0,
          type: p.type || 'registration',
          status: p.status || 'pending',
          transaction_id: p.transaction_id || 'N/A',
          created_at: p.created_at,
          user_name: profile?.full_name || 'Unknown',
          description: '',
          metadata: {}
        };
      });

      // Normalize logs
      const processedLogs: SystemLog[] = (logsData || []).map((l: any) => ({
        id: l.id,
        action_type: l.action_type || 'unknown',
        admin_id: l.admin_id,
        description: l.description || '',
        timestamp: l.timestamp,
        ip_address: l.ip_address || '',
        user_agent: l.user_agent || '',
        profiles: l.profiles || undefined
      }));

      setUsers(processedUsers);
      setSubmissions(processedSubmissions);
      setPayments(processedPayments);
      setSystemLogs(processedLogs);

      // Compute stats
      const totalUsers = processedUsers.length;
      const totalDesigners = processedUsers.filter(u => u.user_roles?.some(r => r.role === 'designer')).length;
      const totalAdmins = processedUsers.filter(u => u.user_roles?.some(r => r.role === 'superadmin' || r.role === 'masteradmin')).length;
      const pendingSubmissions = processedSubmissions.filter(s => s.status === 'pending' || (!s.ph_approved && s.status !== 'rejected')).length;
      const approvedSubmissions = processedSubmissions.filter(s => s.status === 'approved' || s.ph_approved).length;
      const totalSubmissions = processedSubmissions.length;
      const completedPayments = processedPayments.filter(p => p.status === 'completed');
      const totalRevenue = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const conversionRate = totalSubmissions > 0 ? (approvedSubmissions / totalSubmissions) * 100 : 0;

      // average approval time
      let avgApprovalTime = 0;
      const approvedWithDates = processedSubmissions.filter(s => (s.status === 'approved' || s.ph_approved) && s.ph_approved_at && s.created_at);
      if (approvedWithDates.length > 0) {
        const totalHours = approvedWithDates.reduce((sum, sub) => {
          const created = new Date(sub.created_at).getTime();
          const approved = new Date(sub.ph_approved_at!).getTime();
          return sum + ((approved - created) / (1000 * 60 * 60));
        }, 0);
        avgApprovalTime = Math.round(totalHours / approvedWithDates.length);
      }

      setStats({
        totalUsers,
        totalDesigners,
        totalAdmins,
        pendingSubmissions,
        totalRevenue: systemSettings.monthly_revenue?.amount || totalRevenue,
        activeProjects: pendingSubmissions + approvedSubmissions,
        conversionRate: Math.round(conversionRate),
        avgApprovalTime: avgApprovalTime || 0
      });

      await loadSystemSettings();

    } catch (error: any) {
      console.error('Error loading dashboard data (safe):', error);
      toast({ title: 'Load Error', description: error.message || 'Could not load dashboard data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast, loadSystemSettings]);

  // Check admin access - wait for auth to finish loading first
  useEffect(() => {
    // Don't check until auth loading is complete
    if (authLoading) {
      console.log('⏳ Waiting for auth state to load...');
      return;
    }

    const checkAdminAccess = async () => {
      console.log('🔒 Checking admin access via Supabase Auth...');
      
      if (!user) {
        console.log('❌ No authenticated user, redirecting to login');
        toast({
          title: "Access Denied",
          description: "Please login as admin first.",
          variant: "destructive",
        });
        navigate('/superadmin-login', { replace: true });
        return;
      }

      try {
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (roleError || !roleData) {
          console.log('❌ No role found for user');
          toast({
            title: "Access Denied",
            description: "You do not have admin privileges.",
            variant: "destructive",
          });
          navigate('/dashboard', { replace: true });
          return;
        }

        const validAdminRoles = ['superadmin', 'masteradmin'];
        if (!validAdminRoles.includes(roleData.role)) {
          console.log('❌ User is not an admin, role:', roleData.role);
          toast({
            title: "Access Denied",
            description: "You do not have admin privileges.",
            variant: "destructive",
          });
          navigate('/dashboard', { replace: true });
          return;
        }

        console.log('✅ Admin authenticated:', user.email, 'Role:', roleData.role);
        setInitialAuthCheck(false);
        
        await loadDashboardDataSafe();
        
      } catch (error) {
        console.error('❌ Auth check error:', error);
        toast({
          title: "Authentication Error",
          description: "Please login again.",
          variant: "destructive",
        });
        navigate('/superadmin-login', { replace: true });
      }
    };

    checkAdminAccess();
  }, [user, authLoading, navigate, toast, loadDashboardDataSafe]);

  // Handle PH approval (15 points, or correction_points if correction)
  const handlePHApproval = async (submissionId: string) => {
    try {
      const submission = submissions.find(s => s.id === submissionId);
      if (!submission) throw new Error('Submission not found');

      const isCorrection = !!submission.parent_submission_id;
      const correctionPts = typeof systemSettings.correction_points === 'number' ? systemSettings.correction_points : (systemSettings.correction_points as any)?.value || 4;
      const phPoints = isCorrection ? correctionPts : (systemSettings.ph_approval_points?.value || 15);

      // Update submission
      const { error: updateError } = await supabase
        .from('submissions')
        .update({
          ph_approved: true,
          ph_approved_at: new Date().toISOString(),
          ph_approved_by: user?.id,
          points_awarded: (submission.points_awarded || 0) + phPoints,
          status: 'ph_approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', submissionId);

      if (updateError) throw updateError;

      // Update designer's points
      const { data: designerData } = await supabase
        .from('designer_details')
        .select('total_points, monthly_points')
        .eq('user_id', submission.designer_id)
        .maybeSingle();

      if (designerData) {
        const newTotalPoints = (designerData.total_points || 0) + phPoints;
        const newMonthlyPoints = (designerData.monthly_points || 0) + phPoints;
        
        await supabase
          .from('designer_details')
          .update({
            total_points: newTotalPoints,
            monthly_points: newMonthlyPoints,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', submission.designer_id);
      }

      // Log the action
      if (user) {
        await supabase.from('system_logs').insert({
          action_type: 'ph_approval',
          admin_id: user.id,
          description: `Prime Haven approved: ${submission.project_name} (+${phPoints} points)`,
          timestamp: new Date().toISOString(),
        });
      }

      // Send notification email to designer
      try {
        await supabase.functions.invoke('notify-designer', {
          body: {
            designerId: submission.designer_id,
            projectName: submission.project_name,
            notificationType: 'ph_approved',
            pointsAwarded: phPoints,
          },
        });
      } catch (emailErr) {
        console.error('Failed to send PH approval email:', emailErr);
      }

      toast({
        title: 'PH Approved',
        description: `Submission approved with ${phPoints} points.`,
      });

      await loadDashboardDataSafe();

    } catch (error: any) {
      console.error('PH approval error:', error);
      toast({
        title: 'Approval Failed',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Handle Client Acceptance (additional 40 points)
  const handleClientAcceptance = async (submissionId: string) => {
    try {
      const submission = submissions.find(s => s.id === submissionId);
      if (!submission) throw new Error('Submission not found');

      // Use service-type-specific points instead of static value
      const servicePointsMap: Record<string, number> = { logo: 45, branding: 50, uiux: 65, web: 65, print: 20, flyer: 40 };
      const clientPoints = servicePointsMap[submission.service_type] || systemSettings.client_acceptance_points?.value || 40;

      // Update submission
      const { error: updateError } = await supabase
        .from('submissions')
        .update({
          client_accepted: true,
          client_accepted_at: new Date().toISOString(),
          client_accepted_by: user?.id,
          points_awarded: (submission.points_awarded || 0) + clientPoints,
          status: 'approved',
          final_approval_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', submissionId);

      if (updateError) throw updateError;

      // Update designer's points
      const { data: designerData } = await supabase
        .from('designer_details')
        .select('total_points, monthly_points')
        .eq('user_id', submission.designer_id)
        .maybeSingle();

      if (designerData) {
        const newTotalPoints = (designerData.total_points || 0) + clientPoints;
        const newMonthlyPoints = (designerData.monthly_points || 0) + clientPoints;
        
        await supabase
          .from('designer_details')
          .update({
            total_points: newTotalPoints,
            monthly_points: newMonthlyPoints,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', submission.designer_id);
      }

      // Log the action
      if (user) {
        await supabase.from('system_logs').insert({
          action_type: 'client_acceptance',
          admin_id: user.id,
          description: `Client accepted: ${submission.project_name} (+${clientPoints} points)`,
          timestamp: new Date().toISOString(),
        });
      }

      // Send notification email to designer
      try {
        await supabase.functions.invoke('notify-designer', {
          body: {
            designerId: submission.designer_id,
            projectName: submission.project_name,
            notificationType: 'client_accepted',
            pointsAwarded: clientPoints,
          },
        });
      } catch (emailErr) {
        console.error('Failed to send client acceptance email:', emailErr);
      }

      toast({
        title: 'Client Accepted',
        description: `Design accepted by client with additional ${clientPoints} points!`,
      });

      await loadDashboardDataSafe();

    } catch (error: any) {
      console.error('Client acceptance error:', error);
      toast({
        title: 'Acceptance Failed',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Handle rejection with reason
  const handleRejectSubmission = async () => {
    if (!rejectSubmission) return;
    if (!rejectionReason.trim()) {
      toast({ title: 'Reason Required', description: 'Please provide a reason for rejection.', variant: 'destructive' });
      return;
    }
    try {
      const { error: updateError } = await supabase
        .from('submissions')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason.trim(),
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', rejectSubmission.id);

      if (updateError) throw updateError;

      if (user) {
        await supabase.from('system_logs').insert({
          action_type: 'submission_rejected',
          admin_id: user.id,
          description: `Rejected submission: ${rejectSubmission.project_name} — Reason: ${rejectionReason.trim()}`,
          timestamp: new Date().toISOString(),
        });
      }

      toast({ title: 'Submission Rejected', description: 'The submission has been rejected with your feedback.' });
      setRejectSubmission(null);
      setRejectionReason('');
      await loadDashboardDataSafe();

    } catch (error: any) {
      console.error('Rejection error:', error);
      toast({ title: 'Rejection Failed', description: error.message || 'Please try again.', variant: 'destructive' });
    }
  };

  // Update monthly revenue by category
  const handleUpdateRevenue = async () => {
    try {
      const graphicAmt = parseFloat(revenueByCategory.graphic) || 0;
      const uiuxAmt = parseFloat(revenueByCategory.uiux) || 0;
      const webAmt = parseFloat(revenueByCategory.web) || 0;
      const totalAmount = graphicAmt + uiuxAmt + webAmt;

      if (totalAmount < 0) {
        toast({ title: 'Invalid Amount', description: 'Revenue amounts must be positive.', variant: 'destructive' });
        return;
      }

      const currentDate = new Date();
      const revenueData = { amount: totalAmount, currency: 'GHS', month: currentDate.getMonth() + 1, year: currentDate.getFullYear() };
      const categoryData = { graphic: graphicAmt, uiux: uiuxAmt, web: webAmt };

      // Upsert both settings
      await Promise.all([
        supabase.from('system_settings').upsert({ key: 'monthly_revenue', value: revenueData, updated_at: new Date().toISOString(), updated_by: user?.id }, { onConflict: 'key' }),
        supabase.from('system_settings').upsert({ key: 'monthly_revenue_by_category', value: categoryData, updated_at: new Date().toISOString(), updated_by: user?.id }, { onConflict: 'key' }),
      ]);

      if (user) {
        await supabase.from('system_logs').insert({
          action_type: 'revenue_updated',
          admin_id: user.id,
          description: `Revenue updated — Graphic: GH₵${graphicAmt.toFixed(2)}, UI/UX: GH₵${uiuxAmt.toFixed(2)}, Web: GH₵${webAmt.toFixed(2)}, Total: GH₵${totalAmount.toFixed(2)}`,
          timestamp: new Date().toISOString(),
        });
      }

      setSystemSettings(prev => ({ ...prev, monthly_revenue: revenueData, monthly_revenue_by_category: categoryData }));

      // Recalculate salaries by category
      const revenueShare = systemSettings.revenue_share_percentage?.value || 50;
      const { data: allDesigners } = await supabase.from('designer_details').select('user_id, monthly_points');
      const { data: allSubmissions } = await supabase.from('submissions').select('designer_id, service_type, points_awarded').in('status', ['ph_approved', 'approved']);

      if (allDesigners && allSubmissions) {
        const graphicTypes = ['logo', 'branding', 'print', 'flyer'];
        
        // Calculate points per category per designer
        const designerCategoryPoints: Record<string, { graphic: number; uiux: number; web: number }> = {};
        allDesigners.forEach(d => { designerCategoryPoints[d.user_id] = { graphic: 0, uiux: 0, web: 0 }; });
        
        allSubmissions.forEach((s: any) => {
          if (!designerCategoryPoints[s.designer_id]) return;
          const pts = s.points_awarded || 0;
          if (graphicTypes.includes(s.service_type)) designerCategoryPoints[s.designer_id].graphic += pts;
          else if (s.service_type === 'uiux') designerCategoryPoints[s.designer_id].uiux += pts;
          else if (s.service_type === 'web') designerCategoryPoints[s.designer_id].web += pts;
        });

        const totalGraphicPts = Object.values(designerCategoryPoints).reduce((s, d) => s + d.graphic, 0);
        const totalUiuxPts = Object.values(designerCategoryPoints).reduce((s, d) => s + d.uiux, 0);
        const totalWebPts = Object.values(designerCategoryPoints).reduce((s, d) => s + d.web, 0);

        for (const designer of allDesigners) {
          const dp = designerCategoryPoints[designer.user_id] || { graphic: 0, uiux: 0, web: 0 };
          const hasAnyPoints = dp.graphic > 0 || dp.uiux > 0 || dp.web > 0;
          
          // Designers with zero points across all categories get zero salary
          if (!hasAnyPoints) {
            await supabase.from('designer_details').update({ salary_estimated: 0, updated_at: new Date().toISOString() }).eq('user_id', designer.user_id);
            continue;
          }
          
          const graphicSalary = totalGraphicPts > 0 ? (dp.graphic / totalGraphicPts) * (graphicAmt * revenueShare / 100) : 0;
          const uiuxSalary = totalUiuxPts > 0 ? (dp.uiux / totalUiuxPts) * (uiuxAmt * revenueShare / 100) : 0;
          const webSalary = totalWebPts > 0 ? (dp.web / totalWebPts) * (webAmt * revenueShare / 100) : 0;
          const totalSalary = graphicSalary + uiuxSalary + webSalary;

          await supabase.from('designer_details').update({ salary_estimated: totalSalary, updated_at: new Date().toISOString() }).eq('user_id', designer.user_id);
        }
      }

      toast({ title: 'Revenue Updated', description: `Total: GH₵${totalAmount.toFixed(2)}. Salaries recalculated by category.` });
      setIsRevenueModalOpen(false);
      setRevenueByCategory({ graphic: '', uiux: '', web: '' });
      await loadDashboardDataSafe();
    } catch (error: any) {
      console.error('Revenue update error:', error);
      toast({ title: 'Update Failed', description: error.message, variant: 'destructive' });
    }
  };

  // Handle correction request
  const handleRequestCorrection = async (submission: Submission) => {
    try {
      await supabase.from('submissions').update({ status: 'correction_requested', updated_at: new Date().toISOString() } as any).eq('id', submission.id);
      if (user) {
        await supabase.from('system_logs').insert({ action_type: 'correction_requested', admin_id: user.id, description: `Requested correction: ${submission.project_name}`, timestamp: new Date().toISOString() });
      }
      toast({ title: 'Correction Requested', description: 'The designer will be notified to submit corrections.' });
      await loadDashboardDataSafe();
    } catch (error: any) {
      toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    }
  };

  // Handle snapshot and generate monthly report
  const handleGenerateSnapshot = async () => {
    try {
      const currentDate = new Date();
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      
      const { error } = await supabase.functions.invoke('generate-monthly-report', {
        body: { month, year },
      });
      if (error) throw error;
      
      toast({ title: 'Snapshot Generated', description: `Monthly report for ${format(currentDate, 'MMMM yyyy')} created.` });
      await loadDashboardDataSafe();
    } catch (error: any) {
      toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    }
  };

  // Handle user actions
  const handleUserAction = async (userId: string, action: 'suspend' | 'activate' | 'promote' | 'demote') => {
    try {
      const targetUser = users.find(u => u.id === userId);
      if (!targetUser) throw new Error('User not found');

      let updateData: any = {};
      let description = '';

      switch (action) {
        case 'suspend':
          updateData.is_active = false;
          description = `Suspended user: ${targetUser.full_name || targetUser.email}`;
          break;
        case 'activate':
          updateData.is_active = true;
          description = `Activated user: ${targetUser.full_name || targetUser.email}`;
          break;
        case 'promote':
          const { data: existingRole } = await supabase
            .from('user_roles')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

          if (existingRole) {
            await supabase.from('user_roles').update({ role: 'superadmin' }).eq('user_id', userId);
          } else {
            await supabase.from('user_roles').insert({ user_id: userId, role: 'superadmin' });
          }
          description = `Promoted user to admin: ${targetUser.full_name || targetUser.email}`;
          break;
        case 'demote':
          await supabase.from('user_roles').update({ role: 'designer' }).eq('user_id', userId);
          description = `Demoted admin to designer: ${targetUser.full_name || targetUser.email}`;
          break;
      }

      if (Object.keys(updateData).length > 0) {
        await supabase.from('profiles').update(updateData).eq('id', userId);
      }

      if (user) {
        await supabase.from('system_logs').insert({
          action_type: `user_${action}`,
          admin_id: user.id,
          description,
          timestamp: new Date().toISOString(),
        });
      }

      toast({ title: 'Action completed', description: `User ${action}d successfully.` });
      await loadDashboardDataSafe();

    } catch (error: any) {
      console.error('User action error:', error);
      toast({ title: 'Action failed', description: error.message || 'Please try again.', variant: 'destructive' });
    }
  };

  // Handle delete designer
  const handleDeleteDesigner = async (targetUser: User) => {
    try {
      setIsDeleting(true);
      
      // Delete in order: submissions, designer_details, user_roles, payments, then profile
      // Delete submissions
      await supabase
        .from('submissions')
        .delete()
        .eq('designer_id', targetUser.id);
      
      // Delete designer_details
      await supabase
        .from('designer_details')
        .delete()
        .eq('user_id', targetUser.id);
      
      // Delete user_roles
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', targetUser.id);
      
      // Delete payments
      await supabase
        .from('payments')
        .delete()
        .eq('user_id', targetUser.id);
      
      // Delete email verification tokens
      await supabase
        .from('email_verification_tokens')
        .delete()
        .eq('user_id', targetUser.id);
      
      // Delete profile last
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', targetUser.id);
      
      if (profileError) throw profileError;
      
      // Log the action
      if (user) {
        await supabase.from('system_logs').insert({
          action_type: 'user_deleted',
          admin_id: user.id,
          description: `Deleted designer: ${targetUser.full_name || targetUser.email}`,
          timestamp: new Date().toISOString(),
        });
      }

      toast({
        title: 'Designer Deleted',
        description: `${targetUser.full_name || targetUser.email} has been permanently removed.`,
      });

      setDeleteConfirmUser(null);
      await loadDashboardDataSafe();

    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: 'Delete Failed',
        description: error.message || 'Could not delete designer.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle gift points
  const handleGiftPoints = async () => {
    if (!giftPointsUser) return;
    const points = parseInt(giftPointsAmount);
    if (isNaN(points) || points <= 0) {
      toast({ title: 'Invalid Points', description: 'Please enter a valid positive number.', variant: 'destructive' });
      return;
    }
    try {
      const { data: designerData } = await supabase
        .from('designer_details')
        .select('total_points, monthly_points')
        .eq('user_id', giftPointsUser.id)
        .maybeSingle();

      if (designerData) {
        await supabase
          .from('designer_details')
          .update({
            total_points: (designerData.total_points || 0) + points,
            monthly_points: (designerData.monthly_points || 0) + points,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', giftPointsUser.id);
      }

      if (user) {
        await supabase.from('system_logs').insert({
          action_type: 'gift_points',
          admin_id: user.id,
          description: `Gifted ${points} points to ${giftPointsUser.full_name || giftPointsUser.email}${giftPointsReason ? ': ' + giftPointsReason : ''}`,
          timestamp: new Date().toISOString(),
        });
      }

      // Send notification email
      try {
        await supabase.functions.invoke('notify-designer', {
          body: {
            designerId: giftPointsUser.id,
            projectName: '',
            notificationType: 'gift_points',
            pointsAwarded: points,
            giftReason: giftPointsReason,
          },
        });
      } catch (emailErr) {
        console.error('Failed to send gift points email:', emailErr);
      }

      toast({ title: 'Points Gifted', description: `${points} points awarded to ${giftPointsUser.full_name || giftPointsUser.email}.` });
      setGiftPointsUser(null);
      setGiftPointsAmount('');
      setGiftPointsReason('');
      await loadDashboardDataSafe();
    } catch (error: any) {
      console.error('Gift points error:', error);
      toast({ title: 'Gift Failed', description: error.message || 'Please try again.', variant: 'destructive' });
    }
  };

  // Handle marking salary as paid
  const handleMarkSalaryPaid = async (userItem: User) => {
    try {
      const salaryAmount = userItem.designer_details?.salary_estimated || 0;
      const paymentMethod = userItem.designer_details?.payment_method || '';
      const paymentDetails = userItem.designer_details?.payment_details;
      const paymentAccount = typeof paymentDetails === 'object' && paymentDetails
        ? (paymentDetails.account || paymentDetails.email || '')
        : (typeof paymentDetails === 'string' ? paymentDetails : '');

      // Update salary payment status
      const { error } = await supabase
        .from('designer_details')
        .update({
          salary_payment_status: 'paid',
          salary_paid_at: new Date().toISOString(),
          salary_paid_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userItem.id);

      if (error) throw error;

      // Log the action
      if (user) {
        await supabase.from('system_logs').insert({
          action_type: 'salary_paid',
          admin_id: user.id,
          description: `Marked salary as paid for ${userItem.full_name || userItem.email} — GH₵${salaryAmount.toFixed(2)}`,
          timestamp: new Date().toISOString(),
        });
      }

      // Send notification email
      const methodLabels: Record<string, string> = {
        'mtn_momo': 'MTN MoMo', 'vodafone_cash': 'Vodafone Cash',
        'airteltigo_money': 'AirtelTigo Money', 'bank_transfer': 'Bank Transfer',
        'crypto': 'Crypto', 'paypal': 'PayPal', 'wise': 'Wise'
      };
      try {
        await supabase.functions.invoke('notify-designer', {
          body: {
            designerId: userItem.id,
            projectName: '',
            notificationType: 'salary_paid',
            salaryAmount,
            paymentMethod: methodLabels[paymentMethod] || paymentMethod || 'your account',
            paymentAccount: String(paymentAccount || ''),
          },
        });
      } catch (emailErr) {
        console.error('Failed to send salary paid email:', emailErr);
      }

      toast({ title: '💰 Salary Marked as Paid', description: `${userItem.full_name || userItem.email} has been notified via email.` });
      await loadDashboardDataSafe();
    } catch (error: any) {
      console.error('Mark salary paid error:', error);
      toast({ title: 'Failed', description: error.message || 'Could not update payment status.', variant: 'destructive' });
    }
  };

  // Handle resetting salary payment status to unpaid
  const handleResetSalaryStatus = async (userItem: User) => {
    try {
      const { error } = await supabase
        .from('designer_details')
        .update({
          salary_payment_status: 'unpaid',
          salary_paid_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userItem.id);

      if (error) throw error;

      toast({ title: 'Status Reset', description: `Payment status reset to unpaid for ${userItem.full_name || userItem.email}.` });
      await loadDashboardDataSafe();
    } catch (error: any) {
      toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    }
  };

  // Handle client rejection (after PH approval, no points rollback)
  const handleClientRejection = async () => {
    if (!clientRejectSubmission) return;
    if (!clientRejectionReason.trim()) {
      toast({ title: 'Reason Required', description: 'Please provide a reason for client rejection.', variant: 'destructive' });
      return;
    }
    try {
      const { error: updateError } = await supabase
        .from('submissions')
        .update({
          status: 'client_rejected',
          rejection_reason: clientRejectionReason.trim(),
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', clientRejectSubmission.id);

      if (updateError) throw updateError;

      if (user) {
        await supabase.from('system_logs').insert({
          action_type: 'client_rejected',
          admin_id: user.id,
          description: `Client rejected: ${clientRejectSubmission.project_name} — Reason: ${clientRejectionReason.trim()} (PH points retained)`,
          timestamp: new Date().toISOString(),
        });
      }

      toast({ title: 'Client Rejected', description: 'Submission rejected by client. PH approval points retained.' });
      setClientRejectSubmission(null);
      setClientRejectionReason('');
      await loadDashboardDataSafe();
    } catch (error: any) {
      console.error('Client rejection error:', error);
      toast({ title: 'Rejection Failed', description: error.message || 'Please try again.', variant: 'destructive' });
    }
  };

  // Handle reset all points
  const handleResetAllPoints = async () => {
    try {
      setIsResettingPoints(true);
      const { error } = await supabase
        .from('designer_details')
        .update({ monthly_points: 0, total_points: 0, salary_estimated: 0, updated_at: new Date().toISOString() })
        .neq('user_id', '00000000-0000-0000-0000-000000000000'); // update all

      if (error) throw error;

      if (user) {
        await supabase.from('system_logs').insert({
          action_type: 'points_reset',
          admin_id: user.id,
          description: 'All designer points reset to zero',
          timestamp: new Date().toISOString(),
        });
      }

      toast({ title: 'Points Reset', description: 'All designer points have been reset to zero.' });
      await loadDashboardDataSafe();
    } catch (error: any) {
      console.error('Reset points error:', error);
      toast({ title: 'Reset Failed', description: error.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setIsResettingPoints(false);
    }
  };

  // Export data
  const exportData = (type: 'users' | 'submissions' | 'payments') => {
    let data: any[] = [];
    let filename = '';

    switch (type) {
      case 'users':
        data = users.map(u => ({
          ID: u.id,
          Name: u.full_name || 'No Name',
          Email: u.email,
          Phone: u.phone || 'No Phone',
          Role: u.user_roles?.[0]?.role || 'designer',
          'Registration Paid': u.registration_fee_paid ? 'Yes' : 'No',
          'Account Status': u.is_active ? 'Active' : 'Suspended',
          'Professional Title': u.designer_details?.professional_title || 'Not set',
          'Total Points': u.designer_details?.total_points || 0,
          'Monthly Points': u.designer_details?.monthly_points || 0,
          'Joined Date': format(new Date(u.created_at), 'yyyy-MM-dd HH:mm'),
        }));
        filename = `primehaven-users-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        break;
      case 'submissions':
        data = submissions.map(s => ({
          ID: s.id,
          'Project Name': s.project_name,
          Designer: s.designer_name,
          'Service Type': s.service_type,
          Status: s.status,
          'PH Approved': s.ph_approved ? 'Yes' : 'No',
          'Client Accepted': s.client_accepted ? 'Yes' : 'No',
          'Points Awarded': s.points_awarded || 0,
          'Submitted Date': format(new Date(s.created_at), 'yyyy-MM-dd HH:mm'),
        }));
        filename = `primehaven-submissions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        break;
      case 'payments':
        data = payments.map(p => ({
          ID: p.id,
          User: p.user_name,
          Amount: `GH₵${p.amount.toFixed(2)}`,
          Type: p.type,
          Status: p.status,
          'Transaction ID': p.transaction_id || 'N/A',
          'Payment Date': format(new Date(p.created_at), 'yyyy-MM-dd HH:mm'),
        }));
        filename = `primehaven-payments-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        break;
    }

    const headers = Object.keys(data[0] || {});
    const csvRows = [headers.join(','), ...data.map(row => headers.map(header => JSON.stringify(row[header] ?? '')).join(','))];
    const csvString = csvRows.join('\n');

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    toast({ title: 'Data exported', description: `${filename} has been downloaded.` });
  };

  // Handle logout
  const handleLogout = async () => {
    await signOut();
    toast({ title: 'Logged out', description: 'You have been logged out.' });
    navigate('/login');
  };

  // Filtered data
  const filteredSubmissions = useMemo(() => {
    let filtered = submissions;
    
    if (selectedStatus !== 'all') {
      if (selectedStatus === 'pending') {
        filtered = filtered.filter(s => !s.ph_approved && s.status !== 'rejected');
      } else if (selectedStatus === 'ph_approved') {
        filtered = filtered.filter(s => s.ph_approved && !s.client_accepted);
      } else if (selectedStatus === 'approved') {
        filtered = filtered.filter(s => s.client_accepted);
      } else {
        filtered = filtered.filter(s => s.status === selectedStatus);
      }
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.project_name.toLowerCase().includes(query) ||
        s.designer_name.toLowerCase().includes(query) ||
        s.service_type.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [submissions, selectedStatus, searchQuery]);

  const filteredUsers = useMemo(() => {
    let filtered = users;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(u => 
        (u.full_name && u.full_name.toLowerCase().includes(query)) ||
        u.email.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [users, searchQuery]);

  const getAdminDisplayName = () => {
    if (user) {
      const currentProfile = users.find(u => u.id === user.id);
      return currentProfile?.full_name || user.email || 'Admin';
    }
    return 'Admin';
  };

  const adminDisplayName = getAdminDisplayName();

  if (initialAuthCheck || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground font-medium">
            {initialAuthCheck ? 'Checking admin access...' : 'Loading dashboard data...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          {/* Top row: Logo + Actions */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <BrandLogo height={36} className="shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs font-semibold shrink-0">
                    <Shield className="w-3 h-3 mr-1" />
                    Super Admin
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium hidden sm:block">Complete platform administration</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <AlertDialog>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" disabled={isResettingPoints} className="text-amber-500 border-amber-500 hover:bg-amber-500 hover:text-white">
                          {isResettingPoints ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                          <span className="ml-1 hidden lg:inline">Reset Points</span>
                        </Button>
                      </AlertDialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent><p>Reset all designer points to zero</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-bold text-amber-500">Reset All Designer Points?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will set all designer total points, monthly points, and estimated salaries to zero. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResetAllPoints} className="bg-amber-500 hover:bg-amber-600">
                      Reset All Points
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={() => loadDashboardDataSafe()} disabled={loading}>
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Refresh data</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-1 sm:gap-2 px-2 sm:px-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">{(adminDisplayName.charAt(0) || 'A').toUpperCase()}</span>
                    </div>
                    <div className="text-left hidden lg:block">
                      <p className="text-sm font-semibold">Super Admin</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[120px]">{adminDisplayName}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 hidden sm:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                    <UserCheck className="w-4 h-4 mr-2" />
                    Switch to User View
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {/* Navigation row */}
          <div className="mt-3 -mb-1 overflow-x-auto">
            <AdminNavigation />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              title: 'Total Users',
              icon: Users,
              value: stats.totalUsers,
              borderColor: 'border-l-primary',
              extra: (
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs font-medium">{stats.totalDesigners} designers</Badge>
                  <Badge variant="outline" className="text-xs font-medium">{stats.totalAdmins} admins</Badge>
                </div>
              ),
            },
            {
              title: 'Pending Work',
              icon: FileCheck,
              value: stats.pendingSubmissions,
              borderColor: 'border-l-blue-500',
              extra: (
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs font-medium">{stats.activeProjects} active projects</Badge>
                </div>
              ),
            },
            {
              title: 'Monthly Revenue',
              icon: DollarSign,
              value: `GH₵${(systemSettings.monthly_revenue?.amount || 0).toFixed(2)}`,
              borderColor: 'border-l-green-500',
              onClick: () => {
                const cat = systemSettings.monthly_revenue_by_category || { graphic: 0, uiux: 0, web: 0 };
                setRevenueByCategory({ graphic: String(cat.graphic || ''), uiux: String(cat.uiux || ''), web: String(cat.web || '') });
                setIsRevenueModalOpen(true);
              },
              extra: (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {systemSettings.monthly_revenue_by_category ? (
                    <>
                      <Badge variant="outline" className="text-xs font-medium">G: GH₵{(systemSettings.monthly_revenue_by_category.graphic || 0).toFixed(0)}</Badge>
                      <Badge variant="outline" className="text-xs font-medium">UI: GH₵{(systemSettings.monthly_revenue_by_category.uiux || 0).toFixed(0)}</Badge>
                      <Badge variant="outline" className="text-xs font-medium">W: GH₵{(systemSettings.monthly_revenue_by_category.web || 0).toFixed(0)}</Badge>
                    </>
                  ) : (
                    <Badge variant="outline" className="text-xs font-medium">Click to edit</Badge>
                  )}
                </div>
              ),
            },
            {
              title: 'Approval Time',
              icon: Activity,
              value: stats.avgApprovalTime > 0 ? `${stats.avgApprovalTime}h` : 'N/A',
              borderColor: 'border-l-amber-500',
              extra: (
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs font-medium">Avg. approval time</Badge>
                </div>
              ),
            },
          ].map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Card
                className={`glass border-l-4 ${card.borderColor} ${card.onClick ? 'cursor-pointer hover:scale-[1.02] transition-transform' : ''}`}
                onClick={card.onClick}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">{card.title}</CardTitle>
                    <card.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{card.value}</div>
                  {card.extra}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>


        {/* Main Tabs */}
        <Tabs defaultValue="submissions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="submissions" className="font-semibold">
              <FileCheck className="w-4 h-4 mr-2" />
              Submissions
            </TabsTrigger>
            <TabsTrigger value="users" className="font-semibold">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="payments" className="font-semibold">
              <DollarSign className="w-4 h-4 mr-2" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="reports" className="font-semibold">
              <Download className="w-4 h-4 mr-2" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="testimonials" className="font-semibold">
              <Star className="w-4 h-4 mr-2" />
              Reviews
            </TabsTrigger>
            <TabsTrigger value="blog" className="font-semibold">
              <Newspaper className="w-4 h-4 mr-2" />
              Blog
            </TabsTrigger>
            <TabsTrigger value="logs" className="font-semibold">
              <Activity className="w-4 h-4 mr-2" />
              Logs
            </TabsTrigger>
          </TabsList>

          {/* Submissions Tab with Two-Level Approval */}
          <TabsContent value="submissions" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="font-bold">Work Submissions ({submissions.length})</CardTitle>
                    <CardDescription className="font-medium">Two-level approval: PH Check (+{systemSettings.ph_approval_points?.value || 15} pts) → Client Acceptance (points vary by service type)</CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="Search submissions..."
                        className="pl-9 w-full sm:w-[250px]"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending PH Approval</SelectItem>
                        <SelectItem value="ph_approved">Awaiting Client</SelectItem>
                        <SelectItem value="approved">Fully Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="client_rejected">Client Rejected</SelectItem>
                        <SelectItem value="correction_requested">Correction Requested</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={() => exportData('submissions')}>
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
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
                          <TableHead className="font-semibold">PH Status</TableHead>
                          <TableHead className="font-semibold">Client Status</TableHead>
                          <TableHead className="font-semibold">Points</TableHead>
                          <TableHead className="font-semibold">Submitted</TableHead>
                          <TableHead className="text-right font-semibold">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSubmissions.map((submission) => (
                          <TableRow key={submission.id}>
                            <TableCell className="font-semibold">
                              {submission.project_name}
                              {submission.parent_submission_id && (
                                <Badge variant="outline" className="ml-2 text-xs text-amber-500 border-amber-500">Correction</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-semibold">{submission.designer_name}</p>
                                <p className="text-xs text-muted-foreground">{submission.designer_email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-medium">{submission.service_type}</Badge>
                            </TableCell>
                            <TableCell>
                              {submission.ph_approved ? (
                                <Badge className="bg-green-500/20 text-green-500 font-medium">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Approved
                                </Badge>
                              ) : submission.status === 'rejected' ? (
                                <Badge variant="destructive" className="font-medium">Rejected</Badge>
                              ) : (
                                <Badge variant="outline" className="text-amber-500 border-amber-500 font-medium">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Pending
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {submission.client_accepted ? (
                                <Badge className="bg-primary/20 text-primary font-medium">
                                  <Star className="w-3 h-3 mr-1" />
                                  Accepted
                                </Badge>
                              ) : submission.ph_approved ? (
                                <Badge variant="outline" className="text-blue-500 border-blue-500 font-medium">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Awaiting
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="font-bold text-primary">{submission.points_awarded || 0}</span>
                            </TableCell>
                            <TableCell className="font-medium">
                              {format(new Date(submission.created_at), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {/* View Files Button - always visible if there are files */}
                                {submission.files_urls && submission.files_urls.length > 0 && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setViewFilesSubmission(submission)}
                                        >
                                          <ImageIcon className="w-3 h-3 mr-1" />
                                          View ({submission.files_urls.length})
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>View uploaded files</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                                {!submission.ph_approved && submission.status !== 'rejected' && (
                                  <>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
                                            onClick={() => handlePHApproval(submission.id)}
                                          >
                                            <CheckCircle className="w-3 h-3 mr-1" />
                                            PH Approve
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Approve for Prime Haven (+{systemSettings.ph_approval_points?.value || 15} pts)</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                            onClick={() => { setRejectSubmission(submission); setRejectionReason(''); }}
                                          >
                                            <XCircle className="w-3 h-3" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Reject submission</p></TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </>
                                )}
                                {submission.ph_approved && !submission.client_accepted && submission.status !== 'client_rejected' && (
                                  <>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            size="sm"
                                            className="bg-primary hover:bg-primary/90"
                                            onClick={() => handleClientAcceptance(submission.id)}
                                          >
                                            <ThumbsUp className="w-3 h-3 mr-1" />
                                            Client Accept
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Mark as client accepted (+{({logo:45,branding:50,uiux:65,web:65,print:20,flyer:30} as Record<string,number>)[submission.service_type] || 40} pts)</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                            onClick={() => { setClientRejectSubmission(submission); setClientRejectionReason(''); }}
                                          >
                                            <XCircle className="w-3 h-3 mr-1" />
                                            Client Reject
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Client rejected (PH points kept)</p></TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </>
                                )}
                                {submission.client_accepted && (
                                  <Badge className="bg-green-500 text-white font-semibold">
                                    <Award className="w-3 h-3 mr-1" />
                                    Complete
                                  </Badge>
                                )}
                                {submission.status === 'client_rejected' && (
                                  <div className="flex gap-1">
                                    <Badge variant="destructive" className="font-medium">Client Rejected</Badge>
                                    <Button size="sm" variant="outline" className="border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-white" onClick={() => handleRequestCorrection(submission)}>
                                      <Edit className="w-3 h-3 mr-1" />Correction
                                    </Button>
                                  </div>
                                )}
                                {submission.status === 'correction_requested' && (
                                  <Badge className="bg-amber-500/20 text-amber-500 font-medium">Correction Requested</Badge>
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
                    <p className="text-lg font-medium">No submissions found</p>
                    <p className="text-sm mt-2">Try changing your search or filter criteria</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="font-bold">User Management ({users.length})</CardTitle>
                    <CardDescription className="font-medium">Manage all platform users</CardDescription>
                  </div>
                  <div className="flex gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="Search users..."
                        className="pl-9 w-full sm:w-[250px]"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <Button variant="outline" onClick={() => exportData('users')}>
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredUsers.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="font-semibold">User</TableHead>
                          <TableHead className="font-semibold">Email</TableHead>
                          <TableHead className="font-semibold">Role</TableHead>
                          <TableHead className="font-semibold">Status</TableHead>
                          <TableHead className="font-semibold">Points</TableHead>
                          <TableHead className="font-semibold">Est. Salary</TableHead>
                          <TableHead className="font-semibold">Salary Status</TableHead>
                          <TableHead className="font-semibold">Payment Info</TableHead>
                          <TableHead className="font-semibold">Joined</TableHead>
                          <TableHead className="text-right font-semibold">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((userItem) => {
                          const paymentMethod = userItem.designer_details?.payment_method;
                          const paymentDetails = userItem.designer_details?.payment_details;
                          const getPaymentDisplay = () => {
                            if (!paymentMethod) return 'Not set';
                            const methodLabels: Record<string, string> = {
                              'mtn_momo': 'MTN MoMo',
                              'vodafone_cash': 'Vodafone Cash',
                              'airteltigo_money': 'AirtelTigo',
                              'bank_transfer': 'Bank Transfer',
                              'crypto': 'Crypto',
                              'paypal': 'PayPal',
                              'wise': 'Wise'
                            };
                            return methodLabels[paymentMethod] || paymentMethod;
                          };
                          const getPaymentDetailsDisplay = () => {
                            if (!paymentDetails) return null;
                            if (typeof paymentDetails === 'string') return paymentDetails;
                            if (typeof paymentDetails === 'object') {
                              if (paymentDetails.account) return paymentDetails.account;
                              if (paymentDetails.email) return paymentDetails.email;
                              return JSON.stringify(paymentDetails);
                            }
                            return String(paymentDetails);
                          };
                          return (
                          <TableRow key={userItem.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {userItem.designer_details?.profile_photo_url ? (
                                  <img 
                                    src={userItem.designer_details.profile_photo_url} 
                                    alt={userItem.full_name || 'User'} 
                                    className="w-8 h-8 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <span className="text-sm font-bold text-primary">
                                      {userItem.full_name?.charAt(0) || userItem.email.charAt(0)}
                                    </span>
                                  </div>
                                )}
                                <div>
                                  <p className="font-semibold">{userItem.full_name || 'No Name'}</p>
                                  <p className="text-xs text-muted-foreground font-medium">
                                    {userItem.designer_details?.professional_title || 'No title'}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{userItem.email}</TableCell>
                            <TableCell>
                              <Badge variant={
                                userItem.user_roles?.[0]?.role === 'masteradmin' ? 'default' :
                                userItem.user_roles?.[0]?.role === 'superadmin' ? 'secondary' :
                                'outline'
                              } className="font-medium">
                                {userItem.user_roles?.[0]?.role || 'designer'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={!userItem.is_active ? 'destructive' : userItem.registration_fee_paid ? 'default' : 'outline'} className="font-medium">
                                {!userItem.is_active ? 'Suspended' : userItem.registration_fee_paid ? 'Active' : 'Pending Payment'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="font-bold text-primary">{userItem.designer_details?.total_points || 0}</span>
                            </TableCell>
                            <TableCell>
                              <span className="font-semibold">GH₵{(userItem.designer_details?.salary_estimated || 0).toFixed(2)}</span>
                            </TableCell>
                            <TableCell>
                              {(() => {
                                const status = userItem.designer_details?.salary_payment_status || 'unpaid';
                                const isPaid = status === 'paid';
                                return (
                                  <div className="flex items-center gap-2">
                                    <Badge variant={isPaid ? 'default' : 'outline'} className={`font-medium ${isPaid ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}>
                                      {isPaid ? '✓ Paid' : 'Unpaid'}
                                    </Badge>
                                    {!isPaid && (userItem.designer_details?.salary_estimated || 0) > 0 && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs border-green-600 text-green-600 hover:bg-green-600 hover:text-white"
                                        onClick={() => handleMarkSalaryPaid(userItem)}
                                      >
                                        <Banknote className="w-3 h-3 mr-1" />
                                        Pay
                                      </Button>
                                    )}
                                    {isPaid && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 text-xs text-muted-foreground"
                                        onClick={() => handleResetSalaryStatus(userItem)}
                                      >
                                        Reset
                                      </Button>
                                    )}
                                  </div>
                                );
                              })()}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <p className="font-medium">{getPaymentDisplay()}</p>
                                {getPaymentDetailsDisplay() && (
                                  <p className="text-xs text-muted-foreground truncate max-w-[150px]" title={getPaymentDetailsDisplay() || ''}>
                                    {getPaymentDetailsDisplay()}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{format(new Date(userItem.created_at), 'MMM d, yyyy')}</TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Settings className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  {userItem.is_active ? (
                                    <DropdownMenuItem onClick={() => handleUserAction(userItem.id, 'suspend')}>
                                      Suspend User
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem onClick={() => handleUserAction(userItem.id, 'activate')}>
                                      Activate User
                                    </DropdownMenuItem>
                                  )}
                                  {userItem.user_roles?.[0]?.role === 'designer' && (
                                    <DropdownMenuItem onClick={() => handleUserAction(userItem.id, 'promote')}>
                                      Promote to Admin
                                    </DropdownMenuItem>
                                  )}
                                  {(userItem.user_roles?.[0]?.role === 'superadmin') && (
                                    <DropdownMenuItem onClick={() => handleUserAction(userItem.id, 'demote')}>
                                      Demote to Designer
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => setEditUser(userItem)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit All Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => { setGiftPointsUser(userItem); setGiftPointsAmount(''); setGiftPointsReason(''); }}>
                                    <Award className="w-4 h-4 mr-2" />
                                    Gift Points
                                  </DropdownMenuItem>
                                  {userItem.user_roles?.[0]?.role === 'designer' && userItem.id !== user?.id && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem 
                                        onClick={() => setDeleteConfirmUser(userItem)}
                                        className="text-destructive focus:text-destructive"
                                      >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete Designer
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No users found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="font-bold">Payment History ({payments.length})</CardTitle>
                    <CardDescription className="font-medium">All platform payments</CardDescription>
                  </div>
                  <Button variant="outline" onClick={() => exportData('payments')}>
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {payments.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="font-semibold">User</TableHead>
                          <TableHead className="font-semibold">Amount</TableHead>
                          <TableHead className="font-semibold">Type</TableHead>
                          <TableHead className="font-semibold">Status</TableHead>
                          <TableHead className="font-semibold">Transaction ID</TableHead>
                          <TableHead className="font-semibold">Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell className="font-semibold">{payment.user_name}</TableCell>
                            <TableCell className="font-bold">GH₵{payment.amount.toFixed(2)}</TableCell>
                            <TableCell><Badge variant="outline" className="font-medium">{payment.type}</Badge></TableCell>
                            <TableCell>
                              <Badge variant={payment.status === 'completed' ? 'default' : payment.status === 'pending' ? 'outline' : 'destructive'} className="font-medium">
                                {payment.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{payment.transaction_id}</TableCell>
                            <TableCell className="font-medium">{format(new Date(payment.created_at), 'MMM d, yyyy')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <DollarSign className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No payments found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Monthly Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <div className="flex justify-end mb-4">
              <Button onClick={handleGenerateSnapshot} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Generate Current Month Snapshot
              </Button>
            </div>
            <MonthlyReports />
          </TabsContent>

          {/* Testimonials Tab */}
          <TabsContent value="testimonials" className="space-y-6">
            <ManageTestimonials />
          </TabsContent>

          {/* Blog Tab */}
          <TabsContent value="blog" className="space-y-6">
            <ManageBlog />
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-bold">System Logs</CardTitle>
                <CardDescription className="font-medium">Recent system activity</CardDescription>
              </CardHeader>
              <CardContent>
                {systemLogs.length > 0 ? (
                  <div className="space-y-4">
                    {systemLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Activity className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{log.action_type}</p>
                          <p className="text-sm text-muted-foreground font-medium">{log.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Activity className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No logs yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Revenue Edit Modal - By Category */}
      <Dialog open={isRevenueModalOpen} onOpenChange={setIsRevenueModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-bold">Update Monthly Revenue</DialogTitle>
            <DialogDescription className="font-medium">
              Set revenue by category. Salaries are calculated from each designer's category-specific points.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="font-semibold">Graphic Design Revenue (GH₵)</Label>
              <Input type="number" placeholder="0.00" value={revenueByCategory.graphic} onChange={e => setRevenueByCategory(p => ({ ...p, graphic: e.target.value }))} step="0.01" min="0" />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">UI/UX Design Revenue (GH₵)</Label>
              <Input type="number" placeholder="0.00" value={revenueByCategory.uiux} onChange={e => setRevenueByCategory(p => ({ ...p, uiux: e.target.value }))} step="0.01" min="0" />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Web Development Revenue (GH₵)</Label>
              <Input type="number" placeholder="0.00" value={revenueByCategory.web} onChange={e => setRevenueByCategory(p => ({ ...p, web: e.target.value }))} step="0.01" min="0" />
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm font-medium text-muted-foreground">
                Total: <span className="text-foreground font-bold">GH₵{((parseFloat(revenueByCategory.graphic) || 0) + (parseFloat(revenueByCategory.uiux) || 0) + (parseFloat(revenueByCategory.web) || 0)).toFixed(2)}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Current: GH₵{(systemSettings.monthly_revenue?.amount || 0).toFixed(2)} · Share: {systemSettings.revenue_share_percentage?.value || 50}%
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRevenueModalOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateRevenue}>
              <Save className="w-4 h-4 mr-2" />
              Save Revenue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submission Files Preview Dialog */}
      <SubmissionFilesDialog
        open={!!viewFilesSubmission}
        onOpenChange={(open) => !open && setViewFilesSubmission(null)}
        submission={viewFilesSubmission}
      />

      {/* Delete Designer Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmUser} onOpenChange={(open) => !open && setDeleteConfirmUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 font-bold text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Delete Designer Permanently?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>You are about to permanently delete <strong>{deleteConfirmUser?.full_name || deleteConfirmUser?.email}</strong>.</p>
              <p className="text-destructive font-medium">This action cannot be undone. All associated data will be removed:</p>
              <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                <li>Profile information</li>
                <li>Designer details and points</li>
                <li>All work submissions</li>
                <li>Payment records</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmUser && handleDeleteDesigner(deleteConfirmUser)}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Permanently
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rejection Reason Dialog */}
      <Dialog open={!!rejectSubmission} onOpenChange={(open) => { if (!open) { setRejectSubmission(null); setRejectionReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Submission</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting "{rejectSubmission?.project_name}". This will be visible to the designer.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rejection-reason">Rejection Reason</Label>
            <Textarea
              id="rejection-reason"
              placeholder="Explain why this submission is being rejected..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="mt-2 min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectSubmission(null); setRejectionReason(''); }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRejectSubmission} disabled={!rejectionReason.trim()}>
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Client Rejection Reason Dialog */}
      <Dialog open={!!clientRejectSubmission} onOpenChange={(open) => { if (!open) { setClientRejectSubmission(null); setClientRejectionReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Client Rejection</DialogTitle>
            <DialogDescription>
              Provide a reason for the client rejecting "{clientRejectSubmission?.project_name}". PH approval points will be retained.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="client-rejection-reason">Rejection Reason</Label>
            <Textarea
              id="client-rejection-reason"
              placeholder="Explain why the client rejected this submission..."
              value={clientRejectionReason}
              onChange={(e) => setClientRejectionReason(e.target.value)}
              className="mt-2 min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setClientRejectSubmission(null); setClientRejectionReason(''); }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClientRejection} disabled={!clientRejectionReason.trim()}>
              <XCircle className="w-4 h-4 mr-2" />
              Client Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Gift Points Dialog */}
      <Dialog open={!!giftPointsUser} onOpenChange={(open) => { if (!open) { setGiftPointsUser(null); setGiftPointsAmount(''); setGiftPointsReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-bold">Gift Points</DialogTitle>
            <DialogDescription className="font-medium">
              Award bonus points to {giftPointsUser?.full_name || giftPointsUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="gift-points" className="font-semibold">Points Amount</Label>
              <Input
                id="gift-points"
                type="number"
                placeholder="Enter points to gift"
                value={giftPointsAmount}
                onChange={(e) => setGiftPointsAmount(e.target.value)}
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gift-reason" className="font-semibold">Reason (optional)</Label>
              <Textarea
                id="gift-reason"
                placeholder="e.g. Excellent performance, bonus for extra work..."
                value={giftPointsReason}
                onChange={(e) => setGiftPointsReason(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setGiftPointsUser(null); setGiftPointsAmount(''); setGiftPointsReason(''); }}>
              Cancel
            </Button>
            <Button onClick={handleGiftPoints} disabled={!giftPointsAmount || parseInt(giftPointsAmount) <= 0}>
              <Award className="w-4 h-4 mr-2" />
              Gift Points
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <EditUserDialog
        open={!!editUser}
        onOpenChange={(open) => !open && setEditUser(null)}
        user={editUser}
        currentAdminId={user?.id}
        onSaved={() => loadDashboardDataSafe()}
      />
    </div>
  );
};

export default SuperAdminDashboard;
