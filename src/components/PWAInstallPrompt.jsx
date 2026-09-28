import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share, PlusSquare } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

const isInStandaloneMode = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

const SNOOZE_KEY = 'pwa-prompt-dismissed-at';
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
const isSnoozed = () => {
  try { return Date.now() - Number(localStorage.getItem(SNOOZE_KEY) || 0) < SNOOZE_MS; } catch { return false; }
};

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showAndroidPrompt, setShowAndroidPrompt] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  // The landing page has its own Android install banner (with the APK download);
  // the iPhone guide below still shows there.
  const onLandingPage = useLocation().pathname === '/';

  useEffect(() => {
    // Don't show if already installed
    if (isInStandaloneMode()) return;
    if (isSnoozed()) return;

    // Android: listen for beforeinstallprompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowAndroidPrompt(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS: show manual guide after 3 seconds
    if (isIOS()) {
      const timer = setTimeout(() => {
        if (!isSnoozed()) {
          setShowIOSGuide(true);
        }
      }, 3000);
      return () => {
        window.removeEventListener('beforeinstallprompt', handler);
        clearTimeout(timer);
      };
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowAndroidPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowAndroidPrompt(false);
    setShowIOSGuide(false);
    setDismissed(true);
    try { localStorage.setItem(SNOOZE_KEY, String(Date.now())); } catch { /* storage unavailable */ }
  };

  if (dismissed) return null;

  return (
    <AnimatePresence>
      {/* Android Install Banner */}
      {showAndroidPrompt && !onLandingPage && (
        <motion.div
          key="android-prompt"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 20 }}
          className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 p-4 flex items-center gap-3">
            <img
              src="/pwa-192x192.png"
              alt="RMS Madrasa"
              className="w-12 h-12 rounded-xl flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-stone-900 text-sm">Install RMS Madrasa</p>
              <p className="text-xs text-stone-500 mt-0.5">Add to your home screen for quick access</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button
                onClick={handleInstall}
                size="sm"
                className="rounded-full bg-primary hover:bg-emerald-600 text-xs px-3"
              >
                <Download className="w-3 h-3 mr-1" />
                Install
              </Button>
              <button
                onClick={handleDismiss}
                className="p-1.5 text-stone-400 hover:text-stone-600 transition-colors rounded-full"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* iOS Installation Guide */}
      {showIOSGuide && (
        <motion.div
          key="ios-guide"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 20 }}
          className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <img
                  src="/pwa-192x192.png"
                  alt="RMS Madrasa"
                  className="w-10 h-10 rounded-xl"
                />
                <div>
                  <p className="font-semibold text-stone-900 text-sm">Install App</p>
                  <p className="text-xs text-stone-500">RMS Madrasa</p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1 text-stone-400 hover:text-stone-600 transition-colors rounded-full"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2.5">
              <p className="text-xs text-stone-600 font-medium">To install on iPhone/iPad:</p>
              <div className="flex items-center gap-2 text-xs text-stone-600">
                <span className="flex-shrink-0 w-5 h-5 bg-primary/10 text-primary rounded-full flex items-center justify-center font-semibold text-xs">1</span>
                <span>Tap the <Share className="w-3.5 h-3.5 inline mx-0.5 text-blue-500" /> Share button in Safari</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-stone-600">
                <span className="flex-shrink-0 w-5 h-5 bg-primary/10 text-primary rounded-full flex items-center justify-center font-semibold text-xs">2</span>
                <span>Tap <PlusSquare className="w-3.5 h-3.5 inline mx-0.5" /> <strong>Add to Home Screen</strong></span>
              </div>
              <div className="flex items-center gap-2 text-xs text-stone-600">
                <span className="flex-shrink-0 w-5 h-5 bg-primary/10 text-primary rounded-full flex items-center justify-center font-semibold text-xs">3</span>
                <span>Tap <strong>Add</strong> to confirm</span>
              </div>
            </div>
          </div>
          {/* iOS arrow pointing to bottom */}
          <div className="flex justify-center mt-1">
            <div className="w-4 h-4 bg-white border-r border-b border-stone-200 rotate-45 transform -translate-y-2"></div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PWAInstallPrompt;
