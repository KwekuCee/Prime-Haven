import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TeamMember {
  id: string;
  full_name: string;
  role_title: string;
  bio: string;
  photo_url: string | null;
  display_order: number;
}

const TeamSection = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('team_members' as any)
        .select('id, full_name, role_title, bio, photo_url, display_order')
        .eq('is_visible', true)
        .order('display_order', { ascending: true });
      if (data) setMembers(data as any);
    };
    load();
  }, []);

  if (members.length === 0) return null;

  return (
    <section className="py-24 relative overflow-hidden bg-background" id="team">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-primary/5 blur-3xl translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-primary/5 blur-3xl -translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold bg-primary/10 text-primary border border-primary/20 mb-4">
            <Users className="w-4 h-4 inline mr-1" />
            Our People
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold text-foreground">
            Meet Our <span className="text-primary">Team</span>
          </h2>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto text-lg">
            The passionate minds behind Prime Haven's mission
          </p>
        </motion.div>

        <div className={`grid gap-12 max-w-5xl mx-auto ${members.length === 1 ? 'grid-cols-1 max-w-lg' : 'grid-cols-1 md:grid-cols-2'}`}>
          {members.map((member, i) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className="flex flex-col items-center text-center"
            >
              {/* Photo */}
              <div className="relative group mb-6">
                <div className="absolute -inset-3 rounded-2xl bg-gradient-to-br from-primary via-primary/50 to-transparent opacity-50 blur-sm group-hover:opacity-70 transition-opacity duration-500" />
                <div className="relative w-56 h-64 sm:w-64 sm:h-72 rounded-2xl overflow-hidden border-2 border-primary/30 bg-card">
                  {member.photo_url ? (
                    <img
                      src={member.photo_url}
                      alt={member.full_name}
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Users className="w-16 h-16 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>

              {/* Info */}
              <h3 className="text-2xl font-bold text-foreground">{member.full_name}</h3>
              <p className="text-primary font-semibold text-lg mt-1">{member.role_title}</p>
              <p className="text-muted-foreground mt-3 leading-relaxed max-w-md">{member.bio}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TeamSection;
