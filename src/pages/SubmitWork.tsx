import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Upload, 
  ArrowLeft, 
  FileText, 
  Calendar,
  Tag,
  DollarSign,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const serviceTypes = [
  { id: 'logo', label: 'Logo Design', points: 45 },
  { id: 'branding', label: 'Brand Identity', points: 50 },
  { id: 'uiux', label: 'UI/UX Design', points: 65 },
  { id: 'web', label: 'Web Design', points: 65 },
  { id: 'print', label: 'Print Design', points: 20 },
  { id: 'flyer', label: 'Flyer Design', points: 30, bonusOnApproval: 10 },
];

const SubmitWork = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState<string>('');
  
  // Form state
  const [formData, setFormData] = useState({
    projectName: '',
    serviceType: 'logo',
    clientReference: '',
    description: '',
    deadline: '',
    files: [] as string[], // URLs or base64 strings
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleServiceTypeChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      serviceType: value
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);
    
    // Validate file types and size
    const validFiles = newFiles.filter(file => {
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'];
      const maxSize = 10 * 1024 * 1024; // 10MB (reduced for base64)
      
      if (!validTypes.includes(file.type)) {
        setUploadError(`Invalid file type: ${file.type}. Accepted: JPG, PNG, GIF, SVG`);
        return false;
      }
      
      if (file.size > maxSize) {
        setUploadError(`File too large: ${file.name}. Max size: 10MB`);
        return false;
      }
      
      return true;
    });

    if (validFiles.length === 0) return;

    setUploadError('');
    setLoading(true);
    setUploadProgress(0);

    try {
      const uploadedUrls: string[] = [];
      
      for (const [index, file] of validFiles.entries()) {
        // Convert file to base64 for temporary storage
        const base64 = await fileToBase64(file);
        
        // Store as base64 string (temporary solution)
        uploadedUrls.push(base64);
        setUploadProgress((prev) => Math.min(prev + (100 / validFiles.length), 100));
      }

      if (uploadedUrls.length > 0) {
        setUploadedFiles(prev => [...prev, ...validFiles]);
        setFormData(prev => ({
          ...prev,
          files: [...prev.files, ...uploadedUrls]
        }));
        
        toast({
          title: "Files uploaded successfully!",
          description: `${uploadedUrls.length} file(s) have been uploaded. Note: Files are temporarily stored.`,
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError('Failed to upload files. Please try again.');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  // Helper function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setFormData(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please login to submit work.",
        variant: "destructive",
      });
      navigate('/login');
      return;
    }

    // Validation
    if (!formData.projectName.trim()) {
      toast({
        title: "Project name required",
        description: "Please enter a project name.",
        variant: "destructive",
      });
      return;
    }

    if (formData.files.length === 0) {
      toast({
        title: "Files required",
        description: "Please upload at least one file.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.clientReference.trim()) {
      toast({
        title: "Client Reference required",
        description: "Please enter the client reference from the job contract.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Convert base64 files to text URLs (store as text in database)
      const fileUrls = formData.files.map((file, index) => {
        // If it's already a URL, keep it. If it's base64, store as data URL
        return file.startsWith('data:') ? `base64_image_${index}` : file;
      });

      const submissionData = {
        designer_id: user.id,
        project_name: formData.projectName,
        service_type: formData.serviceType,
        client_ref: formData.clientReference.trim(),
        files_urls: fileUrls, // Store as text array
        submission_date: new Date().toISOString(),
        status: 'pending',
        points_awarded: 0,
        revisions_count: 0,
        client_preference: false,
        reviewer_id: null,
        final_approval_date: null,
      };

      const { data, error } = await supabase
        .from('submissions')
        .insert([submissionData])
        .select()
        .single();

      if (error) {
        throw error;
      }

      toast({
        title: "Submission successful!",
        description: "Your work has been submitted for review. You'll be notified when it's approved.",
      });

      // Reset form
      setFormData({
        projectName: '',
        serviceType: 'logo',
        clientReference: '',
        description: '',
        deadline: '',
        files: [],
      });
      setUploadedFiles([]);

      // Navigate to dashboard after delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (error: any) {
      console.error('Submission error:', error);
      toast({
        title: "Submission failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getSelectedService = () => {
    return serviceTypes.find(service => service.id === formData.serviceType);
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
                <h1 className="text-2xl font-heading font-bold">Submit Work</h1>
                <p className="text-sm text-muted-foreground">
                  Submit your completed work for review and points
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-2">
                <CheckCircle className="w-3 h-3" />
                Points Available: {getSelectedService()?.points || 15}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Project Name */}
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-heading font-bold">Project Details</h2>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="projectName" className="mb-2 block">
                      Project Name *
                    </Label>
                    <Input
                      id="projectName"
                      name="projectName"
                      value={formData.projectName}
                      onChange={handleInputChange}
                      placeholder="e.g., TechFlow Dashboard Redesign"
                      required
                      className="bg-card border-border"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description" className="mb-2 block">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Brief description of the project, client requirements, design process..."
                      rows={4}
                      className="bg-card border-border resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="clientReference" className="mb-2 block">
                        Client Reference * <span className="text-xs text-muted-foreground">(from job contract)</span>
                      </Label>
                      <Input
                        id="clientReference"
                        name="clientReference"
                        value={formData.clientReference}
                        onChange={handleInputChange}
                        placeholder="Enter exactly as shown in contract"
                        required
                        className="bg-card border-border"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Must match contract exactly for approval</p>
                    </div>

                    <div>
                      <Label htmlFor="deadline" className="mb-2 block">
                        Deadline (Optional)
                      </Label>
                      <Input
                        id="deadline"
                        name="deadline"
                        type="date"
                        value={formData.deadline}
                        onChange={handleInputChange}
                        className="bg-card border-border"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Type */}
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Tag className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-heading font-bold">Service Type</h2>
                </div>
                
                <RadioGroup
                  value={formData.serviceType}
                  onValueChange={handleServiceTypeChange}
                  className="grid grid-cols-2 md:grid-cols-3 gap-3"
                >
                  {serviceTypes.map((service) => (
                    <div key={service.id}>
                      <RadioGroupItem
                        value={service.id}
                        id={service.id}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={service.id}
                        className="flex flex-col items-center justify-center rounded-xl border-2 border-border bg-card p-4 hover:bg-secondary hover:border-primary/30 cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                      >
                        <span className="font-medium text-sm mb-1">{service.label}</span>
                        <span className="text-xs text-primary font-bold">{service.points} pts</span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* File Upload */}
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Upload className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-heading font-bold">Files Upload</h2>
                </div>
                
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center hover:border-primary/50 transition-colors">
                    <Input
                      id="file-upload"
                      type="file"
                      multiple
                      accept=".jpg,.jpeg,.png,.gif,.svg"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Label
                      htmlFor="file-upload"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <Upload className="w-8 h-8 text-primary" />
                      </div>
                      <p className="font-medium mb-2">Click to upload files</p>
                      <p className="text-sm text-muted-foreground mb-1">
                        JPG, PNG, GIF, SVG only (Max 10MB each)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Upload design files or screenshots
                      </p>
                    </Label>

                    {loading && (
                      <div className="mt-6">
                        <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Uploading... {uploadProgress.toFixed(0)}%
                        </p>
                      </div>
                    )}

                    {uploadError && (
                      <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                        <p className="text-sm text-destructive flex items-center gap-2">
                          <XCircle className="w-4 h-4" />
                          {uploadError}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Uploaded Files List */}
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium">Uploaded Files ({uploadedFiles.length})</p>
                      <div className="space-y-2">
                        {uploadedFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 rounded-lg bg-card border border-border"
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium truncate max-w-[200px]">
                                  {file.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFile(index)}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Note: Files are temporarily stored as base64. For production, use Supabase Storage.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                  className="gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Dashboard
                </Button>
                
                <Button
                  type="submit"
                  disabled={loading || formData.files.length === 0}
                  className="gap-2 min-w-[200px]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Submit for Review
                    </>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>

          {/* Right Column - Summary & Guidelines */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Points Summary */}
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <DollarSign className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-heading font-bold">Points Summary</h2>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Selected Service:</span>
                  <span className="font-medium">
                    {serviceTypes.find(s => s.id === formData.serviceType)?.label}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Base Points:</span>
                  <span className="text-primary font-bold text-lg">
                    +{getSelectedService()?.points || 45} pts
                  </span>
                </div>

                {formData.serviceType === 'flyer' && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-primary/10 border border-primary/20">
                    <span className="text-sm font-medium">Bonus on Approval:</span>
                    <span className="text-primary font-bold">+10 pts</span>
                  </div>
                )}

                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Potential Earnings:</span>
                    <span className="text-primary font-bold">
                      GH₵{(((getSelectedService()?.points || 45) + (formData.serviceType === 'flyer' ? 10 : 0)) * 0.35).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    * Approx. GH₵0.35 per point. Includes bonuses where applicable.
                  </p>
                </div>

                <div className="pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    💡 <strong>Revisions:</strong> Each change made to your submission adds +3 points when approved.
                  </p>
                </div>
              </div>
            </div>

            {/* Submission Guidelines */}
            <div className="glass rounded-2xl p-6">
              <h2 className="text-lg font-heading font-bold mb-4">Submission Guidelines</h2>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary">1</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <strong>Client Reference:</strong> Must match the job contract exactly or submission won't be approved
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary">2</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Ensure all design files are properly named and organized
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary">3</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Include source files (AI, PSD, FIGMA) when possible
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary">4</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Submissions are reviewed within 24-48 hours
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary">5</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Each revision adds <strong>+3 bonus points</strong> when approved
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary">6</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Flyer designs get <strong>+10 bonus points</strong> on approval
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-sm font-medium text-foreground mb-1">Points Earned:</p>
                <p className="text-xs text-muted-foreground">
                  Base points + Revision bonus (+3 each) + Service bonuses (Flyer +10)
                </p>
              </div>
            </div>

            {/* Points Breakdown */}
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-heading font-bold">Points Breakdown</h2>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Logo Design:</span>
                  <span className="font-medium text-primary">45 pts</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Brand Identity:</span>
                  <span className="font-medium text-primary">50 pts</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">UI/UX Design:</span>
                  <span className="font-medium text-primary">65 pts</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Web Design:</span>
                  <span className="font-medium text-primary">65 pts</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Print Design:</span>
                  <span className="font-medium text-primary">20 pts</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Flyer Design:</span>
                  <span className="font-medium text-primary">30 pts <span className="text-xs text-green-500">(+10 bonus)</span></span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default SubmitWork;