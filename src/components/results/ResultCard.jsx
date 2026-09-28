import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Award, CheckCircle2, Clock, Printer, Sparkles, Trophy, User, HeartHandshake } from 'lucide-react';
import Confetti from './Confetti';
import { formatMarks, ordinal } from '@/utils/results';

const StatusPill = ({ subject }) => {
  if (!subject.entered) {
    return <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-bold text-stone-500"><Clock className="h-3 w-3" /> Pending</span>;
  }
  if (subject.is_absent) {
    return <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700">Absent</span>;
  }
  if (subject.passed) {
    return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Passed</span>;
  }
  return <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">Not Completed</span>;
};

const SummaryTile = ({ label, value, sub, tone = 'stone' }) => {
  const tones = {
    stone: 'bg-stone-50 border-stone-100 text-stone-900',
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-800',
    amber: 'bg-amber-50 border-amber-100 text-amber-800',
  };
  return (
    <div className={`rounded-2xl border p-3 sm:p-4 text-center ${tones[tone]}`}>
      <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-1 text-xl sm:text-2xl font-extrabold leading-none">{value}</p>
      {sub && <p className="mt-1 text-[10px] sm:text-xs text-stone-500">{sub}</p>}
    </div>
  );
};

/**
 * One student's exam result. Shared by the public lookup, the parent dashboard
 * and the admin preview so all three always look the same.
 */
const ResultCard = ({ result, celebrate = false, showPrint = true, footer = null }) => {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (!celebrate || !result?.all_passed) return undefined;
    setShowConfetti(true);
    const t = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(t);
  }, [celebrate, result]);

  if (!result) return null;

  const { exam, student, subjects = [] } = result;
  const firstName = (student.full_name || '').split(' ')[0];
  const publishedOn = exam.published_at
    ? new Date(exam.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;
  const failed = Number(result.failed_count || 0);

  return (
    <>
      {showConfetti && <Confetti />}
      <motion.article
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="result-print-area overflow-hidden rounded-3xl border border-stone-200 bg-white text-left text-stone-900 shadow-xl"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 px-5 py-4 text-white sm:px-7 sm:py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <img src="/apple-touch-icon.png" alt="" className="h-10 w-10 flex-shrink-0 rounded-xl bg-white/10 object-cover" />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-100 sm:text-[11px]">Official Result</p>
                <h3 className="break-words font-heading text-lg font-extrabold leading-tight sm:text-xl">{exam.name}</h3>
              </div>
            </div>
            {exam.academic_year && (
              <span className="flex-shrink-0 rounded-full bg-white/15 px-3 py-1 text-xs font-bold">{exam.academic_year}</span>
            )}
          </div>
        </div>

        <div className="space-y-5 p-5 sm:p-7">
          {/* Student */}
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-stone-200 bg-emerald-50">
              {student.photo_url
                ? <img src={student.photo_url} alt={student.full_name} className="h-full w-full object-cover" />
                : <User className="h-7 w-7 text-emerald-300" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-extrabold sm:text-xl">{student.full_name}</p>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-500 sm:text-sm">
                <span>Reg. No: <span className="font-bold text-stone-800">{student.registration_no}</span></span>
                <span>Class: <span className="font-bold text-stone-800">{student.class_level}</span></span>
              </div>
            </div>
          </div>

          {/* Message */}
          {result.all_passed ? (
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <Sparkles className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
              <div>
                <p className="font-bold text-emerald-800">Congratulations, {firstName}! 🎉</p>
                <p className="text-sm text-emerald-700">You passed every subject. May Allah bless your knowledge and keep you growing.</p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <HeartHandshake className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
              <div>
                <p className="font-bold text-amber-800">Keep going, {firstName}! 🌱</p>
                <p className="text-sm text-amber-700">
                  {failed === 1 ? 'One subject is' : `${failed} subjects are`} not completed yet. Every step counts. With a little more
                  effort and du'a, you will get there. Your teachers believe in you.
                </p>
              </div>
            </div>
          )}

          {/* Marks: table on larger screens, stacked rows on phones */}
          <div className="overflow-hidden rounded-2xl border border-stone-200">
            <table className="hidden w-full text-sm sm:table">
              <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Subject</th>
                  <th className="px-3 py-3 text-center font-semibold">Max</th>
                  <th className="px-3 py-3 text-center font-semibold">Pass</th>
                  <th className="px-3 py-3 text-center font-semibold">Obtained</th>
                  <th className="px-4 py-3 text-right font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {subjects.map(s => (
                  <tr key={s.subject}>
                    <td className="px-4 py-3 font-semibold">{s.subject}</td>
                    <td className="px-3 py-3 text-center text-stone-500">{formatMarks(s.max_marks)}</td>
                    <td className="px-3 py-3 text-center text-stone-500">{formatMarks(s.pass_marks)}</td>
                    <td className={`px-3 py-3 text-center text-base font-extrabold ${s.entered && !s.is_absent && !s.passed ? 'text-amber-700' : ''}`}>
                      {s.is_absent ? 'AB' : formatMarks(s.marks_obtained)}
                    </td>
                    <td className="px-4 py-3 text-right"><StatusPill subject={s} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="divide-y divide-stone-100 sm:hidden">
              {subjects.map(s => (
                <li key={s.subject} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{s.subject}</p>
                    <p className="text-xs text-stone-500">Pass {formatMarks(s.pass_marks)} · Max {formatMarks(s.max_marks)}</p>
                  </div>
                  <div className="flex flex-shrink-0 flex-col items-end gap-1">
                    <p className="text-lg font-extrabold leading-none">
                      {s.is_absent ? 'AB' : formatMarks(s.marks_obtained)}
                      <span className="text-xs font-semibold text-stone-400"> / {formatMarks(s.max_marks)}</span>
                    </p>
                    <StatusPill subject={s} />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
            <SummaryTile label="Total" value={formatMarks(result.total_obtained)} sub={`out of ${formatMarks(result.total_max)}`} />
            <SummaryTile label="Percentage" value={`${formatMarks(result.percentage)}%`} tone="emerald" />
            {exam.grading_enabled && result.grade
              ? <SummaryTile label="Grade" value={result.grade} tone="emerald" />
              : <SummaryTile label="Result" value={result.all_passed ? 'Passed' : 'In progress'} tone={result.all_passed ? 'emerald' : 'amber'} />}
            {exam.show_rank && result.rank
              ? <SummaryTile label="Class Rank" value={ordinal(result.rank)} sub={result.class_size ? `of ${result.class_size} students` : null} tone="amber" />
              : <SummaryTile label="Subjects" value={`${subjects.length - failed}/${subjects.length}`} sub="completed" />}
          </div>

          {result.rank === 1 && exam.show_rank && (
            <div className="flex items-center justify-center gap-2 rounded-2xl bg-amber-50 py-2.5 text-sm font-bold text-amber-800">
              <Trophy className="h-4 w-4" /> Top of the class
            </div>
          )}

          {/* Footer */}
          <div className="flex flex-col-reverse items-stretch justify-between gap-3 border-t border-stone-100 pt-4 sm:flex-row sm:items-center">
            <p className="flex items-center gap-1.5 text-xs text-stone-400">
              <Award className="h-3.5 w-3.5" />
              {publishedOn ? `Published on ${publishedOn}` : 'Preview: not yet published'}
            </p>
            <div className="no-print flex flex-wrap gap-2">
              {footer}
              {showPrint && (
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50 sm:flex-none"
                >
                  <Printer className="h-4 w-4" /> Print / Save PDF
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.article>
    </>
  );
};

export default ResultCard;
