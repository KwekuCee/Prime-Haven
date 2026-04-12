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
    <section id="portfolio" className="py-24 relative bg-secondary/30">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-primary font-medium uppercase tracking-wider text-sm">Our Work</span>
          <h2 className="text-4xl md:text-5xl font-heading font-bold mt-4 mb-6">
            Featured <span className="text-gradient">Projects</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Explore our portfolio of innovative digital solutions crafted for clients worldwide.
          </p>
        </motion.div>

        {/* Automated Infinite Carousel Track */}
        <div className="relative w-full overflow-hidden py-10 -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="absolute inset-y-0 left-0 w-1/6 md:w-1/4 bg-gradient-to-r from-secondary/30 via-secondary/10 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-1/6 md:w-1/4 bg-gradient-to-l from-secondary/30 via-secondary/10 to-transparent z-10 pointer-events-none" />

          <motion.div
            className="flex gap-6 w-max"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ ease: "linear", duration: 35, repeat: Infinity }}
          >
            {[...projects, ...projects, ...projects].map((project, index) => (
              <div key={`${project.id}-${index}`} className="w-[300px] md:w-[400px] shrink-0">
                <a
                  href={project.project_url || project.image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block h-full"
                >
                  <motion.div
                    whileHover={{ y: -8 }}
                    className="group relative overflow-hidden rounded-2xl glass cursor-pointer h-full"
                  >
                    {/* Image */}
                    <div className="aspect-[4/3] overflow-hidden">
                      <img
                        src={project.image_url}
                        alt={project.title}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 bg-muted"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-90" />
                    </div>

                    {/* Content Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
                      <span className="text-primary text-sm font-medium">{project.category}</span>
                      <h3 className="text-xl font-heading font-bold mt-1 mb-1">{project.title}</h3>
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
              </div>
            ))}
          </motion.div>
        </div>

        {/* View All Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-12"
        >
          <Link to="/portfolio">
            <Button variant="outline" size="lg">
              View All Projects
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default PortfolioSection;
