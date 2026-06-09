import { motion } from 'framer-motion';
import { Target, Star, CheckCircle, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const MOCK_PULSES = [
    { text: "Sarah earned 40 client points", icon: Star, color: "text-amber-500" },
    { text: "New Full Stack Web project approved", icon: CheckCircle, color: "text-emerald-500" },
    { text: "Michael promoted to Lead Designer", icon: Zap, color: "text-primary" },
    { text: "UI/UX App Design delivered 2 days early", icon: Target, color: "text-blue-500" },
    { text: "Jessica maintained a 99% AI Talent Score", icon: Star, color: "text-amber-500" },
    { text: "Global client onboarding complete", icon: CheckCircle, color: "text-emerald-500" },
];

const CommunityPulse = () => {
    const [pulses, setPulses] = useState(MOCK_PULSES);

    useEffect(() => {
        // Optionally fetch real latest submissions or logs from supabase
        const fetchRealData = async () => {
            try {
                const { data } = await supabase
                    .from('submissions')
                    .select('project_name, service_type')
                    .in('status', ['approved', 'ph_approved'])
                    .order('updated_at', { ascending: false })
                    .limit(3);

                if (data && data.length > 0) {
                    const mapped = data.map(d => ({
                        text: `Project approved: ${d.project_name} (${d.service_type})`,
                        icon: CheckCircle,
                        color: "text-primary"
                    }));
                    setPulses([...mapped, ...MOCK_PULSES].slice(0, 8));
                }
            } catch (err) {
                console.error("Pulse fetch err", err);
            }
        };
        fetchRealData();
    }, []);

    return (
        <div className="w-full relative overflow-hidden bg-background py-8 border-y border-border/30">
            {/* Fade edges */}
            <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

            <div className="flex w-fit">
                <motion.div
                    animate={{ x: [0, -1035] }}
                    transition={{
                        repeat: Infinity,
                        repeatType: 'loop',
                        duration: 25,
                        ease: 'linear',
                    }}
                    className="flex whitespace-nowrap gap-6"
                >
                    {/* Double up the array to make the infinite loop seamless */}
                    {[...pulses, ...pulses, ...pulses].map((item, idx) => (
                        <div
                            key={idx}
                            className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-card/40 border border-border/50 backdrop-blur-md"
                        >
                            <item.icon className={`w-4 h-4 ${item.color}`} />
                            <span className="text-sm font-medium text-foreground">{item.text}</span>
                        </div>
                    ))}
                </motion.div>
            </div>
        </div>
    );
};

export default CommunityPulse;
