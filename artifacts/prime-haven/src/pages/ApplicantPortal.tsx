import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  CheckCircle2, Loader2, PlayCircle, Lock, Trophy, XCircle, CreditCard, Upload,
  ShieldCheck, MessageCircle, ArrowRight, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import BrandLogo from '@/components/BrandLogo';
import Seo from '@/components/Seo';
import { JOIN_FEE_USD, getUsdToGhsRate, usdToGhs, formatUsd, formatGhs, type ExchangeRate } from '@/lib/currency';
import { openPaystackCheckout } from '@/lib/paystack';
import {
  fetchPortalState, uploadApplicantFile, reportCopyEvent, trackHasPractical,
  type AssessmentQuestion, type PracticalTask, type PortalState,
} from '@/lib/applicants';

import ApplicantShell, {
  PortalCard, TrackPanel, NextStepsPanel, type PortalStage,
} from '@/components/applicant/ApplicantShell';

const KORAPAY_PUBLIC_KEY = 'pk_live_AAZBw2DtmnyrGHfDJmNqkE4dKhw9gKQHVbz8Gds5';
const inputClass = 'h-12 bg-background border-border/70 focus:border-primary/50 rounded-xl';

type Stage = PortalStage;

const ApplicantPortal = () => {
  const { token = '' } = useParams();
  const { toast } = useToast();

  const [stage, setStage] = useState<Stage>('loading');
  const [blockedMessage, setBlockedMessage] = useState('');
  const [state, setState] = useState<PortalState | null>(null);

  // video
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoFinished, setVideoFinished] = useState(false);

  // assessment
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [task, setTask] = useState<PracticalTask | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [practicalFile, setPracticalFile] = useState<File | null>(null);
  const [practicalText, setPracticalText] = useState('');
  const [starting, setStarting] = useState(false);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean; passMark: number; correctCount: number; totalQuestions: number } | null>(null);
  const [copyWarning, setCopyWarning] = useState<string | null>(null);

  // payment
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [gateway, setGateway] = useState<'korapay' | 'paystack'>('korapay');
  const [fx, setFx] = useState<ExchangeRate | null>(null);
  const [paying, setPaying] = useState(false);

  const stageFor = (status: string, videoWatched: boolean): Stage => {
    if (status === 'failed') return 'failed';
    if (status === 'passed') return 'payment';
    if (status === 'paid') return 'verify';
    if (status === 'active') return 'active';
    return videoWatched ? 'assessment' : 'video';
  };

  const load = useCallback(async (action: 'state' | 'video_watched' = 'state') => {
    const res = await fetchPortalState(token, action);
    if (!res || res.success === false) {
      setBlockedMessage((res as any)?.message || 'This link is not valid.');
      setStage('blocked');
      return null;
    }
    const data = res as { success: true } & PortalState;
    setState(data);
    setStage(stageFor(data.applicant.status, data.applicant.videoWatched));
    return data;
  }, [token]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (stage !== 'payment') return;
    getUsdToGhsRate().then(setFx).catch(() => {});
  }, [stage]);

  // ── anti-cheating: copy detection ────────────────────────────────────────
  const handleCopyAttempt = useCallback(async () => {
    const res = await reportCopyEvent(token);
    if (!res?.success) return;
    if (res.rejected) {
      setCopyWarning(null);
      setQuestions([]);
      setAnswers({});
      toast({
        variant: 'destructive',
        title: 'Assessment closed',
        description: res.message || 'Copying was detected a second time, so your attempt has ended.',
      });
      await load();
      return;
    }
    setCopyWarning(res.message || 'Copying was detected. One more attempt and your application is rejected automatically.');
    toast({ variant: 'destructive', title: 'Copying detected', description: 'A second attempt ends your assessment automatically.' });
  }, [token, toast, load]);

  useEffect(() => {
    if (stage !== 'assessment' || questions.length === 0) return;
    const onCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      void handleCopyAttempt();
    };
    document.addEventListener('copy', onCopy);
    return () => document.removeEventListener('copy', onCopy);
  }, [stage, questions.length, handleCopyAttempt]);

  // ── video stage ──────────────────────────────────────────────────────────
  const handleVideoEnded = () => setVideoFinished(true);

  const continueFromVideo = async () => {
    const data = await load('video_watched');
    if (data) setStage('assessment');
  };

  // ── assessment stage ─────────────────────────────────────────────────────
  const startAssessment = async () => {
    setStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke('start-assessment', { body: { token } });
      const payload = data as { success?: boolean; questions?: AssessmentQuestion[]; task?: PracticalTask; message?: string };
      if (error || !payload?.success) {
        toast({ variant: 'destructive', title: 'Could not start', description: payload?.message || 'Please try again in a moment.' });
        return;
      }
      setQuestions(payload.questions || []);
      setTask(payload.task || null);
    } finally {
      setStarting(false);
    }
  };

  const submitAssessment = async () => {
    if (Object.keys(answers).length < questions.length) {
      toast({ variant: 'destructive', title: 'Almost there', description: 'Please answer every question before submitting.' });
      return;
    }
    if (task && !practicalFile && !practicalText.trim()) {
      toast({ variant: 'destructive', title: 'Practical task', description: 'Upload your file or paste a link / short write-up.' });
      return;
    }

    setSubmittingQuiz(true);
    try {
      const practicalUrl = practicalFile ? await uploadApplicantFile('practical', practicalFile) : null;
      const { data, error } = await supabase.functions.invoke('submit-assessment', {
        body: { token, answers, practicalUrl, practicalText: practicalText.trim() || null, origin: window.location.origin },
      });
      const payload = data as { success?: boolean; score?: number; passed?: boolean; passMark?: number; correctCount?: number; totalQuestions?: number; message?: string };
      if (error || !payload?.success) {
        toast({ variant: 'destructive', title: 'Submission failed', description: payload?.message || 'Please try again.' });
        return;
      }
      setResult({
        score: payload.score || 0,
        passed: !!payload.passed,
        passMark: payload.passMark || 70,
        correctCount: payload.correctCount || 0,
        totalQuestions: payload.totalQuestions || 0,
      });
      setStage('result');
    } catch (err) {
      toast({ variant: 'destructive', title: 'Submission failed', description: err instanceof Error ? err.message : 'Please try again.' });
    } finally {
      setSubmittingQuiz(false);
    }
  };

  // ── payment stage ────────────────────────────────────────────────────────
  const finalize = async (reference: string) => {
    if (!state) return;
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: state.applicant.email,
        password,
        options: {
          data: {
            full_name: state.applicant.fullName,
            professional_title: state.applicant.track,
            payment_reference: reference,
            gateway,
          },
        },
      });
      if (signUpError) throw signUpError;

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: state.applicant.email,
        password,
      });

      if (!signInError) {
        const { error: verifyError } = await supabase.functions.invoke('verify-payment', {
          body: { reference, gateway },
        });
        if (verifyError) {
          toast({ variant: 'destructive', title: 'Payment recorded, follow-up failed', description: 'Please contact support so we can finish setting up your account.' });
        }
        await supabase.functions.invoke('applicant-paid', { body: { token, reference } });
        await supabase.auth.signOut();
      }

      toast({ title: 'Registration complete 🎉', description: 'Check your email to verify your account.' });
      await load();
      setStage('verify');
    } catch (err) {
      toast({ variant: 'destructive', title: 'Registration error', description: err instanceof Error ? err.message : 'Unexpected error.' });
    } finally {
      setPaying(false);
    }
  };

  const handlePay = async () => {
    if (!state) return;
    if (password.length < 8) {
      toast({ variant: 'destructive', title: 'Password too short', description: 'Use at least 8 characters.' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Passwords do not match', description: 'Please re-enter your password.' });
      return;
    }
    if (gateway === 'korapay' && !(window as any).Korapay) {
      toast({ title: 'Payment system loading', description: 'Give it a moment and try again.' });
      return;
    }

    setPaying(true);
    const reference = `PH-APP-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

    let rate: ExchangeRate;
    try {
      rate = await getUsdToGhsRate(true);
      setFx(rate);
    } catch {
      setPaying(false);
      toast({ variant: 'destructive', title: 'Exchange rate unavailable', description: 'Please try again in a moment.' });
      return;
    }
    const amountGhs = usdToGhs(JOIN_FEE_USD, rate.rate);
    const metadata = {
      amount_usd: JOIN_FEE_USD,
      usd_to_ghs_rate: rate.rate,
      rate_source: rate.source,
      purpose: 'registration_fee',
      full_name: state.applicant.fullName,
    };

    if (gateway === 'paystack') {
      const opened = await openPaystackCheckout({
        email: state.applicant.email,
        amountGhs,
        reference,
        metadata,
        onSuccess: () => { finalize(reference); },
        onClose: () => setPaying(false),
      });
      if (!opened) {
        setPaying(false);
        toast({ variant: 'destructive', title: 'Paystack did not open', description: 'Refresh the page or pay with Korapay instead.' });
      }
      return;
    }

    try {
      (window as any).Korapay.initialize({
        key: KORAPAY_PUBLIC_KEY,
        reference,
        amount: amountGhs,
        currency: 'GHS',
        customer: { name: state.applicant.fullName, email: state.applicant.email },
        metadata,
        onSuccess: async () => { await finalize(reference); },
        onClose: () => setPaying(false),
        onFailed: (d: any) => {
          setPaying(false);
          toast({ variant: 'destructive', title: 'Payment failed', description: d?.message || 'Payment could not be completed.' });
        },
      });
    } catch {
      setPaying(false);
      toast({ variant: 'destructive', title: 'Payment system error', description: 'Could not open Korapay. Please refresh.' });
    }
  };

  // ── render ───────────────────────────────────────────────────────────────
  if (stage === 'loading') {
    return <ApplicantShell {...shellProps}><PortalCard className="text-center"><Loader2 className="w-7 h-7 animate-spin mx-auto text-primary" /></PortalCard></ApplicantShell>;
  }

  if (stage === 'blocked') {
    return (
      <ApplicantShell {...shellProps}>
        <PortalCard className="text-center">
          <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-3">Not available</h1>
          <p className="text-muted-foreground mb-6">{blockedMessage}</p>
          <Button asChild variant="outline" className="rounded-xl"><Link to="/">Back to home</Link></Button>
        </PortalCard>
      </ApplicantShell>
    );
  }

  const name = state?.applicant.fullName.split(' ')[0] || 'there';

  if (stage === 'video') {
    return (
      <ApplicantShell {...shellProps}>
        <PortalCard>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Welcome, {name} 👋</h1>
          <p className="text-muted-foreground mb-6">
            Watch this short intro all the way through. It covers who we are, the work we deliver, and exactly what the
            one-time registration fee covers. The assessment unlocks when the video finishes.
          </p>

          {state?.videoUrl ? (
            <div className="rounded-2xl overflow-hidden bg-black mb-6">
              <video
                ref={videoRef}
                src={state.videoUrl}
                controls
                controlsList="nodownload noplaybackrate"
                onEnded={handleVideoEnded}
                className="w-full aspect-video"
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/70 p-8 text-center mb-6">
              <PlayCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                The intro video is being prepared. You can continue to the assessment in the meantime.
              </p>
            </div>
          )}

          <Button
            onClick={continueFromVideo}
            disabled={!!state?.videoUrl && !videoFinished}
            className="w-full h-12 rounded-xl"
          >
            {state?.videoUrl && !videoFinished ? 'Finish the video to continue' : (<>Continue to the assessment <ArrowRight className="w-4 h-4 ml-2" /></>)}
          </Button>
        </PortalCard>
      </ApplicantShell>
    );
  }

  if (stage === 'assessment') {
    if (questions.length === 0) {
      return (
        <ApplicantShell {...shellProps}>
          <PortalCard>
            <h1 className="text-2xl font-bold mb-2">{state?.applicant.track} assessment</h1>
            <p className="text-muted-foreground mb-6">
              You'll get a randomised set of questions for your track{trackHasPractical(state?.applicant.track) ? ' plus one small practical task' : ''}.
              Answer honestly — this is the only stage that decides whether you move forward, and you get one attempt.
              Copying text from this page is detected: the first time is a warning, the second ends your application.
            </p>
            <Button onClick={startAssessment} disabled={starting} className="w-full h-12 rounded-xl">
              {starting ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Preparing your questions…</>) : 'Start my assessment'}
            </Button>
          </PortalCard>
        </ApplicantShell>
      );
    }

    const answered = Object.keys(answers).length;
    return (
      <ApplicantShell {...shellProps}>
        <PortalCard>
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-xl font-bold">{state?.applicant.track} assessment</h1>
              <span className="text-sm text-muted-foreground">{answered} / {questions.length}</span>
            </div>
            <Progress value={(answered / questions.length) * 100} className="h-2" />
          </div>

          {copyWarning && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-destructive">Copying detected</p>
                <p className="text-sm text-muted-foreground">{copyWarning}</p>
              </div>
            </div>
          )}

          <div className="space-y-7">
            {questions.map((q, i) => (
              <div key={q.id} className="space-y-3">
                <p className="font-medium">
                  <span className="text-muted-foreground mr-2">{i + 1}.</span>{q.prompt}
                </p>
                <RadioGroup
                  value={answers[q.id] !== undefined ? String(answers[q.id]) : ''}
                  onValueChange={(v) => setAnswers((p) => ({ ...p, [q.id]: Number(v) }))}
                  className="space-y-2"
                >
                  {(q.options || []).map((opt, idx) => (
                    <label key={idx} className="flex items-start gap-3 rounded-xl border border-border/60 p-3 cursor-pointer hover:border-primary/40 transition-colors">
                      <RadioGroupItem value={String(idx)} id={`${q.id}-${idx}`} className="mt-0.5" />
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>
            ))}
          </div>

          {task && (
            <div className="mt-9 pt-7 border-t border-border/60">
              <h2 className="text-lg font-bold mb-1">Practical task — {task.title}</h2>
              <p className="text-sm text-muted-foreground mb-5">{task.brief}</p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground" htmlFor="practical-file">Upload your work</Label>
                  <label htmlFor="practical-file" className="flex items-center gap-3 h-12 px-4 rounded-xl border border-dashed border-border/70 cursor-pointer hover:border-primary/50 transition-colors">
                    <Upload className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm truncate">{practicalFile ? practicalFile.name : 'Attach a file (optional if you share a link)'}</span>
                  </label>
                  <input
                    id="practical-file"
                    type="file"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      if (f && f.size > 25 * 1024 * 1024) {
                        toast({ variant: 'destructive', title: 'File too large', description: 'Please keep files under 25MB.' });
                        e.target.value = '';
                        return;
                      }
                      setPracticalFile(f);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground" htmlFor="practical-text">Link and / or notes</Label>
                  <Textarea
                    id="practical-text"
                    rows={4}
                    value={practicalText}
                    onChange={(e) => setPracticalText(e.target.value)}
                    placeholder="Paste a public link (Figma, Drive, CodeSandbox…) and a short explanation of your decisions."
                    className="rounded-xl"
                  />
                </div>
              </div>
            </div>
          )}

          <Button onClick={submitAssessment} disabled={submittingQuiz} className="w-full h-12 rounded-xl mt-8">
            {submittingQuiz ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Scoring your answers…</>) : 'Submit my assessment'}
          </Button>
        </PortalCard>
      </ApplicantShell>
    );
  }

  if (stage === 'result' && result) {
    if (!result.passed) {
      return (
        <ApplicantShell {...shellProps}>
          <PortalCard className="text-center">
            <XCircle className="w-14 h-14 text-muted-foreground mx-auto mb-5" />
            <h1 className="text-2xl font-bold mb-3">Thank you for trying, {name}</h1>
            <p className="text-muted-foreground mb-2">
              You scored {result.score}% ({result.correctCount} of {result.totalQuestions}). Our bar for this round is {result.passMark}%.
            </p>
            <p className="text-muted-foreground mb-6">
              We won't be moving forward this time, and there's nothing to pay. Keep building — you're welcome to apply
              again in the future.
            </p>
            <Button asChild variant="outline" className="rounded-xl"><Link to="/">Back to home</Link></Button>
          </PortalCard>
        </ApplicantShell>
      );
    }
    return (
      <ApplicantShell {...shellProps}>
        <PortalCard className="text-center">
          <Trophy className="w-14 h-14 text-primary mx-auto mb-5" />
          <h1 className="text-2xl font-bold mb-3">You passed, {name} 🎉</h1>
          <p className="text-muted-foreground mb-6">
            You scored {result.score}% ({result.correctCount} of {result.totalQuestions}). One last step: complete your
            one-time registration to activate your professional account.
          </p>
          <Button onClick={() => setStage('payment')} className="h-12 rounded-xl px-8">
            Continue to registration <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </PortalCard>
      </ApplicantShell>
    );
  }

  if (stage === 'failed') {
    return (
      <ApplicantShell {...shellProps}>
        <PortalCard className="text-center">
          <XCircle className="w-14 h-14 text-muted-foreground mx-auto mb-5" />
          <h1 className="text-2xl font-bold mb-3">Thank you for applying</h1>
          <p className="text-muted-foreground mb-6">
            Your assessment didn't reach our bar this round{state?.applicant.score !== null ? ` (${state?.applicant.score}%)` : ''}.
            There is nothing to pay. Keep building and feel free to apply again later.
          </p>
          <Button asChild variant="outline" className="rounded-xl"><Link to="/">Back to home</Link></Button>
        </PortalCard>
      </ApplicantShell>
    );
  }

  if (stage === 'payment') {
    const amountGhs = fx ? usdToGhs(JOIN_FEE_USD, fx.rate) : null;
    return (
      <ApplicantShell {...shellProps}>
        <PortalCard>
          <h1 className="text-2xl font-bold mb-2">Complete your registration</h1>
          <p className="text-muted-foreground mb-6">
            A one-time {formatUsd(JOIN_FEE_USD)} registration activates your professional account: your dashboard, the
            job marketplace, payouts and access to our private Discord.
          </p>

          <div className="rounded-2xl bg-muted/50 p-5 mb-6">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">Registration fee</span>
              <span className="text-xl font-bold">{formatUsd(JOIN_FEE_USD)}</span>
            </div>
            {amountGhs !== null && (
              <p className="text-xs text-muted-foreground">
                Charged as {formatGhs(amountGhs)} at today's rate (1 USD = {fx?.rate.toFixed(2)} GHS).
              </p>
            )}
          </div>

          <div className="space-y-4 mb-6">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Your email</Label>
              <Input value={state?.applicant.email || ''} readOnly className={`${inputClass} opacity-70`} />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground" htmlFor="app-pass">Create a password</Label>
                <Input id="app-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="At least 8 characters" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground" htmlFor="app-pass2">Confirm password</Label>
                <Input id="app-pass2" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} placeholder="Repeat it" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {(['korapay', 'paystack'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setGateway(p)}
                className={`rounded-xl border p-4 text-left transition-colors ${gateway === p ? 'border-primary bg-primary/5' : 'border-border/60 hover:border-primary/40'}`}
              >
                <span className="block text-sm font-semibold capitalize">{p}</span>
                <span className="mt-1 block text-[11px] text-muted-foreground">
                  {p === 'korapay' ? 'Mobile money, cards & bank transfer' : 'Cards, mobile money & bank — ready to use'}
                </span>
              </button>
            ))}
          </div>

          <Button onClick={handlePay} disabled={paying} className="w-full h-12 rounded-xl">
            {paying ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing…</>) : (<><CreditCard className="w-4 h-4 mr-2" /> Pay {formatUsd(JOIN_FEE_USD)} & activate</>)}
          </Button>
          <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-4">
            <ShieldCheck className="w-3.5 h-3.5" /> Payments are verified with the gateway before your account is activated.
          </p>
        </PortalCard>
      </ApplicantShell>
    );
  }

  if (stage === 'verify') {
    return (
      <ApplicantShell {...shellProps}>
        <PortalCard className="text-center">
          <CheckCircle2 className="w-14 h-14 text-primary mx-auto mb-5" />
          <h1 className="text-2xl font-bold mb-3">Payment received — verify your email</h1>
          <p className="text-muted-foreground mb-6">
            We sent a verification link to <strong>{state?.applicant.email}</strong>. Click it to activate your account,
            then come back to this page or sign in directly.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => load()} variant="outline" className="rounded-xl">I've verified — refresh</Button>
            <Button asChild className="rounded-xl"><Link to="/login">Go to sign in</Link></Button>
          </div>
        </PortalCard>
      </ApplicantShell>
    );
  }

  // active
  return (
    <ApplicantShell {...shellProps}>
      <PortalCard className="text-center">
        <Trophy className="w-14 h-14 text-primary mx-auto mb-5" />
        <h1 className="text-2xl font-bold mb-3">You're in, {name}! 🎉</h1>
        <p className="text-muted-foreground mb-6">
          Your professional account is active. Sign in to your dashboard to set up your profile and start claiming jobs
          from the marketplace.
        </p>
        <div className="rounded-2xl bg-muted/50 p-5 text-left mb-6">
          <p className="flex items-center gap-2 font-semibold mb-2"><MessageCircle className="w-4 h-4 text-primary" /> Join the private Discord</p>
          <p className="text-sm text-muted-foreground mb-3">
            All briefs, announcements and team chat happen there. Your personal invite was emailed to you
            {state?.discordInvite ? ', or use the link below' : ''}.
          </p>
          {state?.discordInvite && (
            <a href={state.discordInvite} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary underline break-all">
              {state.discordInvite}
            </a>
          )}
        </div>
        <Button asChild className="h-12 rounded-xl px-8"><Link to="/login">Sign in to my dashboard</Link></Button>
      </PortalCard>
    </ApplicantShell>
  );
};

export default ApplicantPortal;
