import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Upload, FileText, Tag, CheckCircle, XCircle, Loader2, Trash2,
  Image as ImageIcon, Link as LinkIcon, Archive
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/DashboardLayout';
import { SERVICE_TYPES } from '@/lib/serviceTypes';

const serviceTypes = SERVICE_TYPES;

interface UploadedFile { file: File; preview: string; uploading: boolean; url?: string; error?: string; }
interface JobOption { id: string; title: string; client_name: string | null; category: string; }

const normalizeCategory = (title: string | null): string => {
  const t = (title || '').toLowerCase();
  if (t.includes('ui') || t.includes('ux') || t.includes('app')) return 'UI/UX Designer';
  if (t.includes('web') || t.includes('dev') || t.includes('frontend') || t.includes('fullstack') || t.includes('full-stack') || t.includes('backend')) return 'Web Developer';
  return 'Graphic Designer';
};

const categoryToJobCategory = (profession: string): string[] => {
  switch (profession) {
    case 'UI/UX Designer': return ['app-design'];
    case 'Web Developer': return ['web-dev'];
    default: return ['graphic-design'];
  }
};

const SectionCard = ({ icon: Icon, title, desc, children, delay = 0 }: { icon: any; title: string; desc?: string; children: React.ReactNode; delay?: number }) => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
    className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div>
        <h3 className="text-sm font-heading font-bold">{title}</h3>
        {desc && <p className="text-[10px] text-muted-foreground">{desc}</p>}
      </div>
    </div>
    {children}
  </motion.div>
);

