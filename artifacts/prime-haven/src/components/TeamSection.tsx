import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Crown, Star, Briefcase } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TeamMember {
  id: string;
  full_name: string;
  role_title: string;
  bio: string;
  photo_url: string | null;
  display_order: number;
  position_level: number;
}

const TIER_CONFIG: Record<number, { label: string; icon: typeof Crown; accent: string }> = {
  1: { label: 'Leadership', icon: Crown, accent: 'from-amber-500/20 to-primary/20' },
  2: { label: 'Vice Presidents', icon: Star, accent: 'from-primary/20 to-blue-500/20' },
  3: { label: 'Directors', icon: Briefcase, accent: 'from-primary/15 to-emerald-500/15' },
  4: { label: 'Managers', icon: Users, accent: 'from-primary/10 to-purple-500/10' },
  5: { label: 'Leads', icon: Users, accent: 'from-primary/10 to-cyan-500/10' },
};

const TeamSection = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('team_members' as any)
        .select('id, full_name, role_title, bio, photo_url, display_order, position_level')
        .eq('is_visible', true)
        .order('position_level', { ascending: true })
        .order('display_order', { ascending: true });
      if (data) setMembers(data as any);
    };
    load();
  }, []);

  if (members.length === 0) return null;

  // Group by position level
  const grouped = members.reduce<Record<number, TeamMember[]>>((acc, m) => {
    const level = m.position_level || 99;
    if (!acc[level]) acc[level] = [];
    acc[level].push(m);
    return acc;
  }, {});

  const sortedLevels = Object.keys(grouped).map(Number).sort((a, b) => a - b);

  return (
    <section className="py-24 relative overflow-hidden" id="team">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-primary/8 blur-[120px] opacity-60 translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-primary/8 blur-[120px] opacity-60 -translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="eyebrow mb-5">
            <Users className="w-4 h-4 inline mr-1" />
            Our People
          </span>
          <h2 className="text-4xl sm:text-5xl font-heading font-extrabold tracking-tight leading-[1.02] text-foreground">
            Meet the Minds <span className="display-italic text-primary">Behind the Magic</span>
          </h2>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto text-lg">
            The passionate minds behind Prime Haven's mission
          </p>
        </motion.div>

        {sortedLevels.map((level) => {
          const tier = TIER_CONFIG[level];
          const tierMembers = grouped[level];
          const isCsuite = level === 1;

          return (
            <div key={level} className="mb-16 last:mb-0">
              {/* Tier label - only show if multiple tiers exist */}
              {sortedLevels.length > 1 && tier && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="flex items-center justify-center gap-2 mb-8"
                >
                  <div className="h-px flex-1 max-w-[80px] bg-border" />
                  <span className="text-sm font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                    {tier.icon && <tier.icon className="w-3.5 h-3.5" />}
                    {tier.label}
                  </span>
                  <div className="h-px flex-1 max-w-[80px] bg-border" />
                </motion.div>
              )}

              <div className={`grid gap-4 max-w-6xl mx-auto ${tierMembers.length === 1 ? 'grid-cols-1 max-w-md' :
                isCsuite && tierMembers.length === 2 ? 'grid-cols-1 md:grid-cols-2 max-w-4xl' :
                  'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                }`}>
                {tierMembers.map((member, i) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className={`group relative overflow-hidden rounded-[1.5rem] bg-card/20 cursor-pointer ${isCsuite ? 'aspect-[4/5]' : 'aspect-square'
                      }`}
                  >
                    {/* The Full Rectangular Image */}
                    <div className="absolute inset-0">
                      {member.photo_url ? (
                        <img
                          src={member.photo_url}
                          alt={member.full_name}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted/60">
                          <Users className="w-16 h-16 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>

                    {/* Static Title Gradient Drop */}
                    <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-background/80 to-transparent p-6 z-10 transition-opacity duration-300 group-hover:opacity-0">
                      <h3 className="font-bold font-heading text-foreground drop-shadow-md text-xl">{member.full_name}</h3>
                      <p className="text-primary font-semibold mt-1 text-xs uppercase tracking-wider drop-shadow-md">{member.role_title}</p>
                    </div>

                    {/* Stacked Glassmorphism Card (Displays on Hover) */}
                    <div className="absolute inset-x-2 bottom-2 top-2 p-6 rounded-xl glass border border-primary/20 bg-background/60 backdrop-blur-xl opacity-0 translate-y-8 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 ease-out z-20 flex flex-col justify-end shadow-2xl">
                      <h3 className={`font-bold font-heading text-foreground ${isCsuite ? 'text-3xl' : 'text-2xl'}`}>
                        {member.full_name}
                      </h3>
                      <p className="text-primary font-bold mt-1 text-sm uppercase tracking-wider">{member.role_title}</p>

                      <div className="h-px bg-border/50 my-4" />

                      <p className="text-foreground/90 text-sm font-medium leading-relaxed overflow-y-auto pr-2 custom-scrollbar max-h-[50%]">
                        {member.bio}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default TeamSection;
