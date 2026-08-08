import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface ServiceItem {
    id: string;
    label: string;
    basePrice: number;
}

const ProjectEstimator = () => {
    const [services, setServices] = useState<ServiceItem[]>([]);
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [timeline, setTimeline] = useState<number>(2); // days
    const [estimatedPrice, setEstimatedPrice] = useState(0);

    const timelines = [
        { label: '6 Hours', value: 0.25 },
        { label: '1 Day', value: 1 },
        { label: '2 Days (Standard)', value: 2 },
        { label: '3 Days', value: 3 },
        { label: '4 Days', value: 4 },
        { label: '5 Days', value: 5 },
        { label: '1 Week', value: 7 },
    ];

    useEffect(() => {
        const fetchServices = async () => {
            try {
                const { data } = await supabase
                    .from('service_pricing')
                    .select('service_type, service_label, price')
                    .eq('is_active', true)
                    .order('price', { ascending: true });

                if (data && data.length > 0) {
                    // Deduplicate by service type, taking the lowest base price
                    const uniqueMap = new Map();
                    data.forEach(item => {
                        if (!uniqueMap.has(item.service_type)) {
                            uniqueMap.set(item.service_type, {
                                id: item.service_type,
                                label: item.service_label,
                                basePrice: item.price
                            });
                        }
                    });
                    const uniqueServices = Array.from(uniqueMap.values());
                    setServices(uniqueServices);
                    if (uniqueServices.length > 0) setSelectedServices([uniqueServices[0].id]);
                }
            } catch (err) {
                console.error("Error fetching services", err);
            }
        };
        fetchServices();
    }, []);

    const toggleService = (id: string) => {
        setSelectedServices(prev =>
            prev.includes(id)
                ? prev.filter(s => s !== id)
                : [...prev, id]
        );
    };

    useEffect(() => {
        let total = selectedServices.reduce((sum, id) => {
            const srv = services.find(s => s.id === id);
            return sum + (srv ? srv.basePrice : 0);
        }, 0);

        // Pricing logic:
        // Same day / 1 day / 6 hours (< 2 days) -> +40%
        if (timeline < 2) total = total * 1.4;
        // More than 4 days -> -20%
        else if (timeline > 4) total = total * 0.8;

        setEstimatedPrice(Math.round(total));
    }, [selectedServices, timeline, services]);

    return (
        <section className="py-24 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 blur-[150px] opacity-50 rounded-full pointer-events-none" />

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 max-w-6xl">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

                    {/* Left Text */}
                    <div className="space-y-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="eyebrow"
                        >
                            <Calculator className="w-4 h-4" /> Fixed Price & Fast Delivery
                        </motion.div>

                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="text-4xl md:text-5xl font-heading font-bold tracking-tight"
                        >
                            Get an instant project estimate.
                        </motion.h2>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                            className="text-lg text-muted-foreground"
                        >
                            Select your needs and delivery deadline. Usually, we deliver works in 2 days. Get a discount for longer timelines or choose an ultra-fast rush.
                        </motion.p>

                        <motion.ul
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 }}
                            className="space-y-3 pt-4"
                        >
                            {[
                                "2-Day Standard Delivery",
                                "40% Rush Surcharge (<24h)",
                                "20% Discount for 4+ Day Delivery",
                                "Direct communication with elite talent"
                            ].map((benefit, i) => (
                                <li key={i} className="flex items-center gap-3 text-muted-foreground">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                                    {benefit}
                                </li>
                            ))}
                        </motion.ul>
                    </div>

                    {/* Right Calculator Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
                        className="w-full paper-card p-6 md:p-8 relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />

                        <div className="relative space-y-8 z-10">
                            {/* Service Selection */}
                            <div>
                                <label className="text-sm font-semibold mb-4 block text-foreground tracking-wide">1. WHAT DO YOU NEED?</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {services.map(srv => {
                                        const isSelected = selectedServices.includes(srv.id);
                                        return (
                                            <button
                                                key={srv.id}
                                                onClick={() => toggleService(srv.id)}
                                                className={`
                          p-4 rounded-xl border text-left transition-all duration-300
                          ${isSelected
                                                        ? 'bg-primary/10 border-primary text-primary shadow-[0_0_15px_rgba(var(--primary),0.2)]'
                                                        : 'bg-background/50 border-border/50 hover:border-primary/50 text-muted-foreground hover:text-foreground'
                                                    }
                        `}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium text-sm">{srv.label}</span>
                                                    {isSelected && <CheckCircle2 className="w-4 h-4" />}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Timeline Slider */}
                            <div>
                                <label className="flex items-center justify-between text-sm font-semibold mb-4 text-foreground tracking-wide">
                                    <span>2. DELIVERY DEADLINE</span>
                                    <span className={`px-2 py-0.5 rounded text-xs ${timeline < 2 ? 'bg-amber-500/20 text-amber-500' : timeline > 4 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                                        {timelines.find(t => t.value === timeline)?.label || `${timeline} Days`}
                                    </span>
                                </label>
                                <div className="space-y-4">
                                    <input
                                        type="range"
                                        min="0.25"
                                        max="7"
                                        step="0.25"
                                        value={timeline}
                                        onChange={(e) => setTimeline(Number(e.target.value))}
                                        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                    <div className="grid grid-cols-4 gap-2">
                                        {[0.25, 1, 2, 5].map(val => (
                                            <button
                                                key={val}
                                                onClick={() => setTimeline(val)}
                                                className={`py-1.5 rounded-lg text-[10px] font-bold border transition-all ${timeline === val ? 'bg-primary border-primary text-primary-foreground' : 'bg-background border-border text-muted-foreground hover:border-primary/50'}`}
                                            >
                                                {val === 0.25 ? '6H' : val === 1 ? '1D' : val === 2 ? '2D' : '5D'}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex justify-between text-[11px] text-muted-foreground mt-2 font-medium uppercase tracking-wider">
                                        <span>Rush (+40%)</span>
                                        <span>Standard</span>
                                        <span>Relaxed (-20%)</span>
                                    </div>
                                </div>
                            </div>

                            {/* Result */}
                            <div className="pt-6 border-t border-border/50">
                                <div className="flex items-end justify-between mb-6">
                                    <div>
                                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Estimated Cost</h4>
                                        <p className="text-[10px] text-muted-foreground">Prices in Ghana Cedis (GH₵)</p>
                                    </div>
                                    <div className="text-right">
                                        <AnimatePresence mode="popLayout">
                                            <motion.div
                                                key={estimatedPrice}
                                                initial={{ opacity: 0, y: -20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 20 }}
                                                className="text-4xl font-heading font-black text-primary"
                                            >
                                                {estimatedPrice === 0 ? "—" : `₵${estimatedPrice.toLocaleString()}`}
                                            </motion.div>
                                        </AnimatePresence>
                                    </div>
                                </div>

                                <Button asChild className="w-full h-12 text-sm font-bold shadow-lg shadow-primary/20 group">
                                    <Link to={`/start-project?services=${selectedServices.join(',')}&timeline=${timeline}`}>
                                        Finalize Project Scope <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

export default ProjectEstimator;
