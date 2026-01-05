import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, User, Briefcase, Lock, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

const steps = [
  { id: 1, name: 'Personal', icon: User },
  { id: 2, name: 'Skills', icon: Briefcase },
  { id: 3, name: 'Account', icon: Lock },
  { id: 4, name: 'Payment', icon: CreditCard },
];

const Register = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    dob: '',
    portfolioUrl: '',
    professionalTitle: '',
    primarySkills: [] as string[],
    experience: '',
    availableHours: '',
    previousCompany: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = () => {
    toast({
      title: 'Registration Initiated',
      description: 'Backend integration required. Connect Lovable Cloud to enable payments.',
    });
  };

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
                      backgroundColor: currentStep >= step.id ? 'hsl(16, 99%, 55%)' : 'hsl(0, 0%, 15%)',
                    }}
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                  >
                    {currentStep > step.id ? (
                      <CheckCircle className="w-5 h-5 text-primary-foreground" />
                    ) : (
                      <step.icon className="w-5 h-5 text-primary-foreground" />
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
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      placeholder="John Doe"
                      value={formData.fullName}
                      onChange={(e) => updateFormData('fullName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={(e) => updateFormData('email', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 234 567 890"
                        value={formData.phone}
                        onChange={(e) => updateFormData('phone', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dob">Date of Birth</Label>
                      <Input
                        id="dob"
                        type="date"
                        value={formData.dob}
                        onChange={(e) => updateFormData('dob', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="portfolio">Portfolio URL (Optional)</Label>
                    <Input
                      id="portfolio"
                      type="url"
                      placeholder="https://yourportfolio.com"
                      value={formData.portfolioUrl}
                      onChange={(e) => updateFormData('portfolioUrl', e.target.value)}
                    />
                  </div>
                </>
              )}

              {currentStep === 2 && (
                <>
                  <div className="space-y-2">
                    <Label>Professional Title</Label>
                    <Select value={formData.professionalTitle} onValueChange={(v) => updateFormData('professionalTitle', v)}>
                      <SelectTrigger>
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
                  </div>
                  <div className="space-y-2">
                    <Label>Years of Experience</Label>
                    <Select value={formData.experience} onValueChange={(v) => updateFormData('experience', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select experience level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0-1">0-1 years</SelectItem>
                        <SelectItem value="1-3">1-3 years</SelectItem>
                        <SelectItem value="3-5">3-5 years</SelectItem>
                        <SelectItem value="5+">5+ years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Available Hours Per Week</Label>
                    <Select value={formData.availableHours} onValueChange={(v) => updateFormData('availableHours', v)}>
                      <SelectTrigger>
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
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="previousCompany">Previous Company / Education</Label>
                    <Input
                      id="previousCompany"
                      placeholder="Company or University name"
                      value={formData.previousCompany}
                      onChange={(e) => updateFormData('previousCompany', e.target.value)}
                    />
                  </div>
                </>
              )}

              {currentStep === 3 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Create a strong password"
                      value={formData.password}
                      onChange={(e) => updateFormData('password', e.target.value)}
                    />
                    <div className="flex gap-1 mt-2">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full ${
                            formData.password.length >= level * 3 ? 'bg-primary' : 'bg-muted'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Use at least 12 characters with uppercase, lowercase, and numbers
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                    />
                    {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                      <p className="text-xs text-destructive">Passwords do not match</p>
                    )}
                  </div>
                  <div className="flex items-start space-x-3 pt-4">
                    <Checkbox
                      id="terms"
                      checked={formData.agreeToTerms}
                      onCheckedChange={(checked) => updateFormData('agreeToTerms', checked)}
                    />
                    <label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed">
                      I agree to the Terms of Service, Privacy Policy, and understand the point-based 
                      compensation system and 50% revenue share structure.
                    </label>
                  </div>
                </>
              )}

              {currentStep === 4 && (
                <>
                  <div className="glass rounded-2xl p-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                      <CreditCard className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-heading font-bold mb-2">Registration Fee</h3>
                    <div className="text-4xl font-heading font-bold text-gradient mb-2">$5.00</div>
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
                    </div>
                  </div>
                  <p className="text-xs text-center text-muted-foreground">
                    Secure payment powered by Paystack. Your payment information is encrypted.
                  </p>
                </>
              )}
            </motion.div>

            {/* Navigation Buttons */}
            <div className="flex gap-4 mt-8">
              {currentStep > 1 && (
                <Button variant="outline" onClick={prevStep} className="flex-1">
                  Previous
                </Button>
              )}
              {currentStep < 4 ? (
                <Button variant="primary" onClick={nextStep} className="flex-1">
                  Continue
                </Button>
              ) : (
                <Button variant="primary" onClick={handleSubmit} className="flex-1 glow-primary">
                  Pay & Register
                </Button>
              )}
            </div>

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
