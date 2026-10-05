import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

interface ThemeToggleProps {
  variant?: 'navbar' | 'header' | 'row';
  showLabel?: boolean;
  className?: string;
}

export const ThemeToggle = ({ variant = 'header', showLabel = false, className = '' }: ThemeToggleProps) => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = mounted ? (resolvedTheme || theme || 'light') : 'light';
  const isDark = currentTheme === 'dark';

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  if (variant === 'row') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        className={`flex items-center justify-between w-full py-2.5 px-3 rounded-xl border border-white/[0.12] bg-white/[0.05] hover:bg-white/[0.1] backdrop-blur-md text-on-ink transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] ${className}`}
      >
        <span className="text-xs text-on-ink/70 font-medium">Appearance</span>
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-on-ink">
          {isDark ? (
            <>
              <Moon className="w-3.5 h-3.5 text-primary" />
              <span>Dark Glass</span>
            </>
          ) : (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>Light Mode</span>
            </>
          )}
        </span>
      </button>
    );
  }

  if (variant === 'navbar') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        className={`group relative inline-flex h-8 ${showLabel ? 'px-3 gap-1.5' : 'w-8'} items-center justify-center rounded-full border border-white/15 bg-white/[0.07] text-on-ink/90 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition-all duration-200 hover:border-primary/50 hover:bg-white/[0.14] hover:text-on-ink ${className}`}
      >
        <span className="relative flex h-3.5 w-3.5 items-center justify-center">
          <Sun
            className={`h-3.5 w-3.5 text-amber-300 transition-all duration-300 ${
              isDark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
            }`}
          />
          <Moon
            className={`absolute h-3.5 w-3.5 text-primary transition-all duration-300 ${
              isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
            }`}
          />
        </span>
        {showLabel && (
          <span className="text-[11px] font-semibold tracking-tight">
            {isDark ? 'Dark' : 'Light'}
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`group relative inline-flex h-8 ${showLabel ? 'px-3 gap-1.5' : 'w-8'} items-center justify-center rounded-full border border-border/80 bg-card/85 text-foreground backdrop-blur-md transition-all duration-200 hover:border-primary/40 hover:bg-accent/15 hover:text-primary shadow-2xs dark:border-white/15 dark:bg-white/[0.06] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_8px_20px_-6px_rgba(0,0,0,0.6)] dark:hover:border-primary/50 dark:hover:bg-white/[0.12] ${className}`}
    >
      <span className="relative flex h-4 w-4 items-center justify-center">
        <Sun
          className={`h-4 w-4 text-amber-500 transition-all duration-300 ${
            isDark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
          }`}
        />
        <Moon
          className={`absolute h-4 w-4 text-primary transition-all duration-300 ${
            isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
          }`}
        />
      </span>
      {showLabel && (
        <span className="text-xs font-semibold tracking-tight">
          {isDark ? 'Dark' : 'Light'}
        </span>
      )}
    </button>
  );
};

export default ThemeToggle;
