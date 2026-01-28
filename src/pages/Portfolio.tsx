import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, ExternalLink, Calendar, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

// This will be replaced with data from your database
const allProjects = [
  {
    id: 1,
    title: 'TechFlow Dashboard',
    client: 'TechFlow Inc.',
    category: 'UI/UX Design',
    description: 'A comprehensive analytics dashboard for tech startups.',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop',
    year: '2024',
    tags: ['Dashboard', 'Analytics', 'Startup'],
  },
  {
    id: 2,
    title: 'Artisan Brand Identity',
    client: 'Artisan Collective',
    category: 'Graphic Design',
    description: 'Complete brand identity for a local artisan cooperative.',
    image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&h=400&fit=crop',
    year: '2023',
    tags: ['Branding', 'Logo', 'Packaging'],
  },
  {
    id: 3,
    title: 'CloudSync Platform',
    client: 'CloudSync',
    category: 'Web Development',
    description: 'Cloud storage platform with real-time collaboration.',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop',
    year: '2024',
    tags: ['Cloud', 'SaaS', 'Web App'],
  },
  {
    id: 4,
    title: 'Nexus Mobile App',
    client: 'Nexus Labs',
    category: 'App Development',
    description: 'Social networking app for creative professionals.',
    image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=600&h=400&fit=crop',
    year: '2023',
    tags: ['Mobile', 'Social', 'iOS/Android'],
  },
  {
    id: 5,
    title: 'Quantum Website',
    client: 'Quantum Dynamics',
    category: 'Web Development',
    description: 'Corporate website for a quantum computing company.',
    image: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=600&h=400&fit=crop',
    year: '2024',
    tags: ['Corporate', 'CMS', 'Responsive'],
  },
  {
    id: 6,
    title: 'Nova Campaign',
    client: 'Nova Media',
    category: 'Graphic Design',
    description: 'Marketing campaign materials for media company.',
    image: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=600&h=400&fit=crop',
    year: '2023',
    tags: ['Marketing', 'Print', 'Digital Ads'],
  },
];

const categories = ['All', 'UI/UX Design', 'Graphic Design', 'Web Development', 'App Development', 'IT Solutions'];

const Portfolio = () => {
  const [projects, setProjects] = useState(allProjects);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const filterProjects = () => {
    let filtered = allProjects;

    if (selectedCategory !== 'All') {
      filtered = filtered.filter(project => project.category === selectedCategory);
    }

    if (searchTerm) {
      filtered = filtered.filter(project =>
        project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setProjects(filtered);
  };

  useEffect(() => {
    filterProjects();
  }, [selectedCategory, searchTerm]);

  return (
    <div className="min-h-screen bg-background">
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
          <div className="glass rounded-2xl p-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
              {/* Search */}
              <div className="w-full md:w-1/3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search projects..."
                    className="pl-10 bg-secondary border-border"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "primary" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                    className="gap-2"
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
          {projects.length === 0 ? (
            <div className="text-center py-16 glass rounded-2xl">
              <h3 className="text-2xl font-heading font-bold mb-4">No projects found</h3>
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
                  <motion.div
                    whileHover={{ y: -8 }}
                    className="group relative overflow-hidden rounded-2xl glass cursor-pointer h-full"
                  >
                    {/* Image */}
                    <div className="aspect-[4/3] overflow-hidden">
                      <img
                        src={project.image}
                        alt={project.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-80" />
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-primary text-sm font-medium">{project.category}</span>
                        <span className="text-muted-foreground text-sm flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {project.year}
                        </span>
                      </div>
                      
                      <h3 className="text-xl font-heading font-bold mb-2 group-hover:text-primary transition-colors">
                        {project.title}
                      </h3>
                      
                      <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                        {project.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <User className="w-4 h-4" />
                          {project.client}
                        </div>
                        
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <ExternalLink className="w-5 h-5 text-primary" />
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 mt-4">
                        {project.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 text-xs bg-secondary rounded-full text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-6">
          <div className="glass rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-heading font-bold mb-4">
              Want to see your project here?
            </h3>
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