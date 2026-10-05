import { useTheme } from 'next-themes';
import logoLight from '@/assets/prime-haven-logo-light.png';
import logoDark from '@/assets/prime-haven-logo.png';

interface BrandLogoProps {
  className?: string;
  alt?: string;
  height?: number;
  variant?: 'light' | 'dark' | 'auto';
}

const BrandLogo = ({ className, alt = 'Prime Haven', height = 48, variant = 'auto' }: BrandLogoProps) => {
  const { resolvedTheme } = useTheme();
  const isDarkSurface = variant === 'dark' || (variant !== 'light' && resolvedTheme === 'dark') || (variant === 'light' && resolvedTheme === 'dark');
  const src = isDarkSurface ? logoDark : logoLight;

  return (
    <img
      src={src}
      alt={alt}
      className={`block h-auto max-w-full object-contain ${className ?? ''}`}
      style={{ height: `${height}px`, width: 'auto' }}
    />
  );
};

export default BrandLogo;
