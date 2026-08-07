import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Settings, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import BrandLogo from '@/components/BrandLogo';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { name: t('nav.services'), href: '/#services' },
    { name: t('nav.portfolio'), href: '/#portfolio' },
    { name: t('nav.story'), href: '/#founder' },
    { name: t('nav.reviews'), href: '/#testimonials' },
    { name: t('nav.about'), href: '/#about' },
    { name: t('nav.blog'), href: '/blog' },
  ];

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-background/85 backdrop-blur-xl border-b border-border/60'
          : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16 lg:h-20">

          {/* Logo */}
          <Link to="/" className="flex items-center shrink-0 z-10">
            <motion.div whileHover={{ scale: 1.04 }} transition={{ type: 'spring', stiffness: 400 }}>
              <BrandLogo height={36} />
            </motion.div>
          </Link>

          {/* Desktop center nav — pill style */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((item) => (
              <motion.a
                key={item.name}
                href={item.href}
                whileHover={{ y: -1 }}
                className="px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground rounded-full hover:bg-card transition-all duration-300"
              >
                {item.name}
              </motion.a>
            ))}
          </div>


          {/* Desktop right actions */}
          <div className="hidden lg:flex items-center gap-2 z-10">
            {/* Options dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-3 rounded-full text-muted-foreground hover:text-foreground gap-1.5"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="glass border-border/60 bg-card/90 backdrop-blur-xl p-2 rounded-2xl mt-2 w-52 shadow-xl"
              >
                <div className="flex items-center justify-between p-2 rounded-xl hover:bg-primary/5 transition-colors cursor-default">
                  <span className="text-sm font-medium">Theme</span>
                  <ThemeToggle />
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl hover:bg-primary/5 transition-colors cursor-default">
                  <span className="text-sm font-medium">Language</span>
                  <LanguageSwitcher />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="w-px h-5 bg-border/60" />

            <Link to="/login">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-4 rounded-full font-medium hover:text-primary"
              >
                {t('nav.login')}
              </Button>
            </Link>

            <Link to="/register">
              <Button
                size="sm"
                className="h-9 px-5 rounded-full font-bold glow-primary"
              >
                {t('nav.join')}
              </Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isOpen}
            className="lg:hidden p-2 rounded-xl text-foreground/80 hover:text-foreground hover:bg-primary/10 transition-colors z-10"
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

      {/* Mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="lg:hidden overflow-hidden bg-background/95 backdrop-blur-xl border-t border-border/40"
          >
            <div className="container mx-auto px-6 py-5 flex flex-col gap-1">
              {navLinks.map((item, i) => (
                <motion.a
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="py-2.5 px-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-all font-medium text-sm"
                >
                  {item.name}
                </motion.a>
              ))}

              <div className="flex items-center justify-between pt-4 pb-2 border-t border-border/40 mt-2">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Theme</span>
                    <ThemeToggle />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Lang</span>
                    <LanguageSwitcher />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <Link to="/login" onClick={() => setIsOpen(false)}>
                  <Button variant="outline" className="w-full rounded-xl">{t('nav.login')}</Button>
                </Link>
                <Link to="/register" onClick={() => setIsOpen(false)}>
                  <Button className="w-full rounded-xl font-bold glow-primary">{t('nav.join')}</Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;
