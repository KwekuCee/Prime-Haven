import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import BrandLogo from '@/components/BrandLogo';
import { MapPin, Linkedin, Instagram, MessageCircle } from 'lucide-react';

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
      { label: 'Apply as Talent', href: '/apply' },
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
    <footer className="border-t border-white/10 bg-ink text-on-ink pb-20 lg:pb-0">
      <div className="container mx-auto px-6">
        {/* Top */}
        <div className="py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand column */}
          <div className="lg:col-span-2 space-y-6">
            <Link to="/">
              <BrandLogo height={52} variant="dark" />
            </Link>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-xs">
              A Ghanaian design and tech studio. Clients brief us, our vetted designers and developers do the work, and we stay accountable for what ships.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 text-sm text-zinc-400">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                Accra, Ghana
              </div>
            </div>
            <div className="flex items-center gap-3">
              {[
                { icon: Linkedin, href: 'https://linkedin.com/company/primehaven', label: 'LinkedIn' },
                { icon: Instagram, href: 'https://instagram.com/primehaven_tech', label: 'Instagram' },
                { icon: MessageCircle, href: 'https://wa.me/233550160237', label: 'WhatsApp' },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 rounded-xl border border-white/15 bg-white/5 flex items-center justify-center text-zinc-400 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all"
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
              <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.items.map((item) => (
                  <li key={item.label}>
                    {item.href.startsWith('/') && !item.href.startsWith('/#') ? (
                      <Link
                        to={item.href}
                        className="text-sm text-zinc-400 hover:text-primary transition-colors font-medium"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <a
                        href={item.href}
                        className="text-sm text-zinc-400 hover:text-primary transition-colors font-medium"
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
        <div className="py-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-zinc-500">
            © {currentYear} Prime Haven. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link to="/terms" className="text-xs text-zinc-500 hover:text-primary transition-colors">
              Terms
            </Link>
            <Link to="/privacy" className="text-xs text-zinc-500 hover:text-primary transition-colors">
              Privacy
            </Link>
            <span className="text-xs text-zinc-500">Made with care in Ghana</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
