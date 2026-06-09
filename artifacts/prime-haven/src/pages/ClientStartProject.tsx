import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, ArrowLeft, ArrowRight, Check, Loader2, Star, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserSettings } from '@/contexts/UserSettingsContext';
import DashboardLayout from '@/components/DashboardLayout';

declare global {
  interface Window {
    Korapay: {
      initialize: (config: any) => void;
    };
  }
}

const KORAPAY_PUBLIC_KEY = "pk_live_AAZBw2DtmnyrGHfDJmNqkE4dKhw9gKQHVbz8Gds5";



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

const ClientStartProject = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { exchangeRate } = useUserSettings();

  const [step, setStep] = useState(1);
  const [services, setServices] = useState<ServicePricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currency, setCurrency] = useState<'GHS' | 'USD'>('GHS');
  // Korapay is the only payment gateway

  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedTier, setSelectedTier] = useState<string>('');
  const [selectedPricing, setSelectedPricing] = useState<ServicePricing | null>(null);

  const [form, setForm] = useState({
    clientName: '',
    clientEmail: '',
    clientWhatsapp: '',
    businessName: '',
    description: '',
  });

  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [isPromoValidating, setIsPromoValidating] = useState(false);
  const [promoRef, setPromoRef] = useState<string | null>(null);

  useEffect(() => {
    const fetchClientProfile = async () => {
      if (user?.email) {
        const { data: client } = await supabase.from('clients').select('*').eq('email', user.email ?? '').maybeSingle();
        if (client) {
          setForm(prev => ({
            ...prev,
            clientName: client.name || user?.user_metadata?.full_name || '',
            clientEmail: client.email || user.email || '',
            clientWhatsapp: client.whatsapp || '',
            businessName: client.company || '',
          }));
        } else {
          setForm(prev => ({
            ...prev,
            clientName: user?.user_metadata?.full_name || '',
            clientEmail: user.email || '',
          }));
        }
      }
    };
    fetchClientProfile();
  }, [user]);

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

  const formatPrice = (priceGhs: number) => {
    if (currency === 'USD') {
      return `$${(priceGhs / exchangeRate).toFixed(2)}`;
    }
    return `GH₵${priceGhs.toLocaleString()}`;
  };

  const getPaymentAmount = (priceGhs: number) => {
    if (currency === 'USD') {
      return Math.ceil((priceGhs / exchangeRate) * 100) / 100;
    }
    return priceGhs;
  };

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
      toast({ title: 'Code Applied!', description: `You got ${data.discount_percent}% off!` });
    } catch (err: any) {
      toast({ title: 'Error', description: 'Could not validate promo code.', variant: 'destructive' });
    } finally {
      setIsPromoValidating(false);
    }
  };

  const calculateTotal = (basePrice: number) => {
    const discounted = basePrice * (1 - promoDiscount / 100);
    return discounted;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description) {
      toast({ title: 'Missing fields', description: 'Please provide a project description.', variant: 'destructive' });
      return;
    }

    if (!window.Korapay) {
      toast({ title: 'System Loading', description: 'Korapay is still initializing. Please wait...', variant: 'default' });
      return;
    }

    if (!selectedPricing) return;

    setSubmitting(true);
    const reference = `PH-ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const finalPrice = calculateTotal(selectedPricing.price);
    const amount = getPaymentAmount(finalPrice);

    if (amount === 0) {
      const freeReference = `PH-FREE-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      toast({ title: 'Processing Order', description: 'Applying your 100% discount...' });
      try {
        const { error: orderError } = await supabase
          .from('client_orders')
          .insert({
            client_name: form.clientName,
            client_email: form.clientEmail,
            client_whatsapp: form.clientWhatsapp || null,
            service_type: selectedPricing.service_type,
            tier: selectedPricing.tier,
            price: 0,
            description: form.description || null,
            payment_status: 'completed',
            payment_reference: freeReference,
          });

        if (orderError) throw new Error(orderError.message);

        const distributionMap: Record<string, { professions: string[], max: number }> = {
          "graphic-design": { professions: ['Graphic Designer'], max: 2 },
          "app-design": { professions: ['UI/UX Designer'], max: 1 },
          "web-dev": { professions: ['UI/UX Designer', 'Web Developer'], max: 1 },
        };
        const dist = distributionMap[selectedPricing.discord_category] || { professions: ['Web Developer'], max: 1 };

        try {
          await supabase.from('client_projects').insert({
            title: `${selectedPricing.service_label} (${selectedPricing.tier.charAt(0).toUpperCase() + selectedPricing.tier.slice(1)}) — ${form.clientName}`,
            client_name: form.clientName,
            client_email: form.clientEmail,
            client_whatsapp: form.clientWhatsapp || null,
            description: form.description,
            category: selectedPricing.discord_category === 'graphic-design' ? 'graphic-design' : selectedPricing.discord_category === 'app-design' ? 'ui-ux' : 'web-development',
            status: 'pending',
            budget: 'GH₵0 (Promo)',
            required_professions: dist.professions,
            max_assignees: dist.max,
          });
        } catch (e) {
          console.error('Project tracking insert failed (non-critical):', e);
        }

        try {
          await (supabase as any).rpc('notify_discord_order', {
            p_service_label: selectedPricing.service_label,
            p_service_type: selectedPricing.service_type,
            p_tier: selectedPricing.tier,
            p_client_name: form.clientName,
            p_client_email: form.clientEmail,
            p_amount: 0,
            p_discord_category: selectedPricing.discord_category,
            p_gateway: '100% Promo Code',
            p_client_whatsapp: form.clientWhatsapp || null
          });
        } catch (discordErr) {
          console.error('Discord rpc notification failed:', discordErr);
        }

        toast({ title: 'Project Submitted! 🎉', description: 'Your 100% discounted project has been received. We\'ll get started right away!' });

        // Process Affiliate Commission for free orders (commission is 0, but good for tracking signups)
        const refCode = localStorage.getItem('primehaven_ref_code');
        if (refCode) {
          await supabase.rpc('process_affiliate_commission', {
            p_ref_code: refCode,
            p_client_name: form.clientName,
            p_service: selectedPricing.service_label,
            p_commission: 0
          });
          localStorage.removeItem('primehaven_ref_code');
        }

        navigate('/client/dashboard');

      } catch (err: any) {
        toast({
          title: 'Order Processing Error',
          description: `${err.message || 'Could not process your free order'}. Reference: ${freeReference}`,
          variant: 'destructive'
        });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    try {
      window.Korapay.initialize({
        key: KORAPAY_PUBLIC_KEY,
        reference,
        amount,
        currency,
        customer: {
          name: form.clientName,
          email: form.clientEmail,
        },
        onSuccess: () => {
          handleOrderProcess(reference, finalPrice);
        },
        onClose: () => setSubmitting(false),
        onFailed: (data: any) => {
          setSubmitting(false);
          toast({ title: 'Payment Failed', description: data?.message || 'Payment could not be completed.', variant: 'destructive' });
        },
      });
    } catch (err) {
      setSubmitting(false);
      toast({ title: 'Payment System Error', description: 'Could not open Korapay. Please try again.', variant: 'destructive' });
    }
  };

  const handleOrderProcess = async (reference: string, finalPrice: number) => {
    try {
      const { data, error } = await supabase.functions.invoke('process-client-order', {
        body: {
          clientName: form.clientName,
          clientEmail: form.clientEmail,
          clientWhatsapp: form.clientWhatsapp,
          serviceType: selectedPricing!.service_type,
          serviceLabel: selectedPricing!.service_label,
          tier: selectedPricing!.tier,
          price: finalPrice,
          description: form.description,
          discordCategory: selectedPricing!.discord_category,
          paymentReference: reference,
          promoCode: promoRef,
          gateway: 'korapay',
          clientPassword: "dashboard-client", // Dummy password since they are already authenticated
          businessName: form.businessName || "Client Business"
        },
      });

      if (error) {
        let detailMsg = error.message;
        if (error.context && typeof error.context.json === 'function') {
          try {
            const body = await error.context.json();
            if (body?.message) detailMsg = body.message;
            else if (body?.error) detailMsg = body.error;
          } catch (_) { }
        }
        if (data && typeof data === 'object' && data.error) {
          detailMsg = data.message || data.error;
        }
        throw new Error(detailMsg);
      }

      if (data && data.success === false) {
        throw new Error(data.error || data.message || 'Order processing failed');
      }

      toast({ title: 'Project Submitted! 🎉', description: 'Your project has been received. We\'ll get started right away!' });

      // Process Affiliate Commission (5% of final price)
      const refCode = localStorage.getItem('primehaven_ref_code');
      if (refCode) {
        const commission = finalPrice * 0.05;
        await supabase.rpc('process_affiliate_commission', {
          p_ref_code: refCode,
          p_client_name: form.clientName,
          p_service: selectedPricing!.service_label,
          p_commission: commission
        });
        // Clear the code after successful use
        localStorage.removeItem('primehaven_ref_code');
      }

      navigate('/client/dashboard');
    } catch (err: any) {
      toast({
        title: 'Order Processing Error',
        description: `${err.message || 'Something went wrong'}. Reference: ${reference}`,
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-[80vh] flex items-center justify-center bg-background/50">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="px-4 py-8 max-w-6xl mx-auto space-y-6">
        {/* Dashboard Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card/40 border border-border/60 rounded-2xl p-4 backdrop-blur-sm">
          <Button variant="outline" onClick={() => navigate('/client/dashboard')} className="gap-2 shrink-0">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Button>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-muted/50 rounded-full p-1">
              <button
                onClick={() => setCurrency('GHS')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${currency === 'GHS' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Banknote className="w-3 h-3" /> GHS
              </button>
              <button
                onClick={() => setCurrency('USD')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${currency === 'USD' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Banknote className="w-3 h-3" /> USD
              </button>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              {[1, 2, 3].map(s => (
                <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {step > s ? <Check className="w-4 h-4" /> : s}
                </div>
              ))}
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Select Service */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8 py-4">
              <div className="space-y-3">
                <h1 className="text-3xl font-heading font-bold">What do you need?</h1>
                <p className="text-muted-foreground">Select the service that fits your new project.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {serviceTypes.map(type => (
                  <Card
                    key={type}
                    className={`cursor-pointer transition-all bg-card/60 hover:border-primary/60 hover:shadow-lg ${selectedService === type ? 'border-primary ring-2 ring-primary/20 shadow-lg' : ''}`}
                    onClick={() => setSelectedService(type)}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">{serviceLabels[type]}</CardTitle>
                      <CardDescription>
                        From {formatPrice(Math.min(...services.filter(s => s.service_type === type).map(s => s.price)))}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
              <div className="flex justify-end">
                <Button disabled={!selectedService} onClick={() => setStep(2)} className="gap-2 px-8">
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Select Tier */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8 py-4">
              <div className="space-y-3">
                <h1 className="text-3xl font-heading font-bold">Choose Your Package</h1>
                <p className="text-muted-foreground">{serviceLabels[selectedService]}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {tiersForService.map(pricing => (
                  <Card
                    key={pricing.id}
                    className={`cursor-pointer transition-all bg-card/60 hover:shadow-xl relative ${selectedTier === pricing.tier ? tierColors[pricing.tier] : 'hover:border-primary/40'} ${pricing.tier === 'standard' ? 'md:-mt-2 md:mb-[-8px]' : ''}`}
                    onClick={() => handleSelectTier(pricing)}
                  >
                    {pricing.tier === 'standard' && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground gap-1"><Star className="w-3 h-3" /> Popular</Badge>
                      </div>
                    )}
                    <CardHeader className="text-center pb-2">
                      <Badge variant="outline" className="w-fit mx-auto mb-2 bg-background">{tierLabels[pricing.tier]}</Badge>
                      <CardTitle className="text-3xl font-bold">
                        {formatPrice(pricing.price)}
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
                <Button disabled={!selectedTier} onClick={() => setStep(3)} className="gap-2 px-8">
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Details & Payment */}
          {step === 3 && selectedPricing && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-2xl mx-auto space-y-8 py-4">
              <div className="text-center space-y-3">
                <h1 className="text-3xl font-heading font-bold">Final Details</h1>
                <p className="text-muted-foreground">
                  {selectedPricing.service_label} — {tierLabels[selectedPricing.tier]} ({formatPrice(selectedPricing.price)})
                </p>
              </div>

              <Card className="bg-card/60">
                <CardContent className="pt-6">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="description">Project Description *</Label>
                      <Textarea
                        id="description"
                        value={form.description}
                        onChange={e => handleChange('description', e.target.value)}
                        placeholder="Tell us about your project, goals, timeline, and any specific requirements..."
                        className="min-h-[120px] bg-background"
                        required
                      />
                    </div>

                    <div className="space-y-3">
                      <Label>Payment Method</Label>
                      <div className="p-4 rounded-xl border-2 border-primary bg-primary/5 flex flex-col items-center gap-2">
                        <Banknote className="w-6 h-6 text-primary" />
                        <span className="text-xs font-bold uppercase tracking-widest text-center">Korapay</span>
                        <span className="text-[10px] text-muted-foreground text-center">MTN Momo, Telecel Cash, AirtelTigo Cash, Bank Transfer & Card.</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="promo">Promo Code (Optional)</Label>
                      <div className="flex gap-2">
                        <Input
                          id="promo"
                          value={promoCode}
                          onChange={e => setPromoCode(e.target.value)}
                          placeholder="Enter code"
                          className="uppercase bg-background"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={applyPromoCode}
                          disabled={isPromoValidating || !promoCode.trim()}
                        >
                          {isPromoValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                        </Button>
                      </div>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-4 space-y-2 border border-border/50">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Account</span>
                        <span className="font-medium text-right">{form.clientName}<br /><span className="text-xs opacity-70">{form.clientEmail}</span></span>
                      </div>
                      <div className="border-t border-border/50 my-2"></div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Service</span>
                        <span className="font-medium">{selectedPricing.service_label}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Package</span>
                        <span className="font-medium">{tierLabels[selectedPricing.tier]}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Currency</span>
                        <span className="font-medium">{currency === 'USD' ? '🌍 USD (International)' : '🇬🇭 GHS (Local)'}</span>
                      </div>
                      {promoDiscount > 0 && (
                        <div className="flex justify-between text-sm text-emerald-500 font-medium">
                          <span>Discount ({promoDiscount}%)</span>
                          <span>-{formatPrice(selectedPricing.price * (promoDiscount / 100))}</span>
                        </div>
                      )}
                      <div className="border-t border-border pt-2 flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span className="text-primary">{formatPrice(calculateTotal(selectedPricing.price))}</span>
                      </div>
                    </div>

                    <Button type="submit" className="w-full h-14 text-lg font-heading glow-primary" disabled={submitting}>
                      {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Rocket className="w-5 h-5 mr-2" />}
                      Pay & Submit Project
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <div className="flex justify-between items-center px-4">
                <Button variant="ghost" onClick={() => setStep(2)} className="gap-2 text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="w-4 h-4" /> Change Package
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};

export default ClientStartProject;
