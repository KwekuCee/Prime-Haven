import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface SitePromo {
    id: string;
    title: string;
    description: string | null;
    image_url: string | null;
    link_url: string | null;
    delay_ms: number | null;
    target_audience: string | null;
}

const GlobalPromoManager = () => {
    const [currentPromo, setCurrentPromo] = useState<SitePromo | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const fetchPromos = async () => {
            const { data, error } = await supabase
                .from('site_promos')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (data && data.length > 0) {
                const promo = data[0]; // Show the latest active promo for now

                // Add a small delay based on the promo's configuration
                const timer = setTimeout(() => {
                    // Check if already dismissed in this session
                    const dismissed = sessionStorage.getItem(`promo-dismissed-${promo.id}`);
                    if (!dismissed) {
                        setCurrentPromo(promo);
                        setIsVisible(true);
                    }
                }, promo.delay_ms || 2500);

                return () => clearTimeout(timer);
            }
            return undefined;
        };

        fetchPromos();
    }, []);

    const handleDismiss = () => {
        if (currentPromo) {
            sessionStorage.setItem(`promo-dismissed-${currentPromo.id}`, 'true');
        }
        setIsVisible(false);
    };

    if (!currentPromo) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/40 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-lg glass-card overflow-hidden rounded-3xl shadow-2xl border border-primary/20"
                    >
                        {/* Close Button */}
                        <button
                            onClick={handleDismiss}
                            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-background/50 hover:bg-background/80 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Image Header */}
                        {currentPromo.image_url && (
                            <div className="relative aspect-video w-full overflow-hidden">
                                <img
                                    src={currentPromo.image_url}
                                    alt={currentPromo.title}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                            </div>
                        )}

                        {/* Content */}
                        <div className="p-8 space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Special Promotion</span>
                            </div>

                            <h2 className="text-3xl font-heading font-bold tracking-tight">
                                {currentPromo.title}
                            </h2>

                            {currentPromo.description && (
                                <p className="text-muted-foreground text-lg leading-relaxed">
                                    {currentPromo.description}
                                </p>
                            )}

                            <div className="pt-4 flex flex-col sm:flex-row gap-3">
                                {currentPromo.link_url && (
                                    <a
                                        href={currentPromo.link_url}
                                        target={currentPromo.link_url.startsWith('http') ? '_blank' : '_self'}
                                        rel="noopener noreferrer"
                                        className="flex-1"
                                        onClick={handleDismiss}
                                    >
                                        <Button className="w-full h-12 text-base glow-primary group">
                                            Get Started
                                            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </Button>
                                    </a>
                                )}
                                <Button
                                    variant="ghost"
                                    className="h-12 text-base hover:bg-primary/5"
                                    onClick={handleDismiss}
                                >
                                    Maybe Later
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default GlobalPromoManager;
