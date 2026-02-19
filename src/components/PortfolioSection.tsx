import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface PortfolioItem {
  id: string;
  title: string;
  client: string;
  category: string;
  image_url: string;
  project_url: string | null;
}

const PortfolioSection = () => {
  const [projects, setProjects] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPortfolio = async () => {
      const { data } = await supabase
        .from('portfolio_items')
        .select('id, title, client, category, image_url, project_url')
        .order('created_at', { ascending: false })
        .limit(6);
      if (data) setProjects(data);
      setLoading(false);
    };
    fetchPortfolio();
  }, []);

  return (
    <section id="portfolio" className="py-28 relative overflow-hidden bg-card/20">
      {/* Accent glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/8 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-20">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <span className="inline-flex items-center gap-2 text-primary font-bold uppercase tracking-[0.2em] text-xs mb-5">
              <span className="w-8 h-px bg-primary" />
              Our Work
            </span>
            <h2 className="text-5xl md:text-6xl lg:text-7xl font-heading font-bold leading-none">
              Featured<br />
              <span className="text-gradient">Projects</span>
            </h2>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="md:text-right"
          >
            <p className="text-muted-foreground max-w-xs text-base leading-relaxed mb-6 md:ml-auto">
              Explore our portfolio of innovative digital solutions crafted for clients worldwide.
            </p>
            <Link to="/portfolio">
              <Button variant="outline" size="sm" className="border-border/60 hover:border-primary/50 hover:text-primary font-bold">
                View All Projects →
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Portfolio Grid — asymmetric masonry-like */}
        {projects.length === 0 && !loading ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">Projects coming soon — stay tuned.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.08 }}
                className={index === 0 ? 'md:col-span-2 lg:col-span-1' : ''}
              >
                <a
                  href={project.project_url || project.image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group"
                >
                  <motion.div
                    whileHover={{ y: -6 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="relative overflow-hidden rounded-2xl bg-card border border-border/40 group-hover:border-primary/30 transition-all duration-400"
                  >
                    {/* Image */}
                    <div className={`overflow-hidden ${index === 0 ? 'aspect-[16/9]' : 'aspect-[4/3]'}`}>
                      <img
                        src={project.image_url}
                        alt={project.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />
                    </div>

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-400" />

                    {/* Content */}
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <div className="flex items-end justify-between gap-4">
                        <div>
                          <span className="text-xs font-bold text-primary uppercase tracking-widest">{project.category}</span>
                          <h3 className="text-xl font-heading font-bold mt-1 group-hover:text-primary transition-colors duration-300">{project.title}</h3>
                          <p className="text-muted-foreground text-sm mt-0.5">{project.client}</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-primary/20 group-hover:bg-primary flex items-center justify-center transition-all duration-300 shrink-0 border border-primary/30">
                          <ExternalLink className="w-4 h-4 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </a>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default PortfolioSection;
