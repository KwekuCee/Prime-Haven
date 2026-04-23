import { useState, useEffect } from 'react';
import BrandLogo from '@/components/BrandLogo';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, User, Briefcase, Lock, CreditCard, Loader2, Eye, EyeOff, CalendarIcon, Sparkles, Globe } from 'lucide-react';

import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  registerPersonalSchema,
  registerSkillsSchema,
  registerAccountSchema,
  RegisterPersonalData,
  RegisterSkillsData,
  RegisterAccountData,
  getMinimumAgeDate,
} from '@/lib/validations';

declare global {
  interface Window {
    Korapay: {
      initialize: (config: any) => void;
    };
    PaystackPop: {
      setup: (config: any) => { openIframe: () => void };
    };
  }
}

const KORAPAY_PUBLIC_KEY = "pk_live_AAZBw2DtmnyrGHfDJmNqkE4dKhw9gKQHVbz8Gds5";
const PAYSTACK_PUBLIC_KEY = "pk_live_4c60eef11210f3101a756799825004c3145d5edb"; // User needs to update this
const REGISTRATION_FEE_GHS = 100;


const steps = [
  { id: 1, name: 'Personal', icon: User },
  { id: 2, name: 'Skills', icon: Briefcase },
  { id: 3, name: 'Account', icon: Lock },
  { id: 4, name: 'Payment', icon: CreditCard },
];

const inputClass = "h-11 bg-background/60 border-border/60 focus:border-primary/50 focus:ring-primary/20 rounded-xl";
const labelClass = "text-xs font-medium text-muted-foreground uppercase tracking-wider";

