import Navbar from '@/components/Navbar';
import ParticleBackground from '@/components/ParticleBackground';
import HeroSection from '@/components/HeroSection';
import ServicesSection from '@/components/ServicesSection';
import PortfolioSection from '@/components/PortfolioSection';
import StatsSection from '@/components/StatsSection';
import JoinSection from '@/components/JoinSection';
import ContactSection from '@/components/ContactSection';
import Footer from '@/components/Footer';
import VisitorChatbot from '@/components/VisitorChatbot';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <ParticleBackground />
      <Navbar />
      <main>
        <HeroSection />
        <ServicesSection />
        <PortfolioSection />
        <StatsSection />
        <JoinSection />
        <ContactSection />
      </main>
      <Footer />
      <VisitorChatbot />
    </div>
  );
};

export default Index;
