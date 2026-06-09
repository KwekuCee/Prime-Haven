import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Building2, Save, Loader2, Camera, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/DashboardLayout';

const ClientProfile = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        whatsapp: '',
        company: '',
        notes: '',
        profile_photo_url: '',
    });

    useEffect(() => {
        const loadClientData = async () => {
            if (!user) return;
            try {
                setLoading(true);
                const { data: client, error } = await supabase
                    .from('clients')
                    .select('*')
                    .eq('email', user.email)
                    .maybeSingle();

                if (error) throw error;

                if (client) {
                    setFormData({
                        name: client.name || '',
                        email: client.email || user.email || '',
                        whatsapp: client.whatsapp || '',
                        company: client.company || '',
                        notes: client.notes || '',
                        profile_photo_url: (client as any).profile_photo_url || '',
                    });
                }
            } catch (err: any) {
                toast({ title: "Error loading profile", description: err.message, variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        loadClientData();
    }, [user, toast]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;
        setUploadingPhoto(true);
        try {
            const fileName = `clients/${user.id}/profile.${file.name.split('.').pop()}`;
            const { error } = await supabase.storage.from('profile-pictures').upload(fileName, file, { upsert: true });
            if (error) throw error;
            const { data: { publicUrl } } = supabase.storage.from('profile-pictures').getPublicUrl(fileName);
            setFormData(prev => ({ ...prev, profile_photo_url: publicUrl }));
            await supabase.from('clients').update({
                profile_photo_url: publicUrl,
                updated_at: new Date().toISOString()
            } as any).eq('email', user.email);
            toast({ title: "Photo uploaded!" });
        } catch (error: any) {
            toast({ title: "Upload failed", description: error.message, variant: "destructive" });
        } finally {
            setUploadingPhoto(false);
        }
    };

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('clients')
                .update({
                    name: formData.name,
                    whatsapp: formData.whatsapp,
                    company: formData.company,
                    notes: formData.notes,
                    updated_at: new Date().toISOString()
                })
                .eq('email', user.email);

            if (error) throw error;

            // Update auth metadata too
            await supabase.auth.updateUser({
                data: {
                    full_name: formData.name,
                    business_name: formData.company,
                    whatsapp: formData.whatsapp
                }
            });

            toast({ title: "Profile updated successfully!" });
        } catch (error: any) {
            toast({ title: "Save failed", description: error.message, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="min-h-[80vh] flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="p-4 sm:p-6 lg:p-8 max-w-[1000px] mx-auto">
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Business Identity</p>
                    <h1 className="text-2xl sm:text-3xl font-heading font-bold">Client Profile</h1>
                    <p className="text-sm text-muted-foreground mt-2">Manage your personal and business information for your Prime Haven experience.</p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-1 space-y-6">
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                            className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-6 text-center">
                            <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
                            <div className="relative w-24 h-24 mx-auto mb-4">
                                {formData.profile_photo_url ? (
                                    <img src={formData.profile_photo_url} alt="Profile" className="w-24 h-24 rounded-full object-cover border-4 border-primary/10 shadow-xl" />
                                ) : (
                                    <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold border-4 border-primary/10">
                                        {formData.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'CL'}
                                    </div>
                                )}
                                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingPhoto}
                                    className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors shadow-lg disabled:opacity-50">
                                    {uploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                                </button>
                            </div>
                            <h3 className="text-lg font-heading font-bold">{formData.name || 'Your Name'}</h3>
                            <p className="text-xs text-muted-foreground mb-4">{formData.company || 'Business'}</p>
                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 capitalize px-4">Client Portal Access</Badge>
                        </motion.div>
                    </div>

                    <div className="md:col-span-2 space-y-6">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-6 space-y-6">

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider">Full Name</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input id="name" name="name" value={formData.name} onChange={handleInputChange} className="pl-10 bg-muted/20" placeholder="John Doe" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider">Email Address</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input id="email" value={formData.email} disabled className="pl-10 bg-muted/10 opacity-60" />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="company" className="text-xs font-semibold uppercase tracking-wider">Business / Company Name</Label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input id="company" name="company" value={formData.company} onChange={handleInputChange} className="pl-10 bg-muted/20" placeholder="Acme Inc." />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="whatsapp" className="text-xs font-semibold uppercase tracking-wider">WhatsApp Number</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input id="whatsapp" name="whatsapp" value={formData.whatsapp} onChange={handleInputChange} className="pl-10 bg-muted/20" placeholder="+233 XX XXX XXXX" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 pt-4">
                                <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto min-w-[150px]">
                                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                    Save Changes
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default ClientProfile;
