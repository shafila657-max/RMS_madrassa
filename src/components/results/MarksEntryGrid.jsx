import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Save, RefreshCw, Lock, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatMarks, markKey } from '@/utils/results';

// Turn what the admin typed into a cell into a mark. "A" or "AB" means absent.
const parseCell = (raw, max) => {
  const text = String(raw ?? '').trim();
  if (text === '') return { kind: 'empty' };
  if (/^ab?$/i.test(text)) return { kind: 'absent' };
  const n = Number(text);
  if (Number.isNaN(n) || n < 0) return { kind: 'invalid', reason: 'Enter a number, or AB for absent' };
  if (n > Number(max)) return { kind: 'invalid', reason: `Maximum is ${formatMarks(max)}` };
  return { kind: 'mark', value: n };
};

const toCellText = (row) => {
  if (!row) return '';
  if (row.is_absent) return 'AB';
  return row.marks_obtained === null || row.marks_obtained === undefined ? '' : formatMarks(row.marks_obtained);
};

/**
 * Spreadsheet-style marks sheet for one class: students as rows, subjects as columns.
 * Enter / arrow keys move between rows, Tab moves across subjects.
 */
const MarksEntryGrid = ({ classLevel, subjects, roster, marks, locked, onSaved, onDirtyChange }) => {
  const [cells, setCells] = useState({});
  const [saving, setSaving] = useState(false);

  const original = useMemo(() => {
    const o = {};
    roster.forEach(st => subjects.forEach(sub => {
      o[markKey(sub.id, st.id)] = toCellText(marks.get(markKey(sub.id, st.id)));
    }));
    return o;
  }, [roster, subjects, marks]);

  useEffect(() => { setCells(original); }, [original]);

  const dirtyKeys = useMemo(
    () => Object.keys(cells).filter(k => (cells[k] ?? '').trim().toUpperCase() !== (original[k] ?? '').toUpperCase()),
    [cells, original]
  );

  useEffect(() => { onDirtyChange?.(dirtyKeys.length > 0); }, [dirtyKeys.length, onDirtyChange]);

  const subjectMax = useMemo(() => Object.fromEntries(subjects.map(s => [s.id, s.max_marks])), [subjects]);

  const invalidCount = useMemo(
    () => Object.entries(cells).filter(([k, v]) => parseCell(v, subjectMax[k.split(':')[0]]).kind === 'invalid').length,
    [cells, subjectMax]
  );

  const focusCell = (r, c) => {
    const el = document.querySelector(`[data-mark-cell="${r}-${c}"]`);
    if (el) { el.focus(); el.select(); }
  };

  const handleKeyDown = (e, r, c) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); focusCell(r + 1, c); }
    if (e.key === 'ArrowUp') { e.preventDefault(); focusCell(r - 1, c); }
  };

  const handleSave = async () => {
    if (invalidCount > 0) { toast.error(`Fix ${invalidCount} highlighted cell${invalidCount > 1 ? 's' : ''} first`); return; }
    if (dirtyKeys.length === 0) { toast('Nothing to save'); return; }
    setSaving(true);
    try {
      const upserts = [];
      const deletes = [];
      dirtyKeys.forEach(k => {
        const [subjectId, studentId] = k.split(':');
        const parsed = parseCell(cells[k], subjectMax[subjectId]);
        const existing = marks.get(k);
        if (parsed.kind === 'empty') {
          if (existing) deletes.push(existing.id);
        } else {
          upserts.push({
            exam_subject_id: subjectId,
            student_id: studentId,
            is_absent: parsed.kind === 'absent',
            marks_obtained: parsed.kind === 'mark' ? parsed.value : null,
          });
        }
      });

      if (upserts.length) {
        const { error } = await supabase.from('exam_marks').upsert(upserts, { onConflict: 'exam_subject_id,student_id' });
        if (error) throw error;
      }
      if (deletes.length) {
        const { error } = await supabase.from('exam_marks').delete().in('id', deletes);
        if (error) throw error;
      }
      toast.success(`Saved ${dirtyKeys.length} mark${dirtyKeys.length > 1 ? 's' : ''} for ${classLevel}`);
      await onSaved?.();
    } catch (err) {
      toast.error('Could not save marks: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  if (subjects.length === 0) {
    return <p className="rounded-2xl bg-white p-8 text-center text-sm text-stone-400">No subjects for {classLevel}. Edit the exam to add some.</p>;
  }
  if (roster.length === 0) {
    return <p className="rounded-2xl bg-white p-8 text-center text-sm text-stone-400">No active students in {classLevel}.</p>;
  }

  return (
    <div className="space-y-3">
      {locked ? (
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Lock className="h-4 w-4 flex-shrink-0" /> This exam is published, so marks are locked. Unpublish it to make corrections.
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-xl bg-sky-50 px-4 py-3 text-xs text-sky-800">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>Type marks and press <b>Enter</b> to go down, <b>Tab</b> to go across. Type <b>AB</b> for absent. Leave empty if not yet marked.</span>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-stone-50 text-xs text-stone-500">
              <th className="sticky left-0 z-10 min-w-[10rem] bg-stone-50 px-3 py-2.5 text-left font-semibold">Student</th>
              {subjects.map(s => (
                <th key={s.id} className="min-w-[5.5rem] px-2 py-2.5 text-center font-semibold">
                  <span className="block truncate text-stone-800">{s.subject_name}</span>
                  <span className="block text-[10px] font-medium text-stone-400">Max {formatMarks(s.max_marks)} · Pass {formatMarks(s.pass_marks)}</span>
                </th>
              ))}
              <th className="min-w-[4.5rem] px-3 py-2.5 text-center font-semibold">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {roster.map((st, r) => {
              let total = 0;
              return (
                <tr key={st.id} className="hover:bg-stone-50/60">
                  <td className="sticky left-0 z-10 bg-white px-3 py-1.5">
                    <p className="max-w-[11rem] truncate font-semibold text-stone-900">{st.full_name}</p>
                    <p className="text-[10px] text-stone-400">{st.registration_no || '—'}{st.class_level !== classLevel ? ` · now ${st.class_level}` : ''}</p>
                  </td>
                  {subjects.map((sub, c) => {
                    const k = markKey(sub.id, st.id);
                    const value = cells[k] ?? '';
                    const parsed = parseCell(value, sub.max_marks);
                    if (parsed.kind === 'mark') total += parsed.value;
                    const isDirty = (value.trim().toUpperCase()) !== (original[k] ?? '').toUpperCase();
                    const below = parsed.kind === 'mark' && parsed.value < Number(sub.pass_marks);
                    return (
                      <td key={sub.id} className="px-1.5 py-1.5 text-center">
                        <input
                          data-mark-cell={`${r}-${c}`}
                          value={value}
                          disabled={locked}
                          inputMode="decimal"
                          autoComplete="off"
                          title={parsed.kind === 'invalid' ? parsed.reason : undefined}
                          onChange={e => setCells(prev => ({ ...prev, [k]: e.target.value }))}
                          onKeyDown={e => handleKeyDown(e, r, c)}
                          onFocus={e => e.target.select()}
                          className={`h-9 w-full min-w-[4rem] rounded-lg border text-center text-sm font-bold focus:outline-none focus:ring-2 disabled:bg-stone-50 disabled:text-stone-500 ${
                            parsed.kind === 'invalid'
                              ? 'border-red-400 bg-red-50 text-red-700 focus:ring-red-400'
                              : parsed.kind === 'absent'
                              ? 'border-sky-200 bg-sky-50 text-sky-700 focus:ring-emerald-500'
                              : below
                              ? 'border-amber-200 bg-amber-50 text-amber-800 focus:ring-emerald-500'
                              : isDirty
                              ? 'border-emerald-300 bg-emerald-50/60 focus:ring-emerald-500'
                              : 'border-stone-200 focus:ring-emerald-500'
                          }`}
                        />
                      </td>
                    );
                  })}
                  <td className="px-3 py-1.5 text-center font-extrabold text-stone-700">{formatMarks(total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!locked && (
        <div className="sticky bottom-20 z-20 flex flex-col gap-2 rounded-2xl border border-stone-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:bottom-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-stone-500">
            {dirtyKeys.length > 0 ? <span className="font-semibold text-emerald-700">{dirtyKeys.length} unsaved change{dirtyKeys.length > 1 ? 's' : ''}</span> : 'All changes saved'}
            {invalidCount > 0 && <span className="ml-2 font-semibold text-red-600">· {invalidCount} to fix</span>}
            <span className="ml-2 hidden text-stone-400 sm:inline">· Amber = below pass mark</span>
          </p>
          <div className="flex gap-2">
            {dirtyKeys.length > 0 && (
              <button type="button" onClick={() => setCells(original)} className="flex-1 rounded-xl bg-stone-100 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-200 sm:flex-none">
                Undo
              </button>
            )}
            <button type="button" onClick={handleSave} disabled={saving || dirtyKeys.length === 0} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 sm:flex-none">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save {classLevel} marks
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarksEntryGrid;
