import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Star, Trophy, Briefcase, Award, Download, Loader2, UserCheck, Link2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { fetchPortfolioMedia, previewUrl } from '@/lib/portfolioMedia';
import { generatePortfolioPDF } from '@/lib/portfolioPDF';

interface PublicProfile {
    user_id: string;
    full_name: string | null;
    username: string | null;
    bio: string | null;
    specialty: string | null;
    professional_title: string | null;
    profile_photo_url: string | null;
    professions: string[] | null;
    skills: string[] | null;
    experience_level: string | null;
    total_points: number | null;
    talent_score: number | null;
    join_date: string | null;
}

interface Work {
    id: string;
    project_name: string;
    service_type: string;
    points_awarded: number | null;
    files_urls: string[] | null;
    design_link: string | null;
    created_at: string;
}

interface BadgeItem { id: string; badge_name: string; badge_description: string; }

const SERVICE_LABELS: Record<string, string> = {
    logo: 'Logo Design', branding: 'Brand Identity', uiux: 'UI/UX Design',
    web: 'Web Design', print: 'Print Design', flyer: 'Flyer Design',
};

const DesignerProfile = () => {
    const { id } = useParams();
    const [profile, setProfile] = useState<PublicProfile | null>(null);
    const [works, setWorks] = useState<Work[]>([]);
    const [badges, setBadges] = useState<BadgeItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [media, setMedia] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!id) return;
        const load = async () => {
            try {
                const [{ data: prof }, { data: portfolio }, { data: badgeData }] = await Promise.all([
                    (supabase as any).rpc('get_designer_public_profile', { p_designer_id: id }),
                    (supabase as any).rpc('get_designer_public_portfolio', { p_designer_id: id }),
                    (supabase as any).from('user_badges').select('id, badges(title, description)').eq('user_id', id),
                ]);
                setProfile((prof || [])[0] || null);
                setWorks((portfolio || []) as Work[]);
                setMedia(await fetchPortfolioMedia(id));
                setBadges(((badgeData || []) as any[]).map(b => ({
                    id: b.id,
                    badge_name: b.badges?.title || 'Badge',
                    badge_description: b.badges?.description || '',
                })));
            } catch (err) {
                console.error('Error loading designer profile:', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    const handleDownloadPDF = async () => {
        if (!profile) return;
        setExporting(true);
        try {
            await generatePortfolioPDF(
                {
                    full_name: profile.full_name || 'Prime Haven Talent',
                    title: profile.professional_title || profile.specialty || 'Creative Designer',
                    bio: profile.bio,
                    tags: [...(profile.professions || []), ...(profile.skills || [])],
                    total_points: profile.total_points ?? 0,
                    works_count: works.length,
                    talent_score: profile.talent_score,
                    photo: profile.profile_photo_url,
                },
                works.map(w => ({
                    project_name: w.project_name,
                    service_label: SERVICE_LABELS[w.service_type] || w.service_type,
                    created_at: w.created_at,
                    points_awarded: w.points_awarded,
                    image: previewUrl(w.files_urls, media),
                    design_link: w.design_link,
                })),
            );
        } catch (err) {
            console.error('PDF export failed:', err);
        } finally {
            setExporting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <main className="pt-32 pb-20 text-center">
                    <h1 className="text-2xl font-heading font-bold">Designer not found</h1>
                    <p className="text-sm text-muted-foreground mt-2">This portfolio is unavailable.</p>
                </main>
                <Footer />
            </div>
        );
    }

    const title = profile.professional_title || profile.specialty || 'Creative Designer';

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <main className="pt-24 pb-20">
                <div className="container mx-auto px-6">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
                        <div className="flex items-center gap-5">
                            <div className="w-24 h-24 rounded-2xl overflow-hidden bg-primary/10 flex items-center justify-center">
                                {profile.profile_photo_url ? (
                                    <img src={profile.profile_photo_url} alt={profile.full_name || 'Designer'} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-3xl font-bold text-primary">{(profile.full_name || '?')[0]}</span>
                                )}
                            </div>
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-heading font-bold flex items-center gap-2">
                                    {profile.full_name || 'Prime Haven Talent'}
                                    <UserCheck className="w-5 h-5 text-emerald-500" />
                                </h1>
                                <p className="text-primary text-xs font-bold uppercase tracking-widest mt-1">{title}</p>
                                <div className="flex flex-wrap items-center gap-2 mt-3">
                                    <Badge variant="outline" className="text-[10px] gap-1">
                                        <Trophy className="w-3 h-3" /> {profile.total_points ?? 0} pts
                                    </Badge>
                                    <Badge variant="outline" className="text-[10px] gap-1">
                                        <Briefcase className="w-3 h-3" /> {works.length} published works
                                    </Badge>
                                    {profile.talent_score ? (
                                        <Badge variant="outline" className="text-[10px] gap-1">
                                            <Star className="w-3 h-3" /> Talent score {Number(profile.talent_score).toFixed(0)}
                                        </Badge>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                        <Button onClick={handleDownloadPDF} disabled={exporting} className="gap-2 self-start" data-html2canvas-ignore="true">
                            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            Download PDF
                        </Button>
                    </div>

                    {profile.bio && (
                        <p className="max-w-3xl text-sm text-muted-foreground leading-relaxed mb-10">{profile.bio}</p>
                    )}

                    {(profile.skills?.length || profile.professions?.length) ? (
                        <div className="flex flex-wrap gap-2 mb-12">
                            {[...(profile.professions || []), ...(profile.skills || [])].map((s, i) => (
                                <Badge key={`${s}-${i}`} variant="secondary" className="text-[10px]">{s}</Badge>
                            ))}
                        </div>
                    ) : null}

                    {badges.length > 0 && (
                        <section className="mb-14">
                            <h2 className="text-lg font-heading font-bold uppercase tracking-tight mb-5">Achievements</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {badges.map(badge => (
                                    <Card key={badge.id} className="border-border/50">
                                        <CardContent className="p-5 text-center">
                                            <Award className="w-8 h-8 mx-auto mb-3 text-amber-500" />
                                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-amber-500">{badge.badge_name}</h3>
                                            <p className="text-[9px] text-muted-foreground mt-1 leading-tight">{badge.badge_description}</p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </section>
                    )}

                    <section>
                        <h2 className="text-2xl font-heading font-bold uppercase tracking-tighter mb-6">
                            Portfolio <span className="text-primary">Showcase</span>
                        </h2>

                        {works.length === 0 ? (
                            <div className="p-16 rounded-2xl border border-dashed border-border/50 text-center opacity-50">
                                <Briefcase className="w-10 h-10 mx-auto mb-3" />
                                <p className="text-sm">No published works yet.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {works.map(work => (
                                    <motion.div key={work.id} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                                        className="rounded-2xl border border-border/50 overflow-hidden bg-card/40">
                                        {previewUrl(work.files_urls, media) ? (
                                            <div className="aspect-[4/3] bg-muted/30 overflow-hidden">
                                                <img src={previewUrl(work.files_urls, media) as string} alt={work.project_name} loading="lazy"
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }} />
                                            </div>
                                        ) : (
                                            <div className="aspect-[4/3] bg-muted/30 flex items-center justify-center">
                                                <Briefcase className="w-8 h-8 text-muted-foreground/40" />
                                            </div>
                                        )}
                                        <div className="p-4">
                                            <p className="text-sm font-semibold truncate">{work.project_name}</p>
                                            <div className="flex items-center justify-between mt-2">
                                                <Badge variant="outline" className="text-[9px]">
                                                    {SERVICE_LABELS[work.service_type] || work.service_type}
                                                </Badge>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {new Date(work.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            {work.design_link && (
                                                <a href={work.design_link} target="_blank" rel="noreferrer"
                                                    className="mt-3 inline-flex items-center gap-1.5 text-[10px] text-primary font-bold">
                                                    <Link2 className="w-3 h-3" /> View live design
                                                </a>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default DesignerProfile;
