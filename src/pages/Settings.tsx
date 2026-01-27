import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Settings as SettingsIcon,
  Bell,
  Lock,
  User,
  Globe,
  Moon,
  Sun,
  Shield,
  Mail,
  Smartphone,
  Trash2,
  Download,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const Settings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [userProfile, setUserProfile] = useState<any>(null);

  // Notification settings
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    projectUpdates: true,
    paymentAlerts: true,
    marketingEmails: false,
    pushNotifications: true,
  });

  // Privacy settings
  const [privacy, setPrivacy] = useState({
    profileVisibility: 'public',
    showEarnings: false,
    allowMessages: true,
    dataSharing: false,
  });

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;

      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profileData) {
          setUserProfile(profileData);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
  }, [user]);

  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handlePrivacyChange = (key: keyof typeof privacy, value: any) => {
    setPrivacy(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveSettings = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // In a real app, you would save these to your database
      // For now, we'll just simulate saving
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: "Settings saved!",
        description: "Your preferences have been updated.",
      });

    } catch (error) {
      toast({
        title: "Save failed",
        description: "Could not save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      // Fetch all user data
      const [profileData, designerData, submissionsData, paymentsData] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user?.id).maybeSingle(),
        supabase.from('designer_details').select('*').eq('user_id', user?.id).maybeSingle(),
        supabase.from('submissions').select('*').eq('designer_id', user?.id),
        supabase.from('payments').select('*').eq('user_id', user?.id),
      ]);

      const exportData = {
        profile: profileData.data,
        designer_details: designerData.data,
        submissions: submissionsData.data,
        payments: paymentsData.data,
        exported_at: new Date().toISOString(),
      };

      // Create and download JSON file
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileName = `primehaven-data-${new Date().getTime()}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileName);
      linkElement.click();

      toast({
        title: "Data exported!",
        description: "Your data has been downloaded as JSON.",
      });

    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: "Export failed",
        description: "Could not export data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      toast({
        title: "Account deletion requested",
        description: "Please contact support@primehaven.com to proceed with account deletion.",
        variant: "destructive",
      });
    }
  };

  const handleChangePassword = () => {
    navigate('/reset-password');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/dashboard')}
                className="hover:bg-secondary"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-heading font-bold">Settings</h1>
                <p className="text-sm text-muted-foreground">
                  Manage your account preferences and privacy
                </p>
              </div>
            </div>
            <Badge variant="outline">
              {userProfile?.email?.split('@')[0] || 'User'}
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Settings */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Account Settings */}
            <Card className="glass">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-primary" />
                  <div>
                    <CardTitle>Account Settings</CardTitle>
                    <CardDescription>
                      Manage your account information
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <div className="p-3 rounded-lg bg-card border border-border">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{user?.email || 'Not set'}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Contact support to change email
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <div className="p-3 rounded-lg bg-card border border-border">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{userProfile?.phone || 'Not set'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Two-Factor Authentication</Label>
                      <p className="text-sm text-muted-foreground">
                        Add an extra layer of security
                      </p>
                    </div>
                    <Badge variant="outline" className="text-amber-500">
                      Coming Soon
                    </Badge>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={handleChangePassword}
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Change Password
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card className="glass">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-primary" />
                  <div>
                    <CardTitle>Notification Settings</CardTitle>
                    <CardDescription>
                      Choose what notifications you receive
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(notifications).map(([key, value]) => {
                  const labelMap: Record<string, string> = {
                    emailNotifications: 'Email Notifications',
                    projectUpdates: 'Project Updates',
                    paymentAlerts: 'Payment Alerts',
                    marketingEmails: 'Marketing Emails',
                    pushNotifications: 'Push Notifications',
                  };

                  const descriptionMap: Record<string, string> = {
                    emailNotifications: 'Receive updates via email',
                    projectUpdates: 'Get notified about new projects',
                    paymentAlerts: 'Alerts for payments and earnings',
                    marketingEmails: 'Promotional emails and offers',
                    pushNotifications: 'Browser notifications',
                  };

                  return (
                    <div key={key} className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="cursor-pointer">{labelMap[key]}</Label>
                        <p className="text-sm text-muted-foreground">
                          {descriptionMap[key]}
                        </p>
                      </div>
                      <Switch
                        checked={value}
                        onCheckedChange={() => handleNotificationChange(key as keyof typeof notifications)}
                      />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Privacy Settings */}
            <Card className="glass">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-primary" />
                  <div>
                    <CardTitle>Privacy Settings</CardTitle>
                    <CardDescription>
                      Control your privacy and data
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Profile Visibility</Label>
                  <Select
                    value={privacy.profileVisibility}
                    onValueChange={(value) => handlePrivacyChange('profileVisibility', value)}
                  >
                    <SelectTrigger className="bg-card border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public (Everyone)</SelectItem>
                      <SelectItem value="designers">Designers Only</SelectItem>
                      <SelectItem value="private">Private (Only Me)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Controls who can see your profile and portfolio
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show Earnings</Label>
                    <p className="text-sm text-muted-foreground">
                      Display your earnings on profile
                    </p>
                  </div>
                  <Switch
                    checked={privacy.showEarnings}
                    onCheckedChange={(checked) => handlePrivacyChange('showEarnings', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Allow Messages</Label>
                    <p className="text-sm text-muted-foreground">
                      Let other designers message you
                    </p>
                  </div>
                  <Switch
                    checked={privacy.allowMessages}
                    onCheckedChange={(checked) => handlePrivacyChange('allowMessages', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Data Sharing</Label>
                    <p className="text-sm text-muted-foreground">
                      Share anonymous usage data to improve service
                    </p>
                  </div>
                  <Switch
                    checked={privacy.dataSharing}
                    onCheckedChange={(checked) => handlePrivacyChange('dataSharing', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Right Column - Additional Settings */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Theme Settings */}
            <Card className="glass">
              <CardHeader>
                <div className="flex items-center gap-3">
                  {theme === 'dark' ? (
                    <Moon className="w-5 h-5 text-primary" />
                  ) : (
                    <Sun className="w-5 h-5 text-primary" />
                  )}
                  <div>
                    <CardTitle>Theme</CardTitle>
                    <CardDescription>
                      Choose your interface theme
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Select
                    value={theme}
                    onValueChange={setTheme}
                  >
                    <SelectTrigger className="bg-card border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dark">
                        <div className="flex items-center gap-2">
                          <Moon className="w-4 h-4" />
                          Dark
                        </div>
                      </SelectItem>
                      <SelectItem value="light">
                        <div className="flex items-center gap-2">
                          <Sun className="w-4 h-4" />
                          Light
                        </div>
                      </SelectItem>
                      <SelectItem value="system">
                        <div className="flex items-center gap-2">
                          <SettingsIcon className="w-4 h-4" />
                          System
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="p-4 rounded-lg bg-card border border-border">
                    <p className="text-sm font-medium mb-2">Preview:</p>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-lg ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'} border ${theme === 'dark' ? 'border-gray-800' : 'border-gray-300'}`} />
                      <div className="flex-1">
                        <div className={`h-3 rounded-full mb-2 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-300'}`} />
                        <div className={`h-2 rounded-full w-2/3 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-400'}`} />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Language & Region */}
            <Card className="glass">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-primary" />
                  <div>
                    <CardTitle>Language & Region</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select defaultValue="en">
                      <SelectTrigger className="bg-card border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="pt">Portuguese</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select defaultValue="ghs">
                      <SelectTrigger className="bg-card border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ghs">GH₵ - Ghanaian Cedi</SelectItem>
                        <SelectItem value="usd">$ - US Dollar</SelectItem>
                        <SelectItem value="eur">€ - Euro</SelectItem>
                        <SelectItem value="gbp">£ - British Pound</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Management */}
            <Card className="glass">
              <CardHeader>
                <CardTitle>Data Management</CardTitle>
                <CardDescription>
                  Control your data and account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleExportData}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export All Data
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleDeleteAccount}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </Button>

                <div className="pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Account deletion is permanent and cannot be undone.
                    All your data will be permanently removed.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <Button
              onClick={handleSaveSettings}
              disabled={loading}
              className="w-full gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Save All Changes
                </>
              )}
            </Button>

            {/* Logout Button */}
            <Button
              variant="outline"
              onClick={async () => {
                await signOut();
                navigate('/login');
              }}
              className="w-full text-muted-foreground hover:text-foreground"
            >
              Logout
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Settings;