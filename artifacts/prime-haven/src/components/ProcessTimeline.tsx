import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Lightbulb, PenTool, Code2, Rocket, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const STEPS = [
    {
        title: "Discovery & Strategy",
        description: "We start with a call. What the business does, who it is for, what has already been tried — then we write down the scope before anyone opens a design file.",
        icon: Lightbulb,
        color: "text-primary",
        bg: "bg-primary/10",
        border: "border-primary/25"
    },
    {
        title: "UI/UX & Visual Design",
        description: "Wireframes first, then screens. You see work in progress and give notes at each round instead of waiting for one big reveal.",
        icon: PenTool,
        color: "text-foreground",
        bg: "bg-muted",
        border: "border-border"
    },
    {
        title: "Agile Development",
        description: "We build in React with a Postgres backend. You get a staging link early so you can click through the real thing, not a slideshow.",
        icon: Code2,
        color: "text-primary",
        bg: "bg-primary/10",
        border: "border-primary/25"
    },
    {
        title: "Launch & Scale",
        description: "We test on real devices, hand over the files and access, and stay on for a month of fixes after launch.",
        icon: Rocket,
        color: "text-foreground",
        bg: "bg-muted",
        border: "border-border"
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
        <section className="py-24 relative bg-muted/10">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-12 lg:items-start gap-12 lg:gap-20">
                        {/* Sticky Heading */}
                        <div className="lg:col-span-5">
                            <div className="self-start lg:sticky lg:top-32 space-y-6">
                                <span className="eyebrow">Our process</span>
                                <h2 className="text-4xl md:text-5xl font-heading font-extrabold tracking-tight leading-[1.05] text-foreground">
                                    How we execute <span className="display-italic text-primary">web development</span>
                                </h2>
                                <p className="text-lg text-muted-foreground leading-relaxed">
                                    A proven, transparent process designed to turn complex ideas into refined, high-performance web applications with absolute precision.
                                </p>
                                <Link
                                    to="/services/web-development"
                                    className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:gap-3 transition-all"
                                >
                                    Explore web development <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>

                        {/* Scrolling Timeline */}
                        <div className="lg:col-span-7 relative" ref={containerRef}>
                            {/* Background Track Line */}
                            <div className="absolute left-6 top-0 bottom-0 w-1 bg-border/40 -translate-x-1/2 rounded-full" />

                            {/* Glowing Animated Progress Line */}
                            <motion.div
                                className="absolute left-6 top-0 bottom-0 w-1 bg-primary -translate-x-1/2 shadow-[0_0_15px_rgba(var(--primary),0.8)] rounded-full origin-top"
                                style={{ scaleY: lineHeight }}
                            />

                            <div className="flex flex-col gap-12 md:gap-16">
                                {STEPS.map((step, index) => {
                                    const Icon = step.icon;

                                    return (
                                        <div key={index} className="relative flex items-start pl-16">

                                            {/* Node */}
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                whileInView={{ scale: 1 }}
                                                viewport={{ once: true, margin: "-100px" }}
                                                transition={{ type: "spring", bounce: 0.5 }}
                                                className="absolute left-6 top-6 -translate-x-1/2 w-12 h-12 rounded-full border-4 border-background bg-card flex items-center justify-center shadow-xl z-20"
                                            >
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step.bg}`}>
                                                    <Icon className={`w-5 h-5 ${step.color}`} />
                                                </div>
                                            </motion.div>

                                            {/* Content Card */}
                                            <motion.div
                                                initial={{ opacity: 0, x: 40 }}
                                                whileInView={{ opacity: 1, x: 0 }}
                                                viewport={{ once: true, margin: "-100px" }}
                                                transition={{ duration: 0.6, ease: "easeOut" }}
                                                className="w-full"
                                            >
                                                <div className={`p-6 md:p-8 rounded-3xl border bg-card transition-all duration-300 hover:-translate-y-1 ${step.border} shadow-lg hover:shadow-2xl`}>
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
                            {/* Scroll runway so the last card can settle before the section ends */}
                            <div className="h-24 md:h-32" aria-hidden="true" />

                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ProcessTimeline;
