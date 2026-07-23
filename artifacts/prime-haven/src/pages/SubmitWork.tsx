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
import DropZoneUpload from '@/components/ui/DropZoneUpload';

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

const SectionCard = ({ icon: Icon, title, desc, children, delay = 0 }: { icon: any; title: string; desc?: string; children: React.ReactNode; delay?: number }) => {
  return (
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
};

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
  const [startedProject, setStartedProject] = useState<{ jobId: string; title: string } | null>(null);
  const [parentSubmission, setParentSubmission] = useState<{ ph_approved: boolean } | null>(null);

  const correctionId = searchParams.get('correction');
  const correctionProject = searchParams.get('project');
  const correctionClient = searchParams.get('client');
  const correctionService = searchParams.get('service');

  const [formData, setFormData] = useState({
    projectName: '', serviceType: 'logo', clientReference: '',
    selectedJobId: '', description: '', deadline: '', designLink: '',
  });

  // Check if user has a started project
  useEffect(() => {
    if (user) {
      const stored = localStorage.getItem(`started_project_${user.id}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setStartedProject(parsed);
          // Auto-select the started project in the dropdown
          if (parsed?.jobId && !correctionId) {
            setFormData(prev => ({ ...prev, selectedJobId: parsed.jobId, projectName: prev.projectName || parsed.title || '' }));
          }
        } catch { }
      }
    }
  }, [user, correctionId]);

  useEffect(() => {
    const loadJobs = async () => {
      if (!user) return;
      try {
        // 1. Started client_projects — only assignments the designer has clicked "Start Work" on
        const { data: cpAssignments } = await supabase
          .from('project_assignments')
          .select(`status, project:client_projects(id, title, category)`)
          .eq('designer_id', user.id)
          .in('status', ['in_progress', 'active']);

        const availableCP = (cpAssignments || [])
          .filter((a: any) => a.project)
          .map((a: any) => ({
            id: a.project.id,
            title: a.project.title,
            client_name: null,
            category: a.project.category
          }));

        // 2. Claimed job_contracts (only in_progress or active claims that have not been submitted)
        const { data: jcClaims } = await supabase
          .from('job_contract_claims')
          .select(`contract:job_contracts(id, title, category)`)
          .eq('designer_id', user.id)
          .in('status', ['active', 'in_progress', 'claimed']);

        const availableJC = (jcClaims || [])
          .filter((c: any) => c.contract)
          .map((c: any) => ({
            id: c.contract.id,
            title: c.contract.title,
            client_name: null,
            category: c.contract.category
          }));

        // 3. Legacy client_orders
        const { data: legacyOrders } = await supabase.from('client_orders')
          .select('id, service_type')
          .eq('assigned_designer_id', user.id)
          .neq('project_status', 'completed');

        const availableLegacy = (legacyOrders || []).map((o: any) => ({
          id: o.id,
          title: `Legacy Order: ${o.service_type}`,
          client_name: null,
          category: o.service_type
        }));

        const data = [...availableCP, ...availableJC, ...availableLegacy];
        setAvailableJobs(data as JobOption[]);

        // Auto-select job for corrections
        if (correctionId && correctionClient) {
          const decodedClient = decodeURIComponent(correctionClient);
          const matchingJob = data.find(j => j.client_name === decodedClient || j.title.includes(decodedClient));
          if (matchingJob) {
            setFormData(prev => ({ ...prev, selectedJobId: matchingJob.id, clientReference: decodedClient }));
          }
        }
      } catch (err) { console.error('Error loading jobs:', err); }
      finally { setJobsLoading(false); }
    };
    loadJobs();

    if (correctionId) {
      const loadCorrectionParent = async () => {
        try {
          const { data, error } = await supabase.from('submissions').select('ph_approved').eq('id', correctionId).maybeSingle();
          if (!error && data) setParentSubmission(data as { ph_approved: boolean });
        } catch (err) {
          console.error('Error loading parent submission:', err);
        }
      };
      loadCorrectionParent();
    }
  }, [user, correctionId, correctionClient]);

  useEffect(() => {
    if (correctionId) {
      setFormData(prev => ({
        ...prev,
        projectName: correctionProject ? `${decodeURIComponent(correctionProject)}(CR)` : prev.projectName,
        clientReference: correctionClient ? decodeURIComponent(correctionClient) : prev.clientReference,
        serviceType: correctionService || prev.serviceType,
      }));
    }
  }, [correctionId, correctionProject, correctionClient, correctionService]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleJobSelect = (jobId: string) => {
    // If there's a started project, only allow selecting that project
    if (startedProject && startedProject.jobId && jobId !== startedProject.jobId) {
      toast({
        title: "Project Already Started",
        description: `You must submit your work for "${startedProject.title}" before starting another project.`,
        variant: "destructive",
      });
      return;
    }
    const job = availableJobs.find(j => j.id === jobId);
    setFormData(prev => ({ ...prev, selectedJobId: jobId, clientReference: job?.client_name || '', projectName: prev.projectName || job?.title || '' }));
  };

  const isLinkOnlyService = formData.serviceType === 'uiux' || formData.serviceType === 'web';

  // DropZoneUpload handles files now

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
      let parentApproved = false;
      if (correctionId) {
        if (parentSubmission) {
          parentApproved = !!parentSubmission.ph_approved;
        } else {
          const { data, error } = await supabase.from('submissions').select('ph_approved').eq('id', correctionId).maybeSingle();
          if (!error && data) parentApproved = !!data.ph_approved;
        }
      }

      const submissionData: any = {
        designer_id: user.id,
        project_name: formData.projectName.trim(),
        service_type: formData.serviceType,
        client_ref: formData.clientReference.trim(),
        files_urls: fileUrls,
        submission_date: new Date().toISOString(),
        status: correctionId ? (parentApproved ? 'ph_approved' : 'pending') : 'pending',
        ph_approved: correctionId ? parentApproved : false,
        ph_approved_at: correctionId && parentApproved ? new Date().toISOString() : null,
        points_awarded: 0,
        revisions_count: 0,
        client_preference: false,
        ...((isLinkOnlyService && formData.designLink.trim()) ? { design_link: formData.designLink.trim() } : {}),
      };
      if (correctionId) submissionData.parent_submission_id = correctionId;
      const { error } = await supabase.from('submissions').insert([submissionData]);
      if (error) throw error;

      // Reset the user's active contract state so they can claim new jobs
      if (formData.selectedJobId) {
        try {
          // 1. Try dedicated RPC
          await (supabase as any).rpc('submit_job_contract_work', {
            p_contract_id: formData.selectedJobId
          });
        } catch {
          // Fallback direct updates if RPC not deployed yet
          await (supabase as any)
            .from('job_contract_claims')
            .update({ status: 'submitted' })
            .eq('contract_id', formData.selectedJobId)
            .eq('designer_id', user.id);

          await (supabase as any)
            .from('project_assignments')
            .update({ status: 'submitted' })
            .eq('project_id', formData.selectedJobId)
            .eq('designer_id', user.id);

          await (supabase as any)
            .from('client_orders')
            .update({ project_status: 'submitted' })
            .eq('id', formData.selectedJobId)
            .eq('assigned_designer_id', user.id);

          // Remove user from active_designer_ids on job_contracts
          const { data: contractData } = await (supabase as any)
            .from('job_contracts')
            .select('active_designer_ids, active_designers_count')
            .eq('id', formData.selectedJobId)
            .single();

          if (contractData) {
            const currentIds: string[] = contractData.active_designer_ids || [];
            const newIds = currentIds.filter((id: string) => id !== user.id);
            const newCount = Math.max(0, (contractData.active_designers_count || 1) - 1);

            await (supabase as any)
              .from('job_contracts')
              .update({
                active_designer_ids: newIds,
                active_designers_count: newCount,
              })
              .eq('id', formData.selectedJobId);
          }
        }
      }

      try { await supabase.from('system_logs').insert({ action_type: correctionId ? 'correction_submitted' : 'work_submitted', admin_id: user.id, description: `${correctionId ? 'Correction' : 'New work'}: ${formData.projectName.trim()} (${formData.serviceType})`, timestamp: new Date().toISOString() }); } catch { }
      try { await supabase.functions.invoke('notify-designer', { body: { designerId: user.id, projectName: formData.projectName.trim(), notificationType: 'new_submission', serviceType: formData.serviceType } }); } catch { }

      // Clear local started project state and remove submitted job from dropdown
      if (user) localStorage.removeItem(`started_project_${user.id}`);
      setAvailableJobs(prev => prev.filter(j => j.id !== formData.selectedJobId));

      toast({ title: "Submission successful!", description: "Your work has been submitted and your account is reset for new job claims." });
      uploadedFiles.forEach(f => { if (f.preview) URL.revokeObjectURL(f.preview); });
      navigate('/dashboard');
    } catch (error: any) {
      toast({ title: "Submission failed", description: error.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const getSelectedService = () => serviceTypes.find(s => s.id === formData.serviceType);
  const successfulUploads = uploadedFiles.filter(f => f.url && !f.error);
  const uploadingFiles = uploadedFiles.filter(f => f.uploading);

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
                      <Select value={formData.selectedJobId} onValueChange={handleJobSelect}>
                        <SelectTrigger className="mt-1.5 h-9 text-xs bg-muted/20 border-border/40">
                          <SelectValue placeholder={jobsLoading ? "Loading..." : "Select a job"} />
                        </SelectTrigger>
                        <SelectContent>
                          {(() => {
                            // If a project has been started, only show that one
                            const visibleJobs = (startedProject && !correctionId)
                              ? availableJobs.filter(j => j.id === startedProject.jobId)
                              : availableJobs;
                            if (visibleJobs.length === 0 && !jobsLoading) {
                              return <SelectItem value="none" disabled>{startedProject ? 'Started project not found in active list' : 'No active jobs — start one first'}</SelectItem>;
                            }
                            return visibleJobs.map(job => (
                              <SelectItem key={job.id} value={job.id}>{job.title} {job.client_name ? `— ${job.client_name} ` : ''}{correctionId ? ' (CR)' : ''}</SelectItem>
                            ));
                          })()}
                        </SelectContent>
                      </Select>
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
              <SectionCard icon={Upload} title={`File Upload ${isLinkOnlyService ? '(Optional)' : ''} `} desc="JPG, PNG, PDF, ZIP, RAR — Max 50MB" delay={0.2}>
                <DropZoneUpload
                  files={uploadedFiles as any}
                  onFilesChange={(files) => setUploadedFiles(files as any)}
                  maxSizeMB={50}
                />
                {uploadError && (
                  <div className="mt-3 p-2.5 rounded-lg bg-destructive/5 border border-destructive/10">
                    <p className="text-[10px] text-destructive flex items-center gap-1.5"><XCircle className="w-3 h-3" />{uploadError}</p>
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
