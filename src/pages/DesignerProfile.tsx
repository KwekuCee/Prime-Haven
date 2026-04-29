import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Star, Trophy, Briefcase, MapPin, Globe, Instagram,
    Github, ExternalLink, Award, CheckCircle2, Layout,
    MessageSquare, UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface Profile {
    id: string;
    full_name?: string | null;
    avatar_url?: string;
    bio?: string;
    location?: string;
    specialty?: string;
    total_points?: number;
    email?: string;
    created_at?: string;
    [key: string]: any;
}

interface PortfolioItem {
    id: string;
    title: string;
    category: string;
    image_url: string;
}

interface BadgeItem {
    id: string;
    badge_name: string;
    badge_icon: string;
    badge_description: string;
}

const DesignerProfile = () => {
    const { id } = useParams();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
    const [badges, setBadges] = useState<BadgeItem[]>([]);
    const [avgRating, setAvgRating] = useState(0);
    const [totalJobs, setTotalJobs] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            loadDesignerData();
        }
    }, [id]);

    const loadDesignerData = async () => {
        try {
            // 1. Load Profile
            const { data: profData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', id)
                .single();
            setProfile(profData);

            // 2. Load Portfolio
            const { data: portData } = await supabase
                .from('portfolio_items')
                .select('*')
                .eq('designer_id', id);
            setPortfolio(portData || []);

            // 3. Load Badges
            const { data: badgeData } = await (supabase
                .from('user_badges') as any)
                .select('*, badges(*)')
                .eq('user_id', id);

            const formattedBadges = badgeData?.map(b => ({
                id: b.id,
                badge_name: b.badges.name,
                badge_icon: b.badges.icon_url,
                badge_description: b.badges.description
            })) || [];
            setBadges(formattedBadges);

            // 4. Load Stats (Rating & Job Count)
            const { data: statsData } = await (supabase
                .from('client_orders') as any)
                .select('client_rating, project_status')
                .eq('assigned_designer_id', id);

            if (statsData) {
                const ratings = statsData.filter(d => d.client_rating).map(d => d.client_rating);
                const avg = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
                setAvgRating(avg);
                setTotalJobs(statsData.filter(d => d.project_status === 'completed').length);
            }
        } catch (err) {
            console.error('Error loading designer profile:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return null;
    if (!profile) return <div>Designer Not Found</div>;

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <main className="pt-24 pb-20">
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

                        {/* Left Column: Profile Card */}
                        <div className="lg:col-span-4 space-y-6">
                            <Card className="glass border-border/50 overflow-hidden sticky top-24">
                                <div className="h-32 bg-gradient-to-br from-primary/20 via-background to-background border-b border-border/30" />
                                <CardContent className="px-6 pb-8 -mt-16 text-center">
                                    <div className="inline-block relative">
                                        <div className="w-32 h-32 rounded-full border-4 border-background overflow-hidden bg-muted shadow-2xl">
                                            {profile.avatar_url ? (
                                                <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-primary text-4xl font-bold bg-primary/10">
                                                    {profile.full_name[0]}
                                                </div>
                                            )}
                                        </div>
                                        <div className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-emerald-500 border-4 border-background flex items-center justify-center" title="Verified Designer">
                                            <UserCheck className="w-4 h-4 text-white" />
                                        </div>
                                    </div>

                                    <h1 className="text-2xl font-heading font-bold mt-4">{profile.full_name}</h1>
                                    <p className="text-primary font-bold text-xs uppercase tracking-widest mt-1">{profile.specialty || 'Creative Designer'}</p>

                                    <div className="flex items-center justify-center gap-2 mt-4">
                                        <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                                            {avgRating === 0 ? 'New' : (
                                                <>
                                                    <Star className="w-3 h-3 fill-primary" /> {avgRating.toFixed(1)}
                                                </>
                                            )}
                                        </div>
                                        <Badge variant="outline" className="text-xs h-7 rounded-full border-border/50">
                                            {totalJobs} Jobs Done
                                        </Badge>
                                    </div>

                                    <p className="text-sm text-muted-foreground mt-6 leading-relaxed italic">
                                        "{profile.bio || 'This designer hasn\'t added a bio yet but their work speaks for itself!'}"
                                    </p>

                                    <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-border/30">
                                        <a href="#" className="flex flex-col items-center gap-1 group">
                                            <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                                <Instagram className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                                            </div>
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Insta</span>
                                        </a>
                                        <a href="#" className="flex flex-col items-center gap-1 group">
                                            <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                                <Layout className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                                            </div>
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Behance</span>
                                        </a>
                                        <a href="#" className="flex flex-col items-center gap-1 group">
                                            <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                                <Github className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                                            </div>
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Git</span>
                                        </a>
                                    </div>

                                    <Button className="w-full mt-8 glow-primary gap-2" size="lg">
                                        <MessageSquare className="w-4 h-4" /> Message Designer
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Column: Achievements & Portfolio */}
                        <div className="lg:col-span-8 space-y-12">

                            {/* Badges Section */}
                            <section>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                        <Trophy className="w-6 h-6 text-amber-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-heading font-bold uppercase tracking-tight">Achievements</h2>
                                        <p className="text-xs text-muted-foreground font-medium">Earned by consistent performance and quality</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    {badges.length === 0 ? (
                                        <div className="col-span-full p-8 rounded-2xl border border-dashed border-border/50 text-center opacity-40">
                                            <Award className="w-10 h-10 mx-auto mb-2" />
                                            <p className="text-sm">No official badges earned yet</p>
                                        </div>
                                    ) : badges.map((badge) => (
                                        <div key={badge.id} className="group relative flex flex-col items-center p-6 rounded-2xl glass border-border/50 hover:border-amber-500/30 transition-all text-center">
                                            <div className="w-16 h-16 rounded-full bg-amber-500/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                <img src={badge.badge_icon} alt={badge.badge_name} className="w-10 h-10 object-contain drop-shadow-lg" />
                                            </div>
                                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-amber-500 mb-1">{badge.badge_name}</h3>
                                            <p className="text-[9px] text-muted-foreground leading-tight">{badge.badge_description}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Portfolio Tabs */}
                            <Tabs defaultValue="all" className="w-full">
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-2xl font-heading font-bold uppercase tracking-tighter">Designer <span className="text-primary">Showcase</span></h2>
                                    <TabsList className="bg-muted/50 border border-border/50 p-1">
                                        <TabsTrigger value="all" className="text-xs font-bold uppercase tracking-widest px-6 data-[state=active]:bg-background">All Work</TabsTrigger>
                                        <TabsTrigger value="logos" className="text-xs font-bold uppercase tracking-widest px-6 data-[state=active]:bg-background">Branding</TabsTrigger>
                                    </TabsList>
                                </div>

                                <TabsContent value="all" className="mt-0">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        {portfolio.length === 0 ? (
                                            <div className="col-span-full p-20 rounded-2xl border border-dashed border-border/50 text-center opacity-40">
                                                <Briefcase className="w-12 h-12 mx-auto mb-4" />
                                                <p className="text-sm">Portfolio is being curated...</p>
                                            </div>
                                        ) : portfolio.map((item) => (
                                            <motion.div
                                                key={item.id}
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                whileInView={{ opacity: 1, scale: 1 }}
                                                viewport={{ once: true }}
                                                className="group relative h-64 rounded-2xl glass border-border/50 overflow-hidden cursor-pointer"
                                            >
                                                <img src={item.image_url} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6">
                                                    <p className="text-[10px] text-primary font-bold uppercase tracking-widest mb-1">{item.category}</p>
                                                    <h4 className="text-sm font-bold">{item.title}</h4>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default DesignerProfile;
