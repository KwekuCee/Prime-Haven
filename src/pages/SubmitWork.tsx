import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Upload, 
  FileText, 
  Tag,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
  Image as ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/DashboardLayout';

import { SERVICE_TYPES } from '@/lib/serviceTypes';

const serviceTypes = SERVICE_TYPES;

interface UploadedFile {
  file: File;
  preview: string;
  uploading: boolean;
  url?: string;
  error?: string;
}

const SubmitWork = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadError, setUploadError] = useState<string>('');
  
  const correctionId = searchParams.get('correction');
  const correctionProject = searchParams.get('project');
  const correctionClient = searchParams.get('client');
  const correctionService = searchParams.get('service');

  const [formData, setFormData] = useState({
    projectName: '',
    serviceType: 'logo',
    clientReference: '',
    description: '',
    deadline: '',
    designLink: '',
  });

  useEffect(() => {
    if (correctionId) {
      setFormData(prev => ({
        ...prev,
        projectName: correctionProject ? `${decodeURIComponent(correctionProject)} (Correction)` : prev.projectName,
        clientReference: correctionClient ? decodeURIComponent(correctionClient) : prev.clientReference,
        serviceType: correctionService || prev.serviceType,
      }));
    }
  }, [correctionId, correctionProject, correctionClient, correctionService]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleServiceTypeChange = (value: string) => {
    setFormData(prev => ({ ...prev, serviceType: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    const newFiles = Array.from(files);
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'application/pdf'];
    const maxSize = 50 * 1024 * 1024; // 50MB

    for (const file of newFiles) {
      if (!validTypes.includes(file.type)) {
        setUploadError(`Invalid file type: ${file.type}. Accepted: JPG, PNG, GIF, SVG, PDF`);
        continue;
      }

      if (file.size > maxSize) {
        setUploadError(`File too large: ${file.name}. Max size: 50MB`);
        continue;
      }

      // Create preview for images
      const preview = file.type.startsWith('image/') 
        ? URL.createObjectURL(file) 
        : '';

      const newUploadedFile: UploadedFile = {
        file,
        preview,
        uploading: true,
      };

      setUploadedFiles(prev => [...prev, newUploadedFile]);
      setUploadError('');

      // Upload to Supabase Storage
      try {
        const fileExt = file.name.split('.').pop();
        // Use cryptographically random filename for security
        const randomId = crypto.randomUUID();
        const fileName = `${randomId}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('submissions')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Store the file path (not public URL) - we'll use signed URLs for access
        setUploadedFiles(prev => 
          prev.map(f => 
            f.file === file 
              ? { ...f, uploading: false, url: filePath }
              : f
          )
        );

        toast({
          title: "File uploaded!",
          description: `${file.name} has been uploaded successfully.`,
        });

      } catch (error: any) {
        console.error('Upload error:', error);
        setUploadedFiles(prev => 
          prev.map(f => 
            f.file === file 
              ? { ...f, uploading: false, error: error.message || 'Upload failed' }
              : f
          )
        );
      }
    }

    // Reset input
    e.target.value = '';
  };

  const removeFile = async (index: number) => {
    const fileToRemove = uploadedFiles[index];
    
    // If file was uploaded, delete from storage
    if (fileToRemove.url && user) {
      try {
        await supabase.storage
          .from('submissions')
          .remove([fileToRemove.url]);
      } catch (error) {
        console.error('Error deleting file:', error);
      }
    }

    // Revoke preview URL
    if (fileToRemove.preview) {
      URL.revokeObjectURL(fileToRemove.preview);
    }

    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
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

    const successfulUploads = uploadedFiles.filter(f => f.url && !f.error);
    if (successfulUploads.length === 0) {
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
      const fileUrls = successfulUploads.map(f => f.url!);

      const submissionData: any = {
        designer_id: user.id,
        project_name: formData.projectName.trim(),
        service_type: formData.serviceType,
        client_ref: formData.clientReference.trim(),
        files_urls: fileUrls,
        submission_date: new Date().toISOString(),
        status: correctionId ? 'ph_approved' : 'pending',
        ph_approved: correctionId ? true : false,
        ph_approved_at: correctionId ? new Date().toISOString() : null,
        points_awarded: 0,
        revisions_count: 0,
        client_preference: false,
        ...((formData.serviceType === 'uiux' || formData.serviceType === 'web') && formData.designLink.trim() ? { design_link: formData.designLink.trim() } : {}),
      };

      if (correctionId) {
        submissionData.parent_submission_id = correctionId;
      }

      const { error } = await supabase
        .from('submissions')
        .insert([submissionData]);

      if (error) throw error;

      // Log the submission action
      try {
        await supabase.from('system_logs').insert({
          action_type: correctionId ? 'correction_submitted' : 'work_submitted',
          admin_id: user.id,
          description: correctionId 
            ? `Correction submitted: ${formData.projectName.trim()} (${formData.serviceType})`
            : `New work submitted: ${formData.projectName.trim()} (${formData.serviceType})`,
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Failed to log submission:', logErr);
      }

      // Notify admin of new submission
      try {
        await supabase.functions.invoke('notify-designer', {
          body: {
            designerId: user.id,
            projectName: formData.projectName.trim(),
            notificationType: 'new_submission',
            serviceType: formData.serviceType,
          },
        });
      } catch (emailErr) {
        console.error('Failed to send admin notification:', emailErr);
      }

      toast({
        title: "Submission successful!",
        description: "Your work has been submitted for review.",
      });

      // Cleanup previews
      uploadedFiles.forEach(f => {
        if (f.preview) URL.revokeObjectURL(f.preview);
      });

      navigate('/dashboard');

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

  const successfulUploads = uploadedFiles.filter(f => f.url && !f.error);
  const uploadingFiles = uploadedFiles.filter(f => f.uploading);

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-heading font-bold mb-2">
                {correctionId ? 'Submit Correction' : 'Submit Work'}
              </h1>
              <p className="text-muted-foreground">
                {correctionId ? 'Submit your corrected work for review' : 'Submit your completed work for review and points'}
              </p>
            </div>
            <Badge variant="outline" className="gap-2 self-start sm:self-auto">
              <CheckCircle className="w-3 h-3" />
              Points Available: {getSelectedService()?.points || 15}
            </Badge>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column - Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Project Details */}
              <Card className="glass">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-primary" />
                    <div>
                      <CardTitle>Project Details</CardTitle>
                      <CardDescription>Basic information about your work</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="projectName">Project Name *</Label>
                    <Input
                      id="projectName"
                      name="projectName"
                      value={formData.projectName}
                      onChange={handleInputChange}
                      placeholder="e.g., TechFlow Dashboard Redesign"
                      required
                      className="mt-2 bg-card border-border"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Brief description of the project..."
                      rows={3}
                      className="mt-2 bg-card border-border resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="clientReference">
                        Client Reference * 
                        <span className="text-xs text-muted-foreground ml-1">(from job contract)</span>
                      </Label>
                      <Input
                        id="clientReference"
                        name="clientReference"
                        value={formData.clientReference}
                        onChange={handleInputChange}
                        placeholder="Enter exactly as shown"
                        required
                        className="mt-2 bg-card border-border"
                      />
                    </div>

                    <div>
                      <Label htmlFor="deadline">Deadline (Optional)</Label>
                      <Input
                        id="deadline"
                        name="deadline"
                        type="date"
                        value={formData.deadline}
                        onChange={handleInputChange}
                        className="mt-2 bg-card border-border"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Service Type */}
              <Card className="glass">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Tag className="w-5 h-5 text-primary" />
                    <div>
                      <CardTitle>Service Type</CardTitle>
                      <CardDescription>Select the type of work you're submitting</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>

              {/* File Upload */}
              <Card className="glass">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Upload className="w-5 h-5 text-primary" />
                    <div>
                      <CardTitle>File Upload</CardTitle>
                      <CardDescription>
                        {formData.serviceType === 'logo' && 'Upload pictures of the logo design'}
                        {formData.serviceType === 'branding' && 'Upload pictures of the brand identity'}
                        {formData.serviceType === 'uiux' && 'Upload the homepage/first screen design for approval'}
                        {formData.serviceType === 'web' && 'Upload screenshots of the developed site'}
                        {formData.serviceType === 'print' && 'Upload pictures of the print design'}
                        {formData.serviceType === 'flyer' && 'Upload pictures of the flyer design'}
                        {formData.serviceType === 'flyer' && 'Upload pictures of the flyer design'}
                        {' '}(JPG, PNG, GIF, SVG, PDF - Max 50MB)
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center hover:border-primary/50 transition-colors">
                    <Input
                      id="file-upload"
                      type="file"
                      multiple
                      accept=".jpg,.jpeg,.png,.gif,.svg,.pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploadingFiles.length > 0}
                    />
                    <Label
                      htmlFor="file-upload"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        {uploadingFiles.length > 0 ? (
                          <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        ) : (
                          <Upload className="w-8 h-8 text-primary" />
                        )}
                      </div>
                      <p className="font-medium mb-2">
                        {uploadingFiles.length > 0 
                          ? `Uploading ${uploadingFiles.length} file(s)...` 
                          : 'Click to upload files'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Drag and drop or click to browse
                      </p>
                    </Label>
                  </div>

                  {uploadError && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <p className="text-sm text-destructive flex items-center gap-2">
                        <XCircle className="w-4 h-4" />
                        {uploadError}
                      </p>
                    </div>
                  )}

                  {/* Uploaded Files Grid */}
                  {uploadedFiles.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {uploadedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="relative group rounded-lg border border-border overflow-hidden bg-card"
                        >
                          {file.preview ? (
                            <img
                              src={file.preview}
                              alt={file.file.name}
                              className="w-full h-32 object-cover"
                            />
                          ) : (
                            <div className="w-full h-32 flex items-center justify-center bg-secondary">
                              <FileText className="w-12 h-12 text-muted-foreground" />
                            </div>
                          )}
                          
                          <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => removeFile(index)}
                              disabled={file.uploading}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          {file.uploading && (
                            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                              <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                          )}

                          {file.error && (
                            <div className="absolute bottom-0 left-0 right-0 bg-destructive/90 text-xs p-2 text-center">
                              {file.error}
                            </div>
                          )}

                          {file.url && !file.error && (
                            <div className="absolute top-2 right-2">
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            </div>
                          )}

                          <div className="p-2">
                            <p className="text-xs truncate">{file.file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(file.file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Design Link (UI/UX Design and Web Development) */}
              {(formData.serviceType === 'uiux' || formData.serviceType === 'web') && (
                <Card className="glass">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <ImageIcon className="w-5 h-5 text-primary" />
                      <div>
                        <CardTitle>{formData.serviceType === 'uiux' ? 'Design Tool Link' : 'Website / Project Link'}</CardTitle>
                        <CardDescription>
                          {formData.serviceType === 'uiux' 
                            ? 'Provide a link to your Figma, Framer, or Adobe XD project'
                            : 'Provide a link to the developed website or project'}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Input
                      name="designLink"
                      value={formData.designLink}
                      onChange={handleInputChange}
                      placeholder={formData.serviceType === 'uiux' ? 'https://www.figma.com/file/...' : 'https://example.com'}
                      className="bg-card border-border"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      {formData.serviceType === 'uiux'
                        ? 'Upload screenshots above for initial approval, then include the full design link here.'
                        : 'Upload screenshots above and include the live site or repository link here.'}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                size="lg"
                className="w-full gap-2"
                disabled={loading || uploadingFiles.length > 0 || successfulUploads.length === 0}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Submit Work
                  </>
                )}
              </Button>
            </form>
          </motion.div>

          {/* Right Column - Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Selected Service Info */}
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-sm">Selected Service</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary mx-auto mb-4">
                    <Tag className="w-8 h-8" />
                  </div>
                  <h3 className="font-heading font-bold text-lg mb-1">
                    {getSelectedService()?.label}
                  </h3>
                  <p className="text-3xl font-bold text-primary mb-2">
                    +{getSelectedService()?.points} pts
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Points awarded upon approval
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Submission Guidelines */}
            <Card className="glass">
              <CardContent className="pt-6">
                <h3 className="font-medium text-sm mb-3">Submission Guidelines</h3>
                <ul className="text-xs text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Use the exact client reference from your job contract</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Upload high-quality images or source files</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Include all deliverables mentioned in the contract</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Review your submission before final upload</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Upload Status */}
            {uploadedFiles.length > 0 && (
              <Card className="glass">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-sm">Upload Status</h3>
                    <Badge variant="outline">
                      {successfulUploads.length}/{uploadedFiles.length}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Uploaded</span>
                      <span className="text-green-500">{successfulUploads.length}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Uploading</span>
                      <span className="text-primary">{uploadingFiles.length}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Failed</span>
                      <span className="text-destructive">
                        {uploadedFiles.filter(f => f.error).length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SubmitWork;
