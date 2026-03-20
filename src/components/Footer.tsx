import { Link } from 'react-router-dom';
import BrandLogo from '@/components/BrandLogo';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-12 border-t border-border">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <Link to="/">
              <BrandLogo height={40} />
            </Link>
            <p className="text-muted-foreground text-sm mt-2">
              Making IT Dreams a Reality
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-6">
            <a href="#services" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Services</a>
            <a href="#portfolio" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Portfolio</a>
            <a href="#founder" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Our Story</a>
            <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Reviews</a>
            <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors text-sm">About</a>
            <a href="#contact" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Contact</a>
            <Link to="/login" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Login</Link>
          </div>

          <div className="flex flex-col items-center md:items-end gap-3">
            <p className="text-muted-foreground text-sm text-center md:text-right">
              © {currentYear} Prime Haven. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
