import { useEffect } from 'react';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Seo from '@/components/Seo';
import HeroSection from '@/components/HeroSection';
import ServicesSection from '@/components/ServicesSection';
import PortfolioSection from '@/components/PortfolioSection';
import StatsSection from '@/components/StatsSection';
import TestimonialsSection from '@/components/TestimonialsSection';
import FAQSection from '@/components/FAQSection';
import BlogSection from '@/components/BlogSection';
import ValueBentoGrid from '@/components/ValueBentoGrid';
import CommunityPulse from '@/components/CommunityPulse';
import ProcessTimeline from '@/components/ProcessTimeline';
import ProjectEstimator from '@/components/ProjectEstimator';
import JoinSection from '@/components/JoinSection';
import ContactSection from '@/components/ContactSection';
import Footer from '@/components/Footer';
import VisitorChatbot from '@/components/VisitorChatbot';
import PromoPopup from '@/components/PromoPopup';
import AdUnit from '@/components/AdUnit';
import EzoicAd from '@/components/EzoicAd';
import { toast } from 'sonner';

const Index = () => {
  useEffect(() => {
    if (sessionStorage.getItem('ph_welcomed')) return;
    const t = setTimeout(() => {
      toast('Welcome to Prime Haven 👋', {
        description: 'Premium design, built in Ghana.',
      });
      sessionStorage.setItem('ph_welcomed', '1');
    }, 800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-transparent relative z-0">
      <Seo
        title="Prime Haven"
        description="Prime Haven is a freelance design and technology agency in Ghana. Hire vetted Ghanaian designers, developers, motion artists, video editors and social media managers, or start a project with our team."
        path="/"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'ProfessionalService',
            '@id': 'https://primehaven.tech/#service',
            name: 'Prime Haven',
            alternateName: ['Prime Haven Ghana', 'Prime Haven Tech'],
            url: 'https://primehaven.tech',
            image: 'https://primehaven.tech/opengraph.jpg?v=20260915',
            logo: 'https://primehaven.tech/logo-512.png?v=20260915',
            description:
              'Freelance design and technology agency in Ghana offering web development, UI/UX design, graphic design, mobile app development, motion graphics, video editing, social media management and IT solutions through a vetted network of Ghanaian professionals.',
            areaServed: [
              { '@type': 'Country', name: 'Ghana' },
              { '@type': 'Place', name: 'Worldwide' },
            ],
            address: { '@type': 'PostalAddress', addressCountry: 'GH', addressRegion: 'Greater Accra' },
            currenciesAccepted: 'GHS, USD',
            priceRange: '$$',
            sameAs: ['https://www.instagram.com/primehaven_tech'],
            knowsAbout: [
              'Freelance agency Ghana',
              'Freelance designers Ghana',
              'Web design Ghana',
              'Web development Ghana',
              'UI/UX design Ghana',
              'Graphic design Ghana',
              'Brand identity design',
              'Mobile app development Ghana',
              'Motion graphics',
              'Video editing',
              'Social media management Ghana',
              'IT solutions Ghana',
            ],
            hasOfferCatalog: {
              '@type': 'OfferCatalog',
              name: 'Prime Haven Services',
              itemListElement: [
                { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Web Development' } },
                { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'UI/UX Design' } },
                { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Graphic Design' } },
                { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Mobile App Development' } },
                { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Motion Graphics' } },
                { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Video Editing' } },
                { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Social Media Management' } },
                { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'IT Solutions' } },
              ],
            },
          },
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Prime Haven',
            url: 'https://primehaven.tech',
            image: 'https://primehaven.tech/opengraph.jpg?v=20260915',
            publisher: { '@id': 'https://primehaven.tech/#organization' },
            potentialAction: {
              '@type': 'SearchAction',
              target: 'https://primehaven.tech/blog?q={search_term_string}',
              'query-input': 'required name=search_term_string',
            },
          },
        ]}
      />

      <Navbar />
      <motion.main initial={{ opacity: 0, filter: 'blur(10px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }} transition={{ duration: 0.65, ease: 'easeOut' }}>
        <HeroSection />
        <CommunityPulse />
        <ValueBentoGrid />
        <ProcessTimeline />
        <ServicesSection />
        <AdUnit slot="1675197526" />
        <EzoicAd placeholderId={101} />
        <PortfolioSection />
        <ProjectEstimator />
        <StatsSection />
        <AdUnit slot="1675197526" />
        <EzoicAd placeholderId={102} />
        <TestimonialsSection />
        <AdUnit slot="1675197526" />
        <EzoicAd placeholderId={103} />
        <FAQSection />
        <BlogSection />
        <JoinSection />
        <ContactSection />
      </motion.main>
      <Footer />
      <VisitorChatbot />
      <PromoPopup />
    </div>
  );
};

export default Index;
