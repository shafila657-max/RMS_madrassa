import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  ArrowLeft, Edit3, RefreshCw, Send, EyeOff, CheckCircle2, AlertCircle, ExternalLink, Share2, Eye, ClipboardList,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import MarksEntryGrid from './MarksEntryGrid';
import ResultCard from './ResultCard';
import ResultsModal from './ResultsModal';
import {
  CLASS_LEVELS, RESULTS_PATH, fetchAdminPreviewResult, markKey, shareResultsLink, studentsForExamClass,
} from '@/utils/results';

// PostgREST returns at most 1000 rows per request, so page through larger mark sheets.
async function fetchAllMarks(subjectIds) {
  if (subjectIds.length === 0) return [];
  const pageSize = 1000;
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('exam_marks')
      .select('id, exam_subject_id, student_id, marks_obtained, is_absent')
      .in('exam_subject_id', subjectIds)
      .order('id')
      .range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

const StatusBadge = ({ status }) => (
  status === 'published'
    ? <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800">● Published</span>
    : <span className="rounded-full bg-stone-200 px-2.5 py-1 text-[11px] font-bold text-stone-600">Draft</span>
);

const ExamWorkspace = ({ exam, students, onBack, onEdit, onChanged }) => {
  const [subjects, setSubjects] = useState([]);
  const [markRows, setMarkRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState('marks');
  const [activeClass, setActiveClass] = useState(null);
  const [gridDirty, setGridDirty] = useState(false);
  const [confirm, setConfirm] = useState(null); // 'publish' | 'unpublish'
  const [working, setWorking] = useState(false);
  const [preview, setPreview] = useState({ studentId: '', result: null, loading: false });

  const locked = exam.status === 'published';

  const load = useCallback(async () => {
    try {
      const { data: subs, error } = await supabase
        .from('exam_subjects')
        .select('*')
        .eq('exam_id', exam.id)
        .order('sort_order');
      if (error) throw error;
      const rows = await fetchAllMarks((subs || []).map(s => s.id));
      setSubjects(subs || []);
      setMarkRows(rows);
    } catch (err) {
      toast.error('Could not load exam: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  }, [exam.id]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  const classes = useMemo(
    () => CLASS_LEVELS.filter(c => subjects.some(s => s.class_level === c))
      .concat([...new Set(subjects.map(s => s.class_level))].filter(c => !CLASS_LEVELS.includes(c))),
    [subjects]
  );

  useEffect(() => {
    if (!activeClass || !classes.includes(activeClass)) setActiveClass(classes[0] || null);
  }, [classes, activeClass]);

  const marks = useMemo(() => new Map(markRows.map(m => [markKey(m.exam_subject_id, m.student_id), m])), [markRows]);

  // Per-class roster and completion numbers for the review step.
  const classStats = useMemo(() => classes.map(cls => {
    const subs = subjects.filter(s => s.class_level === cls);
    const subIds = new Set(subs.map(s => s.id));
    const marked = new Set(markRows.filter(m => subIds.has(m.exam_subject_id)).map(m => m.student_id));
    const roster = studentsForExamClass(students, cls, marked);
    const incomplete = [];
    let passedAll = 0;
    roster.forEach(st => {
      const missing = subs.filter(s => !marks.has(markKey(s.id, st.id))).map(s => s.subject_name);
      if (missing.length) incomplete.push({ student: st, missing });
      const allPass = subs.every(s => {
        const m = marks.get(markKey(s.id, st.id));
        return m && !m.is_absent && Number(m.marks_obtained) >= Number(s.pass_marks);
      });
      if (allPass) passedAll += 1;
    });
    const totalCells = roster.length * subs.length;
    const filledCells = roster.reduce((n, st) => n + subs.filter(s => marks.has(markKey(s.id, st.id))).length, 0);
    return { cls, subs, roster, incomplete, passedAll, totalCells, filledCells };
  }), [classes, subjects, markRows, marks, students]);

  const active = classStats.find(c => c.cls === activeClass);
  const totals = classStats.reduce((t, c) => ({
    students: t.students + c.roster.length,
    incomplete: t.incomplete + c.incomplete.length,
    cells: t.cells + c.totalCells,
    filled: t.filled + c.filledCells,
  }), { students: 0, incomplete: 0, cells: 0, filled: 0 });

  const guardDirty = (fn) => {
    if (gridDirty && !window.confirm('You have unsaved marks. Leave without saving?')) return;
    setGridDirty(false);
    fn();
  };

  const runStatusChange = async () => {
    setWorking(true);
    try {
      const fn = confirm === 'publish' ? 'publish_exam' : 'unpublish_exam';
      const { error } = await supabase.rpc(fn, { p_exam_id: exam.id });
      if (error) throw error;
      toast.success(confirm === 'publish' ? '🎉 Results published on the website!' : 'Results taken off the website. Marks are editable again.');
      setConfirm(null);
      await onChanged?.();
    } catch (err) {
      toast.error(err.message || String(err));
    } finally {
      setWorking(false);
    }
  };

  const loadPreview = async (studentId) => {
    setPreview({ studentId, result: null, loading: !!studentId });
    if (!studentId) return;
    try {
      const result = await fetchAdminPreviewResult(exam.id, studentId);
      setPreview({ studentId, result, loading: false });
      if (!result) toast('No marks entered for this student yet');
    } catch (err) {
      toast.error(err.message || String(err));
      setPreview({ studentId, result: null, loading: false });
    }
  };

  const handleShare = async () => {
    try {
      const outcome = await shareResultsLink(exam.name);
      if (outcome === 'copied') toast.success('Results link copied');
    } catch {
      toast.error('Could not copy the link');
    }
  };

  if (loading) {
    return <div className="py-20 text-center"><RefreshCw className="mx-auto h-8 w-8 animate-spin text-emerald-500" /></div>;
  }

  const pct = totals.cells ? Math.round((totals.filled / totals.cells) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <button type="button" onClick={() => guardDirty(onBack)} className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-stone-500 hover:text-stone-800">
            <ArrowLeft className="h-3.5 w-3.5" /> All exams
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-xl font-bold text-stone-900">{exam.name}</h2>
            <StatusBadge status={exam.status} />
          </div>
          <p className="mt-0.5 text-xs text-stone-500">
            {[exam.academic_year, exam.exam_date && new Date(exam.exam_date).toLocaleDateString('en-IN'), `${classes.length} classes`, `${totals.students} students`].filter(Boolean).join(' · ')}
          </p>
        </div>
        {!locked && (
          <button type="button" onClick={() => guardDirty(() => onEdit({ ...exam, subjects }))} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50">
            <Edit3 className="h-4 w-4" /> Edit exam & subjects
          </button>
        )}
      </div>

      {/* Steps */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-stone-100 p-1.5">
        {[
          { id: 'marks', label: '2. Enter Marks', icon: ClipboardList },
          { id: 'review', label: '3. Review & Publish', icon: Send },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => guardDirty(() => setStep(id))}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold transition-all ${step === id ? 'bg-white text-emerald-700 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {classes.length === 0 ? (
        <p className="rounded-2xl bg-white p-10 text-center text-sm text-stone-400">This exam has no classes yet. Use “Edit exam & subjects” to add them.</p>
      ) : step === 'marks' ? (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {classStats.map(c => (
              <button
                key={c.cls}
                type="button"
                onClick={() => c.cls !== activeClass && guardDirty(() => setActiveClass(c.cls))}
                className={`flex-shrink-0 rounded-xl border px-3.5 py-2 text-left transition-colors ${c.cls === activeClass ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-stone-200 bg-white text-stone-700 hover:border-emerald-300'}`}
              >
                <span className="block text-sm font-bold">{c.cls}</span>
                <span className={`block text-[10px] font-semibold ${c.cls === activeClass ? 'text-emerald-100' : 'text-stone-400'}`}>
                  {c.roster.length - c.incomplete.length}/{c.roster.length} complete
                </span>
              </button>
            ))}
          </div>
          {active && (
            <MarksEntryGrid
              key={active.cls}
              classLevel={active.cls}
              subjects={active.subs}
              roster={active.roster}
              marks={marks}
              locked={locked}
              onSaved={load}
              onDirtyChange={setGridDirty}
            />
          )}
        </>
      ) : (
        <div className="space-y-5">
          {/* Publish panel */}
          <div className={`rounded-2xl border p-5 ${locked ? 'border-emerald-200 bg-emerald-50' : 'border-stone-200 bg-white'}`}>
            {locked ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="flex items-center gap-2 font-bold text-emerald-800"><CheckCircle2 className="h-5 w-5" /> Live on the website</p>
                  <p className="mt-1 text-sm text-emerald-700">
                    Published {exam.published_at && new Date(exam.published_at).toLocaleString('en-IN')}. Students and parents can check results with the registration number and date of birth.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a href={RESULTS_PATH} target="_blank" rel="noreferrer" className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 sm:flex-none">
                    <ExternalLink className="h-4 w-4" /> Open page
                  </a>
                  <button type="button" onClick={handleShare} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 sm:flex-none">
                    <Share2 className="h-4 w-4" /> Share link
                  </button>
                  <button type="button" onClick={() => setConfirm('unpublish')} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100 sm:flex-none">
                    <EyeOff className="h-4 w-4" /> Unpublish
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-stone-900">Marks entered: {pct}%</p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100">
                    <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-stone-500">
                    {totals.incomplete === 0 ? 'Every student has all marks. Ready to publish.' : `${totals.incomplete} student${totals.incomplete > 1 ? 's have' : ' has'} missing marks.`}
                  </p>
                </div>
                <button type="button" onClick={() => setConfirm('publish')} disabled={totals.filled === 0} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50">
                  <Send className="h-4 w-4" /> Publish Results
                </button>
              </div>
            )}
          </div>

          {/* Class completion */}
          <div className="grid gap-3 sm:grid-cols-2">
            {classStats.map(c => {
              const cp = c.totalCells ? Math.round((c.filledCells / c.totalCells) * 100) : 0;
              return (
                <div key={c.cls} className="rounded-2xl border border-stone-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-stone-900">{c.cls}</p>
                    <span className={`text-xs font-bold ${cp === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>{cp}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100">
                    <div className={`h-full rounded-full ${cp === 100 ? 'bg-emerald-500' : 'bg-amber-400'}`} style={{ width: `${cp}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-stone-500">
                    {c.roster.length} students · {c.subs.length} subjects · {c.passedAll} passed every subject
                  </p>
                  {c.incomplete.length > 0 && (
                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer font-semibold text-amber-700">
                        <AlertCircle className="mr-1 inline h-3.5 w-3.5" />{c.incomplete.length} with missing marks
                      </summary>
                      <ul className="mt-2 space-y-1 text-stone-600">
                        {c.incomplete.map(({ student, missing }) => (
                          <li key={student.id}><b>{student.full_name}</b>: {missing.join(', ')}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              );
            })}
          </div>

          {/* Preview */}
          <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <p className="flex items-center gap-2 font-bold text-stone-900"><Eye className="h-4 w-4 text-emerald-600" /> Preview a student&apos;s result</p>
            <p className="mb-3 text-xs text-stone-500">Exactly what the student will see on the website.</p>
            <select
              value={preview.studentId}
              onChange={e => loadPreview(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Choose a student…</option>
              {classStats.map(c => (
                <optgroup key={c.cls} label={c.cls}>
                  {c.roster.map(st => <option key={st.id} value={st.id}>{st.full_name} ({st.registration_no || 'no reg. no'})</option>)}
                </optgroup>
              ))}
            </select>
            {preview.loading && <RefreshCw className="mx-auto mt-6 h-6 w-6 animate-spin text-emerald-500" />}
            {preview.result && <div className="mt-4"><ResultCard result={preview.result} showPrint={false} /></div>}
          </div>
        </div>
      )}

      <ResultsModal
        open={!!confirm}
        onClose={() => !working && setConfirm(null)}
        title={confirm === 'publish' ? 'Publish results?' : 'Unpublish results?'}
        maxWidth="max-w-md"
        footer={(
          <div className="flex gap-2">
            <button type="button" onClick={() => setConfirm(null)} disabled={working} className="flex-1 rounded-xl bg-stone-100 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-200">Cancel</button>
            <button
              type="button"
              onClick={runStatusChange}
              disabled={working}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${confirm === 'publish' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
            >
              {working && <RefreshCw className="h-4 w-4 animate-spin" />}
              {confirm === 'publish' ? 'Yes, publish' : 'Yes, unpublish'}
            </button>
          </div>
        )}
      >
        {confirm === 'publish' ? (
          <ul className="space-y-2 text-sm text-stone-600">
            <li>• <b>{totals.students}</b> students in <b>{classes.length}</b> classes can check their result on the website.</li>
            <li>• A “Results Published” section appears on the home page, and this becomes the result shown at <b>/results</b>.</li>
            <li>• Marks are added to the <b>leaderboard</b> and parents see them on their dashboard.</li>
            <li>• Marks are locked until you unpublish.</li>
            {totals.incomplete > 0 && (
              <li className="rounded-xl bg-amber-50 p-3 text-amber-800">
                ⚠️ {totals.incomplete} student{totals.incomplete > 1 ? 's have' : ' has'} missing marks. Those subjects will show as “Pending”.
              </li>
            )}
          </ul>
        ) : (
          <p className="text-sm text-stone-600">
            The results disappear from the website and parent dashboard, and the leaderboard points from this exam are removed.
            You can correct marks and publish again.
          </p>
        )}
      </ResultsModal>
    </div>
  );
};

export default ExamWorkspace;
