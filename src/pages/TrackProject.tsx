import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, Circle, Download, MessageCircle, Send, Loader2, Star, Heart, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import BrandLogo from '@/components/BrandLogo';

const KORAPAY_PUBLIC_KEY = "pk_live_AAZBw2DtmnyrGHfDJmNqkE4dKhw9gKQHVbz8Gds5";

interface Project {
  id: string;
  title: string;
  client_name: string;
  client_email?: string;
  description: string;
  category: string;
  status: string;
  progress_percentage: number;
  deadline: string | null;
  created_at: string;
  updated_at: string;
  accepted_designer_id?: string | null;
  tip_total?: number;
}

interface AcceptedDesigner {
  id: string;
  full_name: string | null;
  email: string | null;
  professional_title?: string | null;
  profile_photo_url?: string | null;
}

interface ChatMessage {
  id: string;
  sender_role: string;
  sender_name: string | null;
  content: string;
  created_at: string;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  status: string;
  sort_order: number;
  completed_at: string | null;
}

interface Deliverable {
  id: string;
  title: string;
  file_url: string;
  description: string;
  uploaded_at: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  pending: { label: 'Pending', color: 'text-muted-foreground', icon: Circle },
  in_progress: { label: 'In Progress', color: 'text-primary', icon: Clock },
  review: { label: 'Under Review', color: 'text-yellow-500', icon: Clock },
  completed: { label: 'Completed', color: 'text-emerald-500', icon: CheckCircle },
  on_hold: { label: 'On Hold', color: 'text-orange-500', icon: Clock },
};

