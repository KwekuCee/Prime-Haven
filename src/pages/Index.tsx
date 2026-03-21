import { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import ParticleBackground from '@/components/ParticleBackground';
import HeroSection from '@/components/HeroSection';
import ServicesSection from '@/components/ServicesSection';
import PortfolioSection from '@/components/PortfolioSection';
import StatsSection from '@/components/StatsSection';
import FounderSection from '@/components/FounderSection';
import TeamSection from '@/components/TeamSection';
import TestimonialsSection from '@/components/TestimonialsSection';
import FAQSection from '@/components/FAQSection';
import BlogSection from '@/components/BlogSection';
import JoinSection from '@/components/JoinSection';
import ContactSection from '@/components/ContactSection';
import Footer from '@/components/Footer';
import VisitorChatbot from '@/components/VisitorChatbot';
import AdUnit from '@/components/AdUnit';
import EzoicAd from '@/components/EzoicAd';
import { supabase } from '@/integrations/supabase/client';

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

  return (
    <div className="min-h-screen bg-background">
      <ParticleBackground />
      <Navbar />
      <main>
        <HeroSection />
        <ServicesSection />
        <AdUnit slot="1675197526" />
        <PortfolioSection />
        <StatsSection />
        <AdUnit slot="1675197526" />
        <FounderSection />
        <TeamSection />
        <TestimonialsSection />
        <AdUnit slot="1675197526" />
        <FAQSection />
        <BlogSection />
        <JoinSection />
        <ContactSection />
      </main>
      <Footer />
      <VisitorChatbot />
    </div>
  );
};

export default Index;
