import logoLight from '@/assets/prime-haven-logo-light.png';
import logoDark from '@/assets/prime-haven-logo.png';

interface BrandLogoProps {
  className?: string;
  alt?: string;
  height?: number;
  variant?: 'light' | 'dark';
}

const BrandLogo = ({ className, alt = 'Prime Haven', height = 40, variant = 'light' }: BrandLogoProps) => {
  const src = variant === 'dark' ? logoDark : logoLight;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={{ height: `${height}px`, width: 'auto', display: 'block' }}
    />
  );
};

export default BrandLogo;