const TrackProject = () => {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [acceptedDesigner, setAcceptedDesigner] = useState<AcceptedDesigner | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [feedbackContent, setFeedbackContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  const [tipOpen, setTipOpen] = useState(false);
  const [tipAmount, setTipAmount] = useState('20');
  const [tipMessage, setTipMessage] = useState('');
  const [tipSubmitting, setTipSubmitting] = useState(false);

  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSenderName, setChatSenderName] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const refetchProject = async () => {
    if (!token) return;
    const resp = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-project-tracking?token=${token}`,
      { headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` } }
    );
    if (resp.ok) {
      const data = await resp.json();
      setProject(data.project);
      setMilestones(data.milestones);
      setDeliverables(data.deliverables);
      setAcceptedDesigner(data.acceptedDesigner || null);
      if (data.project?.client_name && !chatSenderName) setChatSenderName(data.project.client_name);
    }
  };

  useEffect(() => {
    const fetchProject = async () => {
      if (!token) { setError(true); setLoading(false); return; }
      try { await refetchProject(); }
      catch { setError(true); }
      finally { setLoading(false); }
    };
    fetchProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!chatOpen || !token) return;
    let cancelled = false;
    const load = async () => {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/project-chat?token=${token}`,
        { headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` } }
      );
      if (!cancelled && resp.ok) {
        const d = await resp.json();
        setMessages(d.messages || []);
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
    };
    load();
    const i = setInterval(load, 5000);
    return () => { cancelled = true; clearInterval(i); };
  }, [chatOpen, token]);

  const handleSendChat = async () => {
    if (!chatInput.trim() || !token) return;
    setChatSending(true);
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/project-chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: JSON.stringify({ token, content: chatInput.trim(), senderName: chatSenderName || project?.client_name }),
        }
      );
      if (!resp.ok) throw new Error('send failed');
      setChatInput('');
      const r = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/project-chat?token=${token}`,
        { headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` } }
      );
      if (r.ok) { const d = await r.json(); setMessages(d.messages || []); }
    } catch (e: any) {
      toast({ title: 'Could not send', description: e.message, variant: 'destructive' });
    } finally { setChatSending(false); }
  };

  const handleTip = async () => {
    if (!project) return;
    const amt = Number(tipAmount);
    if (!amt || amt < 5) {
      toast({ title: 'Minimum tip is GH₵5', variant: 'destructive' });
      return;
    }
    if (!(window as any).Korapay) {
      toast({ title: 'Payment system loading', description: 'Please try again in a moment.' });
      return;
    }
    setTipSubmitting(true);
    const reference = `PH-TIP-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
    try {
      (window as any).Korapay.initialize({
        key: KORAPAY_PUBLIC_KEY,
        reference,
        amount: amt,
        currency: 'GHS',
        customer: {
          name: project.client_name || 'Client',
          email: project.client_email || 'client@primehaven.tech',
        },
        onSuccess: async () => {
          try {
            const resp = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-tip`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
                body: JSON.stringify({
                  reference, projectId: project.id,
                  clientName: project.client_name, clientEmail: project.client_email,
                  message: tipMessage, amount: amt,
                }),
              }
            );
            const j = await resp.json();
            if (j.success) {
              toast({ title: 'Tip sent! 💖', description: `Thank you for tipping GH₵${amt}.` });
              setTipOpen(false); setTipMessage('');
              await refetchProject();
            } else throw new Error(j.error || 'verification_failed');
          } catch (err: any) {
            toast({ title: 'Tip not recorded', description: err.message, variant: 'destructive' });
          } finally { setTipSubmitting(false); }
        },
        onClose: () => setTipSubmitting(false),
        onFailed: (d: any) => {
          setTipSubmitting(false);
          toast({ title: 'Payment failed', description: d?.message || 'Please try again.', variant: 'destructive' });
        },
      });
    } catch (e: any) {
      setTipSubmitting(false);
      toast({ title: 'Payment system error', description: e.message, variant: 'destructive' });
    }
  };

  const handleFeedback = async () => {
    if (!feedbackContent.trim() || !project) return;
    setSubmitting(true);
    try {
      // Update the client_orders table with rating and review
      const { error } = await (supabase
        .from('client_orders') as any)
        .update({
          client_rating: rating > 0 ? rating : null,
          client_review: feedbackContent.trim(),
          project_status: rating > 0 ? 'completed' : project.status // Auto-complete if rated? Or just feedback
        })
        .eq('id', project.id);

      if (error) throw error;
      toast({ title: 'Feedback sent!', description: 'Thank you for your review.' });
      setFeedbackContent('');
      setRating(0);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Could not send feedback.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <BrandLogo height={40} className="mx-auto mb-8" />
          <h1 className="text-2xl font-heading font-bold mb-4">Project Not Found</h1>
          <p className="text-muted-foreground">Please check your tracking link and try again.</p>
        </div>
      </div>
    );
  }

  const status = statusConfig[project.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <BrandLogo height={36} />
          <span className="text-sm text-muted-foreground">Project Tracker</span>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12 max-w-4xl">
        {/* Project Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <StatusIcon className={`w-5 h-5 ${status.color}`} />
            <span className={`text-sm font-semibold uppercase tracking-wider ${status.color}`}>{status.label}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-heading font-bold mb-2">{project.title}</h1>
          <p className="text-muted-foreground mb-6">{project.description}</p>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-bold text-primary">{project.progress_percentage}%</span>
            </div>
            <Progress value={project.progress_percentage} className="h-3" />
          </div>
        </motion.div>

        {/* Milestones */}
        {milestones.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-12">
            <h2 className="text-xl font-heading font-bold mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" /> Milestones
            </h2>
            <div className="space-y-1">
              {milestones.map((m, i) => {
                const done = m.status === 'completed';
                const active = m.status === 'in_progress';
                return (
                  <div key={m.id} className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-emerald-500/20 text-emerald-500' : active ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                        }`}>
                        {done ? <CheckCircle className="w-4 h-4" /> : <span className="text-xs font-bold">{i + 1}</span>}
                      </div>
                      {i < milestones.length - 1 && <div className={`w-0.5 h-8 ${done ? 'bg-emerald-500/30' : 'bg-border'}`} />}
                    </div>
                    <div className="pb-6">
                      <p className={`font-semibold ${done ? 'text-emerald-500' : active ? 'text-foreground' : 'text-muted-foreground'}`}>{m.title}</p>
                      {m.description && <p className="text-sm text-muted-foreground">{m.description}</p>}
                      {m.completed_at && <p className="text-xs text-muted-foreground mt-1">Completed {new Date(m.completed_at).toLocaleDateString()}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Deliverables */}
        {deliverables.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-12">
            <h2 className="text-xl font-heading font-bold mb-6 flex items-center gap-2">
              <Download className="w-5 h-5 text-primary" /> Deliverables
            </h2>
            <div className="grid gap-3">
              {deliverables.map((d) => (
                <a key={d.id} href={d.file_url} target="_blank" rel="noopener noreferrer" className="glass rounded-xl p-4 flex items-center justify-between hover:border-primary/30 transition-colors group">
                  <div>
                    <p className="font-semibold group-hover:text-primary transition-colors">{d.title}</p>
                    {d.description && <p className="text-sm text-muted-foreground">{d.description}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{new Date(d.uploaded_at).toLocaleDateString()}</p>
                  </div>
                  <Download className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </a>
              ))}
            </div>
          </motion.div>
        )}

        {/* Feedback & Rating Form */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass rounded-2xl p-6">
          <h2 className="text-xl font-heading font-bold mb-2 flex items-center gap-2">
            <Star className="w-5 h-5 text-primary" /> Rate & Review Work
          </h2>
          <p className="text-sm text-muted-foreground mb-6">Your feedback helps us maintain high quality standards.</p>

          <div className="space-y-6">
            <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-muted/20 border border-border/50">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Overall Rating</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-transform hover:scale-110 active:scale-95"
                  >
                    <Star
                      className={`w-8 h-8 ${star <= (hoverRating || rating)
                        ? 'fill-primary text-primary'
                        : 'text-muted-foreground/30'
                        }`}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-xs font-semibold text-primary">
                  {['Poor', 'Fair', 'Good', 'Very Good', 'Exceptional'][rating - 1]}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase">Your Comments</Label>
              <Textarea
                placeholder="Share your thoughts on the quality, communication, and turnaround time..."
                value={feedbackContent}
                onChange={(e) => setFeedbackContent(e.target.value)}
                rows={4}
                className="glass bg-background/50"
              />
            </div>

            <Button onClick={handleFeedback} disabled={submitting || !feedbackContent.trim()} className="w-full h-12 glow-primary font-bold">
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Submit Final Feedback
            </Button>
          </div>
        </motion.div>

        {/* Workspace Link */}
        <div className="mt-8 text-center p-6 rounded-2xl border border-dashed border-border/60">
          <p className="text-sm text-muted-foreground mb-4">Need to chat with your designer directly?</p>
          <Button variant="outline" className="gap-2" onClick={() => window.open(`/workspace/${project.id}`, '_blank')}>
            <MessageCircle className="w-4 h-4" /> Open Project Workspace
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TrackProject;
