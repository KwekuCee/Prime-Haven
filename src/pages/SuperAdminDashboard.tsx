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
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  MoreVertical,
  Download,
  BarChart3,
  UserCheck,
  AlertCircle,
  Clock,
  Award,
  Calendar,
  ChevronRight,
  RefreshCw,
  MessageSquare,
  UserPlus,
  Activity,
  PieChart,
  LineChart,
  DownloadCloud,
  Printer,
  Mail,
  Bell,
  UserX,
  Edit,
  Trash2,
  Lock,
  Unlock,
  Star,
  Crown,
  Building,
  Briefcase,
  CreditCard,
  Smartphone,
  Globe,
  Database,
  Server,
  Cpu,
  Zap,
  Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
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
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'suspend' | 'activate' | 'promote' | 'demote' | null>(null);

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
          .select(`
            id,
            designer_id,
            project_name,
            service_type,
            status,
            points_awarded,
            created_at,
            updated_at,
            final_approval_date,
            client_ref,
            files_urls,
            profiles!submissions_designer_id_fkey(full_name, email)
          `)
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
            description,
            metadata,
            profiles!payments_user_id_fkey(full_name)
          `)
          .order('created_at', { ascending: false }),

        supabase
          .from('system_logs')
          .select(`
            id,
            action_type,
            admin_id,
            description,
            timestamp,
            ip_address,
            user_agent,
            profiles!system_logs_admin_id_fkey(full_name)
          `)
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

      // Normalize submissions
      const processedSubmissions: Submission[] = (submissionsData || []).map((s: any) => ({
        id: s.id,
        designer_id: s.designer_id,
        project_name: s.project_name || 'Untitled',
        service_type: s.service_type || 'unknown',
        status: s.status || 'pending',
        points_awarded: s.points_awarded || 0,
        created_at: s.created_at,
        updated_at: s.updated_at,
        final_approval_date: s.final_approval_date,
        designer_name: s.profiles?.full_name || 'Unknown',
        designer_email: s.profiles?.email || 'No email',
        client_ref: s.client_ref || '',
        files_urls: s.files_urls || []
      }));

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
      const pendingSubmissions = processedSubmissions.filter(s => s.status === 'pending').length;
      const approvedSubmissions = processedSubmissions.filter(s => s.status === 'approved').length;
      const totalSubmissions = processedSubmissions.length;
      const completedPayments = processedPayments.filter(p => p.status === 'completed');
      const totalRevenue = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0) / 100;
      const conversionRate = totalSubmissions > 0 ? (approvedSubmissions / totalSubmissions) * 100 : 0;

      // average approval time
      let avgApprovalTime = 0;
      const approvedWithDates = processedSubmissions.filter(s => s.status === 'approved' && s.final_approval_date && s.created_at);
      if (approvedWithDates.length > 0) {
        const totalHours = approvedWithDates.reduce((sum, sub) => {
          const created = new Date(sub.created_at).getTime();
          const approved = new Date(sub.final_approval_date).getTime();
          return sum + ((approved - created) / (1000 * 60 * 60));
        }, 0);
        avgApprovalTime = Math.round(totalHours / approvedWithDates.length);
      }

      setStats({
        totalUsers,
        totalDesigners,
        totalAdmins,
        pendingSubmissions,
        totalRevenue,
        activeProjects: pendingSubmissions + approvedSubmissions,
        conversionRate: Math.round(conversionRate),
        avgApprovalTime: avgApprovalTime || 0
      });

    } catch (error: any) {
      console.error('Error loading dashboard data (safe):', error);
      toast({ title: 'Load Error', description: error.message || 'Could not load dashboard data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // ✅ Check if user is authenticated as admin via Supabase Auth
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
        // Check user's role in the database
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
        
        // Load dashboard data
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

  // ✅ Fetch real data from Supabase (Alternative loader)
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      await loadDashboardDataSafe();
      toast({
        title: "Data Refreshed",
        description: "Dashboard data has been updated.",
      });
    } catch (error: any) {
      console.error('Error in loadDashboardData:', error);
      toast({
        title: "Refresh Failed",
        description: "Could not refresh data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [loadDashboardDataSafe, toast]);

  // Filtered data
  const filteredSubmissions = useMemo(() => {
    let filtered = submissions;
    
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(s => s.status === selectedStatus);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.project_name.toLowerCase().includes(query) ||
        s.designer_name.toLowerCase().includes(query) ||
        s.service_type.toLowerCase().includes(query) ||
        (s.client_ref && s.client_ref.toLowerCase().includes(query))
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
        u.email.toLowerCase().includes(query) ||
        (u.phone && u.phone.toLowerCase().includes(query)) ||
        (u.designer_details?.professional_title && u.designer_details.professional_title.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  }, [users, searchQuery]);

  // Handle submission actions
  const handleSubmissionAction = async (submissionId: string, action: 'approve' | 'reject', points: number = 15) => {
    try {
      const submission = submissions.find(s => s.id === submissionId);
      if (!submission) throw new Error('Submission not found');

      const updateData: any = {
        status: action,
        updated_at: new Date().toISOString()
      };

      if (action === 'approve') {
        updateData.points_awarded = points;
        updateData.final_approval_date = new Date().toISOString();
        
        // Update designer's points in designer_details table
        const { data: designerData } = await supabase
          .from('designer_details')
          .select('total_points, monthly_points')
          .eq('user_id', submission.designer_id)
          .maybeSingle();

        if (designerData) {
          const newTotalPoints = (designerData.total_points || 0) + points;
          const newMonthlyPoints = (designerData.monthly_points || 0) + points;
          
          await supabase
            .from('designer_details')
            .update({
              total_points: newTotalPoints,
              monthly_points: newMonthlyPoints,
              salary_estimated: newTotalPoints * 0.35
            })
            .eq('user_id', submission.designer_id);
        } else {
          // Create designer details if they don't exist
          await supabase
            .from('designer_details')
            .insert({
              user_id: submission.designer_id,
              total_points: points,
              monthly_points: points,
              salary_estimated: points * 0.35
            });
        }
      }

      // Update submission status
      const { error: updateError } = await supabase
        .from('submissions')
        .update(updateData)
        .eq('id', submissionId);

      if (updateError) throw updateError;

      // Log the action to system_logs using actual user ID
      if (user) {
        await supabase
          .from('system_logs')
          .insert({
            action_type: `submission_${action}`,
            admin_id: user.id,
            description: `${action.charAt(0).toUpperCase() + action.slice(1)} submission: ${submission.project_name} (${points} points)`,
            timestamp: new Date().toISOString(),
          });
      }

      toast({
        title: `Submission ${action}d`,
        description: `The submission has been ${action}d successfully${action === 'approve' ? ` with ${points} points` : ''}.`,
      });

      // Refresh data
      await loadDashboardDataSafe();

    } catch (error: any) {
      console.error('Action error:', error);
      toast({
        title: "Action failed",
        description: error.message || "Please try again.",
        variant: "destructive",
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
          // Check if user already has a role
          const { data: existingRole } = await supabase
            .from('user_roles')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

          if (existingRole) {
            // Update existing role
            await supabase
              .from('user_roles')
              .update({ role: 'superadmin' })
              .eq('user_id', userId);
          } else {
            // Insert new role
            await supabase
              .from('user_roles')
              .insert({ 
                user_id: userId, 
                role: 'superadmin',
                created_at: new Date().toISOString()
              });
          }
          description = `Promoted user to admin: ${targetUser.full_name || targetUser.email}`;
          break;
        case 'demote':
          // Update user role to designer
          await supabase
            .from('user_roles')
            .update({ role: 'designer' })
            .eq('user_id', userId);
          description = `Demoted admin to designer: ${targetUser.full_name || targetUser.email}`;
          break;
      }

      if (Object.keys(updateData).length > 0) {
        // Update user profile
        await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', userId);
      }

      // Log the action using actual user ID
      if (user) {
        await supabase
          .from('system_logs')
          .insert({
            action_type: `user_${action}`,
            admin_id: user.id,
            description,
            timestamp: new Date().toISOString(),
          });
      }

      toast({
        title: "Action completed",
        description: `User ${action}d successfully.`,
      });

      // Refresh data
      await loadDashboardDataSafe();

    } catch (error: any) {
      console.error('User action error:', error);
      toast({
        title: "Action failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
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
          'Estimated Salary': u.designer_details?.salary_estimated || 0,
          'Joined Date': format(new Date(u.created_at), 'yyyy-MM-dd HH:mm'),
          'Last Updated': format(new Date(u.updated_at), 'yyyy-MM-dd HH:mm')
        }));
        filename = `primehaven-users-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        break;
      case 'submissions':
        data = submissions.map(s => ({
          ID: s.id,
          'Project Name': s.project_name,
          Designer: s.designer_name,
          'Designer Email': s.designer_email,
          'Service Type': s.service_type,
          Status: s.status,
          'Points Awarded': s.points_awarded || 0,
          'Client Reference': s.client_ref || 'N/A',
          'Submitted Date': format(new Date(s.created_at), 'yyyy-MM-dd HH:mm'),
          'Last Updated': format(new Date(s.updated_at), 'yyyy-MM-dd HH:mm'),
          'Approval Date': s.final_approval_date ? format(new Date(s.final_approval_date), 'yyyy-MM-dd HH:mm') : 'N/A'
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
          Description: p.description,
          'Payment Date': format(new Date(p.created_at), 'yyyy-MM-dd HH:mm')
        }));
        filename = `primehaven-payments-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        break;
    }

    // Convert to CSV
    const headers = Object.keys(data[0] || {});
    const csvRows = [
      headers.join(','),
      ...data.map(row => headers.map(header => JSON.stringify(row[header], (key, value) => 
        value === null ? '' : value
      )).join(','))
    ];
    const csvString = csvRows.join('\n');

    // Download
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    toast({
      title: "Data exported",
      description: `${filename} has been downloaded.`,
    });
  };

  // Handle logout using Supabase Auth
  const handleLogout = async () => {
    await signOut();
    toast({
      title: "Logged out",
      description: "You have been logged out.",
    });
    navigate('/login');
  };

  // Get admin display name from authenticated user
  const getAdminDisplayName = () => {
    if (user) {
      // Get profile data if available
      const currentProfile = users.find(u => u.id === user.id);
      return currentProfile?.full_name || user.email || 'Admin';
    }
    return 'Admin';
  };

  const adminDisplayName = getAdminDisplayName();

  // Show loading during initial auth check or data loading
  if (initialAuthCheck || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">
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
                    <Badge variant="secondary" className="text-xs">
                      <Shield className="w-3 h-3 mr-1" />
                      Super Admin
                    </Badge>
                  </h1>
                  <p className="text-sm text-muted-foreground">Complete platform administration</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => loadDashboardDataSafe()}
                        disabled={loading}
                      >
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Refresh data</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">{(adminDisplayName.charAt(0) || 'A').toUpperCase()}</span>
                    </div>
                    <div className="text-left hidden md:block">
                      <p className="text-sm font-medium">Super Admin</p>
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
                  <DropdownMenuItem onClick={() => navigate('/superadmin-login')}>
                    <Settings className="w-4 h-4 mr-2" />
                    Re-authenticate
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
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  {stats.totalDesigners} designers
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {stats.totalAdmins} admins
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Pending Work</CardTitle>
                <FileCheck className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingSubmissions}</div>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  {stats.activeProjects} active projects
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">GH₵{stats.totalRevenue.toFixed(2)}</div>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  Conversion: {stats.conversionRate}%
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-l-4 border-l-amber-500">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgApprovalTime > 0 ? `${stats.avgApprovalTime}h` : 'N/A'}</div>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  Avg. approval time
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="submissions" className="gap-2">
              <FileCheck className="w-4 h-4" />
              Submissions
              {stats.pendingSubmissions > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs">
                  {stats.pendingSubmissions}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-2">
              <CreditCard className="w-4 h-4" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <LineChart className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quick Actions */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common administrative tasks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={loadDashboardData}>
                      <RefreshCw className="w-6 h-6" />
                      <span>Refresh Data</span>
                    </Button>
                    <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => exportData('users')}>
                      <DownloadCloud className="w-6 h-6" />
                      <span>Export Users</span>
                    </Button>
                    <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate('/dashboard')}>
                      <UserCheck className="w-6 h-6" />
                      <span>User View</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Recent System Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest system actions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {systemLogs.length > 0 ? (
                      systemLogs.slice(0, 5).map((log) => (
                        <div key={log.id} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Activity className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{log.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(log.timestamp), 'MMM d, HH:mm')}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        <p>No recent activity</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Submissions */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Submissions ({submissions.length})</CardTitle>
                <CardDescription>Latest work submissions</CardDescription>
              </CardHeader>
              <CardContent>
                {submissions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Project</TableHead>
                        <TableHead>Designer</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {submissions.slice(0, 5).map((submission) => (
                        <TableRow key={submission.id}>
                          <TableCell className="font-medium">{submission.project_name}</TableCell>
                          <TableCell>{submission.designer_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{submission.service_type}</Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(submission.created_at), 'MMM d, HH:mm')}
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              submission.status === 'approved' ? 'default' :
                              submission.status === 'pending' ? 'outline' :
                              'destructive'
                            }>
                              {submission.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSubmissionAction(submission.id, 'approve', 15)}
                                disabled={submission.status === 'approved'}
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSubmissionAction(submission.id, 'reject')}
                                disabled={submission.status === 'rejected'}
                              >
                                <XCircle className="w-3 h-3 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No submissions yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Submissions Tab */}
          <TabsContent value="submissions" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Work Submissions ({submissions.length})</CardTitle>
                    <CardDescription>Review and approve designer submissions</CardDescription>
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
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
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
                          <TableHead>ID</TableHead>
                          <TableHead>Project</TableHead>
                          <TableHead>Designer</TableHead>
                          <TableHead>Service</TableHead>
                          <TableHead>Points</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Submitted</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSubmissions.map((submission) => (
                          <TableRow key={submission.id}>
                            <TableCell className="font-mono text-xs">
                              {submission.id.substring(0, 8)}...
                            </TableCell>
                            <TableCell className="font-medium">{submission.project_name}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{submission.designer_name}</p>
                                <p className="text-xs text-muted-foreground">{submission.designer_email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{submission.service_type}</Badge>
                            </TableCell>
                            <TableCell>
                              {submission.points_awarded || 0}
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                submission.status === 'approved' ? 'default' :
                                submission.status === 'pending' ? 'outline' :
                                'destructive'
                              }>
                                {submission.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {format(new Date(submission.created_at), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleSubmissionAction(submission.id, 'approve', 15)}
                                        disabled={submission.status === 'approved'}
                                      >
                                        <CheckCircle className="w-3 h-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Approve (15 points)</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleSubmissionAction(submission.id, 'reject')}
                                        disabled={submission.status === 'rejected'}
                                      >
                                        <XCircle className="w-3 h-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Reject submission</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
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
                    <p className="text-lg">No submissions found</p>
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
                    <CardTitle>User Management ({users.length})</CardTitle>
                    <CardDescription>Manage all platform users</CardDescription>
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
                      Export Users
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
                          <TableHead>ID</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Points</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((userItem) => (
                          <TableRow key={userItem.id}>
                            <TableCell className="font-mono text-xs">
                              {userItem.id.substring(0, 8)}...
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="text-sm font-medium text-primary">
                                    {userItem.full_name?.charAt(0) || userItem.email.charAt(0)}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium">{userItem.full_name || 'No Name'}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {userItem.designer_details?.professional_title || 'No title'}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{userItem.email}</TableCell>
                            <TableCell>{userItem.phone || 'No phone'}</TableCell>
                            <TableCell>
                              <Badge variant={
                                userItem.user_roles?.[0]?.role === 'masteradmin' ? 'default' :
                                userItem.user_roles?.[0]?.role === 'superadmin' ? 'secondary' :
                                'outline'
                              }>
                                {userItem.user_roles?.[0]?.role || 'designer'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                !userItem.is_active ? 'destructive' :
                                userItem.registration_fee_paid ? 'default' : 
                                'outline'
                              }>
                                {!userItem.is_active ? 'Suspended' :
                                 userItem.registration_fee_paid ? 'Active' : 
                                 'Pending Payment'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {userItem.designer_details?.total_points || 0}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  ({userItem.designer_details?.monthly_points || 0} this month)
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {format(new Date(userItem.created_at), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedUser(userItem);
                                    setIsViewModalOpen(true);
                                  }}
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  View
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedUser(userItem);
                                    setActionType(userItem.is_active ? 'suspend' : 'activate');
                                    setIsActionModalOpen(true);
                                  }}
                                >
                                  {userItem.is_active ? (
                                    <>
                                      <UserX className="w-3 h-3 mr-1" />
                                      Suspend
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="w-3 h-3 mr-1" />
                                      Activate
                                    </>
                                  )}
                                </Button>
                                {userItem.user_roles?.[0]?.role === 'superadmin' ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedUser(userItem);
                                      setActionType('demote');
                                      setIsActionModalOpen(true);
                                    }}
                                  >
                                    <Lock className="w-3 h-3 mr-1" />
                                    Demote
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedUser(userItem);
                                      setActionType('promote');
                                      setIsActionModalOpen(true);
                                    }}
                                  >
                                    <Unlock className="w-3 h-3 mr-1" />
                                    Promote
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
                    <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">No users found</p>
                    <p className="text-sm mt-2">Try changing your search criteria</p>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <div className="flex items-center justify-between w-full">
                  <div className="text-sm text-muted-foreground">
                    Showing {filteredUsers.length} of {users.length} users
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-xs">
                      Active: {users.filter(u => u.is_active).length}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Paid: {users.filter(u => u.registration_fee_paid).length}
                    </Badge>
                  </div>
                </div>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Payment Management ({payments.length})</CardTitle>
                    <CardDescription>Track and manage all payments</CardDescription>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => exportData('payments')}>
                      <Download className="w-4 h-4 mr-2" />
                      Export Payments
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Total Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">GH₵{stats.totalRevenue.toFixed(2)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Pending Payments</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {payments.filter(p => p.status === 'pending').length}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Completed Payments</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {payments.filter(p => p.status === 'completed').length}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {payments.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Transaction ID</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell className="font-mono text-xs">
                              {payment.transaction_id?.substring(0, 12) || 'N/A'}
                            </TableCell>
                            <TableCell>{payment.user_name}</TableCell>
                            <TableCell>GH₵{(payment.amount / 100).toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{payment.type}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                payment.status === 'completed' ? 'default' :
                                payment.status === 'pending' ? 'outline' :
                                'destructive'
                              }>
                                {payment.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {format(new Date(payment.created_at), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="outline">
                                <Eye className="w-3 h-3 mr-1" />
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <CreditCard className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">No payments recorded yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                  <CardDescription>Platform performance overview</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Submission Approval Rate</Label>
                      <span className="text-sm font-medium">{stats.conversionRate}%</span>
                    </div>
                    <Progress value={stats.conversionRate} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>User Activation Rate</Label>
                      <span className="text-sm font-medium">
                        {users.length > 0 ? Math.round((users.filter(u => u.registration_fee_paid).length / users.length) * 100) : 0}%
                      </span>
                    </div>
                    <Progress value={users.length > 0 ? (users.filter(u => u.registration_fee_paid).length / users.length) * 100 : 0} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Payment Success Rate</Label>
                      <span className="text-sm font-medium">
                        {payments.length > 0 ? Math.round((payments.filter(p => p.status === 'completed').length / payments.length) * 100) : 0}%
                      </span>
                    </div>
                    <Progress value={payments.length > 0 ? (payments.filter(p => p.status === 'completed').length / payments.length) * 100 : 0} />
                  </div>
                </CardContent>
              </Card>

              {/* System Logs */}
              <Card>
                <CardHeader>
                  <CardTitle>System Logs</CardTitle>
                  <CardDescription>Recent administrative actions</CardDescription>
                </CardHeader>
                <CardContent>
                  {systemLogs.length > 0 ? (
                    <div className="space-y-4">
                      {systemLogs.map((log) => (
                        <div key={log.id} className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            log.action_type.includes('approve') ? 'bg-green-500/10 text-green-500' :
                            log.action_type.includes('reject') ? 'bg-red-500/10 text-red-500' :
                            log.action_type.includes('promote') ? 'bg-blue-500/10 text-blue-500' :
                            log.action_type.includes('demote') ? 'bg-amber-500/10 text-amber-500' :
                            'bg-amber-500/10 text-amber-500'
                          }`}>
                            {log.action_type.includes('approve') ? <CheckCircle className="w-4 h-4" /> :
                             log.action_type.includes('reject') ? <XCircle className="w-4 h-4" /> :
                             log.action_type.includes('promote') ? <UserPlus className="w-4 h-4" /> :
                             log.action_type.includes('demote') ? <Lock className="w-4 h-4" /> :
                             <AlertCircle className="w-4 h-4" />}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{log.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {log.profiles?.full_name ? `By ${log.profiles.full_name}` : 'System'} • {format(new Date(log.timestamp), 'MMM d, HH:mm')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No system logs available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Monthly Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Platform Overview</CardTitle>
                <CardDescription>Current platform statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">New Users (30 days)</p>
                    <p className="text-2xl font-bold">
                      {users.filter(u => 
                        new Date(u.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                      ).length}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Submissions (30 days)</p>
                    <p className="text-2xl font-bold">
                      {submissions.filter(s => 
                        new Date(s.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                      ).length}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Revenue (30 days)</p>
                    <p className="text-2xl font-bold">
                      GH₵{payments
                        .filter(p => 
                          p.status === 'completed' && 
                          new Date(p.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                        )
                        .reduce((sum, p) => sum + (p.amount / 100), 0)
                        .toFixed(2)}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Active Designers</p>
                    <p className="text-2xl font-bold">
                      {users.filter(u => 
                        (u.user_roles?.some((r: any) => r.role === 'designer') || u.user_roles?.length === 0) && 
                        u.registration_fee_paid &&
                        u.is_active
                      ).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Action Confirmation Modal */}
      <Dialog open={isActionModalOpen} onOpenChange={setIsActionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' && 'Approve Submission'}
              {actionType === 'reject' && 'Reject Submission'}
              {actionType === 'suspend' && 'Suspend User'}
              {actionType === 'activate' && 'Activate User'}
              {actionType === 'promote' && 'Promote User'}
              {actionType === 'demote' && 'Demote User'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve' && 'Are you sure you want to approve this submission?'}
              {actionType === 'reject' && 'Are you sure you want to reject this submission?'}
              {actionType === 'suspend' && 'Are you sure you want to suspend this user?'}
              {actionType === 'activate' && 'Are you sure you want to activate this user?'}
              {actionType === 'promote' && 'Are you sure you want to promote this user to admin?'}
              {actionType === 'demote' && 'Are you sure you want to demote this admin to designer?'}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (actionType === 'suspend' || actionType === 'activate' || actionType === 'promote' || actionType === 'demote') && (
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">
                    {selectedUser.full_name?.charAt(0) || selectedUser.email.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{selectedUser.full_name || 'No Name'}</p>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Role: {selectedUser.user_roles?.[0]?.role || 'designer'} • 
                    Status: {selectedUser.is_active ? 'Active' : 'Suspended'}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsActionModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={
                actionType === 'reject' || actionType === 'suspend' || actionType === 'demote' ? 'destructive' : 'default'
              }
              onClick={async () => {
                if (selectedUser && actionType) {
                  if (actionType === 'promote') {
                    await handleUserAction(selectedUser.id, 'promote');
                  } else if (actionType === 'demote') {
                    await handleUserAction(selectedUser.id, 'demote');
                  } else if (actionType === 'suspend') {
                    await handleUserAction(selectedUser.id, 'suspend');
                  } else if (actionType === 'activate') {
                    await handleUserAction(selectedUser.id, 'activate');
                  }
                  setIsActionModalOpen(false);
                }
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View User Details Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              Complete user information and activity
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-6">
              {/* User Info */}
              <Card>
                <CardHeader>
                  <CardTitle>User Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Full Name</Label>
                      <p className="font-medium">{selectedUser.full_name || 'Not set'}</p>
                    </div>
                    <div>
                      <Label>Email</Label>
                      <p className="font-medium">{selectedUser.email}</p>
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <p className="font-medium">{selectedUser.phone || 'Not set'}</p>
                    </div>
                    <div>
                      <Label>User ID</Label>
                      <p className="font-mono text-xs">{selectedUser.id}</p>
                    </div>
                    <div>
                      <Label>Account Status</Label>
                      <Badge variant={selectedUser.is_active ? 'default' : 'destructive'}>
                        {selectedUser.is_active ? 'Active' : 'Suspended'}
                      </Badge>
                    </div>
                    <div>
                      <Label>Registration Fee</Label>
                      <Badge variant={selectedUser.registration_fee_paid ? 'default' : 'outline'}>
                        {selectedUser.registration_fee_paid ? 'Paid' : 'Pending'}
                      </Badge>
                    </div>
                  </div>
                  
                  {selectedUser.designer_details && (
                    <>
                      <Separator />
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Professional Title</Label>
                          <p className="font-medium">{selectedUser.designer_details.professional_title || 'Not set'}</p>
                        </div>
                        <div>
                          <Label>Experience Level</Label>
                          <p className="font-medium">{selectedUser.designer_details.experience_level || 'Not set'}</p>
                        </div>
                        <div>
                          <Label>Total Points</Label>
                          <p className="font-medium">{selectedUser.designer_details.total_points || 0}</p>
                        </div>
                        <div>
                          <Label>Monthly Points</Label>
                          <p className="font-medium">{selectedUser.designer_details.monthly_points || 0}</p>
                        </div>
                        <div>
                          <Label>Payment Method</Label>
                          <p className="font-medium">{selectedUser.designer_details.payment_method || 'Not set'}</p>
                        </div>
                        <div>
                          <Label>Portfolio URL</Label>
                          <p className="font-medium truncate">
                            {selectedUser.designer_details.portfolio_url ? (
                              <a 
                                href={selectedUser.designer_details.portfolio_url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-primary hover:underline"
                              >
                                {selectedUser.designer_details.portfolio_url}
                              </a>
                            ) : 'Not set'}
                          </p>
                        </div>
                      </div>
                      
                      {selectedUser.designer_details.skills && selectedUser.designer_details.skills.length > 0 && (
                        <div>
                          <Label>Skills ({selectedUser.designer_details.skills.length})</Label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {selectedUser.designer_details.skills.map((skill, index) => (
                              <Badge key={index} variant="outline">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* User's Submissions */}
              <Card>
                <CardHeader>
                  <CardTitle>User Submissions ({submissions.filter(s => s.designer_id === selectedUser.id).length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {submissions.filter(s => s.designer_id === selectedUser.id).length > 0 ? (
                    <div className="space-y-2">
                      {submissions.filter(s => s.designer_id === selectedUser.id).slice(0, 5).map(sub => (
                        <div key={sub.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{sub.project_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {sub.service_type} • {format(new Date(sub.created_at), 'MMM d, yyyy')}
                            </p>
                          </div>
                          <Badge variant={sub.status === 'approved' ? 'default' : sub.status === 'pending' ? 'outline' : 'destructive'}>
                            {sub.status} ({sub.points_awarded || 0} points)
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No submissions yet</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setIsViewModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <div className="border-t border-border mt-8 py-6">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Prime Haven. Super Admin Dashboard v1.0
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Last updated: {format(new Date(), 'MMM d, yyyy HH:mm')}</span>
              <Badge variant="outline">
                <Server className="w-3 h-3 mr-1" />
                Connected to Database
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;