import Navbar from '@/components/Navbar';
import Seo from '@/components/Seo';
import Footer from '@/components/Footer';
import FounderSection from '@/components/FounderSection';
import TeamSection from '@/components/TeamSection';

const OurStory = () => {
  return (
    <div className="min-h-screen bg-transparent relative z-0">
      <Seo
        title="Our Story & Team — Prime Haven"
        description="How Prime Haven began, the vision behind it, and the people who deliver every project — design, development and IT solutions from Ghana's vetted tech talent."
        path="/our-story"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'AboutPage',
          name: 'Our Story — Prime Haven',
          url: 'https://primehaven.tech/our-story',
        }}
      />
      <Navbar />
      <main className="pt-28">
        <header className="container mx-auto px-6 max-w-5xl">
          <span className="eyebrow">Our story</span>
          <h1 className="font-heading text-4xl sm:text-6xl font-bold mt-4 mb-6 leading-[1.05]">
            Where Prime Haven started — and who builds it today
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            A short account of why we exist, followed by the team behind every project we ship.
          </p>
        </header>
        <FounderSection />
        <TeamSection />
      </main>
      <Footer />
    </div>
  );
};

export default OurStory;
