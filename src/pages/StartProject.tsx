import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, ArrowLeft, ArrowRight, Check, Loader2, Send, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Link, useNavigate } from 'react-router-dom';
import BrandLogo from '@/components/BrandLogo';
import { usePaystackPayment } from 'react-paystack';

const PAYSTACK_PUBLIC_KEY = "pk_live_4c60eef11210f3101a756799825004c3145d5edb";

interface ServicePricing {
  id: string;
  service_type: string;
  service_label: string;
  tier: string;
  price: number;
  description: string;
  features: string[];
  discord_category: string;
}

const tierOrder = ['basic', 'standard', 'premium'];
const tierColors: Record<string, string> = {
  basic: 'border-muted',
  standard: 'border-primary ring-2 ring-primary/20',
  premium: 'border-yellow-500 ring-2 ring-yellow-500/20',
};
const tierLabels: Record<string, string> = {
  basic: 'Basic',
  standard: 'Standard',
  premium: 'Premium',
};

const StartProject = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: select service, 2: select tier, 3: fill details
  const [services, setServices] = useState<ServicePricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedTier, setSelectedTier] = useState<string>('');
  const [selectedPricing, setSelectedPricing] = useState<ServicePricing | null>(null);

  const [form, setForm] = useState({
    clientName: '',
    clientEmail: '',
    clientWhatsapp: '',
    description: '',
  });

  useEffect(() => {
    const fetchPricing = async () => {
      const { data } = await supabase
        .from('service_pricing')
        .select('*')
        .eq('is_active', true)
        .order('service_type')
        .order('price');
      setServices((data as ServicePricing[]) || []);
      setLoading(false);
    };
    fetchPricing();
  }, []);

  // Group services by type
  const serviceTypes = [...new Set(services.map(s => s.service_type))];
  const serviceLabels: Record<string, string> = {};
  services.forEach(s => { serviceLabels[s.service_type] = s.service_label; });

  const tiersForService = services
    .filter(s => s.service_type === selectedService)
    .sort((a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier));

  const handleSelectTier = (pricing: ServicePricing) => {
    setSelectedTier(pricing.tier);
    setSelectedPricing(pricing);
  };

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // Paystack config
  const paystackConfig = {
    reference: `PH-ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    email: form.clientEmail,
    amount: (selectedPricing?.price || 0) * 100, // pesewas
    publicKey: PAYSTACK_PUBLIC_KEY,
    currency: 'GHS',
    channels: ['mobile_money', 'card', 'bank_transfer'] as any,
  };

  const onPaystackSuccess = async (reference: any) => {
    try {
      // Create order and process
      const { error } = await supabase.functions.invoke('process-client-order', {
        body: {
          clientName: form.clientName,
          clientEmail: form.clientEmail,
          clientWhatsapp: form.clientWhatsapp,
          serviceType: selectedPricing!.service_type,
          serviceLabel: selectedPricing!.service_label,
          tier: selectedPricing!.tier,
          price: selectedPricing!.price,
          description: form.description,
          discordCategory: selectedPricing!.discord_category,
          paymentReference: reference.reference || reference.trxref,
        },
      });
      if (error) throw error;
      toast({ title: 'Project Submitted! 🎉', description: 'Your project has been received. We\'ll get started right away!' });
      navigate('/?project=success');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to process order.', variant: 'destructive' });
    }
  };

  const onPaystackClose = () => {
    toast({ title: 'Payment Cancelled', description: 'You can try again when ready.', variant: 'destructive' });
  };

  const initializePayment = usePaystackPayment(paystackConfig);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientName || !form.clientEmail || !form.description) {
      toast({ title: 'Missing fields', description: 'Please fill in all required fields.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    initializePayment({ onSuccess: onPaystackSuccess, onClose: onPaystackClose } as any);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <BrandLogo className="h-8" />
          </Link>
          <div className="flex items-center gap-2">
            {[1, 2, 3].map(s => (
              <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {step > s ? <Check className="w-4 h-4" /> : s}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <AnimatePresence mode="wait">
          {/* Step 1: Select Service */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <div className="text-center space-y-3">
                <h1 className="text-3xl sm:text-4xl font-heading font-bold">What do you need?</h1>
                <p className="text-muted-foreground text-lg">Select the service that fits your project.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {serviceTypes.map(type => (
                  <Card
                    key={type}
                    className={`cursor-pointer transition-all hover:border-primary/60 hover:shadow-lg ${selectedService === type ? 'border-primary ring-2 ring-primary/20 shadow-lg' : ''}`}
                    onClick={() => setSelectedService(type)}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">{serviceLabels[type]}</CardTitle>
                      <CardDescription>
                        From GH₵{Math.min(...services.filter(s => s.service_type === type).map(s => s.price)).toLocaleString()}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
              <div className="flex justify-end">
                <Button disabled={!selectedService} onClick={() => setStep(2)} className="gap-2">
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Select Tier */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <div className="text-center space-y-3">
                <h1 className="text-3xl sm:text-4xl font-heading font-bold">Choose Your Package</h1>
                <p className="text-muted-foreground text-lg">{serviceLabels[selectedService]}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {tiersForService.map(pricing => (
                  <Card
                    key={pricing.id}
                    className={`cursor-pointer transition-all hover:shadow-xl relative ${selectedTier === pricing.tier ? tierColors[pricing.tier] : 'hover:border-primary/40'} ${pricing.tier === 'standard' ? 'md:-mt-2 md:mb-[-8px]' : ''}`}
                    onClick={() => handleSelectTier(pricing)}
                  >
                    {pricing.tier === 'standard' && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground gap-1"><Star className="w-3 h-3" /> Popular</Badge>
                      </div>
                    )}
                    <CardHeader className="text-center pb-2">
                      <Badge variant="outline" className="w-fit mx-auto mb-2">{tierLabels[pricing.tier]}</Badge>
                      <CardTitle className="text-3xl font-bold">
                        GH₵{pricing.price.toLocaleString()}
                      </CardTitle>
                      <CardDescription>{pricing.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {(pricing.features || []).map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            <span className="text-muted-foreground">{f}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button disabled={!selectedTier} onClick={() => setStep(3)} className="gap-2">
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Details & Payment */}
          {step === 3 && selectedPricing && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-2xl mx-auto space-y-8">
              <div className="text-center space-y-3">
                <h1 className="text-3xl sm:text-4xl font-heading font-bold">Project Details</h1>
                <p className="text-muted-foreground">
                  {selectedPricing.service_label} — {tierLabels[selectedPricing.tier]} (GH₵{selectedPricing.price.toLocaleString()})
                </p>
              </div>

              <Card>
                <CardContent className="pt-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="clientName">Full Name *</Label>
                        <Input id="clientName" value={form.clientName} onChange={e => handleChange('clientName', e.target.value)} placeholder="John Doe" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="clientEmail">Email *</Label>
                        <Input id="clientEmail" type="email" value={form.clientEmail} onChange={e => handleChange('clientEmail', e.target.value)} placeholder="john@example.com" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clientWhatsapp">WhatsApp Number</Label>
                      <Input id="clientWhatsapp" type="tel" value={form.clientWhatsapp} onChange={e => handleChange('clientWhatsapp', e.target.value)} placeholder="+233 XX XXX XXXX" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Project Description *</Label>
                      <Textarea id="description" value={form.description} onChange={e => handleChange('description', e.target.value)} placeholder="Tell us about your project, goals, timeline, and any specific requirements..." className="min-h-[120px]" required />
                    </div>

                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Service</span>
                        <span className="font-medium">{selectedPricing.service_label}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Package</span>
                        <span className="font-medium">{tierLabels[selectedPricing.tier]}</span>
                      </div>
                      <div className="border-t border-border pt-2 flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span className="text-primary">GH₵{selectedPricing.price.toLocaleString()}</span>
                      </div>
                    </div>

                    <Button type="submit" disabled={submitting} className="w-full gap-2 glow-primary text-lg py-6">
                      {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      {submitting ? 'Processing...' : `Pay GH₵${selectedPricing.price.toLocaleString()} & Submit`}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <div className="flex justify-start">
                <Button variant="outline" onClick={() => setStep(2)} className="gap-2">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default StartProject;
