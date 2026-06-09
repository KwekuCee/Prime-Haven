import { ReactNode } from 'react';

interface MobileTableCardProps {
  children: ReactNode;
  className?: string;
}

/**
 * A wrapper that shows a proper table on desktop and a stacked card layout on mobile.
 * Wrap your <Table> inside this component and provide a mobileCards render.
 */
export const ResponsiveTableContainer = ({ children, className = '' }: MobileTableCardProps) => {
  return (
    <div className={`overflow-x-auto -mx-4 sm:mx-0 ${className}`}>
      <div className="min-w-[640px] sm:min-w-0">
        {children}
      </div>
    </div>
  );
};

interface MobileCardFieldProps {
  label: string;
  children: ReactNode;
}

export const MobileCardField = ({ label, children }: MobileCardFieldProps) => (
  <div className="flex items-center justify-between py-1.5">
    <span className="text-xs text-muted-foreground font-medium">{label}</span>
    <div className="text-sm font-medium text-right">{children}</div>
  </div>
);

interface MobileCardProps {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export const MobileCard = ({ title, subtitle, actions, children, className = '' }: MobileCardProps) => (
  <div className={`p-4 rounded-xl border border-border/50 bg-card/50 space-y-2 ${className}`}>
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <div className="font-semibold text-sm truncate">{title}</div>
        {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
      </div>
      {actions && <div className="flex items-center gap-1 shrink-0">{actions}</div>}
    </div>
    <div className="divide-y divide-border/30">
      {children}
    </div>
  </div>
);
