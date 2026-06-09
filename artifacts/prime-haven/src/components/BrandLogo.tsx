import { useTheme } from 'next-themes';
import logoDark from '@/assets/prime-haven-logo.png';
import logoLight from '@/assets/prime-haven-logo-light.png';

interface BrandLogoProps {
  className?: string;
  alt?: string;
  height?: number;
}

const BrandLogo = ({ className, alt = 'Prime Haven', height = 40 }: BrandLogoProps) => {
  const { resolvedTheme } = useTheme();
  const src = resolvedTheme === 'light' ? logoLight : logoDark;

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
