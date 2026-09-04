import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Seo from '@/components/Seo';
import Footer from '@/components/Footer';
import { FileText, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-3">
    <h2 className="text-lg font-bold text-foreground">{title}</h2>
    <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
  </div>
);

const Terms = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Seo
        title="Terms of Service — Prime Haven"
        description="The terms that govern client projects, professional accounts, payments and revenue sharing on the Prime Haven platform."
        path="/terms"
      />
      <Navbar />

      <main className="flex-1 pt-28 pb-20">
        <div className="container mx-auto px-6 max-w-3xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <Link to="/">
              <Button variant="ghost" size="sm" className="mb-6 gap-2 text-muted-foreground hover:text-primary -ml-2">
                <ArrowLeft className="w-4 h-4" /> Back to Home
              </Button>
            </Link>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-primary">Legal</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-heading font-bold mb-3">Terms & Conditions</h1>
            <p className="text-muted-foreground text-sm">
              Last updated: <strong>June 2025</strong> · Effective immediately for all users of Prime Haven.
            </p>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="space-y-10 rounded-2xl border border-border/40 bg-card/30 p-8 sm:p-10"
          >
            <Section title="1. Acceptance of Terms">
              <p>
                By accessing or using the Prime Haven platform (primehaven.tech), you agree to be bound by these
                Terms & Conditions, our Privacy Policy, and all applicable laws and regulations of the Republic of Ghana.
                If you do not agree with any part of these terms, you must not use our platform.
              </p>
              <p>
                Prime Haven reserves the right to update these terms at any time. Continued use of the platform
                after any modifications constitutes acceptance of the revised terms.
              </p>
            </Section>

            <Section title="2. About Prime Haven">
              <p>
                Prime Haven is a Ghana-based freelance marketplace that connects clients seeking creative and
                technical services — including graphic design, UI/UX design, and web development — with
                vetted freelance designers and developers (collectively referred to as "Designers"). We facilitate
                the relationship but are not a party to any contract between clients and designers.
              </p>
            </Section>

            <Section title="3. Account Registration">
              <p>
                To access designer features, you must register an account using a valid email address and accurate
                personal information. You are solely responsible for maintaining the confidentiality of your login
                credentials and all activity under your account.
              </p>
              <p>
                Accounts must belong to individuals aged 18 or older. Prime Haven reserves the right to suspend
                or terminate any account found to contain false information or that violates these terms.
              </p>
            </Section>

            <Section title="4. Designer Obligations">
              <p>When you claim or accept a project through Prime Haven, you agree to:</p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Deliver the agreed work to the standard specified in the project brief.</li>
                <li>Communicate promptly with the admin team and clients via the platform.</li>
                <li>Submit original, high-quality work that does not infringe any third-party intellectual property rights.</li>
                <li>Meet deadlines — chronic late deliveries may result in account suspension.</li>
                <li>Only claim projects you are genuinely able to complete.</li>
              </ul>
            </Section>

            <Section title="5. Client Obligations">
              <p>Clients posting projects or ordering services agree to:</p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Provide clear, accurate project briefs and timely feedback.</li>
                <li>Pay all agreed fees before work commences or upon delivery as specified.</li>
                <li>Not request deliverables that infringe copyright or applicable Ghanaian law.</li>
                <li>Communicate professionally and respectfully with designers and platform staff.</li>
              </ul>
            </Section>

            <Section title="6. Payments and Fees">
              <p>
                All prices on the platform are quoted in Ghana Cedis (GH₵) unless otherwise stated.
                Payments processed through the platform are subject to our payment provider's terms.
                Prime Haven charges a platform fee on each successfully completed project.
              </p>
              <p>
                Designer earnings are held by Prime Haven and released to the designer's registered mobile
                money or bank account upon successful delivery and client approval. Disputes must be raised
                within 7 days of delivery.
              </p>
              <p>
                All fees are non-refundable except where a project is demonstrably not delivered or materially
                deviates from the agreed brief. Refund decisions are at Prime Haven's sole discretion.
              </p>
            </Section>

            <Section title="7. Intellectual Property">
              <p>
                Upon full payment and client approval, all intellectual property rights in the completed
                deliverables transfer to the client. Until that point, all rights remain with the creating
                designer unless otherwise agreed in writing.
              </p>
              <p>
                Designers retain the right to display completed work in their portfolio unless the client
                requests a confidentiality clause at the time of project initiation.
              </p>
              <p>
                The Prime Haven name, logo, branding, and platform code are the exclusive property of
                Prime Haven and may not be used without prior written permission.
              </p>
            </Section>

            <Section title="8. Prohibited Conduct">
              <p>You must not:</p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Attempt to circumvent Prime Haven by transacting directly with a designer or client introduced through the platform.</li>
                <li>Post fraudulent projects or submit work that is plagiarised or AI-generated without disclosure.</li>
                <li>Harass, threaten, or abuse other users or platform staff.</li>
                <li>Use automated bots, scrapers, or scripts to interact with the platform.</li>
                <li>Engage in money laundering or any activity that violates Ghanaian law.</li>
              </ul>
            </Section>

            <Section title="9. Limitation of Liability">
              <p>
                Prime Haven provides the platform on an "as-is" basis. We do not guarantee uninterrupted
                service and are not liable for any loss of data, revenue, or profits arising from platform
                downtime, service interruptions, or third-party actions.
              </p>
              <p>
                In no event shall Prime Haven's total liability to you exceed the fees paid by you through
                the platform in the three months preceding the claim.
              </p>
            </Section>

            <Section title="10. Governing Law & Dispute Resolution">
              <p>
                These Terms are governed by the laws of the Republic of Ghana. Any disputes arising out of
                or in connection with these Terms shall first be addressed through good-faith negotiation.
                If unresolved, disputes shall be referred to the courts of competent jurisdiction in Accra, Ghana.
              </p>
            </Section>

            <Section title="11. Contact">
              <p>
                For any questions regarding these Terms & Conditions, please contact us at:
              </p>
              <p>
                <strong>Email:</strong> legal@primehaven.tech<br />
                <strong>Location:</strong> Accra, Ghana
              </p>
            </Section>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-8 flex flex-col sm:flex-row items-center gap-4"
          >
            <Link to="/privacy">
              <Button variant="outline" size="sm" className="gap-2 rounded-full">
                Read our Privacy Policy →
              </Button>
            </Link>
            <Link to="/">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                Return to Home
              </Button>
            </Link>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Terms;
