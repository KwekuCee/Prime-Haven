import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CreditCard, 
  Smartphone, 
  Building, 
  Bitcoin, 
  Wallet,
  DollarSign,
  CheckCircle,
  Clock,
  Loader2,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';

// Ghana-specific payment methods
const paymentMethods = [
  { value: 'mtn_momo', label: 'MTN Mobile Money', icon: Smartphone, color: 'text-yellow-500' },
  { value: 'vodafone_cash', label: 'Vodafone Cash', icon: Smartphone, color: 'text-red-500' },
  { value: 'airteltigo_money', label: 'AirtelTigo Money', icon: Smartphone, color: 'text-blue-500' },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: Building, color: 'text-green-500' },
  { value: 'crypto', label: 'Cryptocurrency', icon: Bitcoin, color: 'text-orange-500' },
  { value: 'paypal', label: 'PayPal', icon: CreditCard, color: 'text-blue-400' },
  { value: 'wise', label: 'Wise', icon: Wallet, color: 'text-green-400' },
];

const Payments = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [paymentStats, setPaymentStats] = useState({
    totalEarned: 0,
    pendingPayments: 0,
    nextPayment: 0,
  });

  // Form state
  const [formData, setFormData] = useState({
    payment_method: '',
    payment_details: '',
    confirm_details: '',
  });

  // Load user payment data
  useEffect(() => {
    const loadPaymentData = async () => {
      if (!user) return;

      try {
        setLoading(true);
        
        // Load designer details for payment info
        const { data: designerData, error } = await supabase
          .from('designer_details')
          .select('payment_method, payment_details, salary_estimated')
          .eq('user_id', user.id)
          .maybeSingle();

        if (designerData) {
          setFormData({
            payment_method: designerData.payment_method || '',
            payment_details: designerData.payment_details ? JSON.stringify(designerData.payment_details, null, 2) : '',
            confirm_details: '',
          });
        }

        // Load payment history
        const { data: paymentsData } = await supabase
          .from('payments')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (paymentsData) {
          setPaymentHistory(paymentsData);
          
          // Calculate stats
          const totalEarned = paymentsData
            .filter(p => p.type === 'salary' && p.status === 'completed')
            .reduce((sum, p) => sum + (p.amount || 0), 0);
          
          const pendingPayments = paymentsData
            .filter(p => p.status === 'pending').length;

          setPaymentStats({
            totalEarned: totalEarned / 100, // Convert from pesewas to GH₵
            pendingPayments,
            nextPayment: designerData?.salary_estimated || 0,
          });
        }

      } catch (error) {
        console.error('Error loading payment data:', error);
        toast({
          title: "Error loading payment data",
          description: "Could not load your payment information.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadPaymentData();
  }, [user, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getPaymentMethodIcon = (methodValue: string) => {
    const method = paymentMethods.find(m => m.value === methodValue);
    if (!method) return <CreditCard className="w-4 h-4" />;
    
    const Icon = method.icon;
    return <Icon className={`w-4 h-4 ${method.color}`} />;
  };

  const handleCopyDetails = () => {
    if (formData.payment_details) {
      navigator.clipboard.writeText(formData.payment_details);
      toast({
        title: "Copied!",
        description: "Payment details copied to clipboard.",
      });
    }
  };

  const handleSavePaymentMethod = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please login to update payment method.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.payment_method) {
      toast({
        title: "Payment method required",
        description: "Please select a payment method.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.payment_details) {
      toast({
        title: "Payment details required",
        description: "Please enter your payment details.",
        variant: "destructive",
      });
      return;
    }

    if (formData.payment_details !== formData.confirm_details) {
      toast({
        title: "Details don't match",
        description: "Payment details and confirmation don't match.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const paymentDetails = formData.payment_details.trim();
      let parsedDetails = paymentDetails;

      // Try to parse as JSON, otherwise use as string
      try {
        parsedDetails = JSON.parse(paymentDetails);
      } catch {
        // Keep as string if not valid JSON
      }

      const updateData = {
        payment_method: formData.payment_method,
        payment_details: parsedDetails,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('designer_details')
        .update(updateData)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Payment method updated!",
        description: "Your payment information has been saved securely.",
      });

      // Clear confirmation field
      setFormData(prev => ({ ...prev, confirm_details: '' }));

    } catch (error: any) {
      console.error('Error updating payment method:', error);
      toast({
        title: "Update failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPaymentMethodPlaceholder = () => {
    switch (formData.payment_method) {
      case 'mtn_momo':
        return 'Enter your MTN Mobile Money number (e.g., 024XXXXXXX)';
      case 'vodafone_cash':
        return 'Enter your Vodafone Cash number (e.g., 020XXXXXXX)';
      case 'airteltigo_money':
        return 'Enter your AirtelTigo Money number (e.g., 027XXXXXXX)';
      case 'bank_transfer':
        return 'Enter bank account details (JSON format: {"bank": "Bank Name", "account": "1234567890", "name": "Your Name"})';
      case 'crypto':
        return 'Enter cryptocurrency wallet address (e.g., Bitcoin, Ethereum)';
      case 'paypal':
        return 'Enter your PayPal email address';
      case 'wise':
        return 'Enter your Wise email or account details';
      default:
        return 'Enter your payment details';
    }
  };

  if (loading && !paymentHistory.length) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading payment information...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-heading font-bold mb-2">Payment Settings</h1>
              <p className="text-muted-foreground">
                Manage your payment methods and view earnings
              </p>
            </div>
            <Badge variant="outline" className="gap-2">
              <DollarSign className="w-3 h-3" />
              GH₵{paymentStats.totalEarned.toFixed(2)} Earned
            </Badge>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Payment Setup */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Current Payment Method */}
            <Card className="glass">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <div>
                    <CardTitle>Current Payment Method</CardTitle>
                    <CardDescription>
                      How you receive your earnings
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="payment_method" className="mb-2 block">
                      Payment Method *
                    </Label>
                    <Select
                      value={formData.payment_method}
                      onValueChange={(value) => handleSelectChange('payment_method', value)}
                    >
                      <SelectTrigger className="bg-card border-border">
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethods.map((method) => (
                          <SelectItem key={method.value} value={method.value}>
                            <div className="flex items-center gap-2">
                              {getPaymentMethodIcon(method.value)}
                              {method.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.payment_method && (
                    <>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label htmlFor="payment_details">
                            Payment Details *
                          </Label>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowDetails(!showDetails)}
                              className="h-8 gap-1"
                            >
                              {showDetails ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              {showDetails ? 'Hide' : 'Show'}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleCopyDetails}
                              className="h-8 gap-1"
                              disabled={!formData.payment_details}
                            >
                              <Copy className="w-3 h-3" />
                              Copy
                            </Button>
                          </div>
                        </div>
                        <textarea
                          id="payment_details"
                          name="payment_details"
                          value={formData.payment_details}
                          onChange={handleInputChange}
                          placeholder={getPaymentMethodPlaceholder()}
                          rows={4}
                          className="w-full p-3 rounded-lg bg-card border border-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>

                      <div>
                        <Label htmlFor="confirm_details" className="mb-2 block">
                          Confirm Payment Details *
                        </Label>
                        <textarea
                          id="confirm_details"
                          name="confirm_details"
                          value={formData.confirm_details}
                          onChange={handleInputChange}
                          placeholder="Re-enter your payment details to confirm"
                          rows={2}
                          className="w-full p-3 rounded-lg bg-card border border-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                    </>
                  )}

                  <Button
                    onClick={handleSavePaymentMethod}
                    disabled={loading || !formData.payment_method || !formData.payment_details || !formData.confirm_details}
                    className="w-full gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Save Payment Method
                      </>
                    )}
                  </Button>

                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-sm font-medium text-primary mb-2">Security Notice:</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Payment details are encrypted and stored securely</li>
                      <li>• Only you and administrators can view these details</li>
                      <li>• Payments are processed on the 1st and 15th of each month</li>
                      <li>• Minimum payout: GH₵50.00</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment History */}
            <Card className="glass">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-primary" />
                  <div>
                    <CardTitle>Payment History</CardTitle>
                    <CardDescription>
                      Track your earnings and payments
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {paymentHistory.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Reference</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paymentHistory.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell className="font-medium">
                              {new Date(payment.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {payment.type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              GH₵{(payment.amount / 100).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                payment.status === 'completed' ? 'default' :
                                payment.status === 'pending' ? 'outline' :
                                'destructive'
                              }>
                                {payment.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <code className="text-xs bg-card px-2 py-1 rounded">
                                {payment.transaction_id?.substring(0, 8) || 'N/A'}
                              </code>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No payment history yet</p>
                    <p className="text-sm mt-2">Earnings will appear here after approval</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Right Column - Stats & Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Earnings Summary */}
            <Card className="glass">
              <CardHeader>
                <CardTitle>Earnings Summary</CardTitle>
                <CardDescription>Your payment overview</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Earned:</span>
                    <span className="text-lg font-bold text-primary">
                      GH₵{paymentStats.totalEarned.toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Next Payment:</span>
                    <span className="font-medium">
                      GH₵{paymentStats.nextPayment.toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Pending Payments:</span>
                    <Badge variant="outline">
                      {paymentStats.pendingPayments}
                    </Badge>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">Payment Schedule:</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Processing:</span>
                      <span className="text-primary">1st & 15th monthly</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Minimum Payout:</span>
                      <span>GH₵50.00</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Processing Time:</span>
                      <span>24-48 hours</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods Guide */}
            <Card className="glass">
              <CardHeader>
                <CardTitle>Payment Methods Guide</CardTitle>
                <CardDescription>Supported in Ghana</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {paymentMethods.map((method) => (
                    <div key={method.value} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                      <div className={`w-8 h-8 rounded-full ${method.color}/20 flex items-center justify-center`}>
                        {getPaymentMethodIcon(method.value)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{method.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {method.value === 'mtn_momo' && 'Instant, nationwide coverage'}
                          {method.value === 'vodafone_cash' && 'Wide network, reliable'}
                          {method.value === 'airteltigo_money' && 'Fast transfers'}
                          {method.value === 'bank_transfer' && 'Direct to bank account'}
                          {method.value === 'crypto' && 'Borderless, secure'}
                          {method.value === 'paypal' && 'International payments'}
                          {method.value === 'wise' && 'Low fees, multi-currency'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Next Steps */}
            <Card className="glass">
              <CardHeader>
                <CardTitle>Next Steps</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-primary">1</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Complete your profile to start earning
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-primary">2</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Submit work for review and earn points
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-primary">3</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Points convert to cash on payment dates
                    </p>
                  </div>

                  <div className="pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Need help? Contact support at payments@primehaven.com
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Payments;