const Register = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [dobOpen, setDobOpen] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '', email: '', phone: '', dob: undefined as Date | undefined,
    portfolioUrl: '', professionalTitle: '', experience: '', availableHours: '',
    previousCompany: '', password: '', confirmPassword: '', agreeToTerms: false,
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  const { signUp, user, loading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gateway, setGateway] = useState<'korapay' | 'paystack'>('korapay');


  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [isPromoValidating, setIsPromoValidating] = useState(false);
  const [promoRef, setPromoRef] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) navigate('/dashboard');
  }, [user, authLoading, navigate]);

  const personalForm = useForm<RegisterPersonalData>({
    resolver: zodResolver(registerPersonalSchema),
    defaultValues: { fullName: formData.fullName, email: formData.email, phone: formData.phone, dob: formData.dob, portfolioUrl: formData.portfolioUrl, professionalTitle: formData.professionalTitle },
  });

  const skillsForm = useForm<RegisterSkillsData>({
    resolver: zodResolver(registerSkillsSchema),
    defaultValues: { experience: formData.experience, availableHours: formData.availableHours, previousCompany: formData.previousCompany },
  });

  const accountForm = useForm<RegisterAccountData>({
    resolver: zodResolver(registerAccountSchema),
    defaultValues: { password: formData.password, confirmPassword: formData.confirmPassword, agreeToTerms: formData.agreeToTerms as true },
  });

  const updateFormData = (field: string, value: unknown) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleStep1Submit = (data: RegisterPersonalData) => { Object.entries(data).forEach(([k, v]) => updateFormData(k, v)); setCurrentStep(2); };
  const handleStep2Submit = (data: RegisterSkillsData) => { Object.entries(data).forEach(([k, v]) => updateFormData(k, v)); setCurrentStep(3); };
  const handleStep3Submit = (data: RegisterAccountData) => { Object.entries(data).forEach(([k, v]) => updateFormData(k, v)); setCurrentStep(4); };
  const prevStep = () => { if (currentStep > 1) setCurrentStep(currentStep - 1); };

  const applyPromoCode = async () => {
    if (!promoCode.trim()) return;
    setIsPromoValidating(true);
    try {
      const { data, error } = await (supabase as any)
        .from('promo_codes')
        .select('*')
        .eq('code', promoCode.toUpperCase().trim())
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast({ title: 'Invalid Code', description: 'This promo code does not exist or is inactive.', variant: 'destructive' });
        setPromoDiscount(0);
        return;
      }

      if (data.expiry_date && new Date(data.expiry_date) < new Date()) {
        toast({ title: 'Expired Code', description: 'This promo code has expired.', variant: 'destructive' });
        setPromoDiscount(0);
        return;
      }

      setPromoDiscount(data.discount_percent);
      setPromoRef(data.code);
      toast({ title: 'Code Applied!', description: `You got ${data.discount_percent}% off your registration fee!` });
    } catch (err: any) {
      toast({ title: 'Error', description: 'Could not validate promo code.', variant: 'destructive' });
    } finally {
      setIsPromoValidating(false);
    }
  };

  const getFinalRegistrationFee = () => {
    return REGISTRATION_FEE_GHS * (1 - promoDiscount / 100);
  };

  const handlePayNow = async () => {

    if (gateway === 'korapay' && !window.Korapay) {
      toast({ title: 'Payment System Loading', description: 'The payment gateway is still initializing. Please wait a moment and try again.', variant: 'default' });
      return;
    }

    if (gateway === 'paystack' && !window.PaystackPop) {
      toast({ title: 'Payment System Loading', description: 'The payment gateway is still initializing. Please wait a moment and try again.', variant: 'default' });
      return;
    }

    setIsSubmitting(true);
    const reference = `PH-REG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const amount = getFinalRegistrationFee();

    // Bypass payment gateway for 100% discount (0 GHS)
    if (amount === 0) {
      const freeReference = `PH-FREE-REG-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      toast({ title: 'Processing Registration', description: 'Applying your 100% discount...' });
      await finalizeRegistration(freeReference);
      return;
    }



    if (gateway === 'korapay') {
      try {
        window.Korapay.initialize({
          key: KORAPAY_PUBLIC_KEY,
          reference,
          amount: getFinalRegistrationFee(),
          currency: "GHS",
          customer: {
            name: formData.fullName,
            email: formData.email,
          },

          onSuccess: async () => {

            await finalizeRegistration(reference);
          },
          onClose: () => {
            setIsSubmitting(false);
          },
          onFailed: (data: any) => {
            setIsSubmitting(false);
            toast({ variant: 'destructive', title: 'Payment Failed', description: data?.message || 'Payment could not be completed.' });
          },
        });
      } catch (err) {
        setIsSubmitting(false);
        toast({ variant: 'destructive', title: 'Payment System Error', description: 'Could not open Korapay. Please refresh and try again.' });
      }
    } else {
      try {
        const handler = window.PaystackPop.setup({
          key: PAYSTACK_PUBLIC_KEY,
          email: formData.email,

          amount: Math.round(getFinalRegistrationFee() * 100),
          currency: "GHS",
          ref: reference,
          metadata: {
            custom_fields: [
              { display_name: "Full Name", variable_name: "full_name", value: formData.fullName }
            ]
          },

          callback: (response: any) => {
            finalizeRegistration(reference);
          },

          onClose: () => {
            setIsSubmitting(false);
          }
        });
        handler.openIframe();

      } catch (err) {
        setIsSubmitting(false);
        toast({ variant: 'destructive', title: 'Payment System Error', description: 'Could not open Paystack. Please refresh and try again.' });
      }
    }
  };

  const finalizeRegistration = async (reference: string) => {
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            professional_title: formData.professionalTitle,
            registration_fee_paid: true,
            payment_reference: reference,
            promo_code: promoRef,
            gateway: gateway
          }
        }
      });



      if (signUpError) throw signUpError;

      toast({ title: 'Registration Successful! 🎉', description: 'Please check your email to verify your account.' });
      navigate('/login?registered=true');
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({ variant: 'destructive', title: 'Registration Error', description: error.message || 'An unexpected error occurred.' });
    } finally {
      setIsSubmitting(false);
    }
  };



  const getPasswordStrength = (password: string): number => {
    let s = 0;
    if (password.length >= 8) s++;
    if (password.length >= 12) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    return s;
  };

  const passwordStrength = getPasswordStrength(accountForm.watch('password') || '');

  if (authLoading) {
    return <div className="min-h-screen bg-transparent relative z-0 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-transparent relative overflow-hidden flex items-center justify-center p-4 z-0">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 -right-32 w-80 h-80 bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      </div>

      <div className="w-full max-w-[520px] relative z-10">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-black/20">
          {/* Header */}
          <div className="text-center mb-6">
            <Link to="/" className="inline-block mb-4">
              <BrandLogo height={36} />
            </Link>
            <h1 className="text-2xl font-heading font-bold mb-1">
              Join <span className="text-primary">Prime Haven</span>
            </h1>
            <p className="text-sm text-muted-foreground">Start your journey as a creative professional</p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-8 px-2">
            {steps.map((step, i) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 border",
                    currentStep > step.id
                      ? "bg-primary/20 border-primary/30 text-primary"
                      : currentStep === step.id
                        ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20"
                        : "bg-muted/30 border-border/40 text-muted-foreground"
                  )}>
                    {currentStep > step.id ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <step.icon className="w-4 h-4" />
                    )}
                  </div>
                  <span className={cn("text-[10px] font-medium", currentStep >= step.id ? "text-foreground" : "text-muted-foreground")}>
                    {step.name}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={cn("w-8 sm:w-12 h-px mx-1 -mt-4 transition-colors", currentStep > step.id ? "bg-primary/40" : "bg-border/40")} />
                )}
              </div>
            ))}
          </div>

          {/* Step Forms */}
          <div className="space-y-5">
            {currentStep === 1 && (
              <div className="space-y-4">

                <form onSubmit={personalForm.handleSubmit(handleStep1Submit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className={labelClass}>Full Name *</Label>
                  <Input id="fullName" placeholder="John Doe" {...personalForm.register('fullName')}
                    className={cn(inputClass, personalForm.formState.errors.fullName && 'border-destructive')} />
                  {personalForm.formState.errors.fullName && <p className="text-xs text-destructive">{personalForm.formState.errors.fullName.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className={labelClass}>Email *</Label>
                  <Input id="email" type="email" placeholder="john@example.com" {...personalForm.register('email')}
                    className={cn(inputClass, personalForm.formState.errors.email && 'border-destructive')} />
                  {personalForm.formState.errors.email && <p className="text-xs text-destructive">{personalForm.formState.errors.email.message}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className={labelClass}>Phone *</Label>
                    <Input id="phone" type="tel" placeholder="+233 XX XXX XXXX" {...personalForm.register('phone')}
                      className={cn(inputClass, personalForm.formState.errors.phone && 'border-destructive')} />
                    {personalForm.formState.errors.phone && <p className="text-xs text-destructive">{personalForm.formState.errors.phone.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dob" className={labelClass}>Date of Birth *</Label>
                    <Popover open={dobOpen} onOpenChange={setDobOpen}>
                      <PopoverTrigger asChild>
                        <Button id="dob" variant="outline" className={cn(
                          "w-full justify-start text-left font-normal h-11 rounded-xl bg-background/60 border-border/60",
                          !personalForm.watch('dob') && "text-muted-foreground",
                          personalForm.formState.errors.dob && "border-destructive"
                        )}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {personalForm.watch('dob') ? format(personalForm.watch('dob'), "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={personalForm.watch('dob')} onSelect={(date) => { personalForm.setValue('dob', date as Date, { shouldValidate: true }); setDobOpen(false); }}
                          disabled={(date) => date > getMinimumAgeDate() || date < new Date("1900-01-01")} defaultMonth={getMinimumAgeDate()} initialFocus />
                      </PopoverContent>
                    </Popover>
                    {personalForm.formState.errors.dob && <p className="text-xs text-destructive">{personalForm.formState.errors.dob.message}</p>}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="portfolio" className={labelClass}>Portfolio URL (Optional)</Label>
                  <Input id="portfolio" type="url" placeholder="https://yourportfolio.com" {...personalForm.register('portfolioUrl')}
                    className={cn(inputClass, personalForm.formState.errors.portfolioUrl && 'border-destructive')} />
                  {personalForm.formState.errors.portfolioUrl && <p className="text-xs text-destructive">{personalForm.formState.errors.portfolioUrl.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className={labelClass}>Professional Title *</Label>
                  <Select value={personalForm.watch('professionalTitle')} onValueChange={(v) => personalForm.setValue('professionalTitle', v, { shouldValidate: true })}>
                    <SelectTrigger className={cn(inputClass, personalForm.formState.errors.professionalTitle && 'border-destructive')}>
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="graphic-designer">Graphic Designer</SelectItem>
                      <SelectItem value="ui-ux-designer">UI/UX Designer</SelectItem>
                      <SelectItem value="web-developer">Web Developer</SelectItem>
                      <SelectItem value="app-developer">App Developer</SelectItem>
                      <SelectItem value="it-specialist">IT Specialist</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {personalForm.formState.errors.professionalTitle && <p className="text-xs text-destructive">{personalForm.formState.errors.professionalTitle.message}</p>}
                </div>

                <Button type="submit" className="w-full h-11 rounded-xl font-semibold text-sm">Continue</Button>
              </form>
              </div>
            )}

            {currentStep === 2 && (
              <form onSubmit={skillsForm.handleSubmit(handleStep2Submit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className={labelClass}>Years of Experience *</Label>
                  <Select value={skillsForm.watch('experience')} onValueChange={(v) => skillsForm.setValue('experience', v, { shouldValidate: true })}>
                    <SelectTrigger className={cn(inputClass, skillsForm.formState.errors.experience && 'border-destructive')}>
                      <SelectValue placeholder="Select experience level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0-1">0-1 years</SelectItem>
                      <SelectItem value="1-3">1-3 years</SelectItem>
                      <SelectItem value="3-5">3-5 years</SelectItem>
                      <SelectItem value="5+">5+ years</SelectItem>
                    </SelectContent>
                  </Select>
                  {skillsForm.formState.errors.experience && <p className="text-xs text-destructive">{skillsForm.formState.errors.experience.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className={labelClass}>Available Hours Per Week *</Label>
                  <Select value={skillsForm.watch('availableHours')} onValueChange={(v) => skillsForm.setValue('availableHours', v, { shouldValidate: true })}>
                    <SelectTrigger className={cn(inputClass, skillsForm.formState.errors.availableHours && 'border-destructive')}>
                      <SelectValue placeholder="Select availability" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0-10">0-10 hours</SelectItem>
                      <SelectItem value="10-20">10-20 hours</SelectItem>
                      <SelectItem value="20-30">20-30 hours</SelectItem>
                      <SelectItem value="30-40">30-40 hours</SelectItem>
                      <SelectItem value="40+">40+ hours</SelectItem>
                    </SelectContent>
                  </Select>
                  {skillsForm.formState.errors.availableHours && <p className="text-xs text-destructive">{skillsForm.formState.errors.availableHours.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="previousCompany" className={labelClass}>Previous Company / Education</Label>
                  <Input id="previousCompany" placeholder="Company or University name" {...skillsForm.register('previousCompany')} className={inputClass} />
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={prevStep} className="flex-1 h-11 rounded-xl">Previous</Button>
                  <Button type="submit" className="flex-1 h-11 rounded-xl font-semibold text-sm">Continue</Button>
                </div>
              </form>
            )}

            {currentStep === 3 && (
              <form onSubmit={accountForm.handleSubmit(handleStep3Submit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password" className={labelClass}>Password *</Label>
                  <div className="relative">
                    <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="Create a strong password"
                      {...accountForm.register('password')}
                      className={cn(inputClass, 'pr-10', accountForm.formState.errors.password && 'border-destructive')} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex gap-1 mt-1.5">
                    {[1, 2, 3, 4].map((level) => (
                      <div key={level} className={cn("h-1 flex-1 rounded-full transition-colors", passwordStrength >= level ? (level <= 1 ? 'bg-destructive' : level <= 2 ? 'bg-yellow-500' : 'bg-green-500') : 'bg-muted')} />
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground">Use at least 8 characters with uppercase and numbers</p>
                  {accountForm.formState.errors.password && <p className="text-xs text-destructive">{accountForm.formState.errors.password.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className={labelClass}>Confirm Password *</Label>
                  <div className="relative">
                    <Input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirm your password"
                      {...accountForm.register('confirmPassword')}
                      className={cn(inputClass, 'pr-10', accountForm.formState.errors.confirmPassword && 'border-destructive')} />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {accountForm.formState.errors.confirmPassword && <p className="text-xs text-destructive">{accountForm.formState.errors.confirmPassword.message}</p>}
                </div>

                <div className="flex items-start space-x-3 pt-2">
                  <Checkbox id="terms" checked={accountForm.watch('agreeToTerms')} onCheckedChange={(checked) => accountForm.setValue('agreeToTerms', checked as true, { shouldValidate: true })} />
                  <label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                    I agree to the Terms of Service, Privacy Policy, and understand the point-based compensation system and 50% revenue share structure.
                  </label>
                </div>
                {accountForm.formState.errors.agreeToTerms && <p className="text-xs text-destructive">{accountForm.formState.errors.agreeToTerms.message}</p>}

                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={prevStep} className="flex-1 h-11 rounded-xl">Previous</Button>
                  <Button type="submit" className="flex-1 h-11 rounded-xl font-semibold text-sm">Continue</Button>
                </div>
              </form>
            )}

            {currentStep === 4 && (
              <div className="space-y-5">
                <div className="rounded-xl border border-border/40 bg-background/40 p-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                    <CreditCard className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-heading font-bold mb-1">Registration Fee</h3>
                  <div className="text-3xl font-heading font-bold text-primary mb-1">
                    {promoDiscount > 0 ? (
                      <div className="flex flex-col items-center">
                        <span className="text-sm line-through text-muted-foreground opacity-50">GH₵{REGISTRATION_FEE_GHS.toFixed(2)}</span>
                        <span>GH₵{getFinalRegistrationFee().toFixed(2)}</span>
                      </div>
                    ) : (
                      `GH₵${REGISTRATION_FEE_GHS.toFixed(2)}`
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">One-time payment to join Prime Haven</p>

                  <div className="mb-4 space-y-2">
                    <Label htmlFor="promo" className="text-[10px] text-left block text-muted-foreground uppercase tracking-widest">Promo Code</Label>
                    <div className="flex gap-2">
                      <Input
                        id="promo"
                        value={promoCode}
                        onChange={e => setPromoCode(e.target.value)}
                        placeholder="SUMMER24"
                        className="h-9 text-xs bg-background/40 uppercase"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={applyPromoCode}
                        disabled={isPromoValidating || !promoCode.trim()}
                        className="h-9 px-3 text-xs"
                      >
                        {isPromoValidating ? <Loader2 className="w-3 h-3 animate-spin shadow-none" /> : 'Apply'}
                      </Button>
                    </div>
                    <div className="mb-4 space-y-2 text-left">
                      <Label className="text-[10px] text-muted-foreground uppercase tracking-widest">Payment Method</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div
                          onClick={() => setGateway('korapay')}
                          className={`cursor-pointer p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${gateway === 'korapay' ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-primary/30'}`}
                        >
                          <CreditCard className={`w-5 h-5 ${gateway === 'korapay' ? 'text-primary' : 'text-muted-foreground'}`} />
                          <span className="text-[10px] font-bold uppercase text-center">Korapay</span>
                          <span className="text-[8px] text-muted-foreground text-center leading-tight">MTN Momo, Telecel Cash, AirtelTigo Cash Only.</span>
                        </div>
                        <div
                          onClick={() => setGateway('paystack')}
                          className={`cursor-pointer p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${gateway === 'paystack' ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-primary/30'}`}
                        >
                          <Globe className={`w-5 h-5 ${gateway === 'paystack' ? 'text-primary' : 'text-muted-foreground'}`} />
                          <span className="text-[10px] font-bold uppercase text-center">Paystack</span>
                          <span className="text-[8px] text-muted-foreground text-center leading-tight">MTN Momo, Telecel Cash, AirtelTigo Cash, Bank Transfer, Card</span>
                        </div>
                      </div>
                    </div>


                    <div className="space-y-2 text-left text-xs">
                      {['Access to designer dashboard', 'Join the Discord community', 'Start earning from projects', 'Email verification for security'].map((item) => (
                        <div key={item} className="flex items-center gap-2 text-muted-foreground">
                          <CheckCircle className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="text-[10px] text-center text-muted-foreground">
                    Secure payment powered by Korapay. Accept Mobile Money, Cards & Bank Transfer.
                  </p>

                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={prevStep} className="flex-1 h-11 rounded-xl">Previous</Button>
                    <Button type="button" onClick={handlePayNow} className="flex-1 h-11 rounded-xl font-semibold text-sm shadow-lg shadow-primary/20" disabled={isSubmitting}>
                      {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : <><Sparkles className="w-4 h-4 mr-2" />Pay & Register</>}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Login link */}
            <p className="text-center text-sm text-muted-foreground mt-6">
              Already a member?{' '}
              <Link to="/login" className="text-primary hover:text-primary/80 font-semibold transition-colors">Sign In</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
