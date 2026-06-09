import { motion } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import ProjectMarketplace from '@/components/dashboard/ProjectMarketplace';
import { ShoppingBag, Sparkles, Filter, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const Marketplace = () => {
    return (
        <DashboardLayout>
            <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-8">
                {/* Header Section */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row md:items-end md:justify-between gap-6"
                >
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                                <ShoppingBag className="w-4 h-4 text-primary" />
                            </div>
                            <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold border-primary/20 text-primary bg-primary/5">
                                Official Marketplace
                            </Badge>
                        </div>
                        <h1 className="text-3xl font-heading font-bold">Project Marketplace</h1>
                        <p className="text-sm text-muted-foreground max-w-2xl">
                            Discover and claim high-value contracts from verified clients.
                            Only projects matching your profession and skill level are displayed here.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground uppercase font-bold tracking-widest mr-2">
                            <Sparkles className="w-3 h-3 text-primary" />
                            Real-time updates
                        </div>
                    </div>
                </motion.div>

                {/* Global Marketplace Search/Filter Placeholder (Future Expansion) */}
                {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           {/* Add global filters here if needed later */}
                {/* </div> */}

                {/* Main Marketplace Component */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <ProjectMarketplace fullWidth={true} />
                </motion.div>

                {/* Bottom Banner */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="p-8 rounded-3xl bg-gradient-to-br from-card/80 to-card/20 border border-border/40 text-center space-y-4"
                >
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                        <Sparkles className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-heading font-bold">Don't see what you're looking for?</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                        New projects are added throughout the day. Enable desktop notifications to be the first to know when a high-priority bounty is pushed!
                    </p>
                </motion.div>
            </div>
        </DashboardLayout>
    );
};

export default Marketplace;
