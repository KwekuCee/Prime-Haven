import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Lightbulb, PenTool, Code2, Rocket } from 'lucide-react';

const STEPS = [
    {
        title: "Discovery & Strategy",
        description: "We dive deep into your business goals, target audience, and market landscape to define a razor-sharp strategy.",
        icon: Lightbulb,
        color: "text-amber-500",
        bg: "bg-amber-500/20",
        border: "border-amber-500/30"
    },
    {
        title: "UI/UX & Visual Design",
        description: "Our elite designers craft intuitive, stunning glassmorphic interfaces designed to convert and captivate users.",
        icon: PenTool,
        color: "text-primary",
        bg: "bg-primary/20",
        border: "border-primary/30"
    },
    {
        title: "Agile Development",
        description: "We leverage cutting-edge tech (React, Supabase, Tailwind) to build scalable, high-performance digital solutions.",
        icon: Code2,
        color: "text-blue-500",
        bg: "bg-blue-500/20",
        border: "border-blue-500/30"
    },
    {
        title: "Launch & Scale",
        description: "Rigorous testing, optimized deployment, and ongoing post-launch support to ensure your product dominates the market.",
        icon: Rocket,
        color: "text-emerald-500",
        bg: "bg-emerald-500/20",
        border: "border-emerald-500/30"
    }
];

const ProcessTimeline = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start center", "end center"]
    });

    const lineHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

    return (
        <section className="py-24 relative overflow-hidden bg-muted/10">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl" ref={containerRef}>
                <div className="text-center mb-20 relative z-10">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-4xl md:text-5xl font-heading font-bold mb-4 tracking-tight"
                    >
                        How We Execute Web Development
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-lg text-muted-foreground max-w-2xl mx-auto"
                    >
                        A proven, transparent process designed to turn complex ideas into refined, high-performance web applications with absolute precision.
                    </motion.p>
                </div>

                <div className="relative">
                    {/* Background Track Line */}
                    <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-1 bg-border/40 -translate-x-1/2 rounded-full" />

                    {/* Glowing Animated Progress Line */}
                    <motion.div
                        className="absolute left-6 md:left-1/2 top-0 bottom-0 w-1 bg-primary -translate-x-1/2 shadow-[0_0_15px_rgba(var(--primary),0.8)] rounded-full origin-top"
                        style={{ scaleY: lineHeight }}
                    />

                    <div className="space-y-12 md:space-y-24">
                        {STEPS.map((step, index) => {
                            const Icon = step.icon;
                            const isEven = index % 2 === 0;

                            return (
                                <div key={index} className={`relative flex items-center ${isEven ? 'md:flex-row-reverse' : 'md:flex-row'} pl-16 md:pl-0`}>

                                    {/* Central Node */}
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        whileInView={{ scale: 1 }}
                                        viewport={{ once: true, margin: "-100px" }}
                                        transition={{ type: "spring", bounce: 0.5 }}
                                        className="absolute left-6 md:left-1/2 -translate-x-1/2 w-12 h-12 rounded-full border-4 border-background bg-card flex items-center justify-center shadow-xl z-20"
                                    >
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step.bg}`}>
                                            <Icon className={`w-5 h-5 ${step.color}`} />
                                        </div>
                                    </motion.div>

                                    {/* Content Card */}
                                    <motion.div
                                        initial={{ opacity: 0, x: isEven ? 50 : -50 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true, margin: "-100px" }}
                                        transition={{ duration: 0.6, ease: "easeOut" }}
                                        className="w-full md:w-1/2"
                                    >
                                        <div className={`
                      p-6 md:p-8 rounded-3xl border bg-card/40 backdrop-blur-md transition-all duration-300 hover:-translate-y-1
                      ${step.border} shadow-lg hover:shadow-2xl hover:shadow-${step.color.split('-')[1]}-500/10
                      ${isEven ? 'md:ml-12' : 'md:mr-12'}
                    `}>
                                            <div className="flex items-center gap-4 mb-4">
                                                <span className={`text-4xl font-black opacity-20 ${step.color}`}>0{index + 1}</span>
                                                <h3 className="text-xl md:text-2xl font-bold">{step.title}</h3>
                                            </div>
                                            <p className="text-muted-foreground leading-relaxed">
                                                {step.description}
                                            </p>
                                        </div>
                                    </motion.div>

                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ProcessTimeline;
