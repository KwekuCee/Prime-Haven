import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User, Mail, Phone, Calendar, Link as LinkIcon, Briefcase, Clock,
  Award, Save, Loader2, CheckCircle, Camera, Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/DashboardLayout';

const KORAPAY_PUBLIC_KEY = "pk_live_AAZBw2DtmnyrGHfDJmNqkE4dKhw9gKQHVbz8Gds5";
const PROFESSION_UPGRADE_FEE = 80;

const experienceLevels = [
  { value: 'beginner', label: 'Beginner (0-1 years)' },
  { value: 'intermediate', label: 'Intermediate (1-3 years)' },
  { value: 'advanced', label: 'Advanced (3-5 years)' },
  { value: 'expert', label: 'Expert (5+ years)' },
];

const availableHoursOptions = [
  { value: '10', label: '10 hrs/week' },
  { value: '20', label: '20 hrs/week' },
  { value: '30', label: '30 hrs/week' },
  { value: '40', label: '40 hrs/week (Full-time)' },
];

const professionalTitles = [
  'UI/UX Designer', 'Graphic Designer', 'Brand Designer', 'Web Designer',
  'Motion Designer', 'Product Designer', 'Visual Designer', 'Illustrator',
];

const EditProfile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    full_name: '', email: '', phone: '', dob: '', professional_title: '',
    professions: [] as string[],
    experience_level: '', available_hours: '', portfolio_url: '', skills: [] as string[], profile_photo_url: '',
  });
  const [extraProfessionPaid, setExtraProfessionPaid] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradePending, setUpgradePending] = useState<string | null>(null);
  const [upgradePaying, setUpgradePaying] = useState(false);
  const [newSkill, setNewSkill] = useState('');

  useEffect(() => {
    const loadProfileData = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const [profileResult, designerResult] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
          supabase.from('designer_details').select('*').eq('user_id', user.id).maybeSingle()
        ]);
        if (profileResult.data) {
          const p = profileResult.data;
          const d = designerResult.data as any;
          setFormData({
            full_name: p.full_name || '', email: p.email || user.email || '', phone: p.phone || '', dob: p.dob || '',
            professional_title: d?.professional_title || '',
            professions: d?.professions || [],
            experience_level: d?.experience_level || '',
            available_hours: d?.available_hours?.toString() || '', portfolio_url: d?.portfolio_url || '',
            skills: d?.skills || [], profile_photo_url: d?.profile_photo_url || '',
          });
          setExtraProfessionPaid(!!d?.extra_profession_paid);
        }
      } catch { toast({ title: "Error loading profile", variant: "destructive" }); }
      finally { setLoading(false); }
    };
    loadProfileData();
  }, [user, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => { setFormData(prev => ({ ...prev, [e.target.name]: e.target.value })); };

  const handleAddSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData(prev => ({ ...prev, skills: [...prev.skills, newSkill.trim()] }));
      setNewSkill('');
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) { toast({ title: "Invalid file type", variant: "destructive" }); return; }
    if (file.size > 5 * 1024 * 1024) { toast({ title: "File too large (max 5MB)", variant: "destructive" }); return; }
    setUploadingPhoto(true);
    try {
      const fileName = `${user.id}/profile.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('profile-pictures').upload(fileName, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('profile-pictures').getPublicUrl(fileName);
      setFormData(prev => ({ ...prev, profile_photo_url: publicUrl }));
      await supabase.from('designer_details').update({ profile_photo_url: publicUrl, updated_at: new Date().toISOString() }).eq('user_id', user.id);
      toast({ title: "Photo uploaded!" });
    } catch (error: any) { toast({ title: "Upload failed", description: error.message, variant: "destructive" }); }
    finally { setUploadingPhoto(false); }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error: profileError } = await supabase.from('profiles').update({ full_name: formData.full_name, phone: formData.phone, dob: formData.dob || null, updated_at: new Date().toISOString() }).eq('id', user.id);
      if (profileError) throw profileError;
      const { error: designerError } = await supabase.from('designer_details').update({
        professional_title: formData.professional_title,
        professions: formData.professions,
        experience_level: formData.experience_level,
        available_hours: formData.available_hours ? parseInt(formData.available_hours) : null,
        portfolio_url: formData.portfolio_url, skills: formData.skills, updated_at: new Date().toISOString(),
      }).eq('user_id', user.id);
      if (designerError) throw designerError;
      toast({ title: "Profile updated!" });
      navigate('/dashboard');
    } catch (error: any) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-[80vh] flex items-center justify-center">
          <div className="relative w-16 h-16"><div className="absolute inset-0 rounded-full border-2 border-primary/20" /><div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" /></div>
        </div>
      </DashboardLayout>
    );
  }

  const SectionCard = ({ icon: Icon, title, desc, children, delay = 0 }: { icon: any; title: string; desc?: string; children: React.ReactNode; delay?: number }) => (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><Icon className="w-4 h-4 text-primary" /></div>
        <div>
          <h3 className="text-sm font-heading font-bold">{title}</h3>
          {desc && <p className="text-[10px] text-muted-foreground">{desc}</p>}
        </div>
      </div>
      {children}
    </motion.div>
  );

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Your profile</p>
              <h1 className="text-2xl sm:text-3xl font-heading font-bold">Edit Profile</h1>
            </div>
            <Badge variant="outline" className="text-[10px] gap-1.5 self-start sm:self-auto">
              <User className="w-3 h-3" /> {formData.professional_title || 'Designer'}
            </Badge>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Personal */}
            <SectionCard icon={User} title="Personal Information" delay={0.05}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { name: 'full_name', label: 'Full Name *', icon: User, placeholder: 'Your full name' },
                  { name: 'email', label: 'Email', icon: Mail, placeholder: '', disabled: true },
                  { name: 'phone', label: 'Phone', icon: Phone, placeholder: '+233 55 123 4567' },
                  { name: 'dob', label: 'Date of Birth', icon: Calendar, type: 'date' },
                ].map(field => (
                  <div key={field.name} className="space-y-1.5">
                    <Label className="text-xs">{field.label}</Label>
                    <div className="relative">
                      <field.icon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input name={field.name} type={field.type || 'text'} value={(formData as any)[field.name]}
                        onChange={handleInputChange} placeholder={field.placeholder} disabled={field.disabled}
                        className={`pl-9 h-9 text-xs bg-muted/20 border-border/40 ${field.disabled ? 'opacity-50' : ''}`} />
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Professional */}
            <SectionCard icon={Briefcase} title="Professional Information" delay={0.1}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Title *</Label>
                  <Select value={formData.professional_title} onValueChange={(v) => {
                    // Automatically add corresponding profession if not present
                    let newProfessions = [...formData.professions];
                    if (v === 'UI/UX Designer' && !newProfessions.includes('UI/UX Designer')) newProfessions.push('UI/UX Designer');
                    if (v === 'Graphic Designer' && !newProfessions.includes('Graphic Designer')) newProfessions.push('Graphic Designer');
                    if (v === 'Web Designer' && !newProfessions.includes('UI/UX Designer')) newProfessions.push('UI/UX Designer');

                    setFormData(p => ({ ...p, professional_title: v, professions: newProfessions }));
                  }}>
                    <SelectTrigger className="h-9 text-xs bg-muted/20 border-border/40"><SelectValue placeholder="Select title" /></SelectTrigger>
                    <SelectContent>{professionalTitles.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Marketplace Professions * (For job pooling)</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {['Graphic Designer', 'UI/UX Designer', 'Web Developer'].map(prof => (
                      <Badge
                        key={prof}
                        variant={formData.professions.includes(prof) ? "default" : "outline"}
                        className="cursor-pointer text-[10px]"
                        onClick={() => {
                          setFormData(p => ({
                            ...p,
                            professions: p.professions.includes(prof)
                              ? p.professions.filter(item => item !== prof)
                              : [...p.professions, prof]
                          }));
                        }}
                      >
                        {prof}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Experience</Label>
                  <Select value={formData.experience_level} onValueChange={(v) => setFormData(p => ({ ...p, experience_level: v }))}>
                    <SelectTrigger className="h-9 text-xs bg-muted/20 border-border/40"><SelectValue placeholder="Select level" /></SelectTrigger>
                    <SelectContent>{experienceLevels.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Availability</Label>
                  <Select value={formData.available_hours} onValueChange={(v) => setFormData(p => ({ ...p, available_hours: v }))}>
                    <SelectTrigger className="h-9 text-xs bg-muted/20 border-border/40"><SelectValue placeholder="Select hours" /></SelectTrigger>
                    <SelectContent>{availableHoursOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Portfolio URL</Label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input name="portfolio_url" type="url" value={formData.portfolio_url} onChange={handleInputChange} placeholder="https://..." className="pl-9 h-9 text-xs bg-muted/20 border-border/40" />
                  </div>
                </div>
              </div>

              {/* Skills */}
              <div className="mt-4 space-y-2">
                <Label className="text-xs">Skills</Label>
                <div className="flex gap-2">
                  <Input value={newSkill} onChange={(e) => setNewSkill(e.target.value)} placeholder="Add a skill" className="h-9 text-xs bg-muted/20 border-border/40"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())} />
                  <Button type="button" variant="outline" size="sm" className="h-9 text-xs" onClick={handleAddSkill}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {formData.skills.map((skill, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px] gap-1 cursor-pointer hover:bg-destructive/20 hover:text-destructive" onClick={() => setFormData(p => ({ ...p, skills: p.skills.filter(s => s !== skill) }))}>
                      {skill} <span>×</span>
                    </Badge>
                  ))}
                  {formData.skills.length === 0 && <p className="text-[10px] text-muted-foreground">No skills added</p>}
                </div>
              </div>
            </SectionCard>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Button onClick={handleSave} disabled={saving} className="w-full text-xs" size="sm">
                {saving ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving...</> : <><Save className="w-3.5 h-3.5 mr-1.5" />Save Profile</>}
              </Button>
            </motion.div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Preview */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5">
              <h3 className="text-xs font-heading font-bold mb-4">Profile Preview</h3>
              <div className="text-center mb-4">
                <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
                <div className="relative w-20 h-20 mx-auto mb-3">
                  {formData.profile_photo_url ? (
                    <img src={formData.profile_photo_url} alt="Profile" className="w-20 h-20 rounded-full object-cover border-2 border-primary/20" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-lg font-bold">
                      {formData.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'PH'}
                    </div>
                  )}
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingPhoto}
                    className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50">
                    {uploadingPhoto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <h3 className="text-sm font-heading font-bold">{formData.full_name || 'Your Name'}</h3>
                <p className="text-[10px] text-muted-foreground">{formData.professional_title || 'Designer'}</p>
              </div>

              <div className="space-y-2 text-[10px]">
                <div className="flex items-center gap-2 text-muted-foreground"><Mail className="w-3 h-3" /><span className="truncate">{formData.email}</span></div>
                {formData.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="w-3 h-3" />{formData.phone}</div>}
                {formData.experience_level && <div className="flex items-center gap-2 text-muted-foreground"><Award className="w-3 h-3" /><span className="capitalize">{formData.experience_level}</span></div>}
                {formData.available_hours && <div className="flex items-center gap-2 text-muted-foreground"><Clock className="w-3 h-3" />{formData.available_hours} hrs/week</div>}
              </div>

              {formData.skills.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/40">
                  <div className="flex flex-wrap gap-1">
                    {formData.skills.slice(0, 5).map((skill, i) => <Badge key={i} variant="outline" className="text-[8px]">{skill}</Badge>)}
                    {formData.skills.length > 5 && <Badge variant="outline" className="text-[8px]">+{formData.skills.length - 5}</Badge>}
                  </div>
                </div>
              )}
            </motion.div>

            {/* Tips */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium mb-1.5">Profile Tips</p>
                  <ul className="text-[10px] text-muted-foreground space-y-1">
                    <li>• Complete profiles get more projects</li>
                    <li>• Add your portfolio URL</li>
                    <li>• List your top 5-10 skills</li>
                    <li>• Keep availability updated</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EditProfile;
