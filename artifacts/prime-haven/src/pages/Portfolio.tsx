import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, ExternalLink, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Navbar from '@/components/Navbar';
import Seo from '@/components/Seo';
import Footer from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';

interface PortfolioItem {
  id: string;
  title: string;
  client: string;
  category: string;
  image_url: string;
  project_url: string | null;
}

const categories = ['All', 'UI/UX Design', 'Graphic Design', 'Web Development', 'App Development', 'IT Solutions'];

const Portfolio = () => {
  const [allProjects, setAllProjects] = useState<PortfolioItem[]>([]);
  const [projects, setProjects] = useState<PortfolioItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPortfolio = async () => {
      const { data } = await supabase
        .from('portfolio_items')
        .select('id, title, client, category, image_url, project_url')
        .order('created_at', { ascending: false });
      if (data) {
        setAllProjects(data);
        setProjects(data);
      }
      setLoading(false);
    };
    fetchPortfolio();
  }, []);

  useEffect(() => {
    let filtered = allProjects;

    if (selectedCategory !== 'All') {
      filtered = filtered.filter(project => project.category === selectedCategory);
    }

    if (searchTerm) {
      filtered = filtered.filter(project =>
        project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.client.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setProjects(filtered);
  }, [selectedCategory, searchTerm, allProjects]);

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Portfolio — Design & Development Work | Prime Haven"
        description="Explore Prime Haven's portfolio of UI/UX design, branding, graphic design and web development projects delivered for clients."
        path="/portfolio"
      />
      <Navbar />
      
      <main className="pt-24 pb-20">
        {/* Hero Section */}
        <section className="container mx-auto px-6 mb-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <span className="text-primary font-medium uppercase tracking-wider text-sm">Our Portfolio</span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold mt-4 mb-6">
              Our <span className="text-gradient">Work</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Browse through our collection of successful projects and see how we've helped clients achieve their goals.
            </p>
          </motion.div>
        </section>

        {/* Filters & Search */}
        <section className="container mx-auto px-6 mb-12">
          <h2 className="sr-only">Filter and search projects</h2>
          <div className="glass rounded-2xl p-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="w-full md:w-1/3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search projects..."
                    aria-label="Search portfolio projects"
                    className="pl-10 bg-secondary border-border"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 justify-center md:justify-end">
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "primary" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                    className="gap-2 text-xs sm:text-sm"
                  >
                    {selectedCategory === category && <Filter className="w-4 h-4" />}
                    {category}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Projects Grid */}
        <section className="container mx-auto px-6 mb-12">
          {loading ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground">Loading projects...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-16 glass rounded-2xl">
              <h2 className="text-2xl font-heading font-bold mb-4">No projects found</h2>
              <p className="text-muted-foreground mb-6">Try adjusting your filters or search term</p>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedCategory('All');
                  setSearchTerm('');
                }}
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                >
                  <a
                    href={project.project_url || project.image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-full"
                  >
                    <motion.div
                      whileHover={{ y: -8 }}
                      className="group relative overflow-hidden rounded-2xl glass cursor-pointer h-full"
                    >
                      <div className="aspect-[4/3] overflow-hidden">
                        <img
                          src={project.image_url}
                          alt={project.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-80" />
                      </div>

                      <div className="absolute bottom-0 left-0 right-0 p-6">
                        <span className="text-primary text-sm font-medium">{project.category}</span>
                        <h3 className="text-xl font-heading font-bold mt-1 mb-1 group-hover:text-primary transition-colors">
                          {project.title}
                        </h3>
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <User className="w-4 h-4" />
                          {project.client}
                        </div>
                      </div>

                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                          <ExternalLink className="w-5 h-5 text-primary-foreground" />
                        </div>
                      </div>
                    </motion.div>
                  </a>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-6">
          <div className="glass rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-heading font-bold mb-4">
              Want to see your project here?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Let's work together to create something amazing for your business.
            </p>
            <a 
              href="https://wa.me/233550160237?text=Hi%20Prime%20Haven%2C%20I'd%20like%20to%20start%20a%20project" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button variant="primary" size="lg" className="glow-primary">
                Start Your Project With Us
              </Button>
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Portfolio;