const SubmitWork = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadError, setUploadError] = useState('');
  const [availableJobs, setAvailableJobs] = useState<JobOption[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  
  const correctionId = searchParams.get('correction');
  const correctionProject = searchParams.get('project');
  const correctionClient = searchParams.get('client');
  const correctionService = searchParams.get('service');

  const [formData, setFormData] = useState({
    projectName: '', serviceType: 'logo', clientReference: '',
    selectedJobId: '', description: '', deadline: '', designLink: '',
  });

  useEffect(() => {
    const loadJobs = async () => {
      if (!user) return;
      try {
        const { data: designerData } = await supabase.from('designer_details').select('professional_title').eq('user_id', user.id).maybeSingle();
        const profession = normalizeCategory(designerData?.professional_title || null);
        const jobCategories = categoryToJobCategory(profession);
        const { data, error } = await supabase.from('job_contracts').select('id, title, client_name, category').in('status', ['active', 'in_progress']).in('category', jobCategories).order('created_at', { ascending: false });
        if (!error && data) setAvailableJobs(data as JobOption[]);
      } catch (err) { console.error('Error loading jobs:', err); }
      finally { setJobsLoading(false); }
    };
    loadJobs();
  }, [user]);

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
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleJobSelect = (jobId: string) => {
    const job = availableJobs.find(j => j.id === jobId);
    setFormData(prev => ({ ...prev, selectedJobId: jobId, clientReference: job?.client_name || '', projectName: prev.projectName || job?.title || '' }));
  };

  const isLinkOnlyService = formData.serviceType === 'uiux' || formData.serviceType === 'web';

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'application/pdf', 'application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed', 'application/vnd.rar', 'application/octet-stream'];
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.pdf', '.zip', '.rar'];
    const maxSize = 50 * 1024 * 1024;

    for (const file of Array.from(files)) {
      const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
      if (!validTypes.includes(file.type) && !validExtensions.includes(ext)) { setUploadError(`Invalid file type: ${file.name}`); continue; }
      if (file.size > maxSize) { setUploadError(`File too large: ${file.name}. Max 50MB`); continue; }
      const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : '';
      const newFile: UploadedFile = { file, preview, uploading: true };
      setUploadedFiles(prev => [...prev, newFile]);
      setUploadError('');
      try {
        const fileExt = file.name.split('.').pop();
        const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
        const { error } = await supabase.storage.from('submissions').upload(filePath, file, { contentType: file.type || 'application/octet-stream', cacheControl: '3600' });
        if (error) throw error;
        setUploadedFiles(prev => prev.map(f => f.file === file ? { ...f, uploading: false, url: filePath } : f));
      } catch (error: any) {
        setUploadedFiles(prev => prev.map(f => f.file === file ? { ...f, uploading: false, error: error.message || 'Upload failed' } : f));
      }
    }
    e.target.value = '';
  };

  const removeFile = async (index: number) => {
    const f = uploadedFiles[index];
    if (f.url && user) { try { await supabase.storage.from('submissions').remove([f.url]); } catch {} }
    if (f.preview) URL.revokeObjectURL(f.preview);
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    if (!formData.projectName.trim()) { toast({ title: "Project name required", variant: "destructive" }); return; }
    const successfulUploads = uploadedFiles.filter(f => f.url && !f.error);
    const hasLink = isLinkOnlyService && formData.designLink.trim();
    if (!isLinkOnlyService && successfulUploads.length === 0) { toast({ title: "Files required", variant: "destructive" }); return; }
    if (isLinkOnlyService && successfulUploads.length === 0 && !hasLink) { toast({ title: "Files or link required", variant: "destructive" }); return; }
    if (!formData.selectedJobId && !formData.clientReference.trim()) { toast({ title: "Job selection required", variant: "destructive" }); return; }

    setLoading(true);
    try {
      const fileUrls = successfulUploads.map(f => f.url!);
      const submissionData: any = {
        designer_id: user.id, project_name: formData.projectName.trim(), service_type: formData.serviceType,
        client_ref: formData.clientReference.trim(), files_urls: fileUrls, submission_date: new Date().toISOString(),
        status: correctionId ? 'ph_approved' : 'pending', ph_approved: !!correctionId,
        ph_approved_at: correctionId ? new Date().toISOString() : null, points_awarded: 0, revisions_count: 0, client_preference: false,
        ...((isLinkOnlyService && formData.designLink.trim()) ? { design_link: formData.designLink.trim() } : {}),
      };
      if (correctionId) submissionData.parent_submission_id = correctionId;
      const { error } = await supabase.from('submissions').insert([submissionData]);
      if (error) throw error;
      try { await supabase.from('system_logs').insert({ action_type: correctionId ? 'correction_submitted' : 'work_submitted', admin_id: user.id, description: `${correctionId ? 'Correction' : 'New work'}: ${formData.projectName.trim()} (${formData.serviceType})`, timestamp: new Date().toISOString() }); } catch {}
      try { await supabase.functions.invoke('notify-designer', { body: { designerId: user.id, projectName: formData.projectName.trim(), notificationType: 'new_submission', serviceType: formData.serviceType } }); } catch {}
      toast({ title: "Submission successful!", description: "Your work has been submitted for review." });
      uploadedFiles.forEach(f => { if (f.preview) URL.revokeObjectURL(f.preview); });
      navigate('/dashboard');
    } catch (error: any) {
      toast({ title: "Submission failed", description: error.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const getSelectedService = () => serviceTypes.find(s => s.id === formData.serviceType);
  const successfulUploads = uploadedFiles.filter(f => f.url && !f.error);
  const uploadingFiles = uploadedFiles.filter(f => f.uploading);
  const getFileIcon = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    return (ext === 'zip' || ext === 'rar') ? <Archive className="w-8 h-8 text-muted-foreground" /> : <FileText className="w-8 h-8 text-muted-foreground" />;
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{correctionId ? 'Correction' : 'New submission'}</p>
              <h1 className="text-2xl sm:text-3xl font-heading font-bold">{correctionId ? 'Submit Correction' : 'Submit Work'}</h1>
            </div>
            <Badge variant="outline" className="text-[10px] gap-1.5 self-start sm:self-auto">
              <CheckCircle className="w-3 h-3" /> {getSelectedService()?.points || 15} pts available
            </Badge>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Project Details */}
              <SectionCard icon={FileText} title="Project Details" desc="Basic information" delay={0.05}>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Project Name *</Label>
                    <Input name="projectName" value={formData.projectName} onChange={handleInputChange} placeholder="e.g., TechFlow Dashboard Redesign" className="mt-1.5 h-9 text-xs bg-muted/20 border-border/40" required />
                  </div>
                  <div>
                    <Label className="text-xs">Description</Label>
                    <Textarea name="description" value={formData.description} onChange={handleInputChange} placeholder="Brief description..." rows={2} className="mt-1.5 text-xs bg-muted/20 border-border/40 resize-none" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Job Contract *</Label>
                      {correctionId ? (
                        <Input value={formData.clientReference} disabled className="mt-1.5 h-9 text-xs bg-muted/20 border-border/40" />
                      ) : (
                        <Select value={formData.selectedJobId} onValueChange={handleJobSelect}>
                          <SelectTrigger className="mt-1.5 h-9 text-xs bg-muted/20 border-border/40">
                            <SelectValue placeholder={jobsLoading ? "Loading..." : "Select a job"} />
                          </SelectTrigger>
                          <SelectContent>
                            {availableJobs.length === 0 && !jobsLoading ? (
                              <SelectItem value="none" disabled>No active jobs</SelectItem>
                            ) : availableJobs.map(job => (
                              <SelectItem key={job.id} value={job.id}>{job.title} {job.client_name ? `— ${job.client_name}` : ''}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs">Deadline (Optional)</Label>
                      <Input name="deadline" type="date" value={formData.deadline} onChange={handleInputChange} className="mt-1.5 h-9 text-xs bg-muted/20 border-border/40" />
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* Service Type */}
              <SectionCard icon={Tag} title="Service Type" desc="Select your work category" delay={0.1}>
                <RadioGroup value={formData.serviceType} onValueChange={(v) => setFormData(p => ({ ...p, serviceType: v }))} className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {serviceTypes.map((s) => (
                    <div key={s.id}>
                      <RadioGroupItem value={s.id} id={s.id} className="peer sr-only" />
                      <Label htmlFor={s.id} className="flex flex-col items-center justify-center rounded-xl border border-border/40 bg-muted/10 p-3 hover:bg-muted/20 cursor-pointer transition-all peer-data-[state=checked]:border-primary/50 peer-data-[state=checked]:bg-primary/5">
                        <span className="text-xs font-medium">{s.label}</span>
                        <span className="text-[10px] text-primary font-bold mt-0.5">{s.points} pts</span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </SectionCard>

              {/* Design Link */}
              {isLinkOnlyService && (
                <SectionCard icon={LinkIcon} title={formData.serviceType === 'uiux' ? 'Design Tool Link' : 'Project Link'} delay={0.15}>
                  <Input name="designLink" value={formData.designLink} onChange={handleInputChange} placeholder={formData.serviceType === 'uiux' ? 'https://figma.com/file/...' : 'https://example.com'} className="h-9 text-xs bg-muted/20 border-border/40" />
                  <p className="text-[9px] text-muted-foreground mt-1.5">You can submit just a link, files, or both.</p>
                </SectionCard>
              )}

              {/* File Upload */}
              <SectionCard icon={Upload} title={`File Upload ${isLinkOnlyService ? '(Optional)' : ''}`} desc="JPG, PNG, PDF, ZIP, RAR — Max 50MB" delay={0.2}>
                <div className="border border-dashed border-border/60 rounded-xl p-6 text-center hover:border-primary/30 transition-colors">
                  <Input id="file-upload" type="file" multiple accept=".jpg,.jpeg,.png,.gif,.svg,.pdf,.zip,.rar" onChange={handleFileUpload} className="hidden" disabled={uploadingFiles.length > 0} />
                  <Label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                      {uploadingFiles.length > 0 ? <Loader2 className="w-5 h-5 text-primary animate-spin" /> : <Upload className="w-5 h-5 text-primary" />}
                    </div>
                    <p className="text-xs font-medium">{uploadingFiles.length > 0 ? `Uploading ${uploadingFiles.length} file(s)...` : 'Click to upload'}</p>
                  </Label>
                </div>
                {uploadError && (
                  <div className="mt-3 p-2.5 rounded-lg bg-destructive/5 border border-destructive/10">
                    <p className="text-[10px] text-destructive flex items-center gap-1.5"><XCircle className="w-3 h-3" />{uploadError}</p>
                  </div>
                )}
                {uploadedFiles.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="relative group rounded-xl border border-border/40 overflow-hidden bg-muted/10">
                        {file.preview ? (
                          <img src={file.preview} alt={file.file.name} className="w-full h-24 object-cover" />
                        ) : (
                          <div className="w-full h-24 flex items-center justify-center">{getFileIcon(file.file)}</div>
                        )}
                        <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button type="button" variant="destructive" size="sm" onClick={() => removeFile(index)} disabled={file.uploading} className="h-7 text-[10px]">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        {file.uploading && <div className="absolute inset-0 bg-background/80 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>}
                        {file.url && !file.error && <div className="absolute top-1.5 right-1.5"><CheckCircle className="w-4 h-4 text-emerald-500" /></div>}
                        <div className="p-1.5">
                          <p className="text-[9px] truncate">{file.file.name}</p>
                          <p className="text-[8px] text-muted-foreground">{(file.file.size / 1024 / 1024).toFixed(1)} MB</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <Button type="submit" className="w-full text-xs" size="sm"
                  disabled={loading || uploadingFiles.length > 0 || (!isLinkOnlyService && successfulUploads.length === 0) || (isLinkOnlyService && successfulUploads.length === 0 && !formData.designLink.trim())}>
                  {loading ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Submitting...</> : <><CheckCircle className="w-3.5 h-3.5 mr-1.5" />Submit Work</>}
                </Button>
              </motion.div>
            </form>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5 text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-3">
                <Tag className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-heading font-bold">{getSelectedService()?.label}</h3>
              <p className="text-2xl font-heading font-bold text-primary mt-1">+{getSelectedService()?.points} pts</p>
              <p className="text-[9px] text-muted-foreground mt-1">Awarded upon approval</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5">
              <h3 className="text-xs font-heading font-bold mb-3">Guidelines</h3>
              <ul className="space-y-2">
                {['Select the job contract', 'Upload high-quality files', 'Include all deliverables', ...(isLinkOnlyService ? ['Submit link without files'] : []), 'Review before submitting'].map((text, i) => (
                  <li key={i} className="flex items-start gap-2 text-[10px] text-muted-foreground">
                    <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />{text}
                  </li>
                ))}
              </ul>
            </motion.div>

            {uploadedFiles.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-heading font-bold">Upload Status</h3>
                  <Badge variant="outline" className="text-[9px]">{successfulUploads.length}/{uploadedFiles.length}</Badge>
                </div>
                <div className="space-y-1 text-[10px]">
                  <div className="flex justify-between"><span className="text-muted-foreground">Uploaded</span><span className="text-emerald-500">{successfulUploads.length}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Uploading</span><span className="text-primary">{uploadingFiles.length}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Failed</span><span className="text-destructive">{uploadedFiles.filter(f => f.error).length}</span></div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SubmitWork;
