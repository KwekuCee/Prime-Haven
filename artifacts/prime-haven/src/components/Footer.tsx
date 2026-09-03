import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import BrandLogo from '@/components/BrandLogo';
import { MapPin, Linkedin, Instagram, MessageCircle } from 'lucide-react';

const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
  </svg>
);

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const links = {
    company: [
      { label: 'About Us', href: '/#about' },
      { label: 'Our Story', href: '/our-story' },
      { label: 'Blog', href: '/blog' },
      { label: 'Careers', href: '/#contact' },
    ],
    services: [
      { label: 'Graphic Design', href: '/#services' },
      { label: 'UI/UX Design', href: '/#services' },
      { label: 'Web Development', href: '/#services' },
      { label: 'Brand Identity', href: '/#services' },
    ],
    platform: [
      { label: 'Start a Project', href: '/start-project' },
      { label: 'Join as Freelancer', href: '/register' },
      { label: 'Portfolio', href: '/#portfolio' },
      { label: 'Reviews', href: '/#testimonials' },
    ],
    legal: [
      { label: 'Terms & Conditions', href: '/terms' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Login', href: '/login' },
      { label: 'Contact', href: '/#contact' },
    ],
  };

  return (
    <footer className="border-t border-border/40 bg-background/60">
      <div className="container mx-auto px-6">
        {/* Top */}
        <div className="py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand column */}
          <div className="lg:col-span-2 space-y-6">
            <Link to="/">
              <BrandLogo height={38} />
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Ghana's premier freelance design and tech marketplace — connecting top creative talent with clients who demand excellence.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                Accra, Ghana
              </div>
            </div>
            <div className="flex items-center gap-3">
              {[
                { icon: XIcon, href: '#', label: 'X' },
                { icon: Linkedin, href: '#', label: 'LinkedIn' },
                { icon: Instagram, href: '#', label: 'Instagram' },
                // TODO: replace href with the WhatsApp link
                { icon: MessageCircle, href: '#', label: 'WhatsApp' },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 rounded-xl border border-border/70 bg-card/30 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Links columns */}
          {[
            { title: 'Company', items: links.company },
            { title: 'Services', items: links.services },
            { title: 'Legal & Access', items: links.legal },
          ].map((col) => (
            <div key={col.title} className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-foreground/50">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.items.map((item) => (
                  <li key={item.label}>
                    {item.href.startsWith('/') && !item.href.startsWith('/#') ? (
                      <Link
                        to={item.href}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <a
                        href={item.href}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium"
                      >
                        {item.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="py-5 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground/60">
            © {currentYear} Prime Haven. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link to="/terms" className="text-xs text-muted-foreground/60 hover:text-primary transition-colors">
              Terms
            </Link>
            <Link to="/privacy" className="text-xs text-muted-foreground/60 hover:text-primary transition-colors">
              Privacy
            </Link>
            <span className="text-xs text-muted-foreground/40">Made with ❤️ in Ghana</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
