import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallPrompt = () => {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem('install-prompt-dismissed');
    if (dismissed) return;
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    // @ts-ignore - navigator.standalone is iOS Safari specific
    if ((navigator as any).standalone === true) return;

    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    const timer = setTimeout(() => {
      if (!deferredPrompt) setShow(true);
    }, 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(timer);
    };
  }, []);

  const handleInstall = async () => {
    try {
      if (deferredPrompt) {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') setShow(false);
        setDeferredPrompt(null);
      }
    } catch (error) {
      console.error("Install prompt error:", error);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    sessionStorage.setItem('install-prompt-dismissed', 'true');
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-4 left-4 right-4 z-[100] md:left-auto md:right-6 md:max-w-sm"
        >
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 relative">
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <img src="/favicon.png" alt="Prime Haven" className="w-8 h-8 rounded-lg" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-heading font-bold text-sm">Install Prime Haven</h3>
                {isIOS ? (
                  <div className="mt-1 space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <span>Tap</span>
                      <Share className="w-3.5 h-3.5 text-primary inline" />
                      <span>then <strong>"Add to Home Screen"</strong></span>
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">
                    Add to your home screen for a faster, app-like experience.
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              {deferredPrompt ? (
                <Button size="sm" onClick={handleInstall} className="flex-1 gap-1.5">
                  <Download className="w-4 h-4" />
                  Install
                </Button>
              ) : (
                <Link to="/install" className="flex-1" onClick={handleDismiss}>
                  <Button size="sm" className="w-full gap-1.5">
                    {isIOS ? <Share className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                    {isIOS ? 'How to Install' : 'Install'}
                  </Button>
                </Link>
              )}
              <Button size="sm" variant="ghost" onClick={handleDismiss}>
                Not now
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InstallPrompt;
