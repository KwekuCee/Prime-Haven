import { motion } from 'framer-motion';

export const AnimatedTechGrid = () => {
    return (
        <div className="relative w-full max-w-[600px] aspect-[4/3] sm:aspect-square lg:aspect-auto lg:h-[600px] flex items-center justify-center mx-auto mt-8 lg:mt-0" style={{ perspective: '1200px' }}>

            {/* Deep Space Background Glows */}
            <div className="absolute top-1/4 -right-12 w-64 h-64 bg-primary/20 rounded-full blur-[80px] pointer-events-none animate-pulse" />
            <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="relative w-full h-full flex justify-center items-center"
            >
                <motion.div
                    animate={{
                        y: [-15, 15, -15],
                        rotateX: [0, 2, 0, -2, 0],
                        rotateY: [0, -3, 0, 3, 0],
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="relative w-[110%] md:w-[130%] h-[110%] md:h-[130%] max-w-[800px] flex justify-center items-center z-10 drop-shadow-2xl"
                    style={{ transformStyle: 'preserve-3d' }}
                >
                    {/* Glass/Glow Backing */}
                    <div className="absolute inset-4 sm:inset-10 bg-gradient-to-tr from-primary/10 to-transparent blur-3xl -z-10 rounded-full opacity-60" />

                    {/* The AI Generated 3D Asset */}
                    <img
                        src="/hero_3d_gen.png"
                        alt="Futuristic Prime Haven Interface"
                        className="w-full h-full object-contain rounded-3xl"
                        loading="eager"
                        style={{ filter: "drop-shadow(0 25px 35px rgba(0,0,0,0.5)) drop-shadow(0 0 40px hsl(var(--primary)/20))" }}
                    />

                    {/* Live Floating Data Particles */}
                    {[...Array(6)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute w-2 h-2 rounded-full bg-primary shadow-[0_0_15px_hsl(var(--primary))]"
                            style={{
                                top: `${20 + Math.random() * 60}%`,
                                left: `${10 + Math.random() * 80}%`,
                                z: 50 + (i * 20)
                            }}
                            animate={{
                                y: [0, -40, 0],
                                opacity: [0, 1, 0],
                                scale: [0.5, 1.5, 0.5],
                            }}
                            transition={{
                                duration: 3 + Math.random() * 2,
                                repeat: Infinity,
                                delay: Math.random() * 2,
                                ease: "easeInOut"
                            }}
                        />
                    ))}
                </motion.div>
            </motion.div>
        </div>
    );
};
