import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, Smartphone, Monitor, CheckCircle, Share, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BrandLogo from '@/components/BrandLogo';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e as BeforeInstallPromptEvent); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[80vh] p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-sm w-full text-center space-y-6">
          {installed ? (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <h1 className="text-xl font-heading font-bold">App Installed!</h1>
              <p className="text-xs text-muted-foreground">Prime Haven has been added to your home screen.</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Download className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-heading font-bold mb-1">Install Prime Haven</h1>
                <p className="text-xs text-muted-foreground">Get a faster, native-like experience on your device.</p>
              </div>

              {deferredPrompt ? (
                <Button onClick={handleInstall} className="w-full text-xs" size="sm">
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Install App
                </Button>
              ) : isIOS ? (
                <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5 text-left space-y-3">
                  <p className="text-xs font-medium">To install on iOS:</p>
                  <div className="flex items-start gap-3 text-[10px] text-muted-foreground">
                    <Share className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                    <span>Tap the <strong>Share</strong> button in Safari</span>
                  </div>
                  <div className="flex items-start gap-3 text-[10px] text-muted-foreground">
                    <Smartphone className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                    <span>Select <strong>"Add to Home Screen"</strong></span>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5 text-left space-y-3">
                  <p className="text-xs font-medium">To install:</p>
                  <div className="flex items-start gap-3 text-[10px] text-muted-foreground">
                    <MoreVertical className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                    <span>Open browser menu (⋮) → <strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong></span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {[{ icon: Smartphone, label: 'Mobile' }, { icon: Monitor, label: 'Desktop' }].map(item => (
                  <div key={item.label} className="rounded-xl border border-border/40 bg-muted/10 p-3 text-center">
                    <item.icon className="w-5 h-5 text-primary mx-auto mb-1" />
                    <p className="text-[10px] text-muted-foreground">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Link to="/dashboard" className="block text-[10px] text-muted-foreground hover:text-primary transition-colors">
            ← Back to Dashboard
          </Link>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Install;
