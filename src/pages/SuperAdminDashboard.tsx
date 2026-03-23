import { useState, useEffect, useCallback, useMemo } from 'react';
import BrandLogo from '@/components/BrandLogo';
import SuperAdminLayout from '@/components/admin/SuperAdminLayout';
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
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SubmissionFilesDialog } from '@/components/admin/SubmissionFilesDialog';
import { EditUserDialog } from '@/components/admin/EditUserDialog';
import ManageTestimonials from '@/components/admin/ManageTestimonials';
import ManageBlog from '@/components/admin/ManageBlog';
import AdsterraStats from '@/components/admin/AdsterraStats';
import ManageTeam from '@/components/admin/ManageTeam';
import { MonthlyReports } from '@/components/admin/MonthlyReports';
import PerformanceAnalytics from '@/components/admin/PerformanceAnalytics';
import ManageClientOrders from '@/components/admin/ManageClientOrders';
import ManageConsultations from '@/components/admin/ManageConsultations';
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
  rejection_reason?: string | null;
  design_link?: string | null;
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
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [correctionRequestSubmission, setCorrectionRequestSubmission] = useState<Submission | null>(null);
  const [correctionNote, setCorrectionNote] = useState('');
  const [giftPointsUser, setGiftPointsUser] = useState<User | null>(null);
  const [giftPointsAmount, setGiftPointsAmount] = useState('');
  const [giftPointsReason, setGiftPointsReason] = useState('');
  const [isResettingPoints, setIsResettingPoints] = useState(false);
  const [clientRejectSubmission, setClientRejectSubmission] = useState<Submission | null>(null);
  const [clientRejectionReason, setClientRejectionReason] = useState('');
  const [editUser, setEditUser] = useState<User | null>(null);
  const [isRecalculatingSalaries, setIsRecalculatingSalaries] = useState(false);
  const [submissionsPage, setSubmissionsPage] = useState(1);
  const [logsPage, setLogsPage] = useState(1);
  const [previewLinkUrl, setPreviewLinkUrl] = useState<string | null>(null);
  const ITEMS_PER_PAGE = 10;

  // Recalculate salaries standalone (without re-saving revenue)
  const handleRecalculateSalaries = async () => {
    try {
      setIsRecalculatingSalaries(true);

      // Load current revenue settings
      const { data: settingsData } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['monthly_revenue_by_category', 'revenue_share_percentage']);

      const settings: any = {};
      (settingsData || []).forEach((s: any) => { settings[s.key] = s.value; });

      const categoryRevenue = settings.monthly_revenue_by_category || { graphic: 0, uiux: 0, web: 0 };
      const graphicAmt = Number(categoryRevenue.graphic || 0);
      const uiuxAmt = Number(categoryRevenue.uiux || 0);
      const webAmt = Number(categoryRevenue.web || 0);
      const revenueShare = settings.revenue_share_percentage?.value || 50;
      const shareRatio = revenueShare / 100;
      const nowIso = new Date().toISOString();

      const { data: allDesigners } = await supabase
        .from('designer_details')
        .select('user_id, monthly_points');

      // Only fetch current month's approved submissions for salary calculation
      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { data: allSubmissions } = await supabase
        .from('submissions')
        .select('designer_id, service_type, points_awarded')
        .in('status', ['ph_approved', 'approved'])
        .gte('created_at', firstOfMonth);

      if (allDesigners && allSubmissions) {
        const graphicTypes = ['logo', 'branding', 'print', 'flyer'];
        const eligibleDesignerIds = new Set(
          allDesigners.filter((d: any) => Number(d.monthly_points || 0) > 0).map((d: any) => d.user_id)
        );

        const designerCategoryPoints: Record<string, { graphic: number; uiux: number; web: number }> = {};
        allDesigners.forEach((d: any) => {
          designerCategoryPoints[d.user_id] = { graphic: 0, uiux: 0, web: 0 };
        });

        allSubmissions.forEach((s: any) => {
          if (!eligibleDesignerIds.has(s.designer_id)) return;
          const pts = Number(s.points_awarded || 0);
          if (pts <= 0) return;
          if (graphicTypes.includes(s.service_type)) designerCategoryPoints[s.designer_id].graphic += pts;
          else if (s.service_type === 'uiux') designerCategoryPoints[s.designer_id].uiux += pts;
          else if (s.service_type === 'web') designerCategoryPoints[s.designer_id].web += pts;
        });

        const totals = Object.entries(designerCategoryPoints).reduce(
          (acc, [designerId, points]) => {
            if (!eligibleDesignerIds.has(designerId)) return acc;
            acc.graphic += points.graphic;
            acc.uiux += points.uiux;
            acc.web += points.web;
            return acc;
          },
          { graphic: 0, uiux: 0, web: 0 }
        );

        await Promise.all(
          allDesigners.map((designer: any) => {
            const monthlyPts = Number(designer.monthly_points || 0);
            if (monthlyPts <= 0) {
              return supabase.from('designer_details').update({ salary_estimated: 0, updated_at: nowIso }).eq('user_id', designer.user_id);
            }
            const dp = designerCategoryPoints[designer.user_id] || { graphic: 0, uiux: 0, web: 0 };
            if (dp.graphic <= 0 && dp.uiux <= 0 && dp.web <= 0) {
              return supabase.from('designer_details').update({ salary_estimated: 0, updated_at: nowIso }).eq('user_id', designer.user_id);
            }
            const graphicSalary = totals.graphic > 0 ? (dp.graphic / totals.graphic) * (graphicAmt * shareRatio) : 0;
            const uiuxSalary = totals.uiux > 0 ? (dp.uiux / totals.uiux) * (uiuxAmt * shareRatio) : 0;
            const webSalary = totals.web > 0 ? (dp.web / totals.web) * (webAmt * shareRatio) : 0;
            const totalSalary = graphicSalary + uiuxSalary + webSalary;
            const safeSalary = Number.isFinite(totalSalary) && totalSalary > 0 ? Number(totalSalary.toFixed(2)) : 0;
            return supabase.from('designer_details').update({ salary_estimated: safeSalary, updated_at: nowIso }).eq('user_id', designer.user_id);
          })
        );

        // Hard guard
        await supabase.from('designer_details').update({ salary_estimated: 0, updated_at: nowIso }).or('monthly_points.is.null,monthly_points.lte.0');
      }

      if (user) {
        await supabase.from('system_logs').insert({
          action_type: 'salary_recalculated',
          admin_id: user.id,
          description: 'Salaries recalculated from existing revenue data',
          timestamp: nowIso,
        });
      }

      toast({ title: 'Salaries Recalculated', description: 'All estimated salaries have been updated based on current revenue and points.' });
      await loadDashboardDataSafe();
    } catch (error: any) {
      console.error('Recalculate salaries error:', error);
      toast({ title: 'Recalculation Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsRecalculatingSalaries(false);
    }
  };

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
          parent_submission_id: s.parent_submission_id || null,
          rejection_reason: s.rejection_reason || null,
          design_link: s.design_link || null
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

      // Normalize logs with actor names
      const processedLogs: SystemLog[] = (logsData || []).map((l: any) => {
        const actor = profilesMap.get(l.admin_id);
        return {
          id: l.id,
          action_type: l.action_type || 'unknown',
          admin_id: l.admin_id,
          description: l.description || '',
          timestamp: l.timestamp,
          ip_address: l.ip_address || '',
          user_agent: l.user_agent || '',
          profiles: actor ? { full_name: actor.full_name } : undefined
        };
      });

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

  // Handle PH approval (NO points for corrections, normal points for regular submissions)
  const handlePHApproval = async (submissionId: string) => {
    try {
      const submission = submissions.find(s => s.id === submissionId);
      if (!submission) throw new Error('Submission not found');

      const isCorrection = !!submission.parent_submission_id;
      // Corrections get 0 PH points - only client acceptance awards points
      const phPoints = isCorrection ? 0 : (systemSettings.ph_approval_points?.value || 15);

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

      // Update designer's points (skip if 0 points for corrections)
      if (phPoints > 0) {
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
      const shareRatio = revenueShare / 100;
      const nowIso = new Date().toISOString();

      const { data: allDesigners } = await supabase
        .from('designer_details')
        .select('user_id, monthly_points');

      const { data: allSubmissions } = await supabase
        .from('submissions')
        .select('designer_id, service_type, points_awarded')
        .in('status', ['ph_approved', 'approved']);

      if (allDesigners && allSubmissions) {
        const graphicTypes = ['logo', 'branding', 'print', 'flyer'];

        // Only designers with monthly points > 0 are eligible for estimated salary
        const eligibleDesignerIds = new Set(
          allDesigners
            .filter((d: any) => Number(d.monthly_points || 0) > 0)
            .map((d: any) => d.user_id)
        );

        const designerCategoryPoints: Record<string, { graphic: number; uiux: number; web: number }> = {};
        allDesigners.forEach((d: any) => {
          designerCategoryPoints[d.user_id] = { graphic: 0, uiux: 0, web: 0 };
        });

        allSubmissions.forEach((s: any) => {
          if (!eligibleDesignerIds.has(s.designer_id)) return;

          const pts = Number(s.points_awarded || 0);
          if (pts <= 0) return;

          if (graphicTypes.includes(s.service_type)) designerCategoryPoints[s.designer_id].graphic += pts;
          else if (s.service_type === 'uiux') designerCategoryPoints[s.designer_id].uiux += pts;
          else if (s.service_type === 'web') designerCategoryPoints[s.designer_id].web += pts;
        });

        const totals = Object.entries(designerCategoryPoints).reduce(
          (acc, [designerId, points]) => {
            if (!eligibleDesignerIds.has(designerId)) return acc;
            acc.graphic += points.graphic;
            acc.uiux += points.uiux;
            acc.web += points.web;
            return acc;
          },
          { graphic: 0, uiux: 0, web: 0 }
        );

        await Promise.all(
          allDesigners.map((designer: any) => {
            const monthlyPts = Number(designer.monthly_points || 0);
            if (monthlyPts <= 0) {
              return supabase
                .from('designer_details')
                .update({ salary_estimated: 0, updated_at: nowIso })
                .eq('user_id', designer.user_id);
            }

            const dp = designerCategoryPoints[designer.user_id] || { graphic: 0, uiux: 0, web: 0 };
            const hasAnyCategoryPoints = dp.graphic > 0 || dp.uiux > 0 || dp.web > 0;

            if (!hasAnyCategoryPoints) {
              return supabase
                .from('designer_details')
                .update({ salary_estimated: 0, updated_at: nowIso })
                .eq('user_id', designer.user_id);
            }

            const graphicSalary = totals.graphic > 0 ? (dp.graphic / totals.graphic) * (graphicAmt * shareRatio) : 0;
            const uiuxSalary = totals.uiux > 0 ? (dp.uiux / totals.uiux) * (uiuxAmt * shareRatio) : 0;
            const webSalary = totals.web > 0 ? (dp.web / totals.web) * (webAmt * shareRatio) : 0;
            const totalSalary = graphicSalary + uiuxSalary + webSalary;
            const safeSalary = Number.isFinite(totalSalary) && totalSalary > 0 ? Number(totalSalary.toFixed(2)) : 0;

            return supabase
              .from('designer_details')
              .update({ salary_estimated: safeSalary, updated_at: nowIso })
              .eq('user_id', designer.user_id);
          })
        );

        // Hard guard: zero-point designers must always stay at zero salary
        await supabase
          .from('designer_details')
          .update({ salary_estimated: 0, updated_at: nowIso })
          .or('monthly_points.is.null,monthly_points.lte.0');
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

  // Handle correction request with note
  const handleRequestCorrectionWithNote = async () => {
    if (!correctionRequestSubmission) return;
    if (!correctionNote.trim()) {
      toast({ title: 'Note Required', description: 'Please provide a correction note for the designer.', variant: 'destructive' });
      return;
    }
    try {
      await supabase.from('submissions').update({ 
        status: 'correction_requested', 
        rejection_reason: correctionNote.trim(),
        updated_at: new Date().toISOString() 
      } as any).eq('id', correctionRequestSubmission.id);
      if (user) {
        await supabase.from('system_logs').insert({ action_type: 'correction_requested', admin_id: user.id, description: `Requested correction: ${correctionRequestSubmission.project_name} — Note: ${correctionNote.trim()}`, timestamp: new Date().toISOString() });
      }
      toast({ title: 'Correction Requested', description: 'The designer will be notified to submit corrections.' });
      setCorrectionRequestSubmission(null);
      setCorrectionNote('');
      await loadDashboardDataSafe();
    } catch (error: any) {
      toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    }
  };

  // Handle revoke submission — revoke all points and mark as rejected
  const handleRevokeSubmission = async (submissionId: string) => {
    try {
      const submission = submissions.find(s => s.id === submissionId);
      if (!submission) throw new Error('Submission not found');

      const pointsToRevoke = submission.points_awarded || 0;

      // Update submission to rejected with 0 points
      await supabase.from('submissions').update({
        status: 'rejected',
        points_awarded: 0,
        rejection_reason: 'Submission revoked by admin',
        updated_at: new Date().toISOString()
      } as any).eq('id', submissionId);

      // Deduct points from designer
      if (pointsToRevoke > 0) {
        const { data: designerData } = await supabase
          .from('designer_details')
          .select('total_points, monthly_points')
          .eq('user_id', submission.designer_id)
          .maybeSingle();

        if (designerData) {
          await supabase.from('designer_details').update({
            total_points: Math.max(0, (designerData.total_points || 0) - pointsToRevoke),
            monthly_points: Math.max(0, (designerData.monthly_points || 0) - pointsToRevoke),
            updated_at: new Date().toISOString()
          }).eq('user_id', submission.designer_id);
        }
      }

      if (user) {
        await supabase.from('system_logs').insert({
          action_type: 'submission_revoked',
          admin_id: user.id,
          description: `Revoked submission: ${submission.project_name} (−${pointsToRevoke} pts from ${submission.designer_name})`,
          timestamp: new Date().toISOString(),
        });
      }

      toast({ title: 'Submission Revoked', description: `${pointsToRevoke} points deducted. Submission marked as rejected.` });
      await loadDashboardDataSafe();
    } catch (error: any) {
      toast({ title: 'Revoke Failed', description: error.message, variant: 'destructive' });
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

  // Filtered data — reset page on filter change
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

  // Reset pagination when filters change
  useEffect(() => { setSubmissionsPage(1); }, [selectedStatus, searchQuery]);

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

  const activeTab = searchParams.get('tab') || 'submissions';

  return (
    <SuperAdminLayout onRefresh={loadDashboardDataSafe} loading={loading}>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Overview of your platform</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => {
              const cat = systemSettings.monthly_revenue_by_category || { graphic: 0, uiux: 0, web: 0 };
              setRevenueByCategory({ graphic: String(cat.graphic || ''), uiux: String(cat.uiux || ''), web: String(cat.web || '') });
              setIsRevenueModalOpen(true);
            }}>
              <DollarSign className="w-3.5 h-3.5" />
              Revenue
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleRecalculateSalaries} disabled={isRecalculatingSalaries}>
              {isRecalculatingSalaries ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Banknote className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Recalculate</span>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 text-amber-500 border-amber-500/30 hover:bg-amber-500/10" disabled={isResettingPoints}>
                  <RefreshCw className={`w-3.5 h-3.5 ${isResettingPoints ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Reset Points</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-amber-500">Reset All Points?</AlertDialogTitle>
                  <AlertDialogDescription>This will set all designer points and salaries to zero. Cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetAllPoints} className="bg-amber-500 hover:bg-amber-600">Reset</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            {
              label: 'Total Users',
              value: stats.totalUsers,
              sub: `${stats.totalDesigners} designers · ${stats.totalAdmins} admins`,
              icon: Users,
              color: 'text-primary',
              bg: 'bg-primary/10',
            },
            {
              label: 'Total Points',
              value: users.reduce((sum, u) => sum + (u.designer_details?.total_points || 0), 0).toLocaleString(),
              sub: `${users.reduce((sum, u) => sum + (u.designer_details?.monthly_points || 0), 0).toLocaleString()} this month`,
              icon: Award,
              color: 'text-purple-500',
              bg: 'bg-purple-500/10',
            },
            {
              label: 'Pending',
              value: stats.pendingSubmissions,
              sub: `${stats.activeProjects} active`,
              icon: FileCheck,
              color: 'text-blue-500',
              bg: 'bg-blue-500/10',
            },
            {
              label: 'Revenue',
              value: `GH₵${(systemSettings.monthly_revenue?.amount || 0).toFixed(0)}`,
              sub: systemSettings.monthly_revenue_by_category
                ? `G:${(systemSettings.monthly_revenue_by_category.graphic || 0).toFixed(0)} · UI:${(systemSettings.monthly_revenue_by_category.uiux || 0).toFixed(0)} · W:${(systemSettings.monthly_revenue_by_category.web || 0).toFixed(0)}`
                : 'Click Revenue to edit',
              icon: DollarSign,
              color: 'text-emerald-500',
              bg: 'bg-emerald-500/10',
            },
            {
              label: 'Approval Time',
              value: stats.avgApprovalTime > 0 ? `${stats.avgApprovalTime}h` : 'N/A',
              sub: 'Average',
              icon: Activity,
              color: 'text-amber-500',
              bg: 'bg-amber-500/10',
            },
          ].map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className={i === 4 ? 'col-span-2 lg:col-span-1' : ''}
            >
              <div className="rounded-xl border border-border/50 bg-card/80 p-4 hover:border-border transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{card.label}</span>
                  <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                    <card.icon className={`w-4 h-4 ${card.color}`} />
                  </div>
                </div>
                <div className="text-2xl font-bold tracking-tight">{card.value}</div>
                <p className="text-[11px] text-muted-foreground mt-1 truncate">{card.sub}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main Content - Tab driven */}
        <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v })} className="space-y-4">
          {/* ========== SUBMISSIONS TAB ========== */}
          <TabsContent value="submissions" className="mt-0 space-y-4">
            <div className="rounded-xl border border-border/50 bg-card/50">
              <div className="p-4 sm:p-5 border-b border-border/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold">Submissions</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">PH Check → Client Acceptance</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
                      <Input placeholder="Search..." className="pl-8 h-8 text-sm w-full sm:w-48" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger className="h-8 text-sm w-full sm:w-40">
                        <SelectValue placeholder="Filter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="ph_approved">Awaiting Client</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="client_rejected">Client Rejected</SelectItem>
                        <SelectItem value="correction_requested">Correction</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => exportData('submissions')}>
                      <Download className="w-3.5 h-3.5 mr-1" />Export
                    </Button>
                  </div>
                </div>
              </div>

              {filteredSubmissions.length > 0 ? (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-xs font-semibold">Project</TableHead>
                          <TableHead className="text-xs font-semibold">Designer</TableHead>
                          <TableHead className="text-xs font-semibold">Type</TableHead>
                          <TableHead className="text-xs font-semibold">PH</TableHead>
                          <TableHead className="text-xs font-semibold">Client</TableHead>
                          <TableHead className="text-xs font-semibold">Pts</TableHead>
                          <TableHead className="text-xs font-semibold">Date</TableHead>
                          <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSubmissions.slice((submissionsPage - 1) * ITEMS_PER_PAGE, submissionsPage * ITEMS_PER_PAGE).map((submission) => (
                          <TableRow key={submission.id} className="group">
                            <TableCell className="font-medium text-sm">
                              <div className="flex items-center gap-1.5">
                                {submission.project_name}
                                {submission.parent_submission_id && (
                                  <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/40 px-1 py-0">Fix</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm font-medium">{submission.designer_name}</div>
                              <div className="text-[11px] text-muted-foreground">{submission.designer_email}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] font-medium">{submission.service_type}</Badge>
                            </TableCell>
                            <TableCell>
                              {submission.ph_approved ? (
                                <span className="inline-flex items-center gap-1 text-emerald-500 text-xs font-medium"><CheckCircle className="w-3 h-3" />Yes</span>
                              ) : submission.status === 'rejected' ? (
                                <span className="text-destructive text-xs font-medium">No</span>
                              ) : (
                                <span className="text-amber-500 text-xs font-medium">Pending</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {submission.client_accepted ? (
                                <span className="inline-flex items-center gap-1 text-primary text-xs font-medium"><Star className="w-3 h-3" />Yes</span>
                              ) : submission.ph_approved ? (
                                <span className="text-blue-500 text-xs font-medium">Waiting</span>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="font-bold text-primary text-sm">{submission.points_awarded || 0}</span>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {format(new Date(submission.created_at), 'MMM d')}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end items-center gap-1">
                                {submission.design_link && (
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setPreviewLinkUrl(submission.design_link!)}>
                                    <Eye className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                                {submission.status !== 'rejected' && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                        <Settings className="w-3.5 h-3.5" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-52">
                                      <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                                      <DropdownMenuSeparator />
                                      {submission.files_urls?.length > 0 && (
                                        <DropdownMenuItem onClick={() => setViewFilesSubmission(submission)} className="text-xs">
                                          <ImageIcon className="w-3.5 h-3.5 mr-2" />View Files ({submission.files_urls.length})
                                        </DropdownMenuItem>
                                      )}
                                      {!submission.ph_approved && !submission.client_accepted && (
                                        <DropdownMenuItem onClick={() => handlePHApproval(submission.id)} className="text-xs text-emerald-500">
                                          <CheckCircle className="w-3.5 h-3.5 mr-2" />PH Approve (+{submission.parent_submission_id ? 0 : (systemSettings.ph_approval_points?.value || 15)} pts)
                                        </DropdownMenuItem>
                                      )}
                                      {submission.ph_approved && !submission.client_accepted && submission.status !== 'client_rejected' && (
                                        <DropdownMenuItem onClick={() => handleClientAcceptance(submission.id)} className="text-xs text-primary">
                                          <ThumbsUp className="w-3.5 h-3.5 mr-2" />Client Accept
                                        </DropdownMenuItem>
                                      )}
                                      {(submission.status === 'client_rejected' || (submission.ph_approved && !submission.client_accepted) || submission.status === 'correction_requested') && (
                                        <DropdownMenuItem onClick={() => { setCorrectionRequestSubmission(submission); setCorrectionNote(''); }} className="text-xs text-amber-500">
                                          <Edit className="w-3.5 h-3.5 mr-2" />Request Correction
                                        </DropdownMenuItem>
                                      )}
                                      {submission.ph_approved && !submission.client_accepted && submission.status !== 'client_rejected' && (
                                        <DropdownMenuItem onClick={() => { setClientRejectSubmission(submission); setClientRejectionReason(''); }} className="text-xs text-destructive">
                                          <XCircle className="w-3.5 h-3.5 mr-2" />Client Reject
                                        </DropdownMenuItem>
                                      )}
                                      {!submission.client_accepted && (
                                        <>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem onClick={() => { setRejectSubmission(submission); setRejectionReason(''); }} className="text-xs text-destructive">
                                            <Trash2 className="w-3.5 h-3.5 mr-2" />Reject
                                          </DropdownMenuItem>
                                        </>
                                      )}
                                      {(submission.points_awarded || 0) > 0 && (
                                        <>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem onClick={() => handleRevokeSubmission(submission.id)} className="text-xs text-destructive font-semibold">
                                            <AlertTriangle className="w-3.5 h-3.5 mr-2" />Revoke (−{submission.points_awarded} pts)
                                          </DropdownMenuItem>
                                        </>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden divide-y divide-border/30">
                    {filteredSubmissions.slice((submissionsPage - 1) * ITEMS_PER_PAGE, submissionsPage * ITEMS_PER_PAGE).map((submission) => (
                      <div key={submission.id} className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-semibold text-sm flex items-center gap-1.5">
                              {submission.project_name}
                              {submission.parent_submission_id && <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/40 px-1 py-0">Fix</Badge>}
                            </div>
                            <div className="text-xs text-muted-foreground">{submission.designer_name}</div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {submission.design_link && (
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setPreviewLinkUrl(submission.design_link!)}>
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            {submission.status !== 'rejected' && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Settings className="w-3.5 h-3.5" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  {submission.files_urls?.length > 0 && <DropdownMenuItem onClick={() => setViewFilesSubmission(submission)} className="text-xs"><ImageIcon className="w-3.5 h-3.5 mr-2" />View Files</DropdownMenuItem>}
                                  {!submission.ph_approved && !submission.client_accepted && <DropdownMenuItem onClick={() => handlePHApproval(submission.id)} className="text-xs text-emerald-500"><CheckCircle className="w-3.5 h-3.5 mr-2" />PH Approve</DropdownMenuItem>}
                                  {submission.ph_approved && !submission.client_accepted && submission.status !== 'client_rejected' && <DropdownMenuItem onClick={() => handleClientAcceptance(submission.id)} className="text-xs text-primary"><ThumbsUp className="w-3.5 h-3.5 mr-2" />Client Accept</DropdownMenuItem>}
                                  {!submission.client_accepted && <DropdownMenuItem onClick={() => { setRejectSubmission(submission); setRejectionReason(''); }} className="text-xs text-destructive"><Trash2 className="w-3.5 h-3.5 mr-2" />Reject</DropdownMenuItem>}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-[10px]">{submission.service_type}</Badge>
                          {submission.ph_approved ? (
                            <span className="text-emerald-500 text-[10px] font-medium">✓ PH</span>
                          ) : submission.status === 'rejected' ? (
                            <span className="text-destructive text-[10px] font-medium">Rejected</span>
                          ) : (
                            <span className="text-amber-500 text-[10px] font-medium">Pending</span>
                          )}
                          {submission.client_accepted && <span className="text-primary text-[10px] font-medium">✓ Client</span>}
                          <span className="text-primary font-bold text-xs ml-auto">{submission.points_awarded || 0} pts</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {filteredSubmissions.length > ITEMS_PER_PAGE && (
                    <div className="flex items-center justify-between p-4 border-t border-border/50">
                      <p className="text-[11px] text-muted-foreground">
                        {(submissionsPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(submissionsPage * ITEMS_PER_PAGE, filteredSubmissions.length)} of {filteredSubmissions.length}
                      </p>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setSubmissionsPage(p => Math.max(1, p - 1))} disabled={submissionsPage === 1}>Prev</Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setSubmissionsPage(p => Math.min(Math.ceil(filteredSubmissions.length / ITEMS_PER_PAGE), p + 1))} disabled={submissionsPage >= Math.ceil(filteredSubmissions.length / ITEMS_PER_PAGE)}>Next</Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-16 text-muted-foreground">
                  <FileCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No submissions found</p>
                  <p className="text-xs mt-1">Try changing your filters</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ========== USERS TAB ========== */}
          <TabsContent value="users" className="mt-0 space-y-4">
            <div className="rounded-xl border border-border/50 bg-card/50">
              <div className="p-4 sm:p-5 border-b border-border/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold">Users ({users.length})</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Manage platform users</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
                      <Input placeholder="Search users..." className="pl-8 h-8 text-sm w-full sm:w-48" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => exportData('users')}>
                      <Download className="w-3.5 h-3.5 mr-1" />Export
                    </Button>
                  </div>
                </div>
              </div>

              {filteredUsers.length > 0 ? (
                <>
                  {/* Desktop Table */}
                  <div className="hidden lg:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-xs font-semibold">User</TableHead>
                          <TableHead className="text-xs font-semibold">Role</TableHead>
                          <TableHead className="text-xs font-semibold">Status</TableHead>
                          <TableHead className="text-xs font-semibold">Points</TableHead>
                          <TableHead className="text-xs font-semibold">Salary</TableHead>
                          <TableHead className="text-xs font-semibold">Paid</TableHead>
                          <TableHead className="text-xs font-semibold">Payment</TableHead>
                          <TableHead className="text-xs font-semibold">Joined</TableHead>
                          <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((userItem) => {
                          const paymentMethod = userItem.designer_details?.payment_method;
                          const paymentDetails = userItem.designer_details?.payment_details;
                          const methodLabels: Record<string, string> = { 'mtn_momo': 'MTN MoMo', 'vodafone_cash': 'Vodafone', 'airteltigo_money': 'AirtelTigo', 'bank_transfer': 'Bank', 'crypto': 'Crypto', 'paypal': 'PayPal', 'wise': 'Wise' };
                          const payDisplay = paymentMethod ? (methodLabels[paymentMethod] || paymentMethod) : '—';
                          const detailDisplay = paymentDetails ? (typeof paymentDetails === 'object' ? (paymentDetails as any).account || (paymentDetails as any).email || '' : String(paymentDetails)) : '';
                          const salaryStatus = userItem.designer_details?.salary_payment_status || 'unpaid';
                          const isPaid = salaryStatus === 'paid';

                          return (
                            <TableRow key={userItem.id}>
                              <TableCell>
                                <div className="flex items-center gap-2.5">
                                  {userItem.designer_details?.profile_photo_url ? (
                                    <img src={userItem.designer_details.profile_photo_url} alt="" className="w-7 h-7 rounded-lg object-cover" />
                                  ) : (
                                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                                      {(userItem.full_name || userItem.email).charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <div className="text-sm font-medium truncate max-w-[140px]">{userItem.full_name || 'No Name'}</div>
                                    <div className="text-[11px] text-muted-foreground truncate max-w-[140px]">{userItem.email}</div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px]">{userItem.user_roles?.[0]?.role || 'designer'}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={!userItem.is_active ? 'destructive' : userItem.registration_fee_paid ? 'default' : 'outline'} className="text-[10px]">
                                  {!userItem.is_active ? 'Suspended' : userItem.registration_fee_paid ? 'Active' : 'Pending'}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-bold text-primary text-sm">{userItem.designer_details?.total_points || 0}</TableCell>
                              <TableCell className="text-sm font-medium">GH₵{(userItem.designer_details?.salary_estimated || 0).toFixed(2)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <Badge variant={isPaid ? 'default' : 'outline'} className={`text-[10px] ${isPaid ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}>
                                    {isPaid ? '✓ Paid' : 'Unpaid'}
                                  </Badge>
                                  {!isPaid && (userItem.designer_details?.salary_estimated || 0) > 0 && (
                                    <Button size="sm" variant="ghost" className="h-6 text-[10px] text-emerald-500 px-1.5" onClick={() => handleMarkSalaryPaid(userItem)}>Pay</Button>
                                  )}
                                  {isPaid && (
                                    <Button size="sm" variant="ghost" className="h-6 text-[10px] text-muted-foreground px-1.5" onClick={() => handleResetSalaryStatus(userItem)}>Reset</Button>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-xs">{payDisplay}</div>
                                {detailDisplay && <div className="text-[10px] text-muted-foreground truncate max-w-[100px]">{detailDisplay}</div>}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">{format(new Date(userItem.created_at), 'MMM d, yy')}</TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Settings className="w-3.5 h-3.5" /></Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-44">
                                    <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {userItem.is_active ? (
                                      <DropdownMenuItem onClick={() => handleUserAction(userItem.id, 'suspend')} className="text-xs">Suspend</DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem onClick={() => handleUserAction(userItem.id, 'activate')} className="text-xs">Activate</DropdownMenuItem>
                                    )}
                                    {userItem.user_roles?.[0]?.role === 'designer' && (
                                      <DropdownMenuItem onClick={() => handleUserAction(userItem.id, 'promote')} className="text-xs">Promote</DropdownMenuItem>
                                    )}
                                    {userItem.user_roles?.[0]?.role === 'superadmin' && (
                                      <DropdownMenuItem onClick={() => handleUserAction(userItem.id, 'demote')} className="text-xs">Demote</DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setEditUser(userItem)} className="text-xs"><Edit className="w-3 h-3 mr-2" />Edit</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => { setGiftPointsUser(userItem); setGiftPointsAmount(''); setGiftPointsReason(''); }} className="text-xs"><Award className="w-3 h-3 mr-2" />Gift Points</DropdownMenuItem>
                                    {userItem.user_roles?.[0]?.role === 'designer' && userItem.id !== user?.id && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => setDeleteConfirmUser(userItem)} className="text-xs text-destructive"><Trash2 className="w-3 h-3 mr-2" />Delete</DropdownMenuItem>
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

                  {/* Mobile Cards */}
                  <div className="lg:hidden divide-y divide-border/30">
                    {filteredUsers.map((userItem) => {
                      const isPaid = (userItem.designer_details?.salary_payment_status || 'unpaid') === 'paid';
                      return (
                        <div key={userItem.id} className="p-4 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              {userItem.designer_details?.profile_photo_url ? (
                                <img src={userItem.designer_details.profile_photo_url} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                                  {(userItem.full_name || userItem.email).charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="text-sm font-semibold truncate">{userItem.full_name || 'No Name'}</div>
                                <div className="text-[11px] text-muted-foreground truncate">{userItem.email}</div>
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0"><Settings className="w-3.5 h-3.5" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem onClick={() => setEditUser(userItem)} className="text-xs"><Edit className="w-3 h-3 mr-2" />Edit</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setGiftPointsUser(userItem); setGiftPointsAmount(''); setGiftPointsReason(''); }} className="text-xs"><Award className="w-3 h-3 mr-2" />Gift Points</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap text-[11px]">
                            <Badge variant="outline" className="text-[10px]">{userItem.user_roles?.[0]?.role || 'designer'}</Badge>
                            <span className="text-primary font-bold">{userItem.designer_details?.total_points || 0} pts</span>
                            <span className="font-medium">GH₵{(userItem.designer_details?.salary_estimated || 0).toFixed(2)}</span>
                            <Badge variant={isPaid ? 'default' : 'outline'} className={`text-[10px] ${isPaid ? 'bg-emerald-600' : ''}`}>{isPaid ? '✓ Paid' : 'Unpaid'}</Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="text-center py-16 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No users found</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ========== PAYMENTS TAB ========== */}
          <TabsContent value="payments" className="mt-0 space-y-4">
            <div className="rounded-xl border border-border/50 bg-card/50">
              <div className="p-4 sm:p-5 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold">Payments ({payments.length})</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">All platform payments</p>
                </div>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => exportData('payments')}>
                  <Download className="w-3.5 h-3.5 mr-1" />Export
                </Button>
              </div>

              {payments.length > 0 ? (
                <>
                  <div className="hidden sm:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-xs font-semibold">User</TableHead>
                          <TableHead className="text-xs font-semibold">Amount</TableHead>
                          <TableHead className="text-xs font-semibold">Type</TableHead>
                          <TableHead className="text-xs font-semibold">Status</TableHead>
                          <TableHead className="text-xs font-semibold">Transaction</TableHead>
                          <TableHead className="text-xs font-semibold">Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell className="text-sm font-medium">{payment.user_name}</TableCell>
                            <TableCell className="text-sm font-bold">GH₵{payment.amount.toFixed(2)}</TableCell>
                            <TableCell><Badge variant="outline" className="text-[10px]">{payment.type}</Badge></TableCell>
                            <TableCell>
                              <Badge variant={payment.status === 'completed' ? 'default' : 'outline'} className="text-[10px]">{payment.status}</Badge>
                            </TableCell>
                            <TableCell className="font-mono text-[11px] text-muted-foreground">{payment.transaction_id}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{format(new Date(payment.created_at), 'MMM d, yy')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="sm:hidden divide-y divide-border/30">
                    {payments.map((payment) => (
                      <div key={payment.id} className="p-4 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold">{payment.user_name}</div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">{payment.type}</Badge>
                            <span>{format(new Date(payment.created_at), 'MMM d')}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold">GH₵{payment.amount.toFixed(2)}</div>
                          <Badge variant={payment.status === 'completed' ? 'default' : 'outline'} className="text-[10px]">{payment.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-16 text-muted-foreground">
                  <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No payments yet</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ========== REPORTS ========== */}
          <TabsContent value="reports" className="mt-0 space-y-4">
            <div className="flex justify-end">
              <Button onClick={handleGenerateSnapshot} variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                <Download className="w-3.5 h-3.5" />Generate Snapshot
              </Button>
            </div>
            <MonthlyReports />
          </TabsContent>

          {/* ========== TESTIMONIALS ========== */}
          <TabsContent value="testimonials" className="mt-0"><ManageTestimonials /></TabsContent>

          {/* ========== BLOG ========== */}
          <TabsContent value="blog" className="mt-0"><ManageBlog /></TabsContent>

          {/* ========== AD REVENUE ========== */}
          <TabsContent value="adsterra" className="mt-0"><AdsterraStats /></TabsContent>

          {/* ========== ANALYTICS ========== */}
          <TabsContent value="analytics" className="mt-0"><PerformanceAnalytics /></TabsContent>

          {/* ========== CLIENT ORDERS ========== */}
          <TabsContent value="orders" className="mt-0"><ManageClientOrders /></TabsContent>

          {/* ========== CONSULTATIONS ========== */}
          <TabsContent value="consultations" className="mt-0"><ManageConsultations /></TabsContent>

          {/* ========== TEAM ========== */}
          <TabsContent value="team" className="mt-0"><ManageTeam /></TabsContent>

          {/* ========== LOGS ========== */}
          <TabsContent value="logs" className="mt-0 space-y-4">
            <div className="rounded-xl border border-border/50 bg-card/50">
              <div className="p-4 sm:p-5 border-b border-border/50">
                <h2 className="text-base font-bold">System Logs ({systemLogs.length})</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Admin actions and system events</p>
              </div>

              {systemLogs.length > 0 ? (
                <>
                  <div className="hidden sm:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-xs font-semibold">Action</TableHead>
                          <TableHead className="text-xs font-semibold">Actor</TableHead>
                          <TableHead className="text-xs font-semibold">Description</TableHead>
                          <TableHead className="text-xs font-semibold">Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {systemLogs.slice((logsPage - 1) * ITEMS_PER_PAGE, logsPage * ITEMS_PER_PAGE).map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px]">{log.action_type.replace(/_/g, ' ')}</Badge>
                            </TableCell>
                            <TableCell className="text-sm font-medium">{log.profiles?.full_name || 'System'}</TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">{log.description}</TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(log.timestamp), 'MMM d, HH:mm')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="sm:hidden divide-y divide-border/30">
                    {systemLogs.slice((logsPage - 1) * ITEMS_PER_PAGE, logsPage * ITEMS_PER_PAGE).map((log) => (
                      <div key={log.id} className="p-4 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="outline" className="text-[10px]">{log.action_type.replace(/_/g, ' ')}</Badge>
                          <span className="text-[10px] text-muted-foreground">{format(new Date(log.timestamp), 'MMM d, HH:mm')}</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{log.description}</p>
                        <p className="text-[11px] font-medium">{log.profiles?.full_name || 'System'}</p>
                      </div>
                    ))}
                  </div>
                  {systemLogs.length > ITEMS_PER_PAGE && (
                    <div className="flex items-center justify-between p-4 border-t border-border/50">
                      <p className="text-[11px] text-muted-foreground">
                        {(logsPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(logsPage * ITEMS_PER_PAGE, systemLogs.length)} of {systemLogs.length}
                      </p>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setLogsPage(p => Math.max(1, p - 1))} disabled={logsPage === 1}>Prev</Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setLogsPage(p => Math.min(Math.ceil(systemLogs.length / ITEMS_PER_PAGE), p + 1))} disabled={logsPage >= Math.ceil(systemLogs.length / ITEMS_PER_PAGE)}>Next</Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-16 text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No logs yet</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ========== DIALOGS ========== */}
      {/* Revenue Modal */}
      <Dialog open={isRevenueModalOpen} onOpenChange={setIsRevenueModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Revenue</DialogTitle>
            <DialogDescription className="text-xs">Set revenue by category. Salaries auto-recalculate.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <div><Label className="text-xs font-medium">Graphic Design (GH₵)</Label><Input type="number" placeholder="0.00" value={revenueByCategory.graphic} onChange={e => setRevenueByCategory(p => ({ ...p, graphic: e.target.value }))} className="mt-1 h-9" /></div>
            <div><Label className="text-xs font-medium">UI/UX Design (GH₵)</Label><Input type="number" placeholder="0.00" value={revenueByCategory.uiux} onChange={e => setRevenueByCategory(p => ({ ...p, uiux: e.target.value }))} className="mt-1 h-9" /></div>
            <div><Label className="text-xs font-medium">Web Development (GH₵)</Label><Input type="number" placeholder="0.00" value={revenueByCategory.web} onChange={e => setRevenueByCategory(p => ({ ...p, web: e.target.value }))} className="mt-1 h-9" /></div>
            <div className="p-3 rounded-lg bg-muted/50 text-xs">
              <span className="text-muted-foreground">Total: </span>
              <span className="font-bold">GH₵{((parseFloat(revenueByCategory.graphic) || 0) + (parseFloat(revenueByCategory.uiux) || 0) + (parseFloat(revenueByCategory.web) || 0)).toFixed(2)}</span>
              <span className="text-muted-foreground ml-2">· Share: {systemSettings.revenue_share_percentage?.value || 50}%</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsRevenueModalOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleUpdateRevenue}><Save className="w-3.5 h-3.5 mr-1.5" />Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SubmissionFilesDialog open={!!viewFilesSubmission} onOpenChange={(open) => !open && setViewFilesSubmission(null)} submission={viewFilesSubmission} />

      <AlertDialog open={!!deleteConfirmUser} onOpenChange={(open) => !open && setDeleteConfirmUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Delete Designer?</AlertDialogTitle>
            <AlertDialogDescription>Permanently delete <strong>{deleteConfirmUser?.full_name || deleteConfirmUser?.email}</strong> and all their data. Cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirmUser && handleDeleteDesigner(deleteConfirmUser)} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Deleting...</> : <><Trash2 className="w-3.5 h-3.5 mr-1.5" />Delete</>}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!rejectSubmission} onOpenChange={(open) => { if (!open) { setRejectSubmission(null); setRejectionReason(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Submission</DialogTitle>
            <DialogDescription className="text-xs">Provide a reason for rejecting "{rejectSubmission?.project_name}"</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Reason..." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} className="min-h-[80px]" />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setRejectSubmission(null); setRejectionReason(''); }}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={handleRejectSubmission} disabled={!rejectionReason.trim()}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!clientRejectSubmission} onOpenChange={(open) => { if (!open) { setClientRejectSubmission(null); setClientRejectionReason(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Client Rejection</DialogTitle>
            <DialogDescription className="text-xs">PH points retained for "{clientRejectSubmission?.project_name}"</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Reason..." value={clientRejectionReason} onChange={(e) => setClientRejectionReason(e.target.value)} className="min-h-[80px]" />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setClientRejectSubmission(null)}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={handleClientRejection} disabled={!clientRejectionReason.trim()}>Client Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!correctionRequestSubmission} onOpenChange={(open) => { if (!open) { setCorrectionRequestSubmission(null); setCorrectionNote(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Correction</DialogTitle>
            <DialogDescription className="text-xs">Instructions for "{correctionRequestSubmission?.project_name}"</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="What needs fixing..." value={correctionNote} onChange={(e) => setCorrectionNote(e.target.value)} className="min-h-[80px]" />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCorrectionRequestSubmission(null)}>Cancel</Button>
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={handleRequestCorrectionWithNote} disabled={!correctionNote.trim()}>
              <Edit className="w-3.5 h-3.5 mr-1.5" />Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!giftPointsUser} onOpenChange={(open) => { if (!open) { setGiftPointsUser(null); setGiftPointsAmount(''); setGiftPointsReason(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gift Points</DialogTitle>
            <DialogDescription className="text-xs">Award bonus to {giftPointsUser?.full_name || giftPointsUser?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Points</Label><Input type="number" placeholder="Amount" value={giftPointsAmount} onChange={(e) => setGiftPointsAmount(e.target.value)} min="1" className="mt-1 h-9" /></div>
            <div><Label className="text-xs">Reason (optional)</Label><Textarea placeholder="e.g. Excellent work..." value={giftPointsReason} onChange={(e) => setGiftPointsReason(e.target.value)} className="mt-1 min-h-[60px]" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setGiftPointsUser(null)}>Cancel</Button>
            <Button size="sm" onClick={handleGiftPoints} disabled={!giftPointsAmount || parseInt(giftPointsAmount) <= 0}><Award className="w-3.5 h-3.5 mr-1.5" />Gift</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EditUserDialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)} user={editUser} currentAdminId={user?.id} onSaved={() => loadDashboardDataSafe()} />

      {/* Link Preview */}
      <Dialog open={!!previewLinkUrl} onOpenChange={(open) => !open && setPreviewLinkUrl(null)}>
        <DialogContent className="max-w-5xl h-[80vh] p-0 flex flex-col">
          <DialogHeader className="px-4 pt-4 pb-2 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="text-sm truncate max-w-md">{previewLinkUrl}</DialogTitle>
              <Button size="sm" variant="outline" className="text-xs shrink-0" onClick={() => window.open(previewLinkUrl!, '_blank')}>Open Tab</Button>
            </div>
          </DialogHeader>
          <div className="flex-1 px-4 pb-4">
            <iframe src={previewLinkUrl || ''} className="w-full h-full rounded-lg border border-border" sandbox="allow-scripts allow-same-origin allow-popups allow-forms" title="Preview" />
          </div>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
};

export default SuperAdminDashboard;
