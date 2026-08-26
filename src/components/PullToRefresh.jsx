import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';

const PULL_THRESHOLD = 65; // Minimum drag distance to trigger refresh
const MAX_PULL = 100;       // Maximum pull limit

const PullToRefresh = ({ children, onRefresh }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  const startYRef = useRef(0);

  useEffect(() => {
    let touchStartedAtTop = false;

    const handleTouchStart = (e) => {
      if (window.scrollY <= 2) {
        touchStartedAtTop = true;
        startYRef.current = e.touches[0].clientY;
      } else {
        touchStartedAtTop = false;
      }
    };

    const handleTouchMove = (e) => {
      if (!touchStartedAtTop || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const dy = currentY - startYRef.current;

      if (dy > 0 && window.scrollY <= 2) {
        const distance = Math.min(MAX_PULL, dy * 0.45);
        setPullDistance(distance);
        setIsPulling(true);

        if (distance > 10 && e.cancelable) {
          e.preventDefault();
        }
      } else {
        setIsPulling(false);
        setPullDistance(0);
      }
    };

    const handleTouchEnd = async () => {
      if (!touchStartedAtTop) return;
      touchStartedAtTop = false;

      if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
        setIsRefreshing(true);
        setPullDistance(PULL_THRESHOLD);

        try {
          if (onRefresh) {
            await onRefresh();
          } else {
            // Trigger app-level custom refresh event or reload route data
            window.dispatchEvent(new CustomEvent('app-pull-refresh'));
            await new Promise(res => setTimeout(res, 800));
          }
          toast.success('Page refreshed with latest data');
        } catch (err) {
          console.error(err);
          toast.error('Failed to refresh');
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
          setIsPulling(false);
        }
      } else {
        setPullDistance(0);
        setIsPulling(false);
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullDistance, isRefreshing, onRefresh]);

  const progress = Math.min(1, pullDistance / PULL_THRESHOLD);
  const isPastThreshold = pullDistance >= PULL_THRESHOLD;

  return (
    <div className="relative min-h-screen">
      {/* Floating Pull to Refresh Indicator Badge */}
      <AnimatePresence>
        {(isPulling || isRefreshing) && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.8 }}
            animate={{
              opacity: 1,
              y: isRefreshing ? 20 : Math.min(pullDistance - 10, 45),
              scale: 1
            }}
            exit={{ opacity: 0, y: -40, scale: 0.8 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-0 left-0 right-0 z-[100] flex justify-center pointer-events-none px-4"
          >
            <div className="bg-stone-900/95 backdrop-blur-md border border-emerald-500/40 text-white px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2.5 text-xs font-semibold">
              {isRefreshing ? (
                <>
                  <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
                  <span className="text-emerald-100">Refreshing content...</span>
                </>
              ) : (
                <>
                  <div
                    className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center transition-transform duration-150"
                    style={{ transform: `rotate(${progress * 180}deg)` }}
                  >
                    <ArrowDown className={`w-3.5 h-3.5 ${isPastThreshold ? 'text-amber-400' : 'text-emerald-400'}`} />
                  </div>
                  <span className={isPastThreshold ? 'text-amber-300 font-bold' : 'text-stone-300'}>
                    {isPastThreshold ? 'Release to refresh' : 'Pull down to refresh'}
                  </span>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div
        style={{
          transform: pullDistance > 0 ? `translate3d(0, ${pullDistance * 0.3}px, 0)` : 'none',
          transition: isPulling ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
