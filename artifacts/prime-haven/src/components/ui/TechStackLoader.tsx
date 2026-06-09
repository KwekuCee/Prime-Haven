import { motion } from "framer-motion";
import { Layers, Database, Code2, Cpu } from "lucide-react";

export const TechStackLoader = () => {
    const stack = [
        { icon: Database, label: "Initializing Database" },
        { icon: Cpu, label: "Waking Servers" },
        { icon: Code2, label: "Compiling Logic" },
        { icon: Layers, label: "Rendering Interface" },
    ];

    return (
        <div className="min-h-screen flex items-center justify-center bg-background overflow-hidden relative">
            {/* Background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[100px]" />

            <div className="relative flex flex-col items-center gap-12">
                <div className="flex flex-col-reverse items-center gap-3">
                    {stack.map((item, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 30, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{
                                delay: index * 0.4,
                                duration: 0.6,
                                type: "spring",
                                stiffness: 100,
                            }}
                            className="glass rounded-xl p-4 flex items-center gap-4 w-64 border border-primary/30 bg-card/40 backdrop-blur-md shadow-[0_0_20px_hsl(var(--primary)/20)] relative overflow-hidden"
                            style={{ zIndex: stack.length - index }}
                        >
                            {/* Scanline effect */}
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/10 to-transparent"
                                animate={{ y: ["-100%", "200%"] }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: index * 0.2 }}
                                style={{ height: "50%" }}
                            />

                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <item.icon className="text-primary w-5 h-5" />
                            </div>
                            <span className="font-heading font-bold text-sm text-foreground">{item.label}</span>
                        </motion.div>
                    ))}
                </div>

                <motion.p
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-primary font-bold uppercase tracking-[0.3em] text-xs"
                >
                    Building Platform...
                </motion.p>
            </div>
        </div>
    );
};
