import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Download, Eye, FileSpreadsheet, FileText, RefreshCw, School, Share2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  A4, classResultsToExcelBlob, deliverFile, fetchClassResults, overallStatus, pagesToPdfBlob, safeFileName,
  shareSupported, sortClasses,
} from '@/utils/reports';
import ResultsModal from './ResultsModal';
import ProgressCard from './reports/ProgressCard';
import { classSheetPages, madrasaSummaryPage } from './reports/ResultSheet';

const STATUS_CHIP = {
  Completed: 'bg-emerald-100 text-emerald-800',
  'Not completed': 'bg-rose-100 text-rose-700',
  'No marks': 'bg-stone-100 text-stone-500',
};

const ATTENDANCE_KEY = 'rms-progress-card-attendance';
const readAttendancePref = () => {
  try { return localStorage.getItem(ATTENDANCE_KEY) !== 'off'; } catch { return true; }
};

const Btn = ({ icon: Icon, children, onClick, disabled, tone = 'light' }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors disabled:opacity-50 ${
      tone === 'dark' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-white text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50'
    }`}
  >
    <Icon className="h-4 w-4" /> {children}
  </button>
);

// The A4 card scaled down to fit the modal.
const ScaledCard = ({ children }) => {
  const ref = useRef(null);
  const [scale, setScale] = useState(0.5);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = () => setScale(Math.min(1, el.clientWidth / A4.portrait.width));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="w-full">
      <div className="overflow-hidden rounded-xl shadow-lg ring-1 ring-stone-200" style={{ height: A4.portrait.height * scale }}>
        <div style={{ width: A4.portrait.width, height: A4.portrait.height, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

/**
 * Result sheets (PDF / Excel) and progress cards for the given classes of an exam.
 * Teachers pass their one class; admins pass every class of the exam (adds whole-madrasa downloads).
 */
const ExamReports = ({ exam, classes, canEditRemarks = false }) => {
  const ordered = sortClasses(classes);
  const [results, setResults] = useState({});
  const [activeClass, setActiveClass] = useState(ordered[0]);
  const [loadingClass, setLoadingClass] = useState(null);
  const [showAttendance, setShowAttendance] = useState(readAttendancePref);
  const [busy, setBusy] = useState(null); // { label, done, total }
  const [preview, setPreview] = useState(null); // row
  const [remarks, setRemarks] = useState({});
  const canShare = shareSupported();

  const loadClass = useCallback(async (cls, { force = false } = {}) => {
    if (!force && results[cls]) return results[cls];
    setLoadingClass(cls);
    try {
      const data = await fetchClassResults(exam.id, cls);
      setResults(prev => ({ ...prev, [cls]: data }));
      setRemarks(prev => ({
        ...prev,
        ...Object.fromEntries(data.students.map(r => [r.student.id, r.remark || ''])),
      }));
      return data;
    } finally {
      setLoadingClass(null);
    }
  }, [exam.id, results]);

  useEffect(() => {
    if (activeClass) loadClass(activeClass).catch(err => toast.error('Could not load results: ' + err.message));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClass]);

  const toggleAttendance = () => {
    setShowAttendance(v => {
      try { localStorage.setItem(ATTENDANCE_KEY, v ? 'off' : 'on'); } catch { /* private mode */ }
      return !v;
    });
  };

  const run = async (label, fn) => {
    if (busy) return;
    setBusy({ label, done: 0, total: 0 });
    try {
      await fn((done, total) => setBusy({ label, done, total }));
    } catch (err) {
      toast.error(`${label} failed: ${err.message || err}`);
    } finally {
      setBusy(null);
    }
  };

  const withRemarks = (classResult) => ({
    ...classResult,
    students: classResult.students.map(r => ({ ...r, remark: remarks[r.student.id] ?? r.remark })),
  });

  const cardPage = (classResult, row) => (
    <ProgressCard
      exam={classResult.exam}
      row={row}
      attendanceFrom={classResult.attendance_from}
      attendanceTo={classResult.attendance_to}
      showAttendance={showAttendance}
    />
  );

  const base = safeFileName(exam.name);

  const downloadClassPdf = (cls) => run('Result sheet', async (progress) => {
    const cr = await loadClass(cls);
    const blob = await pagesToPdfBlob(classSheetPages(cr), { orientation: 'landscape', onProgress: progress });
    await deliverFile(blob, `${base} - ${safeFileName(cls)} - Result sheet.pdf`);
  });

  const downloadClassExcel = (cls) => run('Excel', async () => {
    const cr = await loadClass(cls);
    const blob = await classResultsToExcelBlob([cr]);
    await deliverFile(blob, `${base} - ${safeFileName(cls)} - Results.xlsx`);
  });

  const downloadClassCards = (cls) => run('Progress cards', async (progress) => {
    const cr = withRemarks(await loadClass(cls));
    const rows = cr.students.filter(r => !r.no_marks);
    if (rows.length === 0) throw new Error(`No marks entered for ${cls} yet`);
    const blob = await pagesToPdfBlob(rows.map(r => cardPage(cr, r)), { onProgress: progress });
    await deliverFile(blob, `${base} - ${safeFileName(cls)} - Progress cards.pdf`);
  });

  const downloadCard = (row, { share = false } = {}) => run('Progress card', async () => {
    const cr = withRemarks(results[activeClass]);
    const current = cr.students.find(r => r.student.id === row.student.id) || row;
    const blob = await pagesToPdfBlob([cardPage(cr, current)]);
    const outcome = await deliverFile(blob, `${safeFileName(current.student.full_name)} - ${base} - Progress card.pdf`, { share });
    if (outcome === 'downloaded' && share) toast('Sharing is not available here, so the card was downloaded.');
  });

  const loadAll = async () => {
    const all = [];
    for (const cls of ordered) all.push(await loadClass(cls));
    return all;
  };

  const downloadAllPdf = () => run('Madrasa results', async (progress) => {
    const all = await loadAll();
    const pages = [madrasaSummaryPage(exam, all), ...all.flatMap(cr => classSheetPages(cr))];
    const blob = await pagesToPdfBlob(pages, { orientation: 'landscape', onProgress: progress });
    await deliverFile(blob, `${base} - All classes.pdf`);
  });

  const downloadAllExcel = () => run('Madrasa Excel', async () => {
    const blob = await classResultsToExcelBlob(await loadAll());
    await deliverFile(blob, `${base} - All classes.xlsx`);
  });

  const saveRemark = async (row) => {
    const value = (remarks[row.student.id] || '').trim();
    if (value === (row.remark || '')) return;
    const { error } = await supabase
      .from('exam_student_remarks')
      .upsert({ exam_id: exam.id, student_id: row.student.id, remark: value }, { onConflict: 'exam_id,student_id' });
    if (error) { toast.error('Could not save remark: ' + error.message); return; }
    setResults(prev => ({
      ...prev,
      [activeClass]: {
        ...prev[activeClass],
        students: prev[activeClass].students.map(r => (r.student.id === row.student.id ? { ...r, remark: value } : r)),
      },
    }));
    toast.success(`Remark saved for ${row.student.full_name}`);
  };

  const current = results[activeClass];

  return (
    <div className="space-y-4">
      {/* Whole madrasa (admins) */}
      {ordered.length > 1 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 font-bold text-emerald-900"><School className="h-4 w-4" /> Whole madrasa</p>
            <p className="text-xs text-emerald-700">Every class ({ordered.length}), students arranged by rank with Completed / Not completed.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Btn icon={FileText} tone="dark" onClick={downloadAllPdf} disabled={!!busy}>All classes PDF</Btn>
            <Btn icon={FileSpreadsheet} onClick={downloadAllExcel} disabled={!!busy}>All classes Excel</Btn>
          </div>
        </div>
      )}

      {ordered.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {ordered.map(cls => (
            <button
              key={cls}
              type="button"
              onClick={() => setActiveClass(cls)}
              className={`flex-shrink-0 rounded-xl border px-3.5 py-2 text-sm font-bold ${cls === activeClass ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-stone-200 bg-white text-stone-700 hover:border-emerald-300'}`}
            >
              {cls}
            </button>
          ))}
        </div>
      )}

      {/* Class downloads */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold text-stone-900">{activeClass}</p>
            <p className="text-xs text-stone-500">Result sheet ranked by total, and a progress card for each student.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Btn icon={FileText} onClick={() => downloadClassPdf(activeClass)} disabled={!!busy}>Result sheet PDF</Btn>
            <Btn icon={FileSpreadsheet} onClick={() => downloadClassExcel(activeClass)} disabled={!!busy}>Excel</Btn>
            <Btn icon={Download} tone="dark" onClick={() => downloadClassCards(activeClass)} disabled={!!busy}>All progress cards</Btn>
          </div>
        </div>
        <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-stone-50 px-3 py-2.5">
          <span className="text-sm text-stone-700">
            <b>Show attendance %</b> on progress cards
            {current?.attendance_from && (
              <span className="block text-[11px] text-stone-400">
                {new Date(current.attendance_from).toLocaleDateString('en-IN')} – {new Date(current.attendance_to).toLocaleDateString('en-IN')}
              </span>
            )}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={showAttendance}
            onClick={toggleAttendance}
            className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${showAttendance ? 'bg-emerald-600' : 'bg-stone-300'}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${showAttendance ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
        </label>
      </div>

      {busy && (
        <div className="flex items-center gap-3 rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-900">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Preparing {busy.label.toLowerCase()}{busy.total > 1 ? `: page ${busy.done} of ${busy.total}` : '…'}
        </div>
      )}

      {/* Students */}
      {loadingClass === activeClass && !current ? (
        <div className="py-12 text-center"><RefreshCw className="mx-auto h-7 w-7 animate-spin text-emerald-500" /></div>
      ) : current && (
        <div className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm">
          {current.students.length === 0 && <p className="p-8 text-center text-sm text-stone-400">No students in {activeClass}.</p>}
          {current.students.map(row => {
            const status = overallStatus(row);
            return (
              <div key={row.student.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${row.position && row.position <= 3 ? 'bg-amber-400 text-stone-900' : 'bg-stone-100 text-stone-600'}`}>
                    {row.position || '–'}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-stone-900">{row.student.full_name}</p>
                    <p className="flex flex-wrap items-center gap-x-2 text-xs text-stone-500">
                      {!row.no_marks && <span>{Number(row.percentage).toFixed(1)}%</span>}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_CHIP[status]}`}>{status}</span>
                    </p>
                  </div>
                </div>
                {canEditRemarks && !row.no_marks && (
                  <input
                    value={remarks[row.student.id] ?? ''}
                    onChange={e => setRemarks(prev => ({ ...prev, [row.student.id]: e.target.value }))}
                    onBlur={() => saveRemark(row)}
                    onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                    maxLength={500}
                    placeholder="Teacher's remark for the card (optional)"
                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 lg:w-80"
                  />
                )}
                {!row.no_marks && (
                  <div className="flex gap-2">
                    <Btn icon={Eye} onClick={() => setPreview(row)}>Preview</Btn>
                    <Btn icon={Download} onClick={() => downloadCard(row)} disabled={!!busy}>PDF</Btn>
                    {canShare && <Btn icon={Share2} tone="dark" onClick={() => downloadCard(row, { share: true })} disabled={!!busy}>Share</Btn>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ResultsModal
        open={!!preview && !!current}
        onClose={() => setPreview(null)}
        title={preview ? `${preview.student.full_name} · Progress card` : ''}
        maxWidth="max-w-2xl"
        footer={preview && (
          <div className="flex gap-2">
            <button type="button" onClick={() => downloadCard(preview)} disabled={!!busy} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50">
              {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download PDF
            </button>
            {canShare && (
              <button type="button" onClick={() => downloadCard(preview, { share: true })} disabled={!!busy} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-50">
                <Share2 className="h-4 w-4" /> Share
              </button>
            )}
          </div>
        )}
      >
        {preview && current && (
          <ScaledCard>
            {cardPage(withRemarks(current), withRemarks(current).students.find(r => r.student.id === preview.student.id) || preview)}
          </ScaledCard>
        )}
      </ResultsModal>
    </div>
  );
};

export default ExamReports;
