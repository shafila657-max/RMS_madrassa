import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { CLASS_LEVELS, formatMarks } from '@/utils/results';

// Printed on result sheets and progress cards.
export const MADRASA = {
  name: 'RMS Madrasa',
  tagline: 'Islamic Education & Character Building',
  phone: '+91 81291 27439',
  logo: '/rms-madrasa-logo.png',
};

// A4 at 96 dpi.
export const A4 = { portrait: { width: 794, height: 1123 }, landscape: { width: 1123, height: 794 } };

export const sortClasses = (classes) => [...classes].sort((a, b) => {
  const ia = CLASS_LEVELS.indexOf(a);
  const ib = CLASS_LEVELS.indexOf(b);
  return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b);
});

/** One class's ranked results, attendance and remarks (get_class_exam_results). */
export async function fetchClassResults(examId, classLevel) {
  const { data, error } = await supabase.rpc('get_class_exam_results', { p_exam_id: examId, p_class_level: classLevel });
  if (error) {
    if (error.code === 'PGRST202') throw new Error('Run supabase_teacher_exams.sql in Supabase first.');
    throw error;
  }
  return data;
}

/** "Completed", "Not completed" or "No marks" for a row of get_class_exam_results. */
export const overallStatus = (row) => {
  if (row.no_marks) return 'No marks';
  return row.all_passed ? 'Completed' : 'Not completed';
};

export const subjectStatus = (subject) => {
  if (!subject.entered) return 'Pending';
  if (subject.is_absent) return 'Absent';
  return subject.passed ? 'Completed' : 'Not completed';
};

export const markText = (subject) => {
  if (!subject || !subject.entered) return '—';
  if (subject.is_absent) return 'AB';
  return formatMarks(subject.marks_obtained);
};

export const classSummary = (classResult) => {
  const rows = classResult.students.filter(r => !r.no_marks);
  const completed = rows.filter(r => r.all_passed).length;
  const average = rows.length ? rows.reduce((n, r) => n + Number(r.percentage || 0), 0) / rows.length : null;
  return { appeared: rows.length, completed, notCompleted: rows.length - completed, average };
};

export const safeFileName = (text) => text.replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim();

// ─── Saving and sharing files ───────────────────────────────────────────────

