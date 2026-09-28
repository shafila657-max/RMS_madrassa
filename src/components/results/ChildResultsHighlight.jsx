import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Sparkles, HeartHandshake } from 'lucide-react';
import ResultCard from './ResultCard';
import { formatMarks, ordinal } from '@/utils/results';

const seenKey = (examId, studentId) => `result_seen_${examId}_${studentId}`;

const readSeen = (key) => {
  try { return localStorage.getItem(key) === '1'; } catch { return true; }
};
const markSeen = (key) => {
  try { localStorage.setItem(key, '1'); } catch { /* storage unavailable */ }
};

/**
 * Parent dashboard highlight for the latest published exam.
 * A child's result opens automatically (with confetti if they passed everything)
 * the first time the parent sees it on this device.
 */
const ChildResultsHighlight = ({ results }) => {
  const exam = results[0]?.exam;
  const [openId, setOpenId] = useState(null);
  const [celebrateId, setCelebrateId] = useState(null);

  useEffect(() => {
    const unseen = results.find(r => !readSeen(seenKey(r.exam.id, r.student.id)));
    if (unseen) {
      setOpenId(unseen.student.id);
      setCelebrateId(unseen.student.id);
    }
    results.forEach(r => markSeen(seenKey(r.exam.id, r.student.id)));
  }, [results]);

  if (!exam) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-600 to-emerald-800 text-white shadow-lg"
    >
      <div className="flex items-center gap-3 px-5 pb-3 pt-5">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-white/15">
          <Sparkles className="h-5 w-5 text-amber-300" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-amber-200">Results published</p>
          <h2 className="text-lg font-extrabold leading-tight">{exam.name}{exam.academic_year ? ` ${exam.academic_year}` : ''}</h2>
        </div>
      </div>

      <div className="space-y-2 px-3 pb-3">
        {results.map(r => {
          const open = openId === r.student.id;
          return (
            <div key={r.student.id} className="overflow-hidden rounded-2xl bg-white text-stone-900">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : r.student.id)}
                className="flex w-full items-center gap-3 p-4 text-left"
              >
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${r.all_passed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {r.all_passed ? <Sparkles className="h-5 w-5" /> : <HeartHandshake className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{r.student.full_name}</p>
                  <p className="text-xs text-stone-500">
                    {formatMarks(r.total_obtained)}/{formatMarks(r.total_max)} · {formatMarks(r.percentage)}%
                    {r.grade ? ` · Grade ${r.grade}` : ''}
                    {r.rank ? ` · ${ordinal(r.rank)} in class` : ''}
                  </p>
                </div>
                <span className={`hidden rounded-full px-2.5 py-1 text-[11px] font-bold sm:inline ${r.all_passed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  {r.all_passed ? 'Passed all' : 'Keep going'}
                </span>
                <ChevronDown className={`h-5 w-5 flex-shrink-0 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-stone-100 bg-stone-50 p-3">
                      <ResultCard result={r} celebrate={celebrateId === r.student.id} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </motion.section>
  );
};

export default ChildResultsHighlight;
