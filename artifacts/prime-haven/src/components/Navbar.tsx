import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  X,
  ChevronDown,
  ArrowRight,
  LayoutDashboard,
  Code,
  Palette,
  Smartphone,
  Film,
  Share2,
  Briefcase,
  UserCheck,
  Star,
  BookOpen,
  Shield,
  HelpCircle,
  Sparkles,
  ArrowUpRight,
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import BrandLogo from '@/components/BrandLogo';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isClientUser, setIsClientUser] = useState(false);
  const [mobileExpandedGroup, setMobileExpandedGroup] = useState<string | null>(null);
  const { t } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!user) {
      setIsClientUser(false);
      return;
    }
    let cancelled = false;
    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (!cancelled) {
          const roles = (data || []).map((r: any) => String(r.role));
          setIsClientUser(roles.includes('client'));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Close mobile nav on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const serviceItems = [
    {
      name: 'Web Development',
      desc: 'High-performance web apps, Next.js & full-stack platforms',
      href: '/services/web-development',
      icon: Code,
    },
    {
      name: 'UI/UX Design',
      desc: 'Intuitive product interfaces, wireframes & design systems',
      href: '/services/ui-ux-design',
      icon: Palette,
    },
    {
      name: 'Graphic Design',
      desc: 'Brand identities, marketing assets & digital collateral',
      href: '/services/graphic-design',
      icon: Sparkles,
    },
    {
      name: 'Mobile App Development',
      desc: 'Native and cross-platform iOS & Android solutions',
      href: '/services/mobile-app-development',
      icon: Smartphone,
    },
    {
      name: 'Motion Graphics & Video',
      desc: 'Dynamic 2D/3D animations, promos & post-production',
      href: '/services/motion-graphics',
      icon: Film,
    },
    {
      name: 'Social Media Management',
      desc: 'Content creation, organic campaigns & audience growth',
      href: '/services/social-media-management',
      icon: Share2,
    },
  ];

  const workItems = [
    {
      name: 'Apply as Talent',
      desc: 'Screen and join our vetted Ghanaian creative network',
      href: '/apply',
      icon: UserCheck,
    },
    {
      name: 'Hiring Tracks',
      desc: 'Specialized assessment funnels for designers & developers',
      href: '/hiring/web-development',
      icon: Layers,
    },
    {
      name: 'Submit a Review',
      desc: 'Rate completed work and share client feedback',
      href: '/review',
      icon: Star,
    },
  ];

  const companyItems = [
    {
      name: 'Our Story',
      desc: 'The mission behind powering Ghanaian creative talent',
      href: '/our-story',
      icon: BookOpen,
    },
    {
      name: 'Client Reviews',
      desc: 'Verified testimonials from global founders and partners',
      href: '/#testimonials',
      icon: Star,
    },
    {
      name: 'Frequently Asked Questions',
      desc: 'Clear answers on contracts, escrow & Mobile Money',
      href: '/#faq',
      icon: HelpCircle,
    },
    {
      name: 'Terms & Conditions',
      desc: 'Platform governance, contract terms & client guarantees',
      href: '/terms',
      icon: Shield,
    },
    {
      name: 'Privacy Policy',
      desc: 'How we respect and safeguard your information',
      href: '/privacy',
      icon: Shield,
    },
  ];

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-3 left-3 right-3 z-50 mx-auto max-w-[1480px] rounded-2xl border border-white/10 bg-[#090d16]/80 shadow-[0_16px_45px_rgba(0,0,0,0.65)] backdrop-blur-2xl transition-all duration-300 sm:top-5 sm:left-6 sm:right-6"
    >
      <div className="px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 lg:h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center shrink-0 z-10" aria-label="Prime Haven Home">
            <motion.div whileHover={{ scale: 1.03 }} transition={{ type: 'spring', stiffness: 400 }}>
              <BrandLogo height={38} variant="dark" />
            </motion.div>
          </Link>

          {/* Desktop Center Nav with Dropdowns */}
          <div className="hidden lg:flex items-center gap-1.5">
            {/* Services Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-white/85 hover:text-white rounded-full hover:bg-white/[0.08] transition-all duration-200 outline-none data-[state=open]:bg-white/[0.1] data-[state=open]:text-white"
                >
                  <span>Services</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-60 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                sideOffset={14}
                className="z-50 w-[540px] rounded-2xl border border-white/10 bg-[#0b0f1a]/95 p-3.5 text-white shadow-[0_25px_60px_rgba(0,0,0,0.85)] backdrop-blur-2xl animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
              >
                <div className="px-2 py-1.5 mb-1.5 flex items-center justify-between border-b border-white/[0.08]">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Core Agency Disciplines</span>
                  <Link to="/#services" className="text-xs text-white/60 hover:text-white transition-colors flex items-center gap-1">
                    All Services <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {serviceItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className="group flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-white/[0.08]"
                      >
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-white group-hover:text-primary transition-colors flex items-center gap-1">
                            {item.name}
                          </div>
                          <p className="mt-0.5 text-[11px] leading-snug text-white/55 line-clamp-2">
                            {item.desc}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
                <div className="mt-2.5 pt-2 border-t border-white/[0.08] flex items-center justify-between px-2">
                  <span className="text-xs text-white/60">Need a custom scope or enterprise solution?</span>
                  <Link
                    to="/start-project"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    Start a project <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Direct Link: Portfolio */}
            <Link
              to="/portfolio"
              className="px-3.5 py-2 text-sm font-semibold text-white/85 hover:text-white rounded-full hover:bg-white/[0.08] transition-all duration-200"
            >
              {t('nav.portfolio', 'Portfolio')}
            </Link>

            {/* Work & Talent Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-white/85 hover:text-white rounded-full hover:bg-white/[0.08] transition-all duration-200 outline-none data-[state=open]:bg-white/[0.1] data-[state=open]:text-white"
                >
                  <span>Opportunities &amp; Portals</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-60 transition-transform duration-200" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="center"
                sideOffset={14}
                className="z-50 w-[380px] rounded-2xl border border-white/10 bg-[#0b0f1a]/95 p-3 text-white shadow-[0_25px_60px_rgba(0,0,0,0.85)] backdrop-blur-2xl animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
              >
                <div className="px-2 py-1.5 mb-1.5 flex items-center justify-between border-b border-white/[0.08]">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Talent &amp; Opportunities</span>
                  <span className="text-xs text-white/50">Vetted Network</span>
                </div>
                <div className="space-y-1">
                  {workItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className="group flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-white/[0.08]"
                      >
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.08] text-white/90 group-hover:bg-primary group-hover:text-white transition-colors">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-white group-hover:text-primary transition-colors flex items-center gap-1">
                            {item.name}
                          </div>
                          <p className="mt-0.5 text-[11px] leading-snug text-white/55 line-clamp-2">
                            {item.desc}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Company Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-white/85 hover:text-white rounded-full hover:bg-white/[0.08] transition-all duration-200 outline-none data-[state=open]:bg-white/[0.1] data-[state=open]:text-white"
                >
                  <span>Company</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-60 transition-transform duration-200" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="center"
                sideOffset={14}
                className="z-50 w-72 rounded-2xl border border-white/10 bg-[#0b0f1a]/95 p-2.5 text-white shadow-[0_25px_60px_rgba(0,0,0,0.85)] backdrop-blur-2xl animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
              >
                <div className="px-2 py-1 mb-1 border-b border-white/[0.08]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">About Prime Haven</span>
                </div>
                <div className="space-y-1">
                  {companyItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className="group flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-colors hover:bg-white/[0.08]"
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-white/80 group-hover:bg-primary group-hover:text-white transition-colors">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="text-xs font-semibold text-white/90 group-hover:text-primary transition-colors">
                          {item.name}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Direct Link: Insights / Blog */}
            <Link
              to="/blog"
              className="px-3.5 py-2 text-sm font-semibold text-white/85 hover:text-white rounded-full hover:bg-white/[0.08] transition-all duration-200"
            >
              Insights
            </Link>
          </div>

          {/* Desktop Right Actions */}
          <div className="hidden lg:flex items-center gap-2.5 z-10">
            {/* Language Pill */}
            <div className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 flex items-center">
              <LanguageSwitcher />
            </div>

            <div className="w-px h-5 bg-white/15" />

            {isClientUser ? (
              <Link
                to="/client/dashboard"
                className="group inline-flex items-center gap-2 h-10 pl-4 pr-1.5 rounded-full bg-white text-black font-semibold text-xs hover:bg-zinc-100 transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)]"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-zinc-800" />
                <span>Client Dashboard</span>
                <span className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white">
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            ) : user ? (
              <Link
                to="/dashboard"
                className="group inline-flex items-center gap-2 h-10 pl-4 pr-1.5 rounded-full bg-white text-black font-semibold text-xs hover:bg-zinc-100 transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)]"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-zinc-800" />
                <span>Dashboard</span>
                <span className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white">
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 px-3.5 rounded-full text-white/80 font-semibold hover:text-white hover:bg-white/[0.08]"
                  >
                    {t('nav.login', 'Sign In')}
                  </Button>
                </Link>

                <Link
                  to="/start-project"
                  className="group inline-flex items-center gap-2 h-10 pl-4 pr-1.5 rounded-full bg-white text-black font-semibold text-xs hover:bg-zinc-100 transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                >
                  <span>Start a Project</span>
                  <span className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white">
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isOpen}
            className="lg:hidden p-2 rounded-xl text-white/90 hover:text-white hover:bg-white/[0.1] transition-colors z-10"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={isOpen ? 'close' : 'open'}
                initial={{ opacity: 0, rotate: -90 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: 90 }}
                transition={{ duration: 0.15 }}
              >
                {isOpen ? <X size={22} /> : <Menu size={22} />}
              </motion.div>
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: 'easeInOut' }}
            className="lg:hidden overflow-hidden border-t border-white/10 bg-[#090d16]/95 backdrop-blur-2xl rounded-b-2xl"
          >
            <div className="container mx-auto px-5 py-5 flex flex-col gap-2 max-h-[80vh] overflow-y-auto">
              {/* Services Accordion */}
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setMobileExpandedGroup(mobileExpandedGroup === 'services' ? null : 'services')}
                  className="w-full flex items-center justify-between p-3.5 text-sm font-semibold text-white"
                >
                  <span className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-primary" />
                    Services
                  </span>
                  <ChevronDown className={`w-4 h-4 text-white/60 transition-transform ${mobileExpandedGroup === 'services' ? 'rotate-180' : ''}`} />
                </button>
                {mobileExpandedGroup === 'services' && (
                  <div className="px-3 pb-3 pt-1 space-y-1 border-t border-white/[0.06]">
                    {serviceItems.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center justify-between py-2 px-2.5 rounded-lg text-xs font-medium text-white/80 hover:text-white hover:bg-white/[0.08]"
                      >
                        <span>{item.name}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 opacity-50" />
                      </Link>
                    ))}
                    <Link
                      to="/#services"
                      onClick={() => setIsOpen(false)}
                      className="block text-center text-xs font-semibold text-primary pt-2 hover:underline"
                    >
                      View All Services &amp; Pricing →
                    </Link>
                  </div>
                )}
              </div>

              {/* Work & Opportunities Accordion */}
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setMobileExpandedGroup(mobileExpandedGroup === 'work' ? null : 'work')}
                  className="w-full flex items-center justify-between p-3.5 text-sm font-semibold text-white"
                >
                  <span className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-primary" />
                    Opportunities &amp; Portals
                  </span>
                  <ChevronDown className={`w-4 h-4 text-white/60 transition-transform ${mobileExpandedGroup === 'work' ? 'rotate-180' : ''}`} />
                </button>
                {mobileExpandedGroup === 'work' && (
                  <div className="px-3 pb-3 pt-1 space-y-1 border-t border-white/[0.06]">
                    {workItems.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center justify-between py-2 px-2.5 rounded-lg text-xs font-medium text-white/80 hover:text-white hover:bg-white/[0.08]"
                      >
                        <span>{item.name}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 opacity-50" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Company Accordion */}
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setMobileExpandedGroup(mobileExpandedGroup === 'company' ? null : 'company')}
                  className="w-full flex items-center justify-between p-3.5 text-sm font-semibold text-white"
                >
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" />
                    Company &amp; Trust
                  </span>
                  <ChevronDown className={`w-4 h-4 text-white/60 transition-transform ${mobileExpandedGroup === 'company' ? 'rotate-180' : ''}`} />
                </button>
                {mobileExpandedGroup === 'company' && (
                  <div className="px-3 pb-3 pt-1 space-y-1 border-t border-white/[0.06]">
                    {companyItems.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center justify-between py-2 px-2.5 rounded-lg text-xs font-medium text-white/80 hover:text-white hover:bg-white/[0.08]"
                      >
                        <span>{item.name}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 opacity-50" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Direct links */}
              <Link
                to="/portfolio"
                onClick={() => setIsOpen(false)}
                className="py-2.5 px-3.5 rounded-xl text-white/90 hover:text-white hover:bg-white/[0.08] font-semibold text-sm transition-colors"
              >
                Portfolio
              </Link>
              <Link
                to="/blog"
                onClick={() => setIsOpen(false)}
                className="py-2.5 px-3.5 rounded-xl text-white/90 hover:text-white hover:bg-white/[0.08] font-semibold text-sm transition-colors"
              >
                Insights &amp; Articles
              </Link>

              {/* Language Switcher & Controls */}
              <div className="flex items-center justify-between py-3 px-3 rounded-xl border border-white/[0.08] bg-white/[0.03] mt-1">
                <span className="text-xs text-white/60 font-medium">Select Language</span>
                <LanguageSwitcher />
              </div>

              {/* CTA Action Buttons */}
              <div className="flex flex-col gap-2 pt-2 pb-1">
                {isClientUser ? (
                  <Link to="/client/dashboard" onClick={() => setIsOpen(false)}>
                    <Button className="w-full rounded-full font-bold bg-primary text-white hover:bg-primary/90 gap-2">
                      <LayoutDashboard className="w-4 h-4" />
                      Client Dashboard
                    </Button>
                  </Link>
                ) : user ? (
                  <Link to="/dashboard" onClick={() => setIsOpen(false)}>
                    <Button className="w-full rounded-full font-bold bg-primary text-white hover:bg-primary/90 gap-2">
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/start-project" onClick={() => setIsOpen(false)}>
                      <Button className="w-full rounded-full font-bold bg-white text-black hover:bg-zinc-100 gap-2">
                        Start a Project <ArrowRight className="w-4 h-4 text-primary" />
                      </Button>
                    </Link>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Link to="/login" onClick={() => setIsOpen(false)}>
                        <Button variant="outline" className="w-full rounded-full border-white/20 text-white hover:bg-white/10">
                          {t('nav.login', 'Sign In')}
                        </Button>
                      </Link>
                      <Link to="/register" onClick={() => setIsOpen(false)}>
                        <Button variant="outline" className="w-full rounded-full border-primary/40 text-primary hover:bg-primary/10">
                          Join Network
                        </Button>
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;
