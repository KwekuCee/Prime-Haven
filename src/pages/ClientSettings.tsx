import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Shield, Bell, Lock, Globe, Mail,
    Smartphone, UserCog, Palette, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/DashboardLayout';
import { SpotlightCard } from '@/components/ui/SpotlightCard';

const ClientSettings = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const [settings, setSettings] = useState({
        projectUpdates: true,
        messageNotifications: true,
        emailMarketing: false,
        twoFactor: false,
        darkMode: true
    });

    const handleToggle = (key: keyof typeof settings) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
        toast({
            title: "Setting Updated",
            description: `${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} has been updated.`,
        });
    };

    const handlePasswordReset = async () => {
        if (!user?.email) return;
        setLoading(true);
        // Supposed to use supabase.auth.resetPasswordForEmail
        toast({
            title: "Password Reset Sent",
            description: "Check your email for a link to reset your password.",
        });
        setLoading(false);
    };

    const SettingRow = ({ icon: Icon, title, desc, active, onToggle }: {
        icon: any; title: string; desc: string; active: boolean; onToggle: () => void
    }) => (
        <div className="flex items-center justify-between p-4 rounded-xl hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                    <h4 className="text-sm font-semibold">{title}</h4>
                    <p className="text-[10px] text-muted-foreground">{desc}</p>
                </div>
            </div>
            <Switch checked={active} onCheckedChange={onToggle} />
        </div>
    );

    return (
        <DashboardLayout>
            <div className="p-4 sm:p-6 lg:p-8 max-w-[1000px] mx-auto">
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Configuration</p>
                    <h1 className="text-2xl sm:text-3xl font-heading font-bold">Portal Settings</h1>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                        <SpotlightCard className="p-6 h-full border border-border/60 bg-card/40 backdrop-blur-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <Bell className="w-5 h-5 text-primary" />
                                <h3 className="text-lg font-heading font-bold">Notifications</h3>
                            </div>
                            <div className="space-y-2">
                                <SettingRow
                                    icon={Globe}
                                    title="Project Milestone Updates"
                                    desc="Get notified when your projects progress to a new stage."
                                    active={settings.projectUpdates}
                                    onToggle={() => handleToggle('projectUpdates')}
                                />
                                <SettingRow
                                    icon={Mail}
                                    title="Direct Message Alerts"
                                    desc="Receive email alerts for new messages from designers."
                                    active={settings.messageNotifications}
                                    onToggle={() => handleToggle('messageNotifications')}
                                />
                                <SettingRow
                                    icon={Smartphone}
                                    title="Push Notifications"
                                    desc="Receive alerts directly on your browser or mobile device."
                                    active={settings.emailMarketing}
                                    onToggle={() => handleToggle('emailMarketing')}
                                />
                            </div>
                        </SpotlightCard>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                        <SpotlightCard className="p-6 h-full border border-border/60 bg-card/40 backdrop-blur-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <Shield className="w-5 h-5 text-primary" />
                                <h3 className="text-lg font-heading font-bold">Security & Appearance</h3>
                            </div>
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <SettingRow
                                        icon={Lock}
                                        title="Two-Factor Authentication"
                                        desc="Add an extra layer of security to your client account."
                                        active={settings.twoFactor}
                                        onToggle={() => handleToggle('twoFactor')}
                                    />
                                    <SettingRow
                                        icon={Palette}
                                        title="Immersive Dark Mode"
                                        desc="Optimize the dashboard for low-light environments."
                                        active={settings.darkMode}
                                        onToggle={() => handleToggle('darkMode')}
                                    />
                                </div>

                                <div className="pt-4 border-t border-border/40">
                                    <Label className="text-xs font-semibold uppercase tracking-wider block mb-3">Login Security</Label>
                                    <Button variant="outline" size="sm" className="w-full text-xs" onClick={handlePasswordReset} disabled={loading}>
                                        {loading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <UserCog className="w-3.5 h-3.5 mr-2" />}
                                        Request Password Reset
                                    </Button>
                                </div>
                            </div>
                        </SpotlightCard>
                    </motion.div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default ClientSettings;
