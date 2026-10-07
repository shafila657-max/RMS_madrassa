import React, { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatMarks } from '@/utils/results';

const show = (marks, absent) => {
  if (absent) return 'AB';
  if (marks === null || marks === undefined) return '—';
  return formatMarks(marks);
};

/**
 * Marks corrected after a class was published: who changed what, from and to.
 * Pass classLevel to show one class only (teachers only see their own classes anyway).
 */
const MarkChangesList = ({ examId, classLevel, refreshKey }) => {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    let query = supabase
      .from('exam_mark_changes')
      .select('id, class_level, subject_name, student_name, old_marks, old_absent, new_marks, new_absent, changed_by_name, changed_at')
      .eq('exam_id', examId)
      .order('changed_at', { ascending: false })
      .limit(200);
    if (classLevel) query = query.eq('class_level', classLevel);
    query.then(({ data, error }) => setRows(error ? [] : data || []));
  }, [examId, classLevel, refreshKey]);

  if (!rows || rows.length === 0) return null;

  return (
    <details className="rounded-2xl border border-stone-200 bg-white p-4">
      <summary className="flex cursor-pointer items-center gap-2 font-bold text-stone-900">
        <History className="h-4 w-4 text-amber-600" /> Corrections after publishing ({rows.length})
      </summary>
      <ul className="mt-3 divide-y divide-stone-100 text-sm">
        {rows.map(r => (
          <li key={r.id} className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-stone-800">
              <b>{r.student_name}</b> · {r.subject_name}{!classLevel && <span className="text-stone-400"> · {r.class_level}</span>}:{' '}
              <span className="text-red-600 line-through">{show(r.old_marks, r.old_absent)}</span> → <b className="text-emerald-700">{show(r.new_marks, r.new_absent)}</b>
            </span>
            <span className="text-xs text-stone-400">
              {r.changed_by_name || 'Someone'} · {new Date(r.changed_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
};

export default MarkChangesList;
