import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, QrCode, Smartphone, Copy, CheckCircle2, Sparkles, Share2, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';

const MobileQRModal = ({ open, onClose }) => {
  const apkUrl = 'https://rms-madrasa.vercel.app/rms-madrasa-app.apk'; // Placeholder, replace with actual URL

  const handleCopy = () => {
    navigator.clipboard.writeText(apkUrl);
    toast.success('App download link copied to clipboard!');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Download RMS Madrasa App',
          text: 'Install the RMS Madrasa App for the best experience!',
          url: apkUrl,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      toast.error('Sharing not supported on this browser. Please copy the link instead.');
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          onClick={e => e.stopPropagation()}
          className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden my-6"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 p-6 text-white relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                <QrCode className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Download Mobile App</h3>
                <p className="text-emerald-100 text-xs mt-0.5">Scan QR to install the Android APK</p>
              </div>
            </div>
          </div>

          <div className="p-6 text-center space-y-5">
            {/* QR Code Container */}
            <div className="bg-gradient-to-br from-emerald-50 to-stone-100 p-6 rounded-3xl border-2 border-emerald-100 inline-block shadow-inner">
              <QRCodeSVG
                value={apkUrl}
                size={200}
                bgColor="#ffffff"
                fgColor="#047857"
                level="H"
                includeMargin={true}
              />
            </div>

            <div className="space-y-1">
              <p className="font-bold text-stone-900 text-sm flex items-center justify-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-600" /> Point Camera at QR Code
              </p>
              <p className="text-stone-500 text-xs max-w-xs mx-auto">
                Works on Android devices. Scan to download the direct .apk installer file.
              </p>
            </div>

            {/* URL Copy box */}
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3 flex items-center justify-between text-xs gap-2">
              <span className="font-mono text-emerald-800 font-bold truncate pr-2" title={apkUrl}>{apkUrl}</span>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={handleCopy}
                  className="p-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold rounded-xl transition-colors flex items-center justify-center"
                  title="Copy Link"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={handleShare}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors flex items-center gap-1"
                >
                  <Share2 className="w-3.5 h-3.5" /> Share
                </button>
              </div>
            </div>

            {/* Quick installation note */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-left text-xs space-y-1.5 text-emerald-950">
              <p className="font-bold flex items-center gap-1 text-emerald-800">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Install as Mobile App (PWA):
              </p>
              <p className="text-[11px] text-emerald-900">
                • <strong>iPhone</strong>: Safari &rarr; Share &rarr; <strong>"Add to Home Screen"</strong>
              </p>
              <p className="text-[11px] text-emerald-900">
                • <strong>Android</strong>: Chrome &rarr; 3 dots &rarr; <strong>"Add to Home Screen"</strong>
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-stone-900 text-white font-bold text-xs hover:bg-stone-800 transition-colors"
            >
              Done
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MobileQRModal;
