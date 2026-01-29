import { Link } from 'react-router-dom';
import logo from '@/assets/prime-haven-logo.png';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-12 border-t border-border">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          {/* Logo & Tagline */}
          <div className="text-center md:text-left">
            <Link to="/">
              <img src={logo} alt="Prime Haven" className="h-10 w-auto" />
            </Link>
            <p className="text-muted-foreground text-sm mt-2">
              Making IT Dreams a Reality
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap justify-center gap-6">
            <a href="#services" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
              Services
            </a>
            <a href="#portfolio" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
              Portfolio
            </a>
            <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
              About
            </a>
            <a href="#contact" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
              Contact
            </a>
            <Link to="/login" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
              Login
            </Link>
          </div>

          {/* Copyright */}
          <p className="text-muted-foreground text-sm text-center md:text-right">
            © {currentYear} Prime Haven. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
