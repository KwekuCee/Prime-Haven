import logoLight from '@/assets/prime-haven-logo-light.png';

interface BrandLogoProps {
  className?: string;
  alt?: string;
  height?: number;
}

const BrandLogo = ({ className, alt = 'Prime Haven', height = 40 }: BrandLogoProps) => {
  const src = logoLight;

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
