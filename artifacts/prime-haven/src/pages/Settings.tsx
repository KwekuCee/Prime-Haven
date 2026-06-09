import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Bell, Lock, User, Globe, Moon, Sun, Shield, Mail, Smartphone, Trash2,
  Download, CheckCircle, Loader2, Settings as SettingsIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { useUserSettings } from '@/contexts/UserSettingsContext';

const Settings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const { settings, updateSetting, saveSettings } = useUserSettings();

  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (data) setUserProfile(data);
    };
    loadUserData();
  }, [user]);

  const handleSaveSettings = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await saveSettings();
      toast({ title: "Settings saved!", description: "Your preferences have been updated." });
    } catch {
      toast({ title: "Save failed", description: "Could not save settings.", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleExportData = async () => {
    try {
      const [profileData, designerData, submissionsData, paymentsData] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user?.id ?? '').maybeSingle(),
        supabase.from('designer_details').select('*').eq('user_id', user?.id ?? '').maybeSingle(),
        supabase.from('submissions').select('*').eq('designer_id', user?.id ?? ''),
        supabase.from('payments').select('*').eq('user_id', user?.id ?? ''),
      ]);
      const exportData = { profile: profileData.data, designer_details: designerData.data, submissions: submissionsData.data, payments: paymentsData.data, exported_at: new Date().toISOString() };
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const link = document.createElement('a');
      link.setAttribute('href', dataUri);
      link.setAttribute('download', `primehaven-data-${Date.now()}.json`);
      link.click();
      toast({ title: "Data exported!", description: "Your data has been downloaded as JSON." });
    } catch {
      toast({ title: "Export failed", description: "Could not export data.", variant: "destructive" });
    }
  };

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      toast({ title: "Account deletion requested", description: "Please contact info@primehaven.tech to proceed.", variant: "destructive" });
    }
  };

  const SectionCard = ({ icon: Icon, title, description, children, delay = 0 }: { icon: any; title: string; description?: string; children: React.ReactNode; delay?: number }) => (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-heading font-bold">{title}</h3>
          {description && <p className="text-[10px] text-muted-foreground">{description}</p>}
        </div>
      </div>
      {children}
    </motion.div>
  );

  const ToggleRow = ({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <p className="text-xs font-medium">{label}</p>
        <p className="text-[10px] text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Preferences</p>
              <h1 className="text-2xl sm:text-3xl font-heading font-bold">Settings</h1>
            </div>
            <Badge variant="outline" className="text-[10px] self-start sm:self-auto">
              {userProfile?.email?.split('@')[0] || 'User'}
            </Badge>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Account */}
            <SectionCard icon={User} title="Account" description="Your account information" delay={0.05}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div className="p-3 rounded-xl bg-muted/20 border border-border/40">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs truncate">{user?.email || 'Not set'}</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-1">Contact support to change</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/20 border border-border/40">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs truncate">{userProfile?.phone || 'Not set'}</span>
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => navigate('/reset-password')}>
                <Lock className="w-3.5 h-3.5 mr-1.5" /> Change Password
              </Button>
            </SectionCard>

            {/* Notifications */}
            <SectionCard icon={Bell} title="Notifications" description="Choose what you receive" delay={0.1}>
              <div className="divide-y divide-border/40">
                <ToggleRow label="Email Notifications" desc="Receive updates via email" checked={settings.email_notifications} onChange={(v) => updateSetting('email_notifications', v)} />
                <ToggleRow label="Project Updates" desc="Get notified about new projects" checked={settings.project_updates} onChange={(v) => updateSetting('project_updates', v)} />
                <ToggleRow label="Payment Alerts" desc="Alerts for payments and earnings" checked={settings.payment_alerts} onChange={(v) => updateSetting('payment_alerts', v)} />
                <ToggleRow label="Marketing Emails" desc="Promotional emails and offers" checked={settings.marketing_emails} onChange={(v) => updateSetting('marketing_emails', v)} />
                <ToggleRow label="Push Notifications" desc="Browser notifications" checked={settings.push_notifications} onChange={(v) => updateSetting('push_notifications', v)} />
              </div>
            </SectionCard>

            {/* Privacy */}
            <SectionCard icon={Shield} title="Privacy" description="Control your data" delay={0.15}>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs">Profile Visibility</Label>
                  <Select value={settings.profile_visibility} onValueChange={(v) => updateSetting('profile_visibility', v)}>
                    <SelectTrigger className="mt-1.5 h-9 text-xs bg-muted/20 border-border/40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public (Everyone)</SelectItem>
                      <SelectItem value="designers">Designers Only</SelectItem>
                      <SelectItem value="private">Private (Only Me)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="divide-y divide-border/40">
                  <ToggleRow label="Show Earnings" desc="Display earnings on dashboard" checked={settings.show_earnings} onChange={(v) => updateSetting('show_earnings', v)} />
                  <ToggleRow label="Allow Messages" desc="Let other designers message you" checked={settings.allow_messages} onChange={(v) => updateSetting('allow_messages', v)} />
                  <ToggleRow label="Data Sharing" desc="Share anonymous usage data" checked={settings.data_sharing} onChange={(v) => updateSetting('data_sharing', v)} />
                </div>
              </div>
            </SectionCard>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Theme */}
            <SectionCard icon={settings.theme === 'dark' ? Moon : Sun} title="Theme" delay={0.1}>
              <Select value={settings.theme} onValueChange={(v) => updateSetting('theme', v)}>
                <SelectTrigger className="h-9 text-xs bg-muted/20 border-border/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark"><div className="flex items-center gap-2"><Moon className="w-3.5 h-3.5" />Dark</div></SelectItem>
                  <SelectItem value="light"><div className="flex items-center gap-2"><Sun className="w-3.5 h-3.5" />Light</div></SelectItem>
                  <SelectItem value="system"><div className="flex items-center gap-2"><SettingsIcon className="w-3.5 h-3.5" />System</div></SelectItem>
                </SelectContent>
              </Select>
            </SectionCard>

            {/* Language & Currency */}
            <SectionCard icon={Globe} title="Language & Region" delay={0.15}>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Language</Label>
                  <Select defaultValue="en">
                    <SelectTrigger className="mt-1.5 h-9 text-xs bg-muted/20 border-border/40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Currency</Label>
                  <Select value={settings.currency} onValueChange={(v) => updateSetting('currency', v)}>
                    <SelectTrigger className="mt-1.5 h-9 text-xs bg-muted/20 border-border/40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ghs">GH₵ - Ghanaian Cedi</SelectItem>
                      <SelectItem value="usd">$ - US Dollar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </SectionCard>

            {/* Data Management */}
            <SectionCard icon={Download} title="Data Management" delay={0.2}>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start text-xs" onClick={handleExportData}>
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Export All Data
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start text-xs text-destructive hover:bg-destructive/10" onClick={handleDeleteAccount}>
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete Account
                </Button>
                <p className="text-[9px] text-muted-foreground pt-2 border-t border-border/40">
                  Account deletion is permanent and cannot be undone.
                </p>
              </div>
            </SectionCard>

            {/* Save */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="space-y-2">
              <Button onClick={handleSaveSettings} disabled={saving} className="w-full text-xs" size="sm">
                {saving ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving...</> : <><CheckCircle className="w-3.5 h-3.5 mr-1.5" />Save All Changes</>}
              </Button>
              <Button variant="outline" size="sm" className="w-full text-xs text-muted-foreground" onClick={async () => { await signOut(); navigate('/login'); }}>
                Logout
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
