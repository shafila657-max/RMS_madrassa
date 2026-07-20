import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, QrCode, Smartphone, Copy, CheckCircle2, Sparkles, ArrowRight } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';

const MobileQRModal = ({ open, onClose }) => {
  const localIpUrl = 'http://192.168.1.6:5174';

  const handleCopy = () => {
    navigator.clipboard.writeText(localIpUrl);
    toast.success('Mobile URL copied to clipboard!');
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
                <h3 className="text-xl font-bold">Scan to Open on Mobile</h3>
                <p className="text-emerald-100 text-xs mt-0.5">Use your Phone Camera or Scanner</p>
              </div>
            </div>
          </div>

          <div className="p-6 text-center space-y-5">
            {/* QR Code Container */}
            <div className="bg-gradient-to-br from-emerald-50 to-stone-100 p-6 rounded-3xl border-2 border-emerald-100 inline-block shadow-inner">
              <QRCodeSVG
                value={localIpUrl}
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
                Works on iPhone (Safari Camera) and Android (Chrome / Camera) on the same Wi-Fi.
              </p>
            </div>

            {/* URL Copy box */}
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3 flex items-center justify-between text-xs">
              <span className="font-mono text-emerald-800 font-bold truncate pr-2">{localIpUrl}</span>
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors flex items-center gap-1 flex-shrink-0"
              >
                <Copy className="w-3.5 h-3.5" /> Copy Link
              </button>
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
