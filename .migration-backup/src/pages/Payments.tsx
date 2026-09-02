import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard, Smartphone, Building, Bitcoin, Wallet, DollarSign,
  CheckCircle, Clock, Loader2, Copy, Eye, EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { useUserSettings } from '@/contexts/UserSettingsContext';

const paymentMethods = [
  { value: 'mtn_momo', label: 'MTN Mobile Money', icon: Smartphone, color: 'text-yellow-500' },
  { value: 'vodafone_cash', label: 'Vodafone Cash', icon: Smartphone, color: 'text-red-500' },
  { value: 'airteltigo_money', label: 'AirtelTigo Money', icon: Smartphone, color: 'text-blue-500' },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: Building, color: 'text-emerald-500' },
  { value: 'crypto', label: 'Cryptocurrency', icon: Bitcoin, color: 'text-amber-500' },
  { value: 'paypal', label: 'PayPal', icon: CreditCard, color: 'text-blue-400' },
  { value: 'wise', label: 'Wise', icon: Wallet, color: 'text-emerald-400' },
];

const Payments = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { settings, formatCurrency } = useUserSettings();
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [paymentStats, setPaymentStats] = useState({ totalEarned: 0, pendingPayments: 0, nextPayment: 0 });
  const [formData, setFormData] = useState({ payment_method: '', payment_details: '', confirm_details: '' });

  useEffect(() => {
    const loadPaymentData = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const { data: designerData } = await supabase.from('designer_details').select('payment_method, payment_details, salary_estimated').eq('user_id', user.id).maybeSingle();
        if (designerData) {
          setFormData({ payment_method: designerData.payment_method || '', payment_details: designerData.payment_details ? JSON.stringify(designerData.payment_details, null, 2) : '', confirm_details: '' });
        }
        const { data: paymentsData } = await supabase.from('payments').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
        if (paymentsData) {
          setPaymentHistory(paymentsData);
          const totalEarned = paymentsData.filter(p => p.type === 'salary' && p.status === 'completed').reduce((sum, p) => sum + (p.amount || 0), 0);
          setPaymentStats({ totalEarned, pendingPayments: paymentsData.filter(p => p.status === 'pending').length, nextPayment: designerData?.salary_estimated || 0 });
        }
      } catch { toast({ title: "Error loading payments", variant: "destructive" }); }
      finally { setLoading(false); }
    };
    loadPaymentData();
  }, [user, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setFormData(prev => ({ ...prev, [e.target.name]: e.target.value })); };

  const getPaymentMethodIcon = (v: string) => {
    const m = paymentMethods.find(pm => pm.value === v);
    if (!m) return <CreditCard className="w-3.5 h-3.5" />;
    const Icon = m.icon;
    return <Icon className={`w-3.5 h-3.5 ${m.color}`} />;
  };

  const handleSavePaymentMethod = async () => {
    if (!user || !formData.payment_method || !formData.payment_details) { toast({ title: "Missing fields", variant: "destructive" }); return; }
    if (formData.payment_details !== formData.confirm_details) { toast({ title: "Details don't match", variant: "destructive" }); return; }
    setLoading(true);
    try {
      let parsedDetails: any = formData.payment_details.trim();
      try { parsedDetails = JSON.parse(parsedDetails); } catch { }
      const { error } = await supabase.from('designer_details').update({ payment_method: formData.payment_method, payment_details: parsedDetails, updated_at: new Date().toISOString() }).eq('user_id', user.id);
      if (error) throw error;
      toast({ title: "Payment method updated!" });
      setFormData(prev => ({ ...prev, confirm_details: '' }));
    } catch (error: any) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const getPlaceholder = () => {
    const map: Record<string, string> = {
      mtn_momo: '024XXXXXXX', vodafone_cash: '020XXXXXXX', airteltigo_money: '027XXXXXXX',
      bank_transfer: '{"bank":"Name","account":"123","name":"You"}', crypto: 'Wallet address',
      paypal: 'PayPal email', wise: 'Wise email/details',
    };
    return map[formData.payment_method] || 'Payment details';
  };

  const SectionCard = ({ icon: Icon, title, desc, children, delay = 0 }: { icon: any; title: string; desc?: string; children: React.ReactNode; delay?: number }) => (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><Icon className="w-4 h-4 text-primary" /></div>
        <div>
          <h3 className="text-sm font-heading font-bold">{title}</h3>
          {desc && <p className="text-[10px] text-muted-foreground">{desc}</p>}
        </div>
      </div>
      {children}
    </motion.div>
  );

  if (loading && !paymentHistory.length) {
    return (
      <DashboardLayout>
        <div className="min-h-[80vh] flex items-center justify-center">
          <div className="relative w-16 h-16 mx-auto"><div className="absolute inset-0 rounded-full border-2 border-primary/20" /><div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" /></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Finances</p>
              <h1 className="text-2xl sm:text-3xl font-heading font-bold">Payments</h1>
            </div>
            <Badge variant="outline" className="text-[10px] gap-1.5 self-start sm:self-auto">
              <DollarSign className="w-3 h-3" /> {settings.show_earnings ? formatCurrency(paymentStats.totalEarned) : '••••'} Earned
            </Badge>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Payment Method */}
            <SectionCard icon={CreditCard} title="Payment Method" desc="How you receive earnings" delay={0.05}>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs">Method *</Label>
                  <Select value={formData.payment_method} onValueChange={(v) => setFormData(p => ({ ...p, payment_method: v }))}>
                    <SelectTrigger className="mt-1.5 h-9 text-xs bg-muted/20 border-border/40"><SelectValue placeholder="Select method" /></SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map(m => (
                        <SelectItem key={m.value} value={m.value}><div className="flex items-center gap-2">{getPaymentMethodIcon(m.value)}{m.label}</div></SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {formData.payment_method && (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <Label className="text-xs">Details *</Label>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-6 text-[9px] px-2" onClick={() => setShowDetails(!showDetails)}>
                            {showDetails ? <><EyeOff className="w-3 h-3 mr-1" />Hide</> : <><Eye className="w-3 h-3 mr-1" />Show</>}
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 text-[9px] px-2" onClick={() => { navigator.clipboard.writeText(formData.payment_details); toast({ title: "Copied!" }); }} disabled={!formData.payment_details}>
                            <Copy className="w-3 h-3 mr-1" />Copy
                          </Button>
                        </div>
                      </div>
                      <textarea name="payment_details" value={formData.payment_details} onChange={handleInputChange} placeholder={getPlaceholder()} rows={3}
                        className="w-full p-3 rounded-xl text-xs bg-muted/20 border border-border/40 resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                    <div>
                      <Label className="text-xs">Confirm Details *</Label>
                      <textarea name="confirm_details" value={formData.confirm_details} onChange={handleInputChange} placeholder="Re-enter to confirm" rows={2}
                        className="w-full mt-1.5 p-3 rounded-xl text-xs bg-muted/20 border border-border/40 resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                  </>
                )}
                <Button size="sm" className="w-full text-xs" onClick={handleSavePaymentMethod} disabled={loading || !formData.payment_method || !formData.payment_details || !formData.confirm_details}>
                  {loading ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving...</> : <><CheckCircle className="w-3.5 h-3.5 mr-1.5" />Save Payment Method</>}
                </Button>
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <p className="text-[10px] text-muted-foreground">
                    🔒 Payment details are encrypted. Processed on 1st & 15th. Min payout:$10.
                  </p>
                </div>
              </div>
            </SectionCard>

            {/* Payment History */}
            <SectionCard icon={Clock} title="Payment History" desc="Your earnings record" delay={0.1}>
              {paymentHistory.length > 0 ? (
                <div className="space-y-2">
                  {paymentHistory.map(payment => (
                    <div key={payment.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/10 border border-border/30 hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-muted/30 flex items-center justify-center flex-shrink-0">
                          <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{payment.type}</p>
                          <p className="text-[9px] text-muted-foreground">{new Date(payment.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-bold">{settings.show_earnings ? formatCurrency(payment.amount) : '••••'}</span>
                        <Badge variant={payment.status === 'completed' ? 'default' : payment.status === 'pending' ? 'outline' : 'destructive'} className="text-[8px] h-5">
                          {payment.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="w-8 h-8 text-muted mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No payment history yet</p>
                </div>
              )}
            </SectionCard>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Earnings Summary */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5">
              <h3 className="text-xs font-heading font-bold mb-4">Earnings Summary</h3>
              <div className="space-y-3">
                {[
                  { label: 'Total Earned', value: settings.show_earnings ? formatCurrency(paymentStats.totalEarned) : '••••', highlight: true },
                  { label: 'Next Payment', value: settings.show_earnings ? formatCurrency(paymentStats.nextPayment) : '••••' },
                  { label: 'Pending', value: paymentStats.pendingPayments.toString() },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">{item.label}</span>
                    <span className={`text-xs font-bold ${item.highlight ? 'text-primary' : ''}`}>{item.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-border/40 space-y-1.5 text-[10px] text-muted-foreground">
                <div className="flex justify-between"><span>Schedule</span><span className="text-primary">1st & 15th</span></div>
                <div className="flex justify-between"><span>Min Payout</span><span>GH₵100</span></div>
                <div className="flex justify-between"><span>Processing</span><span>24-48 hrs</span></div>
              </div>
            </motion.div>

            {/* Methods Guide */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5">
              <h3 className="text-xs font-heading font-bold mb-3">Payment Methods</h3>
              <div className="space-y-2">
                {paymentMethods.map(m => (
                  <div key={m.value} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/10 transition-colors">
                    {getPaymentMethodIcon(m.value)}
                    <span className="text-[10px] font-medium">{m.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Steps */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5">
              <h3 className="text-xs font-heading font-bold mb-3">How It Works</h3>
              <div className="space-y-2.5">
                {['Complete your profile', 'Submit work & earn points', 'Points convert to cash'].map((text, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-[8px] font-bold text-primary">{i + 1}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{text}</p>
                  </div>
                ))}
              </div>
              <p className="text-[9px] text-muted-foreground mt-3 pt-3 border-t border-border/40">
                Need help? transactions@primehaven.tech
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Payments;
