import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, ArrowRight } from 'lucide-react';
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
        .limit(3);
      if (data) setProjects(data);
      setLoading(false);
    };
    fetchPortfolio();
  }, []);

  return (
    <section id="portfolio" className="py-24 relative bg-secondary/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 lg:items-start gap-12 lg:gap-20">
            {/* Sticky Heading */}
            <div className="lg:col-span-5">
              <div className="self-start lg:sticky lg:top-32 space-y-6">
                <span className="eyebrow">Our work</span>
                <h2 className="text-4xl md:text-5xl font-heading font-extrabold tracking-tight leading-[1.05] text-foreground">
                  Our latest <span className="display-italic text-primary">work</span>
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Explore our portfolio of innovative digital solutions crafted for clients worldwide.
                </p>
                <Link
                  to="/portfolio"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:gap-3 transition-all"
                >
                  View all works <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Scrolling Projects */}
            <div className="lg:col-span-7">
              <div className="flex flex-col gap-8">
                {loading &&
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="aspect-[16/10] rounded-2xl bg-muted/40 animate-pulse" />
                  ))}

                {!loading &&
                  projects.map((project, index) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-80px' }}
                      transition={{ duration: 0.6, delay: index * 0.05 }}
                    >
                      <a
                        href={project.project_url || project.image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <motion.div
                          whileHover={{ y: -8 }}
                          className="group relative overflow-hidden rounded-2xl glass cursor-pointer"
                        >
                          {/* Image */}
                          <div className="aspect-[16/10] overflow-hidden">
                            <img
                              src={project.image_url}
                              alt={project.title}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 bg-muted"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-90" />
                          </div>

                          {/* Content Overlay */}
                          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 z-20">
                            <span className="text-primary text-sm font-medium">{project.category}</span>
                            <h3 className="text-xl md:text-2xl font-heading font-bold mt-1 mb-1">{project.title}</h3>
                            <p className="text-muted-foreground text-sm">{project.client}</p>
                          </div>

                          {/* Hover Icon */}
                          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg">
                              <ExternalLink className="w-5 h-5 text-primary-foreground" />
                            </div>
                          </div>
                        </motion.div>
                      </a>
                    </motion.div>
                  ))}

                {/* View All Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="pt-4"
                >
                  <Link to="/portfolio">
                    <Button variant="outline" size="lg" className="w-full sm:w-auto">
                      View All Works
                    </Button>
                  </Link>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PortfolioSection;
