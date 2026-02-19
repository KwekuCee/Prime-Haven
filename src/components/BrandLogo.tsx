import { useTheme } from 'next-themes';
import logoDark from '@/assets/prime-haven-logo.png';
import logoLight from '@/assets/prime-haven-logo-light.png';

interface BrandLogoProps {
  className?: string;
  alt?: string;
}

const BrandLogo = ({ className = 'h-10 w-auto', alt = 'Prime Haven' }: BrandLogoProps) => {
  const { resolvedTheme } = useTheme();
  const src = resolvedTheme === 'light' ? logoLight : logoDark;

  return <img src={src} alt={alt} className={className} />;
};

export default BrandLogo;
