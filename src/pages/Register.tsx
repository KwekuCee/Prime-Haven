import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, User, Briefcase, Lock, CreditCard, Loader2, Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { usePaystackPayment } from 'react-paystack';
import { 
  registerPersonalSchema, 
  registerSkillsSchema, 
  registerAccountSchema,
  RegisterPersonalData,
  RegisterSkillsData,
  RegisterAccountData,
} from '@/lib/validations';

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
const REGISTRATION_FEE_GHS = 100; // GH₵100

const steps = [
  { id: 1, name: 'Personal', icon: User },
  { id: 2, name: 'Skills', icon: Briefcase },
  { id: 3, name: 'Account', icon: Lock },
  { id: 4, name: 'Payment', icon: CreditCard },
];

const Register = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    dob: '',
    portfolioUrl: '',
    professionalTitle: '',
    experience: '',
    availableHours: '',
    previousCompany: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  const { signUp, user, loading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard');
    }
  }, [user, authLoading, navigate]);

  // Step 1 form
  const personalForm = useForm<RegisterPersonalData>({
    resolver: zodResolver(registerPersonalSchema),
    defaultValues: {
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      dob: formData.dob,
      portfolioUrl: formData.portfolioUrl,
      professionalTitle: formData.professionalTitle,
    },
  });

  // Step 2 form
  const skillsForm = useForm<RegisterSkillsData>({
    resolver: zodResolver(registerSkillsSchema),
    defaultValues: {
      experience: formData.experience,
      availableHours: formData.availableHours,
      previousCompany: formData.previousCompany,
    },
  });

  // Step 3 form
  const accountForm = useForm<RegisterAccountData>({
    resolver: zodResolver(registerAccountSchema),
    defaultValues: {
      password: formData.password,
      confirmPassword: formData.confirmPassword,
      agreeToTerms: formData.agreeToTerms as true,
    },
  });

  const updateFormData = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleStep1Submit = (data: RegisterPersonalData) => {
    Object.entries(data).forEach(([key, value]) => updateFormData(key, value));
    setCurrentStep(2);
  };

  const handleStep2Submit = (data: RegisterSkillsData) => {
    Object.entries(data).forEach(([key, value]) => updateFormData(key, value));
    setCurrentStep(3);
  };

  const handleStep3Submit = (data: RegisterAccountData) => {
    Object.entries(data).forEach(([key, value]) => updateFormData(key, value));
    setCurrentStep(4);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  // Paystack config
  const paystackConfig = {
    reference: `PH_${Date.now()}_${Math.floor(Math.random() * 1000000)}`,
    email: formData.email,
    amount: REGISTRATION_FEE_GHS * 100, // Convert to pesewas
    publicKey: PAYSTACK_PUBLIC_KEY,
    currency: 'GHS',
    channels: ['card', 'mobile_money', 'bank_transfer'] as ('card' | 'mobile_money' | 'bank_transfer')[],
  };

  const initializePayment = usePaystackPayment(paystackConfig);

  const handlePaymentSuccess = async (reference: { reference: string }) => {
    setIsSubmitting(true);

    try {
      // First, create the user account
      const { data: authData, error: signUpError } = await signUp(formData.email, formData.password, {
        full_name: formData.fullName,
      });

      if (signUpError) {
        let errorMessage = 'An error occurred during registration';
        
        if (signUpError.message.includes('User already registered')) {
          errorMessage = 'An account with this email already exists. Please sign in instead.';
        } else if (signUpError.message.includes('Password should be at least')) {
          errorMessage = 'Password is too weak. Please use a stronger password.';
        } else if (signUpError.message.includes('Invalid email')) {
          errorMessage = 'Please enter a valid email address.';
        } else {
          errorMessage = signUpError.message;
        }

        toast({
          variant: 'destructive',
          title: 'Registration Failed',
          description: errorMessage,
        });
        setIsSubmitting(false);
        return;
      }

      const userId = authData?.user?.id;
      if (!userId) {
        throw new Error('Failed to create user account');
      }

      // Verify payment with backend
      const { error: verifyError } = await supabase.functions.invoke('verify-payment', {
        body: { reference: reference.reference, userId },
      });

      if (verifyError) {
        console.error('Payment verification error:', verifyError);
        // Payment was successful with Paystack, so continue anyway
      }

      // Send verification email
      const redirectUrl = window.location.origin;
      await supabase.functions.invoke('send-verification-email', {
        body: {
          email: formData.email,
          fullName: formData.fullName,
          userId,
          redirectUrl,
        },
      });

      toast({
        title: 'Registration Successful!',
        description: 'Please check your email to verify your account.',
      });

      // Redirect to login with message
      navigate('/login?registered=true');
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        variant: 'destructive',
        title: 'Registration Error',
        description: 'An unexpected error occurred. Please contact support.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentClose = () => {
    toast({
      variant: 'destructive',
      title: 'Payment Cancelled',
      description: 'You cancelled the payment. Please try again to complete registration.',
    });
  };

  const handlePayNow = () => {
    initializePayment({
      onSuccess: handlePaymentSuccess,
      onClose: handlePaymentClose,
    });
  };

  // Calculate password strength
  const getPasswordStrength = (password: string): number => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(accountForm.watch('password') || '');

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Form */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>

        {/* Form Content */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-lg">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <h1 className="text-3xl font-heading font-bold mb-2">
                Join <span className="text-gradient">Prime Haven</span>
              </h1>
              <p className="text-muted-foreground">
                Start your journey as a creative professional
              </p>
            </motion.div>

            {/* Progress Steps */}
            <div className="flex justify-between mb-10">
              {steps.map((step) => (
                <div key={step.id} className="flex flex-col items-center gap-2">
                  <motion.div
                    animate={{
                      scale: currentStep === step.id ? 1.1 : 1,
                    }}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      currentStep >= step.id ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    {currentStep > step.id ? (
                      <CheckCircle className="w-5 h-5 text-primary-foreground" />
                    ) : (
                      <step.icon className={`w-5 h-5 ${currentStep >= step.id ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                    )}
                  </motion.div>
                  <span className={`text-xs ${currentStep >= step.id ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {step.name}
                  </span>
                </div>
              ))}
            </div>

            {/* Step Forms */}
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {currentStep === 1 && (
                <form onSubmit={personalForm.handleSubmit(handleStep1Submit)} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      placeholder="John Doe"
                      {...personalForm.register('fullName')}
                      className={personalForm.formState.errors.fullName ? 'border-destructive' : ''}
                    />
                    {personalForm.formState.errors.fullName && (
                      <p className="text-sm text-destructive">{personalForm.formState.errors.fullName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      {...personalForm.register('email')}
                      className={personalForm.formState.errors.email ? 'border-destructive' : ''}
                    />
                    {personalForm.formState.errors.email && (
                      <p className="text-sm text-destructive">{personalForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 234 567 890"
                        {...personalForm.register('phone')}
                        className={personalForm.formState.errors.phone ? 'border-destructive' : ''}
                      />
                      {personalForm.formState.errors.phone && (
                        <p className="text-sm text-destructive">{personalForm.formState.errors.phone.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dob">Date of Birth *</Label>
                      <Input
                        id="dob"
                        type="date"
                        {...personalForm.register('dob')}
                        className={personalForm.formState.errors.dob ? 'border-destructive' : ''}
                      />
                      {personalForm.formState.errors.dob && (
                        <p className="text-sm text-destructive">{personalForm.formState.errors.dob.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="portfolio">Portfolio URL (Optional)</Label>
                    <Input
                      id="portfolio"
                      type="url"
                      placeholder="https://yourportfolio.com"
                      {...personalForm.register('portfolioUrl')}
                      className={personalForm.formState.errors.portfolioUrl ? 'border-destructive' : ''}
                    />
                    {personalForm.formState.errors.portfolioUrl && (
                      <p className="text-sm text-destructive">{personalForm.formState.errors.portfolioUrl.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Professional Title *</Label>
                    <Select 
                      value={personalForm.watch('professionalTitle')} 
                      onValueChange={(v) => personalForm.setValue('professionalTitle', v, { shouldValidate: true })}
                    >
                      <SelectTrigger className={personalForm.formState.errors.professionalTitle ? 'border-destructive' : ''}>
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
                    {personalForm.formState.errors.professionalTitle && (
                      <p className="text-sm text-destructive">{personalForm.formState.errors.professionalTitle.message}</p>
                    )}
                  </div>

                  <Button type="submit" variant="primary" className="w-full">
                    Continue
                  </Button>
                </form>
              )}

              {currentStep === 2 && (
                <form onSubmit={skillsForm.handleSubmit(handleStep2Submit)} className="space-y-6">
                  <div className="space-y-2">
                    <Label>Years of Experience *</Label>
                    <Select 
                      value={skillsForm.watch('experience')} 
                      onValueChange={(v) => skillsForm.setValue('experience', v, { shouldValidate: true })}
                    >
                      <SelectTrigger className={skillsForm.formState.errors.experience ? 'border-destructive' : ''}>
                        <SelectValue placeholder="Select experience level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0-1">0-1 years</SelectItem>
                        <SelectItem value="1-3">1-3 years</SelectItem>
                        <SelectItem value="3-5">3-5 years</SelectItem>
                        <SelectItem value="5+">5+ years</SelectItem>
                      </SelectContent>
                    </Select>
                    {skillsForm.formState.errors.experience && (
                      <p className="text-sm text-destructive">{skillsForm.formState.errors.experience.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Available Hours Per Week *</Label>
                    <Select 
                      value={skillsForm.watch('availableHours')} 
                      onValueChange={(v) => skillsForm.setValue('availableHours', v, { shouldValidate: true })}
                    >
                      <SelectTrigger className={skillsForm.formState.errors.availableHours ? 'border-destructive' : ''}>
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
                    {skillsForm.formState.errors.availableHours && (
                      <p className="text-sm text-destructive">{skillsForm.formState.errors.availableHours.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="previousCompany">Previous Company / Education</Label>
                    <Input
                      id="previousCompany"
                      placeholder="Company or University name"
                      {...skillsForm.register('previousCompany')}
                    />
                  </div>

                  <div className="flex gap-4">
                    <Button type="button" variant="outline" onClick={prevStep} className="flex-1">
                      Previous
                    </Button>
                    <Button type="submit" variant="primary" className="flex-1">
                      Continue
                    </Button>
                  </div>
                </form>
              )}

              {currentStep === 3 && (
                <form onSubmit={accountForm.handleSubmit(handleStep3Submit)} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Create a strong password"
                        {...accountForm.register('password')}
                        className={accountForm.formState.errors.password ? 'border-destructive pr-10' : 'pr-10'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <div className="flex gap-1 mt-2">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            passwordStrength >= level ? 'bg-primary' : 'bg-muted'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Use at least 8 characters with uppercase, lowercase, and numbers
                    </p>
                    {accountForm.formState.errors.password && (
                      <p className="text-sm text-destructive">{accountForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm your password"
                        {...accountForm.register('confirmPassword')}
                        className={accountForm.formState.errors.confirmPassword ? 'border-destructive pr-10' : 'pr-10'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {accountForm.formState.errors.confirmPassword && (
                      <p className="text-sm text-destructive">{accountForm.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>

                  <div className="flex items-start space-x-3 pt-4">
                    <Checkbox
                      id="terms"
                      checked={accountForm.watch('agreeToTerms')}
                      onCheckedChange={(checked) => accountForm.setValue('agreeToTerms', checked as true, { shouldValidate: true })}
                    />
                    <label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                      I agree to the Terms of Service, Privacy Policy, and understand the point-based 
                      compensation system and 50% revenue share structure.
                    </label>
                  </div>
                  {accountForm.formState.errors.agreeToTerms && (
                    <p className="text-sm text-destructive">{accountForm.formState.errors.agreeToTerms.message}</p>
                  )}

                  <div className="flex gap-4">
                    <Button type="button" variant="outline" onClick={prevStep} className="flex-1">
                      Previous
                    </Button>
                    <Button type="submit" variant="primary" className="flex-1">
                      Continue
                    </Button>
                  </div>
                </form>
              )}

{currentStep === 4 && (
                <>
                  <div className="glass rounded-2xl p-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                      <CreditCard className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-heading font-bold mb-2">Registration Fee</h3>
                    <div className="text-4xl font-heading font-bold text-gradient mb-2">GH₵50.00</div>
                    <p className="text-muted-foreground text-sm mb-6">
                      One-time payment to join Prime Haven
                    </p>
                    <div className="space-y-2 text-left text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-primary" />
                        <span>Access to designer dashboard</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-primary" />
                        <span>Join the Discord community</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-primary" />
                        <span>Start earning from projects</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-primary" />
                        <span>Email verification for security</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-center text-muted-foreground">
                    Secure payment powered by Paystack. Accept Mobile Money, Cards & Bank Transfer.
                  </p>

                  <div className="flex gap-4">
                    <Button type="button" variant="outline" onClick={prevStep} className="flex-1">
                      Previous
                    </Button>
                    <Button 
                      type="button" 
                      variant="primary" 
                      onClick={handlePayNow} 
                      className="flex-1 glow-primary"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Pay GH₵50 & Register'
                      )}
                    </Button>
                  </div>
                </>
              )}
            </motion.div>

            {/* Login Link */}
            <p className="text-center text-muted-foreground mt-6">
              Already a member?{' '}
              <Link to="/login" className="text-primary hover:underline">
                Login here
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Visual */}
      <div className="hidden lg:flex w-1/3 bg-gradient-to-br from-primary/20 to-background items-center justify-center p-12">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl font-heading font-bold mb-4">
              Join the <span className="text-gradient">Future</span>
            </h2>
            <p className="text-muted-foreground max-w-xs mx-auto">
              Be part of a youth-driven creative community building the next generation 
              of digital experiences.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Register;
