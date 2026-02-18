import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Link as LinkIcon,
  Briefcase,
  Clock,
  Award,
  Save,
  Loader2,
  CheckCircle,
  Camera,
  Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const experienceLevels = [
  { value: 'beginner', label: 'Beginner (0-1 years)' },
  { value: 'intermediate', label: 'Intermediate (1-3 years)' },
  { value: 'advanced', label: 'Advanced (3-5 years)' },
  { value: 'expert', label: 'Expert (5+ years)' },
];

const availableHoursOptions = [
  { value: '10', label: '10 hours/week' },
  { value: '20', label: '20 hours/week' },
  { value: '30', label: '30 hours/week' },
  { value: '40', label: '40 hours/week (Full-time)' },
];

const professionalTitles = [
  'UI/UX Designer',
  'Graphic Designer',
  'Brand Designer',
  'Web Designer',
  'Motion Designer',
  'Product Designer',
  'Visual Designer',
  'Illustrator',
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
    full_name: '',
    email: '',
    phone: '',
    dob: '',
    professional_title: '',
    experience_level: '',
    available_hours: '',
    portfolio_url: '',
    skills: [] as string[],
    profile_photo_url: '',
  });

  const [newSkill, setNewSkill] = useState('');

  useEffect(() => {
    const loadProfileData = async () => {
      if (!user) return;

      try {
        setLoading(true);
        
        // Load profile and designer details in parallel
        const [profileResult, designerResult] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
          supabase.from('designer_details').select('*').eq('user_id', user.id).maybeSingle()
        ]);

        if (profileResult.data) {
          const profile = profileResult.data;
          const designer = designerResult.data;
          
          setFormData({
            full_name: profile.full_name || '',
            email: profile.email || user.email || '',
            phone: profile.phone || '',
            dob: profile.dob || '',
            professional_title: designer?.professional_title || '',
            experience_level: designer?.experience_level || '',
            available_hours: designer?.available_hours?.toString() || '',
            portfolio_url: designer?.portfolio_url || '',
            skills: designer?.skills || [],
            profile_photo_url: (designer as any)?.profile_photo_url || '',
          });
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        toast({
          title: "Error loading profile",
          description: "Could not load your profile data.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, [user, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }));
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadingPhoto(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/profile.${fileExt}`;

      // Upload the file
      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName);

      // Update the form state
      setFormData(prev => ({ ...prev, profile_photo_url: publicUrl }));

      // Update the database
      await supabase
        .from('designer_details')
        .update({ profile_photo_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      toast({
        title: "Photo uploaded!",
        description: "Your profile picture has been updated.",
      });

    } catch (error: any) {
      console.error('Error uploading photo:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Could not upload photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          dob: formData.dob || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Update designer details
      const { error: designerError } = await supabase
        .from('designer_details')
        .update({
          professional_title: formData.professional_title,
          experience_level: formData.experience_level,
          available_hours: formData.available_hours ? parseInt(formData.available_hours) : null,
          portfolio_url: formData.portfolio_url,
          skills: formData.skills,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (designerError) throw designerError;

      toast({
        title: "Profile updated!",
        description: "Your profile changes have been saved.",
      });

      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({
        title: "Save failed",
        description: error.message || "Could not save your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/dashboard')}
                  className="hover:bg-secondary flex-shrink-0"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h1 className="text-xl sm:text-2xl font-heading font-bold">Edit Profile</h1>
                  <p className="text-sm text-muted-foreground">
                    Update your personal and professional information
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="gap-2 self-start sm:self-auto">
                <User className="w-3 h-3" />
                {formData.professional_title || 'Designer'}
              </Badge>
            </div>
        </div>
      </div>

        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column - Personal Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Personal Information */}
            <Card className="glass">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-primary" />
                  <div>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>
                      Your basic personal details
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="full_name"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleInputChange}
                        placeholder="Enter your full name"
                        className="pl-10 bg-card border-border"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        disabled
                        className="pl-10 bg-card border-border opacity-60"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Contact support to change email</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="e.g., +233 55 123 4567"
                        className="pl-10 bg-card border-border"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dob">Date of Birth</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="dob"
                        name="dob"
                        type="date"
                        value={formData.dob}
                        onChange={handleInputChange}
                        className="pl-10 bg-card border-border"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Professional Information */}
            <Card className="glass">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Briefcase className="w-5 h-5 text-primary" />
                  <div>
                    <CardTitle>Professional Information</CardTitle>
                    <CardDescription>
                      Your design expertise and availability
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="professional_title">Professional Title *</Label>
                    <Select
                      value={formData.professional_title}
                      onValueChange={(value) => handleSelectChange('professional_title', value)}
                    >
                      <SelectTrigger className="bg-card border-border">
                        <SelectValue placeholder="Select your title" />
                      </SelectTrigger>
                      <SelectContent>
                        {professionalTitles.map((title) => (
                          <SelectItem key={title} value={title}>
                            {title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="experience_level">Experience Level</Label>
                    <Select
                      value={formData.experience_level}
                      onValueChange={(value) => handleSelectChange('experience_level', value)}
                    >
                      <SelectTrigger className="bg-card border-border">
                        <SelectValue placeholder="Select experience level" />
                      </SelectTrigger>
                      <SelectContent>
                        {experienceLevels.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="available_hours">Available Hours</Label>
                    <Select
                      value={formData.available_hours}
                      onValueChange={(value) => handleSelectChange('available_hours', value)}
                    >
                      <SelectTrigger className="bg-card border-border">
                        <SelectValue placeholder="Select availability" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableHoursOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="portfolio_url">Portfolio URL</Label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="portfolio_url"
                        name="portfolio_url"
                        type="url"
                        value={formData.portfolio_url}
                        onChange={handleInputChange}
                        placeholder="https://your-portfolio.com"
                        className="pl-10 bg-card border-border"
                      />
                    </div>
                  </div>
                </div>

                {/* Skills */}
                <div className="space-y-3">
                  <Label>Skills & Expertise</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      placeholder="Add a skill (e.g., Figma, Adobe XD)"
                      className="bg-card border-border"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                    />
                    <Button type="button" onClick={handleAddSkill} variant="outline">
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.skills.map((skill, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="gap-1 cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => handleRemoveSkill(skill)}
                      >
                        {skill}
                        <span className="ml-1">×</span>
                      </Badge>
                    ))}
                    {formData.skills.length === 0 && (
                      <p className="text-sm text-muted-foreground">No skills added yet</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={saving}
              size="lg"
              className="w-full gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Profile
                </>
              )}
            </Button>
          </motion.div>

          {/* Right Column - Profile Preview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Profile Card Preview */}
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-sm">Profile Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-6">
                  {/* Profile Photo Upload */}
                  <div className="relative w-24 h-24 mx-auto mb-4">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handlePhotoUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    {formData.profile_photo_url ? (
                      <img
                        src={formData.profile_photo_url}
                        alt="Profile"
                        className="w-24 h-24 rounded-full object-cover border-4 border-primary/20"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-bold">
                        {formData.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'PH'}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {uploadingPhoto ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">Click the camera icon to upload</p>
                  <h3 className="font-heading font-bold text-lg">
                    {formData.full_name || 'Your Name'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {formData.professional_title || 'Designer'}
                  </p>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{formData.email || 'email@example.com'}</span>
                  </div>
                  {formData.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span>{formData.phone}</span>
                    </div>
                  )}
                  {formData.experience_level && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Award className="w-4 h-4" />
                      <span className="capitalize">{formData.experience_level}</span>
                    </div>
                  )}
                  {formData.available_hours && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{formData.available_hours} hrs/week</span>
                    </div>
                  )}
                </div>

                {formData.skills.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-2">Skills</p>
                    <div className="flex flex-wrap gap-1">
                      {formData.skills.slice(0, 5).map((skill, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {formData.skills.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{formData.skills.length - 5}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tips Card */}
            <Card className="glass">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm mb-1">Profile Tips</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Complete profiles get more projects</li>
                      <li>• Add your portfolio URL for credibility</li>
                      <li>• List your top 5-10 skills</li>
                      <li>• Keep your availability updated</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;
