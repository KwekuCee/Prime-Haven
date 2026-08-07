import { motion } from 'framer-motion';
import { Target, Coins, Globe, ArrowRight, Activity, Cpu } from 'lucide-react';
import { Link } from 'react-router-dom';

const ValueBentoGrid = () => {
    return (
        <section className="py-24 relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary/20 blur-[120px] rounded-full pointer-events-none opacity-50" />

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6"
                    >
                        <Target className="w-4 h-4" /> Why Choose Us
                    </motion.div>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-5xl font-heading font-bold mb-6 tracking-tight text-foreground"
                    >
                        Built for the <span className="text-gradient">modern digital era.</span>
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="text-lg text-muted-foreground"
                    >
                        We combine world-class talent, proprietary AI evaluation, and aggressive performance incentives to deliver unmatched quality.
                    </motion.p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                    {/* Box 1: Large Span */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 }}
                        className="md:col-span-2 md:row-span-2 group relative overflow-hidden rounded-3xl border border-border/70 bg-card p-8 flex flex-col justify-between"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        <div className="relative z-10 space-y-4 mb-12">
                            <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-primary/20 text-primary">
                                <Cpu className="w-6 h-6" />
                            </div>
                            <h3 className="text-3xl font-heading font-bold">Top 1% AI-Scored Talent</h3>
                            <p className="text-muted-foreground text-lg max-w-md">
                                Our proprietary AI evaluates designers on 5 dimensions: quality, consistency, revision efficiency, reliability, and client success rate. Only the elite handle your projects.
                            </p>
                        </div>

                        <div className="relative z-10 flex border border-border/50 bg-background rounded-2xl p-6 backdrop-blur-md overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/30 blur-3xl -translate-y-1/2 translate-x-1/2 rounded-full pointer-events-none" />
                            <div className="flex-1 space-y-6">
                                <div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-muted-foreground font-medium">Design Consistency</span>
                                        <span className="text-emerald-400 font-bold">98%</span>
                                    </div>
                                    <div className="w-full bg-muted/50 rounded-full h-2.5 overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            whileInView={{ width: '98%' }}
                                            viewport={{ once: true }}
                                            transition={{ duration: 1.5, delay: 0.5, ease: 'easeOut' }}
                                            className="bg-emerald-500 h-2.5 rounded-full"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-muted-foreground font-medium">Revision Efficiency</span>
                                        <span className="text-primary font-bold">95%</span>
                                    </div>
                                    <div className="w-full bg-muted/50 rounded-full h-2.5 overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            whileInView={{ width: '95%' }}
                                            viewport={{ once: true }}
                                            transition={{ duration: 1.5, delay: 0.7, ease: 'easeOut' }}
                                            className="bg-primary h-2.5 rounded-full"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Box 2 */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.4 }}
                        className="md:col-span-1 group relative overflow-hidden rounded-3xl border border-border/70 bg-card p-8"
                    >
                        <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="relative z-10">
                            <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-amber-500/20 text-amber-500 mb-6">
                                <Coins className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-heading font-bold mb-3">Revenue Sharing</h3>
                            <p className="text-muted-foreground text-sm">
                                We believe in growing together. Our talent is incredibly motivated because they earn direct revenue shares for delivering stunning work and achieving client acceptance points.
                            </p>
                        </div>
                        {/* Animated coins decoration */}
                        <div className="absolute -bottom-6 -right-6 flex gap-2 opacity-20">
                            <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }} className="w-16 h-16 rounded-full border-[6px] border-amber-500" />
                            <motion.div animate={{ y: [0, -15, 0] }} transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut', delay: 0.5 }} className="w-20 h-20 rounded-full border-[8px] border-amber-500" />
                        </div>
                    </motion.div>

                    {/* Box 3 */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5 }}
                        className="md:col-span-1 group relative overflow-hidden rounded-3xl border border-blue-500/20 bg-blue-500/5 backdrop-blur-xl p-8 flex flex-col justify-between"
                    >
                        <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="relative z-10 mb-8">
                            <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-blue-500/20 text-blue-400 mb-6 group-hover:scale-110 transition-transform duration-500">
                                <Globe className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-heading font-bold mb-3 text-foreground dark:text-white">Global Reach & Standards</h3>
                            <p className="text-muted-foreground text-sm">
                                Borderless talent pool operating under strict international design standards. We deliver Silicon Valley quality, globally accessible.
                            </p>
                        </div>

                        <Link to="/start-project" className="relative z-10 inline-flex items-center gap-2 text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors group/btn">
                            Start your project <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                        </Link>
                    </motion.div>

                </div>
            </div>
        </section>
    );
};

export default ValueBentoGrid;
