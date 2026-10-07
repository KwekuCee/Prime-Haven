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

            <Section title="3. Talent Application & Account Onboarding">
              <p>
                To access professional talent features and the marketplace, you must submit an application via /apply,
                successfully complete the required track screening or assessment, and complete account onboarding.
                You are solely responsible for maintaining the confidentiality of your login credentials and all
                activity under your account.
              </p>
              <p>
                Accounts must belong to individuals aged 18 or older. Prime Haven reserves the right to suspend
                or terminate any account found to contain false information or that violates these terms.
              </p>
            </Section>

            <Section title="4. Marketplace Claiming, Single-Assignee Enforcement & Turnaround Deadlines">
              <p>
                To maintain high accountability and premier work quality, projects listed on the Prime Haven Marketplace
                operate under strict single-professional assignment and active countdown rules:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li><strong>Single Professional Claiming:</strong> Exactly one verified professional may claim an open project at any given time. Once claimed, the contract remains visible on the marketplace marked as "Claimed" and disabled to all other users.</li>
                <li><strong>Live Turnaround Countdown:</strong> When clients post projects, a turnaround deadline (recorded in hours, e.g., 24h, 48h, 72h) is established. The countdown timer initiates the exact second the professional clicks to claim the job and is displayed live on the talent command center.</li>
                <li><strong>Milestone Warnings:</strong> As the active countdown reaches 50%, 70%, and 90% of the total deadline duration, automated warning emails and platform notices are dispatched to the assigned professional instructing them to finalize and submit deliverables for approval.</li>
              </ul>
            </Section>

            <Section title="5. Missed Deadlines, 48-Hour Inactivity Cooldown & Marketplace Re-Listing">
              <p>
                Meeting deadlines is fundamental to client trust on Prime Haven. If an assigned professional fails to submit completed work for approval prior to deadline expiry:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li><strong>Immediate Revocation & Re-Listing:</strong> The project is automatically unassigned and released back to the open Marketplace for another verified professional to claim immediately.</li>
                <li><strong>Mandatory 48-Hour Inactivity Cooldown:</strong> The defaulting professional is automatically placed into a 48-hour activity cooldown. During this 48-hour period, the talent's dashboard work features are restricted: they cannot claim marketplace jobs, start new projects, or submit work deliverables. The professional may still log in, review past activity, and update their profile.</li>
                <li><strong>Automatic Reactivation:</strong> Upon conclusion of the 48-hour cooldown period, the talent dashboard automatically reactivates for claiming new available jobs.</li>
              </ul>
            </Section>

            <Section title="6. Mandatory On-Platform Communication & Anti-Circumvention Policy">
              <p>
                Prime Haven provides built-in real-time project messaging and chat tools for clients and designers. All project communication, asset exchange, feedback, and financial transactions must strictly remain on the Prime Haven platform.
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li><strong>Prohibited Contact Sharing:</strong> Requesting, sending, or soliciting phone numbers, WhatsApp, Telegram, personal email addresses, external video call links, or direct payment details is strictly forbidden.</li>
                <li><strong>Automated Scanning & Flagging:</strong> Communications are actively monitored and automatically scanned for off-platform solicitation triggers, contact information, and external transaction attempts. Flagged messages are reviewed by super administrators.</li>
                <li><strong>Immediate Cancellation Without Refund:</strong> Any client or designer attempting to move communications or payment off the platform will have their project immediately cancelled with <strong>NO REFUND</strong>. Repeat or severe violations will result in permanent platform banning and forfeiture of all accumulated earnings.</li>
              </ul>
            </Section>

            <Section title="7. Video Editing, Motion Design & Development Scoping">
              <p>
                Certain specialized disciplines — including Video Editing, Motion Graphics, Mobile App Development, and Custom Web Applications — vary significantly by footage volume, animation complexity, and technical architecture. For these services:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Fixed standard pricing tiers are replaced by structured discovery and consultation calls.</li>
                <li>Clients book a scoping consultation with the Prime Haven team to determine exact deliverables, milestones, turnaround schedules, and custom escrow pricing prior to project launch.</li>
              </ul>
            </Section>

            <Section title="8. Designer Obligations">
              <p>When you claim or accept a project through Prime Haven, you agree to:</p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Deliver the agreed work to the standard specified in the project brief.</li>
                <li>Communicate promptly with clients and admin exclusively via the platform chat.</li>
                <li>Submit original, high-quality work that does not infringe any third-party intellectual property rights.</li>
                <li>Meet all deadline countdowns to prevent contract revocation and 48-hour cooldown penalties.</li>
                <li>Only claim projects matching your verified skill level and profession.</li>
              </ul>
            </Section>

            <Section title="9. Client Obligations">
              <p>Clients posting projects or ordering services agree to:</p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Provide clear, accurate project briefs and timely feedback through the platform.</li>
                <li>Pay all agreed escrow fees before work commences or upon delivery as specified.</li>
                <li>Not solicit external contact information or attempt off-platform communication.</li>
                <li>Communicate professionally and respectfully with designers and platform staff.</li>
              </ul>
            </Section>

            <Section title="10. Payments and Fees">
              <p>
                All prices on the platform are quoted in US Dollars (USD) or Ghana Cedis (GH₵).
                Payments processed through the platform are held in secure escrow until client approval.
                Prime Haven distributes agreed revenue shares to designers upon delivery verification.
              </p>
              <p>
                Designer earnings are released to the designer's registered mobile money or bank account upon successful delivery and client approval. Disputes must be raised within 7 days of delivery.
              </p>
              <p>
                All fees are non-refundable except where a project is demonstrably not delivered or materially deviates from the agreed brief. Circumvention violations result in total forfeiture of refunds.
              </p>
            </Section>

            <Section title="11. Intellectual Property">
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

            <Section title="12. Prohibited Conduct">
              <p>You must not:</p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Attempt to circumvent Prime Haven by transacting directly with a designer or client introduced through the platform.</li>
                <li>Post fraudulent projects or submit work that is plagiarised or AI-generated without disclosure.</li>
                <li>Harass, threaten, or abuse other users or platform staff.</li>
                <li>Use automated bots, scrapers, or scripts to interact with the platform.</li>
                <li>Engage in money laundering or any activity that violates Ghanaian law.</li>
              </ul>
            </Section>

            <Section title="13. Limitation of Liability">
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

            <Section title="14. Governing Law & Dispute Resolution">
              <p>
                These Terms are governed by the laws of the Republic of Ghana. Any disputes arising out of
                or in connection with these Terms shall first be addressed through good-faith negotiation.
                If unresolved, disputes shall be referred to the courts of competent jurisdiction in Accra, Ghana.
              </p>
            </Section>

            <Section title="15. Contact">
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
