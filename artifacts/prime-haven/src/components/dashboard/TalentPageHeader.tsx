import type { LucideIcon } from 'lucide-react';

interface TalentPageHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}

export default function TalentPageHeader({ eyebrow, title, description, icon: Icon, action }: TalentPageHeaderProps) {
  return (
    <header className="relative overflow-hidden rounded-lg bg-ink px-5 py-6 text-on-ink shadow-glass sm:px-7 sm:py-8">
      <div className="absolute inset-y-0 right-0 w-1 bg-primary" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <div className="mb-3 flex items-center gap-2 text-primary">
            {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
            <p className="text-[11px] font-bold uppercase tracking-normal">{eyebrow}</p>
          </div>
          <h1 className="font-heading text-2xl font-bold leading-tight sm:text-4xl">{title}</h1>
          {description && <p className="mt-2 max-w-xl text-sm text-on-ink/65">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}
