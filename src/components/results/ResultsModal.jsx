import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

// Wide modal shell for the Results screens (the dashboard's own Modal is too narrow for grids).
const ResultsModal = ({ open, onClose, title, subtitle, children, footer, maxWidth = 'max-w-3xl' }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className={`flex max-h-[94vh] w-full ${maxWidth} flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl`}
        >
          <div className="flex flex-shrink-0 items-start justify-between gap-3 border-b border-stone-100 p-5">
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-stone-900">{title}</h3>
              {subtitle && <p className="mt-0.5 text-xs text-stone-500">{subtitle}</p>}
            </div>
            <button type="button" onClick={onClose} className="rounded-xl p-2 text-stone-400 transition-colors hover:bg-stone-100">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5">{children}</div>
          {footer && <div className="flex-shrink-0 border-t border-stone-100 bg-stone-50 p-4">{footer}</div>}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default ResultsModal;
