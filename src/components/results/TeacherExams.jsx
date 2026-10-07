import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, ChevronRight, ClipboardList, FileSpreadsheet, FileText, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CLASS_LEVELS, fetchAllMarks, markKey, studentsForExamClass } from '@/utils/results';
import MarksEntryGrid from './MarksEntryGrid';
import MarkChangesList from './MarkChangesList';
import ExamReports from './ExamReports';

const byClassOrder = (a, b) => {
  const ia = CLASS_LEVELS.indexOf(a);
  const ib = CLASS_LEVELS.indexOf(b);
  return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b);
};

const StatusChip = ({ live }) => (
  live
    ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">● Published</span>
    : <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-bold text-stone-600">Draft</span>
);

// ─── One class of one exam: marks, then progress cards & downloads ──────────

const TeacherExamClass = ({ exam, classLevel, classes, live, students, onPickClass, onBack, onChanged }) => {
  const [subjects, setSubjects] = useState([]);
  const [markRows, setMarkRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('marks');
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data: subs, error } = await supabase
        .from('exam_subjects').select('*').eq('exam_id', exam.id).eq('class_level', classLevel).order('sort_order');
      if (error) throw error;
      setSubjects(subs || []);
      setMarkRows(await fetchAllMarks((subs || []).map(s => s.id)));
    } catch (err) {
      toast.error('Could not load marks: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  }, [exam.id, classLevel]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  const marks = useMemo(() => new Map(markRows.map(m => [markKey(m.exam_subject_id, m.student_id), m])), [markRows]);
  // Teachers mark the students in the class now; anyone who has moved on is the admin's.
  const roster = useMemo(() => studentsForExamClass(students, classLevel), [students, classLevel]);

  const stats = useMemo(() => {
    let filled = 0;
    let passedAll = 0;
    let sumPct = 0;
    let withMarks = 0;
    const maxTotal = subjects.reduce((n, s) => n + Number(s.max_marks), 0);
    roster.forEach(st => {
      let got = 0;
      let any = false;
      let allPass = subjects.length > 0;
      subjects.forEach(s => {
        const m = marks.get(markKey(s.id, st.id));
        if (m) { filled += 1; any = true; got += Number(m.marks_obtained || 0); }
        if (!m || m.is_absent || Number(m.marks_obtained) < Number(s.pass_marks)) allPass = false;
      });
      if (allPass) passedAll += 1;
      if (any && maxTotal > 0) { withMarks += 1; sumPct += (got * 100) / maxTotal; }
    });
    const cells = roster.length * subjects.length;
    return {
      pct: cells ? Math.round((filled / cells) * 100) : 0,
      missing: cells - filled,
      passedAll,
      average: withMarks ? Math.round(sumPct / withMarks) : null,
    };
  }, [roster, subjects, marks]);

  const guard = (fn) => {
    if (dirty && !window.confirm('You have unsaved marks. Leave without saving?')) return;
    setDirty(false);
    fn();
  };

  return (
    <div className="space-y-5">
      <div>
        <button type="button" onClick={() => guard(onBack)} className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-stone-500 hover:text-stone-800">
          <ArrowLeft className="h-3.5 w-3.5" /> All exams
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-bold text-stone-900">{exam.name}</h2>
          <StatusChip live={live} />
        </div>
        <p className="text-xs text-stone-500">
          {[exam.academic_year, exam.exam_date && new Date(exam.exam_date).toLocaleDateString('en-IN')].filter(Boolean).join(' · ')}
        </p>
      </div>

      {classes.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {classes.map(c => (
            <button
              key={c.cls}
              type="button"
              onClick={() => c.cls !== classLevel && guard(() => onPickClass(c.cls))}
              className={`flex-shrink-0 rounded-xl border px-3.5 py-2 text-sm font-bold ${c.cls === classLevel ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-stone-200 bg-white text-stone-700 hover:border-emerald-300'}`}
            >
              {c.cls}
            </button>
          ))}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Students', value: roster.length },
          { label: 'Marks entered', value: `${stats.pct}%`, warn: stats.pct < 100 },
          { label: 'Passed every subject', value: `${stats.passedAll}/${roster.length}` },
          { label: 'Class average', value: stats.average === null ? '—' : `${stats.average}%` },
        ].map(card => (
          <div key={card.label} className="rounded-2xl border border-stone-100 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">{card.label}</p>
            <p className={`mt-1 text-2xl font-extrabold ${card.warn ? 'text-amber-600' : 'text-stone-900'}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-stone-100 p-1.5">
        {[
          { id: 'marks', label: 'Marks', icon: ClipboardList },
          { id: 'reports', label: 'Progress cards & downloads', short: 'Reports', icon: FileText },
        ].map(({ id, label, short, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => guard(() => setView(id))}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold transition-all ${view === id ? 'bg-white text-emerald-700 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}
          >
            <Icon className="h-4 w-4" />
            {short ? <><span className="sm:hidden">{short}</span><span className="hidden sm:inline">{label}</span></> : label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center"><RefreshCw className="mx-auto h-7 w-7 animate-spin text-emerald-500" /></div>
      ) : view === 'marks' ? (
        <>
          <MarksEntryGrid
            key={classLevel}
            classLevel={classLevel}
            subjects={subjects}
            roster={roster}
            marks={marks}
            live={live}
            onSaved={async () => { await load(); onChanged?.(); }}
            onDirtyChange={setDirty}
          />
          {live && <MarkChangesList examId={exam.id} classLevel={classLevel} refreshKey={markRows} />}
        </>
      ) : (
        <ExamReports exam={exam} classes={[classLevel]} canEditRemarks />
      )}
    </div>
  );
};

// ─── Exams list ─────────────────────────────────────────────────────────────

/** Teacher "Exams" tab: exams that include the teacher's classes. */
const TeacherExams = ({ students = [] }) => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null); // { examId, cls }

  const fetchExams = useCallback(async () => {
    const { data, error } = await supabase
      .from('exams')
      .select('id, name, academic_year, exam_date, grading_enabled, show_rank, created_at, exam_subjects(id, class_level), exam_class_publications(class_level)')
      .order('created_at', { ascending: false });
    if (error) {
      toast.error(/exam_class_publications|permission|relationship/i.test(error.message)
        ? 'Exams are not set up for teachers yet. Ask the admin to run supabase_teacher_exams.sql.'
        : 'Could not load exams: ' + error.message);
    }
    setExams((data || []).map(ex => {
      const live = new Set((ex.exam_class_publications || []).map(p => p.class_level));
      const classes = [...new Set((ex.exam_subjects || []).map(s => s.class_level))]
        .sort(byClassOrder)
        .map(cls => ({ cls, live: live.has(cls), subjects: ex.exam_subjects.filter(s => s.class_level === cls).length }));
      return { ...ex, classes };
    }).filter(ex => ex.classes.length > 0));
    setLoading(false);
  }, []);

  useEffect(() => { fetchExams(); }, [fetchExams]);

  const openExam = open && exams.find(e => e.id === open.examId);
  if (openExam) {
    const cls = openExam.classes.find(c => c.cls === open.cls) || openExam.classes[0];
    return (
      <TeacherExamClass
        key={`${openExam.id}-${cls.cls}`}
        exam={openExam}
        classLevel={cls.cls}
        classes={openExam.classes}
        live={cls.live}
        students={students}
        onPickClass={c => setOpen({ examId: openExam.id, cls: c })}
        onBack={() => setOpen(null)}
        onChanged={fetchExams}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-stone-900">Exams</h2>
        <p className="text-sm text-stone-500">Enter and correct marks for your classes, and download result sheets and progress cards.</p>
      </div>

      {loading ? (
        <div className="py-16 text-center"><RefreshCw className="mx-auto h-7 w-7 animate-spin text-emerald-500" /></div>
      ) : exams.length === 0 ? (
        <div className="rounded-2xl border border-stone-100 bg-white p-12 text-center">
          <FileSpreadsheet className="mx-auto mb-3 h-14 w-14 text-stone-200" />
          <p className="font-semibold text-stone-700">No exams for your classes yet</p>
          <p className="mt-1 text-sm text-stone-400">When the admin creates an exam that includes your class, it appears here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {exams.map(ex => (
            <div key={ex.id} className="overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm">
              <div className="border-b border-stone-100 px-4 py-3">
                <p className="font-bold text-stone-900">{ex.name}</p>
                <p className="text-xs text-stone-500">
                  {[ex.academic_year, ex.exam_date && new Date(ex.exam_date).toLocaleDateString('en-IN')].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="divide-y divide-stone-100">
                {ex.classes.map(c => (
                  <button
                    key={c.cls}
                    type="button"
                    onClick={() => setOpen({ examId: ex.id, cls: c.cls })}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-stone-50"
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-semibold text-stone-800">{c.cls}</span>
                      <StatusChip live={c.live} />
                    </span>
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                      {c.live ? 'View & correct marks' : 'Enter marks'} <ChevronRight className="h-4 w-4" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherExams;
