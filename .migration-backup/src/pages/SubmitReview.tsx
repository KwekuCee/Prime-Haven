import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Send, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import BrandLogo from '@/components/BrandLogo';

const SERVICE_OPTIONS = ['Graphic Design', 'UI/UX Design', 'Web Development', 'IT Solutions'];

const StarPicker = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
  <div className="flex gap-1.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <button key={i} type="button" onClick={() => onChange(i)} className="focus:outline-none">
        <Star className={`w-8 h-8 transition-colors ${i <= value ? 'text-primary fill-primary' : 'text-muted-foreground/30 hover:text-primary/60'}`} />
      </button>
    ))}
  </div>
);

const SubmitReview = () => {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    client_name: '',
    company_role: '',
    service_used: '',
    rating: 5,
    review_text: '',
  });

  const handleSubmit = async () => {
    if (!form.client_name.trim() || !form.review_text.trim()) {
      toast({ title: 'Required Fields', description: 'Please fill in your name and review.', variant: 'destructive' });
      return;
    }
    if (form.review_text.trim().length < 10) {
      toast({ title: 'Too Short', description: 'Please write at least 10 characters for your review.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      // Fetch location from IP
      let location = '';
      try {
        const geoRes = await fetch('https://ipapi.co/json/');
        if (geoRes.ok) {
          const geo = await geoRes.json();
          location = [geo.city, geo.region, geo.country_name].filter(Boolean).join(', ');
        }
      } catch {
        // Location is optional
      }

      const companyRole = [form.company_role, location].filter(Boolean).join(' · ');

      const { error } = await supabase.from('testimonials').insert({
        client_name: form.client_name.trim(),
        company_role: companyRole || null,
        service_used: form.service_used || null,
        rating: form.rating,
        review_text: form.review_text.trim(),
        is_visible: true,
        display_order: 999,
      });

      if (error) throw error;
      setSubmitted(true);
    } catch (error: any) {
      toast({ title: 'Submission Failed', description: error.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
          <Card className="max-w-md w-full text-center">
            <CardContent className="pt-10 pb-10">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Thank You!</h2>
              <p className="text-muted-foreground">Your review has been submitted and is now live on our website. We truly appreciate your feedback!</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        <div className="flex justify-center mb-8">
          <BrandLogo height={40} />
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Share Your Experience</CardTitle>
            <CardDescription>We'd love to hear about your experience working with Prime Haven.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>Your Name *</Label>
                <Input
                  placeholder="e.g. Ama Boateng"
                  value={form.client_name}
                  onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label>Company / Role <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  placeholder="e.g. CEO at TechStart"
                  value={form.company_role}
                  onChange={(e) => setForm({ ...form, company_role: e.target.value })}
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label>Service Used <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Select value={form.service_used} onValueChange={(v) => setForm({ ...form, service_used: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select the service you used" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Rating *</Label>
                <StarPicker value={form.rating} onChange={(v) => setForm({ ...form, rating: v })} />
              </div>

              <div className="space-y-2">
                <Label>Your Review *</Label>
                <Textarea
                  placeholder="Tell us about your experience..."
                  value={form.review_text}
                  onChange={(e) => setForm({ ...form, review_text: e.target.value })}
                  className="min-h-[120px]"
                  maxLength={1000}
                />
                <p className="text-xs text-muted-foreground text-right">{form.review_text.length}/1000</p>
              </div>

              <Button onClick={handleSubmit} disabled={saving} className="w-full" size="lg">
                {saving ? 'Submitting...' : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Review
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Your location will be detected automatically. By submitting, you agree to have your review displayed publicly.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default SubmitReview;
