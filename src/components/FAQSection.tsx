import { useState } from 'react';
import { motion } from 'framer-motion';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const businessFAQs = [
  {
    q: "What does Prime Haven actually do?",
    a: "Prime Haven is a technology solutions company specializing in website design, branding, product development, and digital strategy. We also operate a curated tech talent network for businesses that require contract-based professionals."
  },
  {
    q: "Can Prime Haven handle projects end-to-end?",
    a: "Yes. Our team can manage projects from concept to launch — including research, design, development, testing, and ongoing support — ensuring a seamless and structured execution process."
  },
  {
    q: "When would we use your freelance network?",
    a: "If your business needs specialized skills, short-term support, or project-based talent, we can connect you with vetted designers and developers from our network who match your requirements."
  },
  {
    q: "How do you ensure quality and reliability?",
    a: "We follow structured workflows, clear milestones, and performance standards. Freelancers in our network are screened, and internal projects are handled under strict quality control processes."
  },
  {
    q: "How do we get started?",
    a: "Simply contact us with your project details. We'll review your requirements, recommend the best approach (in-house execution or talent placement), and provide a clear proposal outlining scope, timelines, and pricing."
  },
];

const freelancerFAQs = [
  {
    q: "Who can apply to join Prime Haven?",
    a: "Designers, developers, and skilled tech professionals with a strong portfolio or proven experience can apply. Every application is reviewed to maintain a high-quality network."
  },
  {
    q: "How do I receive contract opportunities?",
    a: "Once approved, you'll be matched with contract opportunities based on your skills, experience, and availability. Relevant projects are sent directly to you."
  },
  {
    q: "Do I need to bid for jobs?",
    a: "No. Prime Haven focuses on structured matching. Instead of bidding against dozens of freelancers, qualified members receive curated opportunities."
  },
  {
    q: "Is there a membership or commission fee?",
    a: "Any membership terms or service fees are clearly communicated during onboarding. Transparency is a core part of how we operate."
  },
  {
    q: "How do I increase my chances of getting contracts?",
    a: "Maintain an updated portfolio, respond promptly to opportunities, deliver high-quality work, and keep your profile information accurate and detailed."
  },
];

const tabs = [
  { id: 'businesses', label: '🔹 For Businesses', faqs: businessFAQs },
  { id: 'freelancers', label: '🔹 For Freelancers', faqs: freelancerFAQs },
];

const FAQSection = () => {
  const [activeTab, setActiveTab] = useState('businesses');
  const activeFAQs = tabs.find(t => t.id === activeTab)!.faqs;

  return (
    <section className="py-24 relative overflow-hidden bg-background" id="faq">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold bg-primary/10 text-primary border border-primary/20 mb-4">
            Got Questions?
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold text-foreground">
            Frequently Asked <span className="text-primary">Questions</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
            Everything you need to know, whether you're a business or a freelancer.
          </p>
        </motion.div>

        {/* Tab Switcher */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex rounded-full bg-card border border-border p-1 gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* FAQ Accordion */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-3xl mx-auto"
        >
          <Accordion type="single" collapsible className="space-y-3">
            {activeFAQs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="border border-border rounded-xl px-6 bg-card/60 backdrop-blur-sm data-[state=open]:border-primary/30 data-[state=open]:shadow-md transition-all"
              >
                <AccordionTrigger className="text-left text-foreground hover:no-underline py-5 text-base">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQSection;
