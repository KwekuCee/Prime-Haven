import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, Smartphone, Monitor, CheckCircle, Share, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BrandLogo from '@/components/BrandLogo';
import { Link } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua));

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setInstalled(true));

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    try {
      if (!deferredPrompt) return;
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setInstalled(true);
      setDeferredPrompt(null);
    } catch (error) {
      console.error("Install prompt error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center space-y-8"
      >
        <Link to="/">
          <BrandLogo height={40} className="mx-auto" />
        </Link>

        {installed ? (
          <div className="space-y-4">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <h1 className="text-2xl font-heading font-bold">App Installed!</h1>
            <p className="text-muted-foreground">Prime Haven has been added to your home screen.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Download className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-2xl font-heading font-bold">Install Prime Haven</h1>
            <p className="text-muted-foreground">
              Install our app for a faster, native-like experience on your device.
            </p>

            {deferredPrompt ? (
              <Button size="lg" onClick={handleInstall} className="w-full gap-2">
                <Download className="w-5 h-5" />
                Install App
              </Button>
            ) : isIOS ? (
              <div className="glass rounded-xl p-6 text-left space-y-3">
                <p className="font-medium text-sm">To install on iOS:</p>
                <div className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Share className="w-5 h-5 shrink-0 mt-0.5 text-primary" />
                  <span>Tap the <strong>Share</strong> button in Safari</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Smartphone className="w-5 h-5 shrink-0 mt-0.5 text-primary" />
                  <span>Select <strong>"Add to Home Screen"</strong></span>
                </div>
              </div>
            ) : (
              <div className="glass rounded-xl p-6 text-left space-y-3">
                <p className="font-medium text-sm">To install:</p>
                <div className="flex items-start gap-3 text-sm text-muted-foreground">
                  <MoreVertical className="w-5 h-5 shrink-0 mt-0.5 text-primary" />
                  <span>Open browser menu (⋮) and select <strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong></span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="glass rounded-lg p-4 text-center">
                <Smartphone className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Mobile</p>
              </div>
              <div className="glass rounded-lg p-4 text-center">
                <Monitor className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Desktop</p>
              </div>
            </div>
          </div>
        )}

        <Link to="/" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
          ← Back to website
        </Link>
      </motion.div>
    </div>
  );
};

export default Install;
