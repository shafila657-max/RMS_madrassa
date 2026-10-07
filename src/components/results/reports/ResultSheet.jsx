import React from 'react';
import { formatMarks } from '@/utils/results';
import { MADRASA, classSummary, markText, overallStatus } from '@/utils/reports';

const SERIF = { fontFamily: "'Playfair Display', Georgia, serif" };
const SANS = { fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif" };
const ROWS_PER_PAGE = 16;

const STATUS_STYLE = {
  Completed: 'bg-emerald-100 text-emerald-800',
  'Not completed': 'bg-rose-100 text-rose-700',
  'No marks': 'bg-stone-100 text-stone-500',
};

const Header = ({ exam, title, subtitle, page, pages }) => (
  <div className="flex items-center gap-4 border-b-2 border-emerald-800 pb-3">
    <img src={MADRASA.logo} alt="" className="h-14 w-14 rounded-2xl" />
    <div className="min-w-0 flex-1">
      <p className="text-[24px] font-black leading-none text-emerald-900" style={SERIF}>{MADRASA.name}</p>
      <p className="mt-1 text-[12px] font-semibold text-stone-500">
        {exam.name}{exam.academic_year ? ` · ${exam.academic_year}` : ''}{exam.exam_date ? ` · ${new Date(exam.exam_date).toLocaleDateString('en-IN')}` : ''}
      </p>
    </div>
    <div className="text-right">
      <p className="text-[20px] font-extrabold text-stone-900" style={SERIF}>{title}</p>
      {subtitle && <p className="text-[11px] font-semibold text-stone-500">{subtitle}</p>}
      {pages > 1 && <p className="text-[10px] text-stone-400">Page {page} of {pages}</p>}
    </div>
  </div>
);

const Footer = () => (
  <div className="mt-auto flex items-end justify-between pt-4 text-[10px] text-stone-400">
    <div className="flex gap-16">
      {['Class Teacher', 'Principal'].map(label => (
        <div key={label} className="w-44 text-center font-semibold text-stone-500">
          <div className="mb-1 h-8 border-b border-stone-400" />{label}
        </div>
      ))}
    </div>
    <span>Printed {new Date().toLocaleDateString('en-IN')} · {MADRASA.name}</span>
  </div>
);

/** A class result sheet split into A4 landscape pages (1123 × 794 px each). */
export function classSheetPages(classResult) {
  const { exam, class_level: cls, subjects, students } = classResult;
  const summary = classSummary(classResult);
  const chunks = [];
  for (let i = 0; i < Math.max(students.length, 1); i += ROWS_PER_PAGE) chunks.push(students.slice(i, i + ROWS_PER_PAGE));
  const narrow = subjects.length > 7;

  return chunks.map((rows, idx) => (
    <div key={`${cls}-${idx}`} className="flex h-full w-full flex-col bg-white px-10 py-8 text-stone-800" style={SANS}>
      <Header
        exam={exam}
        title={`${cls} · Result Sheet`}
        subtitle={`${summary.appeared} appeared · ${summary.completed} completed · ${summary.notCompleted} not completed${summary.average === null ? '' : ` · average ${summary.average.toFixed(1)}%`}`}
        page={idx + 1}
        pages={chunks.length}
      />
      <table className={`mt-4 w-full border-collapse ${narrow ? 'text-[11px]' : 'text-[12.5px]'}`}>
        <thead>
          <tr className="bg-emerald-800 text-white">
            <th className="w-12 px-2 py-2 text-center font-semibold">Rank</th>
            <th className="px-2 py-2 text-left font-semibold">Student</th>
            {subjects.map(s => (
              <th key={s.subject} className="px-1.5 py-2 text-center font-semibold leading-tight">
                {s.subject}<span className="block text-[9px] font-normal text-emerald-100">/{formatMarks(s.max_marks)}</span>
              </th>
            ))}
            <th className="px-2 py-2 text-center font-semibold">Total</th>
            <th className="px-2 py-2 text-center font-semibold">%</th>
            {exam.grading_enabled && <th className="px-2 py-2 text-center font-semibold">Grade</th>}
            <th className="px-2 py-2 text-center font-semibold">Attend.</th>
            <th className="w-28 px-2 py-2 text-center font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const status = overallStatus(r);
            const bySubject = new Map((r.subjects || []).map(s => [s.subject, s]));
            const top = r.position && r.position <= 3;
            return (
              <tr key={r.student.id} className={`border-b border-stone-200 ${i % 2 ? 'bg-stone-50' : 'bg-white'}`}>
                <td className="px-2 py-1.5 text-center">
                  {r.position
                    ? <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-extrabold ${top ? 'bg-amber-400 text-stone-900' : 'text-stone-700'}`}>{r.position}</span>
                    : '—'}
                </td>
                <td className="px-2 py-1.5">
                  <p className="font-bold leading-tight text-stone-900">{r.student.full_name}</p>
                  <p className="text-[9.5px] text-stone-400">{r.student.registration_no || ''}</p>
                </td>
                {subjects.map(s => {
                  const m = bySubject.get(s.subject);
                  return (
                    <td key={s.subject} className={`px-1.5 py-1.5 text-center font-semibold ${m && !m.passed ? 'text-rose-600' : 'text-stone-800'}`}>
                      {r.no_marks ? '' : markText(m)}
                    </td>
                  );
                })}
                <td className="px-2 py-1.5 text-center font-extrabold">{r.no_marks ? '' : formatMarks(r.total_obtained)}</td>
                <td className="px-2 py-1.5 text-center font-semibold">{r.no_marks ? '' : Number(r.percentage).toFixed(1)}</td>
                {exam.grading_enabled && <td className="px-2 py-1.5 text-center font-bold">{r.grade || ''}</td>}
                <td className="px-2 py-1.5 text-center text-stone-600">
                  {r.attendance?.percentage === null || r.attendance?.percentage === undefined ? '—' : `${Math.round(r.attendance.percentage)}%`}
                </td>
                <td className="px-2 py-1.5 text-center">
                  <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[status]}`}>{status}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {students.length === 0 && <p className="mt-10 text-center text-stone-400">No students in this class.</p>}
      <Footer />
    </div>
  ));
}

/** First page of the whole-madrasa PDF: one line per class. */
export function madrasaSummaryPage(exam, classResults) {
  const lines = classResults.map(cr => ({ cls: cr.class_level, ...classSummary(cr), toppers: cr.students.filter(r => r.position === 1).map(r => r.student.full_name) }));
  const all = lines.reduce((t, l) => ({ appeared: t.appeared + l.appeared, completed: t.completed + l.completed }), { appeared: 0, completed: 0 });
  return (
    <div className="flex h-full w-full flex-col bg-white px-10 py-8 text-stone-800" style={SANS}>
      <Header exam={exam} title="Madrasa Result Summary" subtitle={`${classResults.length} classes · ${all.appeared} students appeared`} />
      <div className="mt-5 grid grid-cols-3 gap-3">
        {[
          { label: 'Students appeared', value: all.appeared },
          { label: 'Completed', value: all.completed, accent: 'bg-emerald-700 text-white' },
          { label: 'Completion rate', value: all.appeared ? `${Math.round((all.completed * 100) / all.appeared)}%` : '—', accent: 'bg-amber-400 text-stone-900' },
        ].map(t => (
          <div key={t.label} className={`rounded-2xl px-5 py-4 ${t.accent || 'ring-1 ring-stone-200'}`}>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-70">{t.label}</p>
            <p className="mt-1 text-[30px] font-extrabold leading-none" style={SERIF}>{t.value}</p>
          </div>
        ))}
      </div>
      <table className="mt-5 w-full border-collapse text-[13px]">
        <thead>
          <tr className="bg-emerald-800 text-white">
            {['Class', 'Appeared', 'Completed', 'Not completed', 'Completion', 'Class average', 'First rank'].map(h => (
              <th key={h} className={`px-3 py-2 font-semibold ${h === 'Class' || h === 'First rank' ? 'text-left' : 'text-center'}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={l.cls} className={`border-b border-stone-200 ${i % 2 ? 'bg-stone-50' : ''}`}>
              <td className="px-3 py-2 font-bold text-stone-900">{l.cls}</td>
              <td className="px-3 py-2 text-center">{l.appeared}</td>
              <td className="px-3 py-2 text-center font-semibold text-emerald-700">{l.completed}</td>
              <td className="px-3 py-2 text-center font-semibold text-rose-600">{l.notCompleted}</td>
              <td className="px-3 py-2 text-center">{l.appeared ? `${Math.round((l.completed * 100) / l.appeared)}%` : '—'}</td>
              <td className="px-3 py-2 text-center">{l.average === null ? '—' : `${l.average.toFixed(1)}%`}</td>
              <td className="px-3 py-2">{l.toppers.join(', ') || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-[11px] text-stone-500">Each class follows on its own pages, students arranged by rank.</p>
      <Footer />
    </div>
  );
}