const canShareFiles = (file) => {
  try {
    return typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
};

/** Phones: open the share sheet (WhatsApp etc.). Otherwise, or if sharing is cancelled, download. */
export async function deliverFile(blob, fileName, { share = false } = {}) {
  const file = new File([blob], fileName, { type: blob.type });
  if (share && canShareFiles(file)) {
    try {
      await navigator.share({ files: [file], title: fileName });
      return 'shared';
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return 'downloaded';
}

export const shareSupported = () =>
  typeof navigator !== 'undefined' && !!navigator.canShare && canShareFiles(new File([''], 'x.pdf', { type: 'application/pdf' }));

// ─── PDF: render A4 pages off screen and capture them ───────────────────────

// The capture frame only gets inline <style> tags; give it the app's stylesheets and fonts
// (production serves them as <link>s) and wait until they have loaded.
async function copyStylesheets(cloneDoc) {
  const links = [...document.querySelectorAll('link[rel="stylesheet"]')].map(link => {
    const copy = cloneDoc.createElement('link');
    copy.rel = 'stylesheet';
    copy.href = link.href;
    if (link.crossOrigin !== null) copy.crossOrigin = link.crossOrigin;
    const loaded = new Promise(resolve => { copy.onload = resolve; copy.onerror = resolve; });
    cloneDoc.head.appendChild(copy);
    return loaded;
  });
  document.querySelectorAll('style').forEach(style => {
    cloneDoc.head.appendChild(cloneDoc.importNode(style, true));
  });
  await Promise.race([Promise.all(links), new Promise(resolve => setTimeout(resolve, 8000))]);
  if (cloneDoc.fonts?.ready) await Promise.race([cloneDoc.fonts.ready, new Promise(resolve => setTimeout(resolve, 4000))]);
}

const waitForImages = (root) => Promise.all([...root.querySelectorAll('img')].map(img => (
  img.complete ? Promise.resolve() : new Promise(resolve => { img.onload = resolve; img.onerror = resolve; })
)));

/**
 * pages: React elements, each exactly one A4 page in the given orientation.
 * onProgress(done, total) is called as pages are captured.
 */
export async function pagesToPdfBlob(pages, { orientation = 'portrait', onProgress } = {}) {
  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([import('jspdf'), import('html2canvas-pro')]);
  const size = A4[orientation];

  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  Object.assign(host.style, { position: 'fixed', left: '-10000px', top: '0', width: `${size.width}px`, zIndex: '-1' });
  document.body.appendChild(host);
  const root = createRoot(host);

  const pdf = new jsPDF({ orientation, unit: 'px', format: [size.width, size.height], hotfixes: ['px_scaling'], compress: true });
  try {
    if (document.fonts?.ready) await document.fonts.ready;
    for (let i = 0; i < pages.length; i += 1) {
      flushSync(() => root.render(createElement('div', { style: { width: size.width, height: size.height } }, pages[i])));
      await waitForImages(host);
      const canvas = await html2canvas(host.firstChild, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        width: size.width,
        height: size.height,
        windowWidth: size.width,
        onclone: copyStylesheets,
      });
      if (i > 0) pdf.addPage([size.width, size.height], orientation);
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, size.width, size.height, undefined, 'FAST');
      onProgress?.(i + 1, pages.length);
    }
  } finally {
    root.unmount();
    host.remove();
  }
  return pdf.output('blob');
}

// ─── Excel ──────────────────────────────────────────────────────────────────

const HEADER = { fontWeight: 'bold', backgroundColor: '#065F46', color: '#FFFFFF', align: 'center', alignVertical: 'center', wrap: true };
const TITLE = { fontWeight: 'bold', fontSize: 14 };
const STATUS_COLORS = { Completed: '#D1FAE5', 'Not completed': '#FEE2E2', 'No marks': '#F5F5F4' };

function classSheet(classResult) {
  const { exam, class_level: cls, subjects, students } = classResult;
  const summary = classSummary(classResult);
  const rows = [
    [{ value: `${MADRASA.name} · ${exam.name}${exam.academic_year ? ` (${exam.academic_year})` : ''}`, ...TITLE, span: 6 }],
    [{ value: `${cls} · ${summary.appeared} appeared · ${summary.completed} completed · ${summary.notCompleted} not completed${summary.average === null ? '' : ` · class average ${summary.average.toFixed(1)}%`}`, span: 6 }],
    [],
    [
      { value: 'Rank', ...HEADER },
      { value: 'Reg. No.', ...HEADER },
      { value: 'Student', ...HEADER },
      ...subjects.map(s => ({ value: `${s.subject} (${formatMarks(s.max_marks)})`, ...HEADER })),
      { value: 'Total', ...HEADER },
      { value: '%', ...HEADER },
      ...(exam.grading_enabled ? [{ value: 'Grade', ...HEADER }] : []),
      { value: 'Attendance %', ...HEADER },
      { value: 'Status', ...HEADER },
      { value: 'Subjects not completed', ...HEADER },
    ],
  ];
  students.forEach(r => {
    const status = overallStatus(r);
    const bySubject = new Map((r.subjects || []).map(s => [s.subject, s]));
    const notCompleted = (r.subjects || []).filter(s => !s.passed).map(s => s.subject).join(', ');
    rows.push([
      r.position ? { value: Number(r.position), type: Number, align: 'center' } : { value: '—', align: 'center' },
      { value: r.student.registration_no || '' },
      { value: r.student.full_name, fontWeight: 'bold' },
      ...subjects.map(s => {
        const m = bySubject.get(s.subject);
        if (m && m.entered && !m.is_absent && m.marks_obtained !== null) {
          return { value: Number(m.marks_obtained), type: Number, align: 'center', ...(m.passed ? {} : { color: '#B91C1C' }) };
        }
        return { value: markText(m), align: 'center', color: '#B91C1C' };
      }),
      r.no_marks ? { value: '' } : { value: Number(r.total_obtained), type: Number, align: 'center', fontWeight: 'bold' },
      r.no_marks ? { value: '' } : { value: Number(r.percentage), type: Number, format: '0.00', align: 'center' },
      ...(exam.grading_enabled ? [{ value: r.grade || '', align: 'center' }] : []),
      r.attendance?.percentage === null || r.attendance?.percentage === undefined
        ? { value: '' }
        : { value: Number(r.attendance.percentage), type: Number, format: '0.0', align: 'center' },
      { value: status, backgroundColor: STATUS_COLORS[status], fontWeight: 'bold' },
      { value: r.no_marks ? '' : notCompleted, wrap: true },
    ]);
  });
  const columns = [
    { width: 7 }, { width: 16 }, { width: 26 },
    ...subjects.map(() => ({ width: 13 })),
    { width: 9 }, { width: 8 },
    ...(exam.grading_enabled ? [{ width: 8 }] : []),
    { width: 13 }, { width: 15 }, { width: 30 },
  ];
  return { rows, columns };
}

/** One sheet per class, in class order, students by rank. */
export async function classResultsToExcelBlob(classResults) {
  const { default: writeXlsxFile } = await import('write-excel-file');
  const sheets = classResults.map(classSheet);
  const usedNames = new Set();
  const names = classResults.map(cr => {
    let name = cr.class_level.replace(/[\\/?*[\]:]/g, '').slice(0, 31) || 'Class';
    while (usedNames.has(name)) name = `${name.slice(0, 28)} ${usedNames.size}`;
    usedNames.add(name);
    return name;
  });
  return writeXlsxFile(sheets.map(s => s.rows), {
    sheets: names,
    columns: sheets.map(s => s.columns),
    stickyRowsCount: 4,
    fontFamily: 'Calibri',
    fontSize: 11,
  });
}
