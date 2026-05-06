import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Promo {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
  collect_email: boolean;
  background_color: string | null;
  accent_color: string | null;
}

const PromoPopup = () => {
  const [promo, setPromo] = useState<Promo | null>(null);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("promo_popups")
        .select("id,title,description,image_url,cta_label,cta_url,collect_email,background_color,accent_color")
        .eq("is_active", true)
        .maybeSingle();
      if (cancelled || !data) return;
      setPromo(data as Promo);
      setTimeout(() => !cancelled && setOpen(true), 2500);
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promo || !email.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("submit-promo-email", {
        body: { popup_id: promo.id, email: email.trim() },
      });
      if (error) throw error;
      setSubmitted(true);
      toast({ title: "You're in!", description: "Thanks for subscribing." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Could not subscribe", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (!promo) return null;

  const bg = promo.background_color || "#0a0a0a";
  const accent = promo.accent_color || "#fe4c18";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="max-w-md p-0 overflow-hidden border-0 shadow-2xl animate-scale-in"
        style={{ background: bg, color: "#fff" }}
      >
        {promo.image_url && (
          <div className="w-full h-48 overflow-hidden">
            <img src={promo.image_url} alt={promo.title} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-6 space-y-4">
          <h2 className="text-2xl font-bold leading-tight" style={{ color: accent }}>
            {promo.title}
          </h2>
          {promo.description && (
            <p className="text-sm text-white/80 whitespace-pre-line">{promo.description}</p>
          )}

          {promo.collect_email && !submitted && (
            <form onSubmit={handleSubmit} className="space-y-2">
              <Input
                type="email"
                required
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
              <Button
                type="submit"
                disabled={submitting}
                className="w-full font-semibold"
                style={{ background: accent, color: "#fff" }}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Subscribe
              </Button>
            </form>
          )}

          {promo.collect_email && submitted && (
            <div className="text-sm text-white/80 text-center py-2">✓ You're subscribed!</div>
          )}

          {promo.cta_url && promo.cta_label && (
            <a href={promo.cta_url} target="_blank" rel="noopener noreferrer">
              <Button
                className="w-full font-semibold"
                style={{ background: promo.collect_email ? "transparent" : accent, color: "#fff", border: `1px solid ${accent}` }}
              >
                {promo.cta_label}
              </Button>
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PromoPopup;
