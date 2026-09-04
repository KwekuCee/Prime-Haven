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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Prefetch all homepage images immediately so they're cached before scrolling
const prefetchImages = async () => {
  const [portfolio, team, blog] = await Promise.all([
    supabase.from('portfolio_items').select('image_url').order('created_at', { ascending: false }).limit(6),
    supabase.from('team_members').select('photo_url').eq('is_visible', true),
    supabase.from('blog_posts').select('cover_image_url').eq('is_published', true).order('published_at', { ascending: false }).limit(3),
  ]);

  const urls: string[] = [];
  portfolio.data?.forEach(p => p.image_url && urls.push(p.image_url));
  (team.data as any)?.forEach((m: any) => m.photo_url && urls.push(m.photo_url));
  blog.data?.forEach(b => b.cover_image_url && urls.push(b.cover_image_url));

  urls.forEach(url => {
    const img = new Image();
    img.src = url;
  });
};

const Index = () => {
  useEffect(() => {
    prefetchImages();
  }, []);

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
        title="Web Design & Development Company in Ghana | Prime Haven"
        description="Prime Haven is a Ghana-based web design, UI/UX, graphic design and IT services company. Hire vetted designers and developers to build your website, brand and digital product."
        path="/"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'ProfessionalService',
            name: 'Prime Haven',
            url: 'https://primehaven.tech',
            image: 'https://primehaven.tech/opengraph.jpg',
            description: 'Web design and development, UI/UX design, graphic design and IT solutions company in Ghana, powered by a vetted tech talent network.',
            areaServed: ['Ghana', 'Worldwide'],
            address: { '@type': 'PostalAddress', addressCountry: 'GH' },
            knowsAbout: [
              'Web design Ghana',
              'Web development Ghana',
              'UI/UX design',
              'Graphic design',
              'Brand identity design',
              'IT solutions',
            ],
            hasOfferCatalog: {
              '@type': 'OfferCatalog',
              name: 'Prime Haven Services',
              itemListElement: [
                { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Web Development' } },
                { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'UI/UX Design' } },
                { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Graphic Design' } },
                { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'IT Solutions' } },
              ],
            },
          },
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Prime Haven',
            url: 'https://primehaven.tech',
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
