import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Globe, Users, Trophy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const GlobalPresence = () => {
    const [memberCount, setMemberCount] = useState(50);
    const [matchRate, setMatchRate] = useState(98);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const { count: members } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', true);
                if (members) setMemberCount(Math.max(50, members));

                const { count: totalSubs } = await supabase.from('submissions').select('*', { count: 'exact', head: true });
                const { count: approvedSubs } = await supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('ph_approved', true);

                if (totalSubs && approvedSubs) {
                    const rate = Math.round((approvedSubs / totalSubs) * 100);
                    setMatchRate(Math.max(90, rate));
                }
            } catch (err) {
                console.error("Failed to fetch global stats", err);
            }
        };
        fetchStats();
    }, []);

    return (
        <section className="py-24 relative overflow-hidden bg-background">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

                    <div className="order-2 lg:order-1 relative aspect-square flex items-center justify-center">
                        {/* The 3D CSS Orb / Globe effect */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            {/* Core glow */}
                            <div className="absolute w-[200px] md:w-[350px] h-[200px] md:h-[350px] bg-blue-500/20 blur-[100px] rounded-full" />

                            {/* Animated Rings */}
                            <motion.div
                                animate={{ rotate: 360, rotateX: 60, rotateY: 30 }}
                                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                className="absolute w-[280px] md:w-[450px] h-[280px] md:h-[450px] border border-blue-500/20 rounded-full"
                            />
                            <motion.div
                                animate={{ rotate: -360, rotateX: -45, rotateY: 45 }}
                                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                                className="absolute w-[320px] md:w-[500px] h-[320px] md:h-[500px] border border-primary/20 rounded-full"
                            />
                            <motion.div
                                animate={{ rotate: 360, rotateX: 20, rotateY: 70 }}
                                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                                className="absolute w-[250px] md:w-[400px] h-[250px] md:h-[400px] border border-emerald-500/10 rounded-full border-dashed"
                            />

                            {/* Central Sphere */}
                            <div className="relative w-40 md:w-56 h-40 md:w-56 rounded-full shadow-[inset_0_0_50px_rgba(59,130,246,0.5),0_0_20px_rgba(59,130,246,0.5)] bg-gradient-to-br from-blue-500/10 to-transparent backdrop-blur-sm border border-blue-500/30 flex items-center justify-center">
                                <Globe className="w-12 h-12 text-blue-400 opacity-50" />

                                {/* Dots / Nodes around sphere */}
                                {[...Array(6)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 10 + i * 2, repeat: Infinity, ease: "linear", delay: i }}
                                        className="absolute inset-0"
                                    >
                                        <div className="absolute top-0 left-1/2 -ml-1.5 w-3 h-3 bg-blue-400 rounded-full shadow-[0_0_10px_rgba(59,130,246,1)]" />
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="order-1 lg:order-2 space-y-8 relative z-10 text-center lg:text-left">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium"
                        >
                            <Globe className="w-4 h-4" /> Global Reach
                        </motion.div>

                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="text-4xl md:text-5xl font-heading font-bold tracking-tight"
                        >
                            Borderless talent. <br className="hidden md:block" /> Universal impact.
                        </motion.h2>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                            className="text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0"
                        >
                            Prime Haven breaks down geographical barriers. We dynamically match your project with elite designers and developers from around the world, ensuring around-the-clock progress and diverse creative perspectives.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 }}
                            className="grid grid-cols-2 gap-4 pt-6"
                        >
                            <div className="glass-card p-6 rounded-2xl border bg-card/40 backdrop-blur-md">
                                <Users className="w-6 h-6 text-primary mb-3 mx-auto lg:mx-0" />
                                <h3 className="text-3xl font-black mb-1">{memberCount}+</h3>
                                <p className="text-sm text-muted-foreground font-medium">Active Elite Members</p>
                            </div>
                            <div className="glass-card p-6 rounded-2xl border bg-card/40 backdrop-blur-md">
                                <Trophy className="w-6 h-6 text-amber-500 mb-3 mx-auto lg:mx-0" />
                                <h3 className="text-3xl font-black mb-1">{matchRate}%</h3>
                                <p className="text-sm text-muted-foreground font-medium">Quality Match Rate</p>
                            </div>
                        </motion.div>
                    </div>

                </div>
            </div>
        </section>
    );
};

export default GlobalPresence;
