import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Palette, Layers, Globe, Cpu, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import Seo from '@/components/Seo';
import Footer from '@/components/Footer';

// Service data - in a real app, this would come from a database
const serviceDetails = {
  'graphic-design': {
    title: 'Graphic Design',
    icon: Palette,
    description: 'Professional graphic design services that transform your ideas into visual masterpieces.',
    longDescription: 'Our graphic design team creates stunning visuals that communicate your brand message effectively. From logos to marketing materials, we deliver designs that captivate and convert.',
    features: [
      'Logo & Brand Identity Design',
      'Marketing Materials (Brochures, Flyers)',
      'Social Media Graphics',
      'Packaging Design',
      'Print & Digital Advertisements'
    ],
    process: [
      'Discovery & Research',
      'Concept Development',
      'Design Creation',
      'Revisions & Refinement',
      'Final Delivery'
    ],
    image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=1200&h.600&fit=crop'
  },
  'ui-ux-design': {
    title: 'UI/UX Design',
    icon: Layers,
    description: 'User-centered design solutions that create seamless digital experiences.',
    longDescription: 'We craft intuitive user interfaces and engaging user experiences that keep users coming back. Our designs are not just beautiful but functional and user-friendly.',
    features: [
      'User Research & Personas',
      'Wireframing & Prototyping',
      'UI Design Systems',
      'Usability Testing',
      'Mobile & Responsive Design'
    ],
    process: [
      'User Research',
      'Information Architecture',
      'Wireframing',
      'UI Design',
      'Prototyping & Testing'
    ],
    image: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=1200&h=600&fit=crop'
  },
  'web-development': {
    title: 'Web Development',
    icon: Globe,
    description: 'Custom web development solutions built with modern technologies.',
    longDescription: 'We build high-performance websites and web applications using cutting-edge technologies. From simple landing pages to complex web platforms, we deliver robust solutions.',
    features: [
      'Custom Website Development',
      'E-commerce Solutions',
      'Web Applications',
      'API Integration',
      'Performance Optimization'
    ],
    process: [
      'Planning & Analysis',
      'Design & Prototyping',
      'Development',
      'Testing & Quality Assurance',
      'Deployment & Maintenance'
    ],
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=600&fit=crop'
  },
  'it-solutions': {
    title: 'IT Solutions',
    icon: Cpu,
    description: 'Comprehensive IT services to streamline your business operations.',
    longDescription: 'We provide end-to-end IT solutions that help businesses optimize their technology infrastructure and achieve digital transformation.',
    features: [
      'IT Infrastructure Setup',
      'Cloud Solutions',
      'Network Security',
      'Technical Support',
      'System Integration'
    ],
    process: [
      'Needs Assessment',
      'Solution Design',
      'Implementation',
      'Training & Support',
      'Ongoing Maintenance'
    ],
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&h=600&fit=crop'
  }
};

const ServiceDetail = () => {
  const { serviceId } = useParams<{ serviceId: string }>();
  const [service, setService] = useState<any>(null);

  useEffect(() => {
    if (serviceId && serviceDetails[serviceId as keyof typeof serviceDetails]) {
      setService(serviceDetails[serviceId as keyof typeof serviceDetails]);
    }
  }, [serviceId]);

  if (!service) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Service Not Found</h2>
          <Link to="/#services">
            <Button>View All Services</Button>
          </Link>
        </div>
      </div>
    );
  }

  const IconComponent = service.icon;

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={`${service.title} Services | Prime Haven`}
        description={service.description || `Professional ${service.title} services from Prime Haven — structured process, senior talent, delivered in Ghana and worldwide.`}
        path={`/services/${serviceId}`}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Service',
          name: service.title,
          description: service.description || undefined,
          serviceType: service.title,
          provider: { '@type': 'Organization', name: 'Prime Haven', url: 'https://primehaven.tech' },
          areaServed: 'Worldwide',
        }}
      />
      <Navbar />
      
      <main className="pt-24 pb-20">
        {/* Back Button */}
        <div className="container mx-auto px-6 mb-8">
          <Link to="/#services">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Services
            </Button>
          </Link>
        </div>

        {/* Hero Section */}
        <section className="container mx-auto px-6 mb-16">
          <div className="glass rounded-3xl overflow-hidden">
            <div className="grid md:grid-cols-2 gap-8 p-8 md:p-12">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                    <IconComponent className="w-7 h-7 text-primary" />
                  </div>
                  <span className="text-primary font-medium uppercase tracking-wider text-sm">
                    Our Service
                  </span>
                </div>
                
                <h1 className="text-4xl md:text-5xl font-heading font-bold mb-6">
                  {service.title}
                </h1>
                
                <p className="text-xl text-muted-foreground mb-8">
                  {service.description}
                </p>
                
                <a href="https://wa.me/233550160237?text=Hi%20Prime%20Haven%2C%20I'd%20like%20to%20inquire%20about%20your%20services" target="_blank" rel="noopener noreferrer">
                  <Button variant="primary" size="lg" className="glow-primary">
                    Get This Service
                  </Button>
                </a>
              </div>
              
              <div className="rounded-2xl overflow-hidden">
                <img
                  src={service.image}
                  alt={service.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Detailed Content */}
        <section className="container mx-auto px-6">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Description */}
            <div className="lg:col-span-2">
              <div className="glass rounded-2xl p-8 mb-8">
                <h2 className="text-3xl font-heading font-bold mb-6">Service Overview</h2>
                <p className="text-muted-foreground leading-relaxed text-lg">
                  {service.longDescription}
                </p>
              </div>

              {/* Process */}
              <div className="glass rounded-2xl p-8">
                <h2 className="text-3xl font-heading font-bold mb-8">Our Process</h2>
                <div className="space-y-6">
                  {service.process.map((step: string, index: number) => (
                    <div key={index} className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-primary font-bold">{index + 1}</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-heading font-bold mb-1">{step}</h3>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Features */}
            <div>
              <div className="glass rounded-2xl p-8 sticky top-24">
                <h2 className="text-3xl font-heading font-bold mb-6">What's Included</h2>
                <ul className="space-y-4">
                  {service.features.map((feature: string, index: number) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <div className="mt-10 pt-8 border-t border-border">
                  <h3 className="text-xl font-heading font-bold mb-4">Ready to Get Started?</h3>
                  <p className="text-muted-foreground mb-6">
                    Let's discuss how our {service.title} service can help your business.
                  </p>
                  <a href="mailto:contact@primehaven.tech" className="w-full">
                    <Button variant="primary" className="w-full glow-primary" size="lg">
                      Contact Us Today
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ServiceDetail;