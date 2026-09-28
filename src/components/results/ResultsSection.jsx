import React from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Share2, GraduationCap } from 'lucide-react';
import ResultLookup from './ResultLookup';
import { shareResultsLink } from '@/utils/results';

/**
 * "Results Published" block: exam heading, share button and the lookup form.
 * Used as a landing page section and as the body of the /results page.
 */
const ResultsSection = ({ exam, headingLevel = 'h2' }) => {
  const Heading = headingLevel;
  const publishedOn = exam?.published_at
    ? new Date(exam.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const handleShare = async () => {
    try {
      const outcome = await shareResultsLink(exam?.name);
      if (outcome === 'copied') toast.success('Results link copied. Share it with parents!');
    } catch {
      toast.error('Could not share the link');
    }
  };

  return (
    <div className="container relative z-10 mx-auto px-4 sm:px-6 md:px-12">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="mx-auto mb-8 max-w-2xl text-center"
      >
        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-400/15 px-3.5 py-1 text-[11px] font-bold uppercase tracking-widest text-amber-200 sm:text-xs">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-300" />
          </span>
          Results Published
        </span>
        <Heading className="mb-2 font-heading text-3xl font-extrabold text-white sm:text-4xl md:text-5xl">
          {exam?.name || 'Exam Results'}
          {exam?.academic_year && <span className="text-emerald-300"> {exam.academic_year}</span>}
        </Heading>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-emerald-100/80 sm:text-base">
          Enter the student&apos;s registration number and date of birth to see the full mark list.
          {publishedOn && <span className="block pt-1 text-xs text-emerald-200/60">Published on {publishedOn}</span>}
        </p>
        <button
          type="button"
          onClick={handleShare}
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-white/20"
        >
          <Share2 className="h-3.5 w-3.5" /> Share results link
        </button>
      </motion.div>

      <ResultLookup tone="dark" />

      <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-[11px] text-emerald-200/50">
        <GraduationCap className="h-3.5 w-3.5" />
        Don&apos;t know the registration number? Ask the madrasa office.
      </p>
    </div>
  );
};

export default ResultsSection;
