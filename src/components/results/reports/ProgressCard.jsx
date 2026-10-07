import React from 'react';
import { ClipboardList, Sprout, Trophy } from 'lucide-react';
import { formatMarks, ordinal } from '@/utils/results';
import { MADRASA, markText, overallStatus, subjectStatus } from '@/utils/reports';

const SERIF = { fontFamily: "'Playfair Display', Georgia, serif" };
const SANS = { fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif" };

const STATUS_STYLE = {
  Completed: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  'Not completed': 'bg-rose-100 text-rose-700 ring-rose-200',
  Absent: 'bg-amber-100 text-amber-800 ring-amber-200',
  Pending: 'bg-stone-100 text-stone-500 ring-stone-200',
};

const formatDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

const Corner = ({ className }) => (
  <svg viewBox="0 0 60 60" className={`absolute h-14 w-14 text-amber-500 ${className}`} aria-hidden="true">
    <path d="M2 58V20C2 10 10 2 20 2h38" fill="none" stroke="currentColor" strokeWidth="2.5" />
    <path d="M10 58V24c0-8 6-14 14-14h34" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.7" />
    <circle cx="20" cy="20" r="3.5" fill="currentColor" />
  </svg>
);

const InfoBox = ({ label, value }) => (
  <div className="min-w-0 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-2">
    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">{label}</p>
    <p className="mt-1 truncate text-[15px] font-bold text-stone-900">{value || '—'}</p>
  </div>
);

const Tile = ({ label, value, sub, accent }) => (
  <div className={`flex flex-col items-center justify-center rounded-2xl px-3 py-2.5 text-center ${accent || 'bg-white ring-1 ring-stone-200'}`}>
    <p className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-70">{label}</p>
    <p className="mt-1 text-[24px] font-extrabold leading-none" style={SERIF}>{value}</p>
    {sub && <p className="mt-1 text-[10px] font-semibold opacity-70">{sub}</p>}
  </div>
);

/**
 * One A4 portrait progress card (794 × 1123 px) for a row of get_class_exam_results.
 * showAttendance toggles the attendance tile; the remark box always shows (empty lines to fill by hand).
 */
const ProgressCard = ({ exam, row, attendanceFrom, attendanceTo, showAttendance = true }) => {
  const status = overallStatus(row);
  const subjects = row.subjects || [];
  const notCompleted = subjects.filter(s => !s.passed).map(s => s.subject);
  const attendance = row.attendance || {};
  const showRank = exam.show_rank && row.rank;
  const showGrade = exam.grading_enabled && row.grade;
  // Keep long subject lists on one page.
  const cell = subjects.length > 8 ? 'py-1' : 'py-1.5';

  const tiles = [
    { label: 'Total', value: row.no_marks ? '—' : formatMarks(row.total_obtained), sub: row.no_marks ? '' : `out of ${formatMarks(row.total_max)}` },
    { label: 'Percentage', value: row.no_marks ? '—' : `${Number(row.percentage).toFixed(1)}%`, accent: 'bg-emerald-700 text-white' },
    showGrade && { label: 'Grade', value: row.grade, accent: 'bg-amber-400 text-stone-900' },
    showRank && { label: 'Class rank', value: ordinal(row.rank), sub: row.class_size ? `of ${row.class_size} students` : '' },
    showAttendance && {
      label: 'Attendance',
      value: attendance.percentage === null || attendance.percentage === undefined ? '—' : `${Math.round(attendance.percentage)}%`,
      sub: attendance.total ? `${attendance.present} of ${attendance.total} days` : 'not recorded',
    },
  ].filter(Boolean);

  return (
    <div className="relative h-full w-full overflow-hidden bg-white text-stone-800" style={SANS}>
      {/* Frame */}
      <div className="absolute inset-[18px] rounded-[28px] border-[3px] border-emerald-800" />
      <div className="absolute inset-[26px] rounded-[22px] border border-amber-400" />
      <Corner className="left-[30px] top-[30px]" />
      <Corner className="right-[30px] top-[30px] rotate-90" />
      <Corner className="bottom-[30px] right-[30px] rotate-180" />
      <Corner className="bottom-[30px] left-[30px] -rotate-90" />
      {/* Watermark */}
      <img src={MADRASA.logo} alt="" className="pointer-events-none absolute left-1/2 top-[52%] h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-[80px] opacity-[0.045]" />

      <div className="relative flex h-full flex-col px-[62px] pb-[66px] pt-[50px] [&>*]:flex-shrink-0">
        {/* Header */}
        <div className="flex items-center gap-5">
          <img src={MADRASA.logo} alt="" className="h-[70px] w-[70px] rounded-[20px] shadow-md" />
          <div className="min-w-0 flex-1">
            <p className="text-[31px] font-black leading-none tracking-wide text-emerald-900" style={SERIF}>{MADRASA.name}</p>
            <p className="mt-1.5 text-[12px] font-semibold uppercase tracking-[0.22em] text-amber-600">{MADRASA.tagline}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-400" />
          <div className="rounded-full bg-emerald-800 px-7 py-1.5 text-center text-white shadow">
            <p className="text-[19px] font-bold tracking-[0.18em]" style={SERIF}>PROGRESS CARD</p>
          </div>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-400" />
        </div>
        <p className="mt-1.5 text-center text-[14px] font-semibold text-stone-600">
          {exam.name}{exam.academic_year ? ` · Academic year ${exam.academic_year}` : ''}
        </p>

        {/* Student */}
        <div className="mt-4 grid gap-2.5" style={{ gridTemplateColumns: '1.9fr 1.25fr 0.85fr' }}>
          <div className="min-w-0 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">Student name</p>
            <p className="mt-0.5 truncate text-[19px] font-extrabold leading-tight text-stone-900" style={SERIF}>{row.student.full_name}</p>
          </div>
          <InfoBox label="Reg. No." value={row.student.registration_no} />
          <InfoBox label="Class" value={row.student.class_level} />
        </div>

        {/* Marks */}
        <div className="mt-4 overflow-hidden rounded-2xl ring-1 ring-emerald-200">
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr className="bg-emerald-800 text-white">
                <th className="px-4 py-2 text-left font-semibold">Subject</th>
                <th className="w-[78px] px-2 py-2 text-center font-semibold">Max</th>
                <th className="w-[78px] px-2 py-2 text-center font-semibold">Pass</th>
                <th className="w-[96px] px-2 py-2 text-center font-semibold">Obtained</th>
                <th className="w-[140px] px-3 py-2 text-center font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {subjects.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-stone-400">No marks entered yet</td></tr>
              ) : subjects.map((s, i) => {
                const st = subjectStatus(s);
                return (
                  <tr key={s.subject} className={i % 2 ? 'bg-emerald-50/50' : 'bg-white'}>
                    <td className={`px-4 ${cell} font-semibold text-stone-900`}>{s.subject}</td>
                    <td className={`px-2 ${cell} text-center text-stone-500`}>{formatMarks(s.max_marks)}</td>
                    <td className={`px-2 ${cell} text-center text-stone-500`}>{formatMarks(s.pass_marks)}</td>
                    <td className={`px-2 ${cell} text-center text-[15px] font-extrabold ${s.passed ? 'text-stone-900' : 'text-rose-600'}`}>{markText(s)}</td>
                    <td className="px-3 py-1.5 text-center">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${STATUS_STYLE[st]}`}>{st}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {!row.no_marks && (
              <tfoot>
                <tr className="border-t-2 border-emerald-800 bg-amber-50 font-extrabold text-stone-900">
                  <td className="px-4 py-2">Total</td>
                  <td className="px-2 py-2 text-center">{formatMarks(row.total_max)}</td>
                  <td />
                  <td className="px-2 py-2 text-center text-[16px]">{formatMarks(row.total_obtained)}</td>
                  <td className="px-3 py-2 text-center">{Number(row.percentage).toFixed(1)}%</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Summary tiles */}
        <div className="mt-4 grid gap-2.5" style={{ gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))` }}>
          {tiles.map(t => <Tile key={t.label} {...t} />)}
        </div>

        {/* Result */}
        <div className={`mt-3 flex items-center gap-4 rounded-2xl px-5 py-3 ${status === 'Completed' ? 'bg-gradient-to-r from-emerald-600 to-emerald-800 text-white' : status === 'No marks' ? 'bg-stone-100 text-stone-700' : 'bg-gradient-to-r from-amber-100 to-rose-100 text-stone-900'}`}>
          <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${status === 'Completed' ? 'bg-white/15' : 'bg-white/70'}`}>
            {status === 'Completed' ? <Trophy className="h-7 w-7 text-amber-300" /> : status === 'No marks' ? <ClipboardList className="h-6 w-6 text-stone-500" /> : <Sprout className="h-7 w-7 text-emerald-600" />}
          </div>
          <div className="min-w-0">
            <p className="text-[18px] font-extrabold" style={SERIF}>
              {status === 'Completed' ? 'Completed — Masha Allah!' : status === 'No marks' ? 'Result pending' : 'Not completed — keep going!'}
            </p>
            <p className={`text-[12px] ${status === 'Completed' ? 'text-emerald-50' : 'text-stone-600'}`}>
              {status === 'Completed'
                ? 'Passed every subject. May Allah bless your efforts and grant you more success.'
                : status === 'No marks'
                  ? 'Marks for this exam have not been entered yet.'
                  : `Needs more practice in: ${notCompleted.join(', ')}. With effort and du‘a, success is near, in sha Allah.`}
            </p>
          </div>
        </div>

        {/* Remark */}
        <div className="mt-3 rounded-2xl border border-dashed border-amber-400 bg-amber-50/40 px-5 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700">Class teacher&apos;s remark</p>
          {row.remark ? (
            <p className="mt-1 text-[14px] italic leading-relaxed text-stone-800" style={SERIF}>“{row.remark}”</p>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="border-b border-stone-300" />
              <div className="border-b border-stone-300" />
            </div>
          )}
        </div>

        {/* Signatures */}
        <div className="mt-auto grid grid-cols-3 gap-8 pt-4 text-center text-[11px] font-semibold text-stone-500">
          {['Class Teacher', 'Principal', 'Parent / Guardian'].map(label => (
            <div key={label}>
              <div className="mb-1.5 h-9 border-b border-stone-400" />
              {label}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between px-6 text-[10px] text-stone-400">
          <span>
            {exam.exam_date ? `Exam date: ${formatDate(exam.exam_date)}` : ''}
            {showAttendance && attendanceFrom ? ` · Attendance ${formatDate(attendanceFrom)} – ${formatDate(attendanceTo)}` : ''}
          </span>
          <span>{MADRASA.name} · {MADRASA.phone}</span>
        </div>
      </div>
    </div>
  );
};

export default ProgressCard;
