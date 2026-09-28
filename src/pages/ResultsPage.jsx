import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, CalendarClock } from 'lucide-react';
import ResultsSection from '@/components/results/ResultsSection';
import { fetchLatestPublishedExam } from '@/utils/results';

// Public, shareable page for the latest published exam. No login needed.
const ResultsPage = () => {
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Exam Results · RMS Madrasa';
    fetchLatestPublishedExam()
      .then(setExam)
      .catch(err => console.error('Failed to load published exam:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#022c22] via-[#064e3b] to-[#011812] star-pattern-bg text-white">
      <header className="no-print sticky top-0 z-40 border-b border-white/10 bg-[#022c22]/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 md:px-12">
          <Link to="/" className="flex items-center gap-2">
            <img src="/apple-touch-icon.png" alt="RMS Madrasa" className="h-9 w-9 rounded-xl object-cover" />
            <span className="font-heading text-lg font-bold">RMS Madrasa</span>
          </Link>
          <Link to="/" className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-xs font-bold transition-colors hover:bg-white/20">
            <ArrowLeft className="h-3.5 w-3.5" /> Home
          </Link>
        </div>
      </header>

      <main className="py-12 sm:py-16">
        {loading ? (
          <div className="py-24 text-center">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-emerald-300" />
          </div>
        ) : exam ? (
          <ResultsSection exam={exam} headingLevel="h1" />
        ) : (
          <div className="container mx-auto max-w-md px-4 py-16 text-center">
            <CalendarClock className="mx-auto mb-4 h-12 w-12 text-emerald-300" />
            <h1 className="mb-2 font-heading text-3xl font-extrabold">No results published yet</h1>
            <p className="text-sm text-emerald-100/80">Results will appear here as soon as the madrasa publishes them. Please check back soon.</p>
            <Link to="/" className="mt-6 inline-flex rounded-full bg-emerald-500 px-6 py-3 text-sm font-extrabold hover:bg-emerald-400">
              Back to home
            </Link>
          </div>
        )}
      </main>
    </div>
  );
};

export default ResultsPage;
