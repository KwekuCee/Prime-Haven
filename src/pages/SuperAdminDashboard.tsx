import { useState, useEffect, useCallback, useMemo } from 'react';
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
  Save
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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
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
}

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
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

      const [
        { data: usersData, error: usersError },
        { data: submissionsData, error: submissionsError },
        { data: paymentsData, error: paymentsError },
        { data: logsData, error: logsError }
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select(`
            id,
            email,
            full_name,
            phone,
            registration_fee_paid,
            is_active,
            created_at,
            updated_at,
            designer_details(*),
            user_roles(role)
          `)
          .order('created_at', { ascending: false }),

        supabase
          .from('submissions')
          .select('*')
          .order('created_at', { ascending: false }),

        supabase
          .from('payments')
          .select(`
            id,
            user_id,
            amount,
            type,
            status,
            transaction_id,
            created_at,
            profiles!payments_user_id_fkey(full_name)
          `)
          .order('created_at', { ascending: false }),

        supabase
          .from('system_logs')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(50)
      ]);

      if (usersError) throw usersError;
      if (submissionsError) throw submissionsError;
      if (paymentsError) throw paymentsError;

      // Normalize users
      const processedUsers: User[] = (usersData || []).map((u: any) => ({
        id: u.id,
        email: u.email || '',
        full_name: u.full_name || '',
        phone: u.phone || '',
        registration_fee_paid: u.registration_fee_paid || false,
        is_active: typeof u.is_active === 'boolean' ? u.is_active : true,
        created_at: u.created_at,
        updated_at: u.updated_at,
        designer_details: Array.isArray(u.designer_details) ? u.designer_details[0] : u.designer_details || undefined,
        user_roles: Array.isArray(u.user_roles) ? u.user_roles : (u.user_roles ? [u.user_roles] : [])
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
          client_accepted_at: s.client_accepted_at
        };
      });

      // Normalize payments
      const processedPayments: Payment[] = (paymentsData || []).map((p: any) => ({
        id: p.id,
        user_id: p.user_id,
        amount: p.amount || 0,
        type: p.type || 'registration',
        status: p.status || 'pending',
        transaction_id: p.transaction_id || 'N/A',
        created_at: p.created_at,
        user_name: p.profiles?.full_name || 'Unknown',
        description: p.description || '',
        metadata: p.metadata || {}
      }));

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
      const totalRevenue = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0) / 100;
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
  }, [toast, loadSystemSettings, systemSettings.monthly_revenue?.amount]);

  // Check admin access
  useEffect(() => {
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
  }, [user, navigate, toast, loadDashboardDataSafe]);

  // Handle PH approval (15 points)
  const handlePHApproval = async (submissionId: string) => {
    try {
      const submission = submissions.find(s => s.id === submissionId);
      if (!submission) throw new Error('Submission not found');

      const phPoints = systemSettings.ph_approval_points?.value || 15;

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

      const clientPoints = systemSettings.client_acceptance_points?.value || 40;

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

  // Handle rejection
  const handleRejectSubmission = async (submissionId: string) => {
    try {
      const submission = submissions.find(s => s.id === submissionId);
      if (!submission) throw new Error('Submission not found');

      const { error: updateError } = await supabase
        .from('submissions')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', submissionId);

      if (updateError) throw updateError;

      if (user) {
        await supabase.from('system_logs').insert({
          action_type: 'submission_rejected',
          admin_id: user.id,
          description: `Rejected submission: ${submission.project_name}`,
          timestamp: new Date().toISOString(),
        });
      }

      toast({
        title: 'Submission Rejected',
        description: 'The submission has been rejected.',
      });

      await loadDashboardDataSafe();

    } catch (error: any) {
      console.error('Rejection error:', error);
      toast({
        title: 'Rejection Failed',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Update monthly revenue
  const handleUpdateRevenue = async () => {
    try {
      const amount = parseFloat(revenueInput);
      if (isNaN(amount) || amount < 0) {
        toast({
          title: 'Invalid Amount',
          description: 'Please enter a valid revenue amount.',
          variant: 'destructive',
        });
        return;
      }

      const currentDate = new Date();
      const revenueData = {
        amount,
        currency: 'GHS',
        month: currentDate.getMonth() + 1,
        year: currentDate.getFullYear()
      };

      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'monthly_revenue',
          value: revenueData,
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        }, { onConflict: 'key' });

      if (error) throw error;

      // Log the action
      if (user) {
        await supabase.from('system_logs').insert({
          action_type: 'revenue_updated',
          admin_id: user.id,
          description: `Updated monthly revenue to GH₵${amount.toFixed(2)}`,
          timestamp: new Date().toISOString(),
        });
      }

      setSystemSettings(prev => ({
        ...prev,
        monthly_revenue: revenueData
      }));

      toast({
        title: 'Revenue Updated',
        description: `Monthly revenue set to GH₵${amount.toFixed(2)}`,
      });

      setIsRevenueModalOpen(false);
      setRevenueInput('');
      await loadDashboardDataSafe();

    } catch (error: any) {
      console.error('Revenue update error:', error);
      toast({
        title: 'Update Failed',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
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
          Amount: `GH₵${(p.amount / 100).toFixed(2)}`,
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
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                  <Crown className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
                    Prime Haven
                    <Badge variant="secondary" className="text-xs font-semibold">
                      <Shield className="w-3 h-3 mr-1" />
                      Super Admin
                    </Badge>
                  </h1>
                  <p className="text-sm text-muted-foreground font-medium">Complete platform administration</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
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
                  <Button variant="ghost" className="gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">{(adminDisplayName.charAt(0) || 'A').toUpperCase()}</span>
                    </div>
                    <div className="text-left hidden md:block">
                      <p className="text-sm font-semibold">Super Admin</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[120px]">{adminDisplayName}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 ml-2" />
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
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="glass border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs font-medium">{stats.totalDesigners} designers</Badge>
                <Badge variant="outline" className="text-xs font-medium">{stats.totalAdmins} admins</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Pending Work</CardTitle>
                <FileCheck className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingSubmissions}</div>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs font-medium">{stats.activeProjects} active projects</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-l-4 border-l-green-500 cursor-pointer hover:border-green-400 transition-colors" onClick={() => setIsRevenueModalOpen(true)}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Monthly Revenue</CardTitle>
                <div className="flex items-center gap-1">
                  <Edit className="h-3 w-3 text-muted-foreground" />
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">GH₵{(systemSettings.monthly_revenue?.amount || 0).toFixed(2)}</div>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs font-medium">Click to edit</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-l-4 border-l-amber-500">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Approval Time</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgApprovalTime > 0 ? `${stats.avgApprovalTime}h` : 'N/A'}</div>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs font-medium">Avg. approval time</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="submissions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
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
                    <CardDescription className="font-medium">Two-level approval: PH Check (+{systemSettings.ph_approval_points?.value || 15} pts) → Client Acceptance (+{systemSettings.client_acceptance_points?.value || 40} pts)</CardDescription>
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
                            <TableCell className="font-semibold">{submission.project_name}</TableCell>
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
                                            onClick={() => handleRejectSubmission(submission.id)}
                                          >
                                            <XCircle className="w-3 h-3" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Reject submission</p></TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </>
                                )}
                                {submission.ph_approved && !submission.client_accepted && (
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
                                        <p>Mark as client accepted (+{systemSettings.client_acceptance_points?.value || 40} pts)</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                                {submission.client_accepted && (
                                  <Badge className="bg-green-500 text-white font-semibold">
                                    <Award className="w-3 h-3 mr-1" />
                                    Complete
                                  </Badge>
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
                          <TableHead className="font-semibold">Joined</TableHead>
                          <TableHead className="text-right font-semibold">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((userItem) => (
                          <TableRow key={userItem.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="text-sm font-bold text-primary">
                                    {userItem.full_name?.charAt(0) || userItem.email.charAt(0)}
                                  </span>
                                </div>
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
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
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
                            <TableCell className="font-bold">GH₵{(payment.amount / 100).toFixed(2)}</TableCell>
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

      {/* Revenue Edit Modal */}
      <Dialog open={isRevenueModalOpen} onOpenChange={setIsRevenueModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-bold">Update Monthly Revenue</DialogTitle>
            <DialogDescription className="font-medium">
              Set the total revenue for this month. This will be used to calculate designer salaries.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="revenue" className="font-semibold">Revenue Amount (GH₵)</Label>
              <Input
                id="revenue"
                type="number"
                placeholder="Enter revenue amount"
                value={revenueInput}
                onChange={(e) => setRevenueInput(e.target.value)}
                step="0.01"
                min="0"
              />
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm font-medium text-muted-foreground">
                Current revenue: <span className="text-foreground font-bold">GH₵{(systemSettings.monthly_revenue?.amount || 0).toFixed(2)}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Designer share: {systemSettings.revenue_share_percentage?.value || 50}% of revenue
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
    </div>
  );
};

export default SuperAdminDashboard;
