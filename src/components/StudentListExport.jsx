import React, { useState } from 'react';
import { toast } from 'sonner';
import { FileSpreadsheet, FileText, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CLASS_LEVELS } from '@/utils/results';
import { MADRASA, deliverFile, pagesToPdfBlob, sortClasses } from '@/utils/reports';
import ResultsModal from '@/components/results/ResultsModal';

const SERIF = { fontFamily: "'Playfair Display', Georgia, serif" };
const SANS = { fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif" };
const ROWS_PER_PAGE = 18;
const STATUS_LABEL = { active: 'Active', completed: 'Completed', dropped: 'Dropped out' };

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

// Students with their parent account and date of birth, ready for the list.
async function loadStudents({ classLevel, includeInactive }) {
  let query = supabase.from('students').select('*, parent:profiles!user_id(*)').order('full_name');
  if (classLevel) query = query.eq('class_level', classLevel);
  const [{ data: students, error }, { data: details }] = await Promise.all([
    query,
    supabase.from('student_private_details').select('student_id, date_of_birth'),
  ]);
  if (error) throw error;
  const dob = new Map((details || []).map(d => [d.student_id, d.date_of_birth]));
  return (students || [])
    .filter(s => includeInactive || (s.status || 'active') === 'active')
    .map(s => ({
      id: s.id,
      name: s.full_name || '',
      regNo: s.registration_no || '',
      cls: s.class_level || 'No class',
      dob: dob.get(s.id) || '',
      admitted: s.admission_date || '',
      status: STATUS_LABEL[s.status || 'active'] || s.status,
      parentName: s.parent?.full_name || '',
      parentPhone: s.parent?.phone || '',
      parentEmail: s.parent?.email || '',
    }));
}

const groupByClass = (rows) => {
  const groups = new Map();
  rows.forEach(r => { if (!groups.has(r.cls)) groups.set(r.cls, []); groups.get(r.cls).push(r); });
  return sortClasses([...groups.keys()]).map(cls => ({ cls, rows: groups.get(cls) }));
};

// ─── PDF pages (A4 landscape) ───────────────────────────────────────────────

const Page = ({ title, subtitle, page, pages, children }) => (
  <div className="flex h-full w-full flex-col bg-white px-10 py-8 text-stone-800" style={SANS}>
    <div className="flex items-center gap-4 border-b-2 border-emerald-800 pb-3">
      <img src={MADRASA.logo} alt="" className="h-14 w-14 rounded-2xl" />
      <div className="min-w-0 flex-1">
        <p className="text-[24px] font-black leading-none text-emerald-900" style={SERIF}>{MADRASA.name}</p>
        <p className="mt-1 text-[12px] font-semibold text-stone-500">Student register · {fmtDate(new Date().toISOString())}</p>
      </div>
      <div className="text-right">
        <p className="text-[20px] font-extrabold text-stone-900" style={SERIF}>{title}</p>
        {subtitle && <p className="text-[11px] font-semibold text-stone-500">{subtitle}</p>}
        {pages > 1 && <p className="text-[10px] text-stone-400">Page {page} of {pages}</p>}
      </div>
    </div>
    {children}
    <div className="mt-auto flex justify-between pt-3 text-[10px] text-stone-400">
      <span>Confidential: contains parent contact details.</span>
      <span>{MADRASA.name} · {MADRASA.phone}</span>
    </div>
  </div>
);

function classPages({ cls, rows }) {
  const chunks = [];
  for (let i = 0; i < Math.max(rows.length, 1); i += ROWS_PER_PAGE) chunks.push(rows.slice(i, i + ROWS_PER_PAGE));
  return chunks.map((chunk, idx) => (
    <Page key={`${cls}-${idx}`} title={cls} subtitle={`${rows.length} student${rows.length === 1 ? '' : 's'}`} page={idx + 1} pages={chunks.length}>
      <table className="mt-4 w-full border-collapse text-[11.5px]">
        <thead>
          <tr className="bg-emerald-800 text-left text-white">
            {['#', 'Reg. No.', 'Student', 'Date of birth', 'Admitted', 'Status', 'Parent', 'Parent phone', 'Parent email'].map(h => (
              <th key={h} className={`px-2 py-2 font-semibold ${h === '#' ? 'w-8 text-center' : ''}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {chunk.map((r, i) => (
            <tr key={r.id} className={`border-b border-stone-200 ${i % 2 ? 'bg-stone-50' : 'bg-white'}`}>
              <td className="px-2 py-1.5 text-center text-stone-500">{idx * ROWS_PER_PAGE + i + 1}</td>
              <td className="whitespace-nowrap px-2 py-1.5 font-semibold text-stone-700">{r.regNo || '—'}</td>
              <td className="px-2 py-1.5 font-bold text-stone-900">{r.name}</td>
              <td className="whitespace-nowrap px-2 py-1.5">{fmtDate(r.dob) || '—'}</td>
              <td className="whitespace-nowrap px-2 py-1.5">{fmtDate(r.admitted) || '—'}</td>
              <td className="px-2 py-1.5">{r.status}</td>
              <td className="px-2 py-1.5 font-semibold">{r.parentName || <span className="font-normal text-stone-400">Not linked</span>}</td>
              <td className="whitespace-nowrap px-2 py-1.5">{r.parentPhone || '—'}</td>
              <td className="px-2 py-1.5 text-[10.5px]">{r.parentEmail || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="mt-10 text-center text-stone-400">No students.</p>}
    </Page>
  ));
}

function summaryPage(groups, total) {
  return (
    <Page title="All Students" subtitle={`${total} students · ${groups.length} classes`}>
      <table className="mt-5 w-full border-collapse text-[13px]">
        <thead>
          <tr className="bg-emerald-800 text-white">
            {['Class', 'Students', 'Parent linked', 'Date of birth missing'].map(h => (
              <th key={h} className={`px-3 py-2 font-semibold ${h === 'Class' ? 'text-left' : 'text-center'}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((g, i) => (
            <tr key={g.cls} className={`border-b border-stone-200 ${i % 2 ? 'bg-stone-50' : ''}`}>
              <td className="px-3 py-2 font-bold">{g.cls}</td>
              <td className="px-3 py-2 text-center">{g.rows.length}</td>
              <td className="px-3 py-2 text-center">{g.rows.filter(r => r.parentName).length}</td>
              <td className="px-3 py-2 text-center">{g.rows.filter(r => !r.dob).length}</td>
            </tr>
          ))}
          <tr className="bg-amber-50 font-extrabold">
            <td className="px-3 py-2">Total</td>
            <td className="px-3 py-2 text-center">{total}</td>
            <td className="px-3 py-2 text-center">{groups.reduce((n, g) => n + g.rows.filter(r => r.parentName).length, 0)}</td>
            <td className="px-3 py-2 text-center">{groups.reduce((n, g) => n + g.rows.filter(r => !r.dob).length, 0)}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-4 text-[11px] text-stone-500">Each class follows on its own pages, students in alphabetical order.</p>
    </Page>
  );
}

// ─── Excel ──────────────────────────────────────────────────────────────────

const HEADER = { fontWeight: 'bold', backgroundColor: '#065F46', color: '#FFFFFF', alignVertical: 'center', wrap: true };

function sheet(rows, { withClass }) {
  const head = ['#', 'Reg. No.', 'Student', ...(withClass ? ['Class'] : []), 'Date of birth', 'Admission date', 'Status', 'Parent name', 'Parent phone', 'Parent email'];
  const asDate = (iso) => (iso ? { value: new Date(`${iso}T00:00:00`), type: Date, format: 'dd-mm-yyyy' } : { value: '' });
  return {
    rows: [
      head.map(h => ({ value: h, ...HEADER })),
      ...rows.map((r, i) => [
        { value: i + 1, type: Number },
        { value: r.regNo },
        { value: r.name, fontWeight: 'bold' },
        ...(withClass ? [{ value: r.cls }] : []),
        asDate(r.dob),
        asDate(r.admitted),
        { value: r.status },
        { value: r.parentName },
        { value: r.parentPhone },
        { value: r.parentEmail },
      ]),
    ],
    columns: [{ width: 5 }, { width: 16 }, { width: 28 }, ...(withClass ? [{ width: 12 }] : []), { width: 13 }, { width: 14 }, { width: 12 }, { width: 24 }, { width: 16 }, { width: 30 }],
  };
}

async function excelBlob(groups, allMadrasa) {
  const { default: writeXlsxFile } = await import('write-excel-file');
  const sheets = [];
  const names = [];
  if (allMadrasa) {
    const all = groups.flatMap(g => g.rows);
    sheets.push(sheet(all, { withClass: true }));
    names.push('All students');
  }
  groups.forEach(g => {
    sheets.push(sheet(g.rows, { withClass: false }));
    names.push(g.cls.replace(/[\\/?*[\]:]/g, '').slice(0, 31) || 'Class');
  });
  return writeXlsxFile(sheets.map(s => s.rows), {
    sheets: names,
    columns: sheets.map(s => s.columns),
    stickyRowsCount: 1,
    fontFamily: 'Calibri',
    fontSize: 11,
  });
}

// ─── Modal ──────────────────────────────────────────────────────────────────

/** Admin: download the student register (whole madrasa or one class) as PDF or Excel. */
const StudentListExport = ({ open, onClose }) => {
  const [scope, setScope] = useState('all');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [busy, setBusy] = useState(null);

  const run = async (format) => {
    setBusy({ format, done: 0, total: 0 });
    try {
      const classLevel = scope === 'all' ? null : scope;
      const rows = await loadStudents({ classLevel, includeInactive });
      if (rows.length === 0) throw new Error('No students match these options');
      const groups = groupByClass(rows);
      const label = classLevel || 'All students';
      const stamp = new Date().toISOString().slice(0, 10);
      if (format === 'pdf') {
        const pages = [...(classLevel ? [] : [summaryPage(groups, rows.length)]), ...groups.flatMap(classPages)];
        const blob = await pagesToPdfBlob(pages, { orientation: 'landscape', onProgress: (done, total) => setBusy({ format, done, total }) });
        await deliverFile(blob, `${MADRASA.name} - ${label} - ${stamp}.pdf`);
      } else {
        const blob = await excelBlob(groups, !classLevel);
        await deliverFile(blob, `${MADRASA.name} - ${label} - ${stamp}.xlsx`);
      }
      toast.success(`Downloaded ${rows.length} student${rows.length === 1 ? '' : 's'}`);
    } catch (err) {
      toast.error('Download failed: ' + (err.message || err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <ResultsModal
      open={open}
      onClose={() => !busy && onClose()}
      title="Download student list"
      subtitle="Registration no., date of birth, admission, status and parent details."
      maxWidth="max-w-md"
      footer={(
        <div className="flex gap-2">
          <button type="button" onClick={() => run('pdf')} disabled={!!busy} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
            {busy?.format === 'pdf' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} PDF
          </button>
          <button type="button" onClick={() => run('excel')} disabled={!!busy} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50">
            {busy?.format === 'excel' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />} Excel
          </button>
        </div>
      )}
    >
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-stone-700">Which students</span>
          <select value={scope} onChange={e => setScope(e.target.value)} className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="all">Whole madrasa (every class)</option>
            {CLASS_LEVELS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { v: false, label: 'Active only', text: 'Currently studying' },
            { v: true, label: 'Everyone', text: 'Also completed & dropped out' },
          ].map(o => (
            <button
              key={o.label}
              type="button"
              onClick={() => setIncludeInactive(o.v)}
              className={`rounded-xl border px-3 py-2 text-left transition ${includeInactive === o.v ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/30' : 'border-stone-200 hover:border-stone-300'}`}
            >
              <p className="text-sm font-semibold text-stone-900">{o.label}</p>
              <p className="text-[11px] text-stone-500">{o.text}</p>
            </button>
          ))}
        </div>
        <p className="rounded-xl bg-stone-50 p-3 text-xs text-stone-500">
          {scope === 'all'
            ? 'PDF: a summary page, then each class on its own pages. Excel: an "All students" sheet plus one sheet per class.'
            : `One list for ${scope}, students in alphabetical order.`}
        </p>
        {busy?.total > 1 && (
          <p className="flex items-center gap-2 text-sm text-sky-800"><RefreshCw className="h-4 w-4 animate-spin" /> Preparing page {busy.done} of {busy.total}…</p>
        )}
        <p className="text-[11px] text-amber-700">The file contains parents' phone numbers and emails. Share it only with staff.</p>
      </div>
    </ResultsModal>
  );
};

export default StudentListExport;
