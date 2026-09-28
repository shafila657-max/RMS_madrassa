import React, { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, RefreshCw, AlertCircle, RotateCcw } from 'lucide-react';
import ResultCard from './ResultCard';
import { fetchPublicResult } from '@/utils/results';

/**
 * Registration number + date of birth form for the latest published exam.
 * `tone` matches the section it sits in: "dark" on the landing page, "light" elsewhere.
 */
const ResultLookup = ({ tone = 'light' }) => {
  const [regNo, setRegNo] = useState('');
  const [dob, setDob] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const resultRef = useRef(null);

  const dark = tone === 'dark';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!regNo.trim() || !dob) {
      setError('Enter the registration number and date of birth.');
      return;
    }
    setLoading(true);
    try {
      const data = await fetchPublicResult(regNo.trim(), dob);
      if (!data) {
        setError('No result found. Please check the registration number and date of birth, or contact the madrasa office.');
        setResult(null);
        return;
      }
      setResult(data);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    } catch (err) {
      setError(err?.message || 'Could not load the result. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setRegNo('');
    setDob('');
    setError('');
  };

  const labelCls = `mb-1.5 block text-xs font-semibold ${dark ? 'text-emerald-100' : 'text-stone-600'}`;
  const inputCls = `w-full rounded-xl border px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
    dark
      ? 'border-white/15 bg-white/95 text-stone-900 placeholder:text-stone-400'
      : 'border-stone-200 bg-white text-stone-900 placeholder:text-stone-400'
  }`;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <AnimatePresence mode="wait">
        {!result ? (
          <motion.form
            key="form"
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className={`mx-auto max-w-xl rounded-3xl border p-5 sm:p-7 ${
              dark ? 'border-emerald-500/25 bg-emerald-950/50 backdrop-blur-sm' : 'border-stone-200 bg-white shadow-lg'
            }`}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="result-reg-no" className={labelCls}>Registration Number</label>
                <input
                  id="result-reg-no"
                  value={regNo}
                  onChange={e => setRegNo(e.target.value)}
                  placeholder="e.g. RMS-2026-0001"
                  autoComplete="off"
                  autoCapitalize="characters"
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="result-dob" className={labelCls}>Date of Birth</label>
                <input
                  id="result-dob"
                  type="date"
                  value={dob}
                  onChange={e => setDob(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className={inputCls}
                />
              </div>
            </div>

            {error && (
              <div className={`mt-4 flex items-start gap-2 rounded-xl px-3.5 py-3 text-sm ${
                dark ? 'bg-amber-400/10 text-amber-200' : 'bg-amber-50 text-amber-800'
              }`}>
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-900/20 transition-colors hover:bg-emerald-400 disabled:opacity-60"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {loading ? 'Checking…' : 'View Result'}
            </button>
            <p className={`mt-3 text-center text-[11px] ${dark ? 'text-emerald-200/60' : 'text-stone-400'}`}>
              No login needed. Your details are only used to find this result.
            </p>
          </motion.form>
        ) : (
          <motion.div key="result" ref={resultRef} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="scroll-mt-24">
            <ResultCard
              result={result}
              celebrate
              footer={(
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 sm:flex-none"
                >
                  <RotateCcw className="h-4 w-4" /> Check another
                </button>
              )}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ResultLookup;
