import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Shield, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-3">
    <h2 className="text-lg font-bold text-foreground">{title}</h2>
    <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
  </div>
);

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
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
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-primary">Legal</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-heading font-bold mb-3">Privacy Policy</h1>
            <p className="text-muted-foreground text-sm">
              Last updated: <strong>June 2025</strong> · We value your privacy and handle your data with care.
            </p>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="space-y-10 rounded-2xl border border-border/40 bg-card/30 p-8 sm:p-10"
          >
            <Section title="1. Introduction">
              <p>
                Prime Haven ("we", "us", or "our") is committed to protecting your personal data.
                This Privacy Policy explains how we collect, use, store, and share information when
                you use our platform at primehaven.tech. It applies to all users — clients, designers,
                and visitors.
              </p>
              <p>
                We comply with the Ghana Data Protection Act, 2012 (Act 843) and other applicable
                data protection regulations.
              </p>
            </Section>

            <Section title="2. Information We Collect">
              <p>We collect the following categories of personal data:</p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>
                  <strong>Account Information:</strong> Full name, email address, phone number, and password
                  when you register.
                </li>
                <li>
                  <strong>Designer Profile Data:</strong> Professional title, experience level, skills,
                  portfolio links, profile photo, and payment details (e.g., mobile money number or bank account).
                </li>
                <li>
                  <strong>Project Data:</strong> Project briefs, submitted work, messages, files, and
                  communications within the platform.
                </li>
                <li>
                  <strong>Payment Data:</strong> Transaction records, payment status, and salary history.
                  We do not store raw card numbers — payments are processed by trusted third-party providers.
                </li>
                <li>
                  <strong>Usage Data:</strong> IP address, browser type, pages visited, time on site, and
                  device information collected automatically via cookies and analytics tools.
                </li>
              </ul>
            </Section>

            <Section title="3. How We Use Your Information">
              <p>We use your personal data to:</p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Create and manage your account and provide access to the platform.</li>
                <li>Match clients with suitable designers based on skills and project requirements.</li>
                <li>Process payments and manage designer earnings.</li>
                <li>Communicate important updates, project notifications, and service announcements.</li>
                <li>Improve platform performance, detect fraud, and ensure security.</li>
                <li>Comply with legal obligations under Ghanaian law.</li>
                <li>Send marketing communications where you have opted in (you may opt out at any time).</li>
              </ul>
            </Section>

            <Section title="4. Legal Basis for Processing">
              <p>We process your data under the following lawful bases:</p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li><strong>Contract:</strong> To fulfil our obligations to you as a user of the platform.</li>
                <li><strong>Legitimate Interests:</strong> To improve our services, prevent fraud, and maintain security.</li>
                <li><strong>Consent:</strong> For marketing emails and optional data uses — which you can withdraw at any time.</li>
                <li><strong>Legal Obligation:</strong> To comply with applicable Ghanaian laws and regulations.</li>
              </ul>
            </Section>

            <Section title="5. Data Sharing">
              <p>We do not sell your personal data. We may share your data with:</p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>
                  <strong>Service Providers:</strong> Trusted third parties that help us operate the platform
                  (e.g., cloud hosting via Supabase, email providers, payment processors). These providers
                  are contractually bound to protect your data.
                </li>
                <li>
                  <strong>Clients:</strong> When you claim a project, your professional name and relevant
                  profile information may be shared with the commissioning client.
                </li>
                <li>
                  <strong>Legal Authorities:</strong> Where required by Ghanaian law, court order, or
                  regulatory authority.
                </li>
              </ul>
              <p>
                We will never share your payment details (e.g., mobile money number) with other users
                or third parties beyond payment processing.
              </p>
            </Section>

            <Section title="6. Cookies & Tracking">
              <p>
                We use cookies and similar technologies to maintain your session, remember your preferences,
                and gather analytics. These include:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li><strong>Strictly Necessary Cookies:</strong> Required for the platform to function (e.g., authentication tokens).</li>
                <li><strong>Analytics Cookies:</strong> Help us understand how users interact with the site (e.g., page views, session duration).</li>
                <li><strong>Preference Cookies:</strong> Remember your theme (dark/light) and language settings.</li>
              </ul>
              <p>
                You can manage or disable cookies in your browser settings. Note that disabling certain
                cookies may affect platform functionality.
              </p>
            </Section>

            <Section title="7. Data Retention">
              <p>
                We retain your personal data for as long as your account is active or as needed to provide
                our services. Specifically:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Account data is retained for the duration of your account.</li>
                <li>Project and submission records are retained for 3 years after project completion.</li>
                <li>Payment records are retained for 7 years as required by Ghanaian financial regulations.</li>
                <li>On account deletion, personal data is anonymised within 30 days, except where legal retention obligations apply.</li>
              </ul>
            </Section>

            <Section title="8. Your Rights">
              <p>Under the Ghana Data Protection Act and where applicable, you have the right to:</p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
                <li><strong>Correction:</strong> Ask us to correct inaccurate or incomplete data.</li>
                <li><strong>Deletion:</strong> Request deletion of your personal data (subject to legal obligations).</li>
                <li><strong>Portability:</strong> Receive your data in a structured, machine-readable format.</li>
                <li><strong>Withdrawal of Consent:</strong> Opt out of marketing communications at any time via your account settings or by emailing us.</li>
              </ul>
              <p>
                To exercise any of these rights, please contact us at <strong>privacy@primehaven.tech</strong>.
                We will respond within 30 days.
              </p>
            </Section>

            <Section title="9. Data Security">
              <p>
                We implement appropriate technical and organisational measures to protect your personal
                data against unauthorised access, loss, alteration, or disclosure. These include:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Encrypted storage and transmission (HTTPS/TLS).</li>
                <li>Role-based access controls — only authorised staff can access sensitive data.</li>
                <li>Regular security reviews of our platform and hosting infrastructure.</li>
              </ul>
              <p>
                However, no system is 100% secure. In the event of a data breach that poses a risk to
                your rights, we will notify you and the relevant authorities as required by law.
              </p>
            </Section>

            <Section title="10. Children's Privacy">
              <p>
                Prime Haven is not directed at individuals under the age of 18. We do not knowingly
                collect personal data from minors. If you believe a minor has provided data to us,
                please contact us and we will promptly delete it.
              </p>
            </Section>

            <Section title="11. Changes to This Policy">
              <p>
                We may update this Privacy Policy from time to time. When we make material changes,
                we will notify you via email or a prominent notice on the platform. Your continued use
                of Prime Haven after any update constitutes acceptance of the revised policy.
              </p>
            </Section>

            <Section title="12. Contact Us">
              <p>
                If you have questions, concerns, or requests relating to this Privacy Policy or your
                personal data, please reach out:
              </p>
              <p>
                <strong>Email:</strong> privacy@primehaven.tech<br />
                <strong>Location:</strong> Accra, Ghana<br />
                <strong>Data Controller:</strong> Prime Haven
              </p>
            </Section>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-8 flex flex-col sm:flex-row items-center gap-4"
          >
            <Link to="/terms">
              <Button variant="outline" size="sm" className="gap-2 rounded-full">
                Read our Terms & Conditions →
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

export default Privacy;
