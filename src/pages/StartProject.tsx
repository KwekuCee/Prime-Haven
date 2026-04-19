import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, ArrowLeft, ArrowRight, Check, Loader2, Send, Star, Globe, Banknote } from 'lucide-react';
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

// Approximate conversion rate: 1 USD ≈ 15.5 GHS
const GHS_TO_USD = 1 / 15.5;

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
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<ServicePricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currency, setCurrency] = useState<'GHS' | 'USD'>('GHS');
  const [gateway, setGateway] = useState<'korapay' | 'paystack'>('korapay');

  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedTier, setSelectedTier] = useState<string>('');
  const [selectedPricing, setSelectedPricing] = useState<ServicePricing | null>(null);

  const [form, setForm] = useState({
    clientName: '',
    clientEmail: '',
    clientWhatsapp: '',
    description: '',
  });

  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [isPromoValidating, setIsPromoValidating] = useState(false);
  const [promoRef, setPromoRef] = useState<string | null>(null);

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
      return `$${(priceGhs * GHS_TO_USD).toFixed(2)}`;
    }
    return `GH₵${priceGhs.toLocaleString()}`;
  };

  const getPaymentAmount = (priceGhs: number) => {
    if (currency === 'USD') {
      return Math.ceil(priceGhs * GHS_TO_USD * 100) / 100; // round up to nearest cent
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
    if (!form.clientName || !form.clientEmail || !form.description) {
      toast({ title: 'Missing fields', description: 'Please fill in all required fields.', variant: 'destructive' });
      return;
    }

    if (gateway === 'korapay' && !window.Korapay) {
      toast({ title: 'System Loading', description: 'Korapay is still initializing. Please wait...', variant: 'default' });
      return;
    }

    if (gateway === 'paystack' && !window.PaystackPop) {
      toast({ title: 'System Loading', description: 'Paystack is still initializing. Please wait...', variant: 'default' });
      return;
    }

    if (!selectedPricing) return;

    setSubmitting(true);
    const reference = `PH-ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const finalPrice = calculateTotal(selectedPricing.price);
    const amount = getPaymentAmount(finalPrice);

    // Bypass payment gateway AND edge function for 100% discount (0 GHS)
    // The edge function is only needed for paid orders to verify payment with gateways
    if (amount === 0) {
      const freeReference = `PH-FREE-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      toast({ title: 'Processing Order', description: 'Applying your 100% discount...' });
      try {
        // Insert order directly — no payment gateway verification needed
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

        if (orderError) {
          console.error('Free order insert error:', orderError);
          throw new Error(orderError.message);
        }

        const distributionMap: Record<string, { professions: string[], max: number }> = {
          "graphic-design": { professions: ['Graphic Designer'], max: 2 },
          "app-design": { professions: ['UI/UX Designer'], max: 1 },
          "web-dev": { professions: ['UI/UX Designer', 'Web Developer'], max: 1 },
        };
        const dist = distributionMap[selectedPricing.discord_category] || { professions: ['Web Developer'], max: 1 };

        // Also create the client project for tracking
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
        }).then(() => { }).catch(e => console.error('Project tracking insert failed (non-critical):', e));


        // 3. Notify Discord via Database RPC (bypassing edge function)
        try {
          // @ts-ignore
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
        navigate('/?project=success');

      } catch (err: any) {
        console.error('Free order error:', err);
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



    if (gateway === 'korapay') {
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
    } else {
      try {
        const handler = window.PaystackPop.setup({
          key: PAYSTACK_PUBLIC_KEY,
          email: form.clientEmail,
          amount: Math.round(amount * 100), // Paystack uses kobo/pesewas
          currency: currency === 'USD' ? 'USD' : 'GHS',
          ref: reference,
          metadata: {
            custom_fields: [
              { display_name: "Client Name", variable_name: "client_name", value: form.clientName }
            ]
          },
          callback: (response: any) => {
            handleOrderProcess(reference, finalPrice);
          },


          onClose: () => {
            setSubmitting(false);
          }
        });
        handler.openIframe();
      } catch (err: any) {
        setSubmitting(false);
        toast({ title: 'Payment System Error', description: `Could not open Paystack: ${err.message || 'Unknown error'}. Please try again.`, variant: 'destructive' });
      }

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
          gateway: gateway
        },
      });

      if (error) {
        // The supabase client wraps the response — try to read the body
        let detailMsg = error.message;
        // For FunctionsHttpError, the context is the Response object
        if (error.context && typeof error.context.json === 'function') {
          try {
            const body = await error.context.json();
            if (body?.message) detailMsg = body.message;
            else if (body?.error) detailMsg = body.error;
          } catch (_) { }
        }
        // Also check if data itself has the error info (some versions)
        if (data && typeof data === 'object' && data.error) {
          detailMsg = data.message || data.error;
        }
        throw new Error(detailMsg);
      }

      // Check if data indicates failure (edge function returned 200 but with error payload)
      if (data && data.success === false) {
        throw new Error(data.error || data.message || 'Order processing failed');
      }

      toast({ title: 'Project Submitted! 🎉', description: 'Your project has been received. We\'ll get started right away!' });
      navigate('/?project=success');
    } catch (err: any) {
      console.error('Order processing error:', err);
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
          <div className="flex items-center gap-4">
            {/* Currency Toggle */}
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
                <Globe className="w-3 h-3" /> USD
              </button>
            </div>
            <div className="flex items-center gap-2">
              {[1, 2, 3].map(s => (
                <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {step > s ? <Check className="w-4 h-4" /> : s}
                </div>
              ))}
            </div>
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
                        From {formatPrice(Math.min(...services.filter(s => s.service_type === type).map(s => s.price)))}
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
                  {selectedPricing.service_label} — {tierLabels[selectedPricing.tier]} ({formatPrice(selectedPricing.price)})
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

                    <div className="space-y-3">
                      <Label>Choose Payment Method</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div
                          onClick={() => setGateway('korapay')}
                          className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${gateway === 'korapay' ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-primary/30'}`}
                        >
                          <Banknote className={`w-6 h-6 ${gateway === 'korapay' ? 'text-primary' : 'text-muted-foreground'}`} />
                          <span className="text-xs font-bold uppercase tracking-widest text-center">Korapay</span>
                          <span className="text-[10px] text-muted-foreground text-center">MTN Momo, Telecel Cash, AirtelTigo Cash Only.</span>

                        </div>
                        <div
                          onClick={() => setGateway('paystack')}
                          className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${gateway === 'paystack' ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-primary/30'}`}
                        >
                          <Globe className={`w-6 h-6 ${gateway === 'paystack' ? 'text-primary' : 'text-muted-foreground'}`} />
                          <span className="text-xs font-bold uppercase tracking-widest text-center">Paystack</span>
                          <span className="text-[10px] text-muted-foreground text-center">MTN Momo, Telecel Cash, AirtelTigo Cash, Bank Transfer, Card</span>

                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">

                      <Label htmlFor="promo">Promo Code</Label>
                      <div className="flex gap-2">
                        <Input
                          id="promo"
                          value={promoCode}
                          onChange={e => setPromoCode(e.target.value)}
                          placeholder="Enter code (e.g. YOUTHQUAKE)"
                          className="uppercase"
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

                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
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
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold text-muted-foreground uppercase opacity-50">Pay in</span>
                  <div className="flex p-1 bg-muted rounded-full border border-border/50">
                    <button type="button" onClick={() => setCurrency('GHS')} className={`px-4 py-1.5 rounded-full text-[10px] font-bold transition-all ${currency === 'GHS' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}>GHS</button>
                    <button type="button" onClick={() => setCurrency('USD')} className={`px-4 py-1.5 rounded-full text-[10px] font-bold transition-all ${currency === 'USD' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}>USD</button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default StartProject;
