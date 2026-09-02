import { useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const businessFAQs = [
  {
    q: "How do we get started with you?",
    a: "Send us your project details and we'll come back with a straightforward proposal — scope, timeline and price. No long forms, no sales calls you didn't ask for."
  },
  {
    q: "What kind of work do you take on?",
    a: "Websites, branding, product design and the digital strategy around them. If a project needs extra hands, we bring in vetted people from our talent network."
  },
  {
    q: "Can you run the whole project for us?",
    a: "Yes. Research, design, build, testing and support after launch — you get one team and one point of contact from start to finish."
  },
  {
    q: "What if we just need one specialist?",
    a: "That happens a lot. We'll match you with a screened designer or developer for the length of the contract, and step back once you're set up."
  },
  {
    q: "How do you keep the quality consistent?",
    a: "Clear milestones, a review at every stage, and the same standards applied whether the work is done in-house or by someone from our network."
  },
];

const freelancerFAQs = [
  {
    q: "Who can join?",
    a: "Designers, developers and other tech professionals with real work to show. We read every application — a solid portfolio matters more than a long CV."
  },
  {
    q: "Is there a fee?",
    a: "There's a one-time$10 membership. Everything about fees and revenue share is explained during onboarding before you commit."
  },
  {
    q: "How does work reach me?",
    a: "We match contracts to your skills and availability and send them straight to you. Nothing to chase, nothing to refresh."
  },
  {
    q: "Do I have to bid against other people?",
    a: "No. No bidding wars and no racing to the lowest price — approved members get curated opportunities instead."
  },
  {
    q: "How do I get picked more often?",
    a: "Keep your portfolio current, reply quickly, and deliver work you'd be happy to show off. That's genuinely most of it."
  },
];

const tabs = [
  { id: 'businesses', label: 'For businesses', faqs: businessFAQs },
  { id: 'freelancers', label: 'For freelancers', faqs: freelancerFAQs },
];

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [...businessFAQs, ...freelancerFAQs].map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
};

const FAQSection = () => {
  const [activeTab, setActiveTab] = useState('businesses');
  const activeFAQs = tabs.find((t) => t.id === activeTab)!.faqs;

  return (
    <section className="py-24" id="faq">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 max-w-6xl mx-auto">
          {/* Intro */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-32 space-y-6">
              <span className="eyebrow">Questions people ask us</span>
              <h2 className="text-4xl sm:text-5xl font-heading font-extrabold tracking-tight leading-[1.05] text-foreground">
                Answers, <span className="display-italic text-primary">plainly put</span>
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                These are the questions that come up in almost every first conversation. If yours isn't
                here, just ask us directly — a real person replies.
              </p>

              <div className="flex flex-wrap gap-2 pt-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-5 py-2.5 rounded-full text-sm font-semibold border transition-colors ${activeTab === tab.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border/70 text-muted-foreground hover:text-foreground hover:border-foreground/30'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <a
                href="#contact"
                className="inline-block text-sm font-semibold text-primary hover:underline pt-2"
              >
                Still unsure? Talk to us →
              </a>
            </div>
          </div>

          {/* Questions */}
          <div className="lg:col-span-7">
            <Accordion type="single" collapsible className="divide-y divide-border/60 border-y border-border/60">
              {activeFAQs.map((faq, i) => (
                <AccordionItem key={`${activeTab}-${i}`} value={`item-${i}`} className="border-none">
                  <AccordionTrigger className="text-left text-foreground hover:no-underline py-6 text-lg font-semibold data-[state=open]:text-primary">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pb-7 text-base max-w-xl">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
