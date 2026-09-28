import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, RefreshCw, Check, Wand2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import ResultsModal from './ResultsModal';
import { CLASS_LEVELS, DEFAULT_GRADE_SCALE } from '@/utils/results';

const inputCls = 'w-full rounded-xl border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500';
const numCls = 'w-full rounded-lg border border-stone-200 px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-500';

const emptyForm = {
  name: '',
  academic_year: String(new Date().getFullYear()),
  exam_date: '',
  notes: '',
  grading_enabled: false,
  grade_scale: DEFAULT_GRADE_SCALE,
  show_rank: true,
};

let rowKey = 0;
const newRow = (fields = {}) => ({ key: `row-${rowKey++}`, subject_name: '', max_marks: '100', pass_marks: '40', ...fields });

/**
 * Create, edit or duplicate an exam and its subjects per class.
 * `source` is an existing exam (with `subjects`) when editing or duplicating.
 */
const ExamFormModal = ({ open, onClose, source = null, mode = 'create', onSaved }) => {
  const [form, setForm] = useState(emptyForm);
  // { [class_level]: [{ key, id?, subject_name, max_marks, pass_marks }] }
  const [classSubjects, setClassSubjects] = useState({});
  const [catalog, setCatalog] = useState([]);
  const [bulk, setBulk] = useState({ max: '100', pass: '40' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase.from('subjects').select('class_level, name').order('name')
      .then(({ data }) => setCatalog(data || []));

    if (source) {
      setForm({
        name: mode === 'duplicate' ? `${source.name} (copy)` : source.name,
        academic_year: source.academic_year || '',
        exam_date: mode === 'duplicate' ? '' : (source.exam_date || ''),
        notes: source.notes || '',
        grading_enabled: !!source.grading_enabled,
        grade_scale: Array.isArray(source.grade_scale) && source.grade_scale.length ? source.grade_scale : DEFAULT_GRADE_SCALE,
        show_rank: source.show_rank !== false,
      });
      const grouped = {};
      [...(source.subjects || [])]
        .sort((a, b) => a.sort_order - b.sort_order)
        .forEach(s => {
          grouped[s.class_level] = grouped[s.class_level] || [];
          grouped[s.class_level].push(newRow({
            id: mode === 'edit' ? s.id : undefined,
            subject_name: s.subject_name,
            max_marks: String(Number(s.max_marks)),
            pass_marks: String(Number(s.pass_marks)),
          }));
        });
      setClassSubjects(grouped);
    } else {
      setForm(emptyForm);
      setClassSubjects({});
    }
  }, [open, source, mode]);

  const subjectsFromCatalog = (cls) => {
    const names = catalog.filter(s => s.class_level === cls).map(s => s.name);
    return names.length ? names.map(name => newRow({ subject_name: name })) : [newRow()];
  };

  const toggleClass = (cls) => {
    setClassSubjects(prev => {
      const next = { ...prev };
      if (next[cls]) {
        const hasSaved = next[cls].some(r => r.id);
        if (hasSaved && !window.confirm(`Remove ${cls} from this exam? Marks already entered for ${cls} will be deleted.`)) {
          return prev;
        }
        delete next[cls];
      } else {
        next[cls] = subjectsFromCatalog(cls);
      }
      return next;
    });
  };

  const updateRow = (cls, key, field, value) => {
    setClassSubjects(prev => ({
      ...prev,
      [cls]: prev[cls].map(r => (r.key === key ? { ...r, [field]: value } : r)),
    }));
  };

  const removeRow = (cls, row) => {
    if (row.id && !window.confirm(`Remove "${row.subject_name}"? Marks already entered for it will be deleted when you save.`)) return;
    setClassSubjects(prev => ({ ...prev, [cls]: prev[cls].filter(r => r.key !== row.key) }));
  };

  const addRow = (cls) => {
    setClassSubjects(prev => ({ ...prev, [cls]: [...prev[cls], newRow()] }));
  };

  const applyBulk = () => {
    setClassSubjects(prev => Object.fromEntries(
      Object.entries(prev).map(([cls, rows]) => [cls, rows.map(r => ({ ...r, max_marks: bulk.max, pass_marks: bulk.pass }))])
    ));
    toast.success('Applied to every subject');
  };

  const updateGrade = (idx, field, value) => {
    setForm(f => ({
      ...f,
      grade_scale: f.grade_scale.map((g, i) => (i === idx ? { ...g, [field]: field === 'min' ? value : value.toUpperCase() } : g)),
    }));
  };

  const validate = () => {
    if (!form.name.trim()) return 'Exam name is required';
    const classes = Object.keys(classSubjects);
    if (classes.length === 0) return 'Select at least one class';
    for (const cls of classes) {
      const rows = classSubjects[cls];
      if (rows.length === 0) return `${cls} needs at least one subject`;
      const seen = new Set();
      for (const r of rows) {
        const name = r.subject_name.trim();
        const max = Number(r.max_marks);
        const pass = Number(r.pass_marks);
        if (!name) return `${cls}: every subject needs a name`;
        if (seen.has(name.toLowerCase())) return `${cls}: "${name}" is listed twice`;
        seen.add(name.toLowerCase());
        if (!(max > 0)) return `${cls} · ${name}: maximum marks must be more than 0`;
        if (r.pass_marks === '' || pass < 0 || Number.isNaN(pass)) return `${cls} · ${name}: enter pass marks`;
        if (pass > max) return `${cls} · ${name}: pass marks cannot be more than maximum`;
      }
    }
    if (form.grading_enabled) {
      if (form.grade_scale.some(g => !String(g.grade).trim() || g.min === '' || Number.isNaN(Number(g.min)))) {
        return 'Every grade needs a label and a minimum %';
      }
    }
    return null;
  };

  const handleSave = async () => {
    const problem = validate();
    if (problem) { toast.error(problem); return; }
    setSaving(true);
    try {
      const examPayload = {
        name: form.name.trim(),
        academic_year: form.academic_year.trim() || null,
        exam_date: form.exam_date || null,
        notes: form.notes.trim() || null,
        grading_enabled: form.grading_enabled,
        grade_scale: [...form.grade_scale]
          .map(g => ({ min: Number(g.min), grade: String(g.grade).trim() }))
          .sort((a, b) => b.min - a.min),
        show_rank: form.show_rank,
      };

      let examId = source?.id;
      if (mode === 'edit') {
        const { error } = await supabase.from('exams').update(examPayload).eq('id', examId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('exams').insert([examPayload]).select('id').single();
        if (error) throw error;
        examId = data.id;
      }

      const rows = Object.entries(classSubjects).flatMap(([cls, list]) => list.map((r, idx) => ({
        id: r.id,
        exam_id: examId,
        class_level: cls,
        subject_name: r.subject_name.trim(),
        max_marks: Number(r.max_marks),
        pass_marks: Number(r.pass_marks),
        sort_order: idx,
      })));

      if (mode === 'edit') {
        const keepIds = rows.filter(r => r.id).map(r => r.id);
        const removed = (source.subjects || []).filter(s => !keepIds.includes(s.id)).map(s => s.id);
        if (removed.length) {
          const { error } = await supabase.from('exam_subjects').delete().in('id', removed);
          if (error) throw error;
        }
        for (const r of rows.filter(x => x.id)) {
          const { id, ...rest } = r;
          const { error } = await supabase.from('exam_subjects').update(rest).eq('id', id);
          if (error) throw error;
        }
      }

      const inserts = rows.filter(r => !r.id).map(({ id, ...rest }) => rest);
      if (inserts.length) {
        const { error } = await supabase.from('exam_subjects').insert(inserts);
        if (error) throw error;
      }

      toast.success(mode === 'edit' ? 'Exam updated' : 'Exam created. Now enter the marks.');
      onSaved?.(examId);
    } catch (err) {
      toast.error('Could not save exam: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const selectedClasses = CLASS_LEVELS.filter(c => classSubjects[c]);
  const titles = { create: 'Create Exam', edit: 'Edit Exam', duplicate: 'Duplicate Exam' };

  return (
    <ResultsModal
      open={open}
      onClose={onClose}
      title={titles[mode]}
      subtitle="Step 1: exam details, classes and subjects with their maximum and pass marks."
      footer={(
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-stone-100 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-200">Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {mode === 'edit' ? 'Save Changes' : 'Create Exam'}
          </button>
        </div>
      )}
    >
      <div className="space-y-6">
        {/* Details */}
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <label className="mb-1 block text-xs font-medium text-stone-700">Exam Name *</label>
            <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Half-Yearly Examination" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-700">Academic Year</label>
            <input className={inputCls} value={form.academic_year} onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))} placeholder="2026" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-700">Exam Date</label>
            <input type="date" className={inputCls} value={form.exam_date} onChange={e => setForm(f => ({ ...f, exam_date: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-700">Notes (admin only)</label>
            <input className={inputCls} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" />
          </div>
        </section>

        {/* Result options */}
        <section className="space-y-3 rounded-2xl border border-stone-200 p-4">
          <p className="text-sm font-bold text-stone-900">What the result shows</p>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>Show class rank <span className="block text-xs text-stone-400">e.g. "2nd of 30 students"</span></span>
            <input type="checkbox" className="h-5 w-5 accent-emerald-600" checked={form.show_rank} onChange={e => setForm(f => ({ ...f, show_rank: e.target.checked }))} />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>Show grades <span className="block text-xs text-stone-400">Based on the overall percentage</span></span>
            <input type="checkbox" className="h-5 w-5 accent-emerald-600" checked={form.grading_enabled} onChange={e => setForm(f => ({ ...f, grading_enabled: e.target.checked }))} />
          </label>
          {form.grading_enabled && (
            <div className="rounded-xl bg-stone-50 p-3">
              <div className="mb-2 grid grid-cols-[1fr_1fr_auto] gap-2 text-[11px] font-semibold uppercase text-stone-500">
                <span>Grade</span><span>From %</span><span className="w-7" />
              </div>
              <div className="space-y-2">
                {form.grade_scale.map((g, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
                    <input className={numCls} value={g.grade} maxLength={4} onChange={e => updateGrade(idx, 'grade', e.target.value)} />
                    <input className={numCls} type="number" min="0" max="100" value={g.min} onChange={e => updateGrade(idx, 'min', e.target.value)} />
                    <button type="button" onClick={() => setForm(f => ({ ...f, grade_scale: f.grade_scale.filter((_, i) => i !== idx) }))} className="p-1 text-stone-400 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-3 text-xs font-semibold">
                <button type="button" onClick={() => setForm(f => ({ ...f, grade_scale: [...f.grade_scale, { min: 0, grade: '' }] }))} className="text-emerald-700 hover:underline">+ Add grade</button>
                <button type="button" onClick={() => setForm(f => ({ ...f, grade_scale: DEFAULT_GRADE_SCALE }))} className="text-stone-500 hover:underline">Reset to default</button>
              </div>
            </div>
          )}
        </section>

        {/* Classes */}
        <section>
          <p className="mb-2 text-sm font-bold text-stone-900">Classes in this exam *</p>
          <div className="flex flex-wrap gap-2">
            {CLASS_LEVELS.map(cls => {
              const on = !!classSubjects[cls];
              return (
                <button
                  key={cls}
                  type="button"
                  onClick={() => toggleClass(cls)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${on ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-stone-200 bg-white text-stone-600 hover:border-emerald-300'}`}
                >
                  {on && '✓ '}{cls}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-stone-400">Subjects are filled in from each class's subject list. You can change them here.</p>
        </section>

        {selectedClasses.length > 0 && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/50 p-3">
              <div className="w-24">
                <label className="mb-1 block text-[11px] font-semibold text-stone-600">Max marks</label>
                <input className={numCls} type="number" min="1" value={bulk.max} onChange={e => setBulk(b => ({ ...b, max: e.target.value }))} />
              </div>
              <div className="w-24">
                <label className="mb-1 block text-[11px] font-semibold text-stone-600">Pass marks</label>
                <input className={numCls} type="number" min="0" value={bulk.pass} onChange={e => setBulk(b => ({ ...b, pass: e.target.value }))} />
              </div>
              <button type="button" onClick={applyBulk} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700">
                <Wand2 className="h-3.5 w-3.5" /> Apply to all subjects
              </button>
            </div>

            {selectedClasses.map(cls => (
              <div key={cls} className="overflow-hidden rounded-2xl border border-stone-200">
                <div className="flex items-center justify-between bg-stone-50 px-4 py-2.5">
                  <p className="text-sm font-bold text-stone-900">{cls}</p>
                  <span className="text-xs text-stone-500">{classSubjects[cls].length} subjects</span>
                </div>
                <div className="space-y-2 p-3">
                  <div className="grid grid-cols-[1fr_4.5rem_4.5rem_2rem] gap-2 px-1 text-[11px] font-semibold uppercase text-stone-400">
                    <span>Subject</span><span className="text-center">Max</span><span className="text-center">Pass</span><span />
                  </div>
                  {classSubjects[cls].map(r => (
                    <div key={r.key} className="grid grid-cols-[1fr_4.5rem_4.5rem_2rem] items-center gap-2">
                      <input className="w-full rounded-lg border border-stone-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={r.subject_name} placeholder="Subject name" onChange={e => updateRow(cls, r.key, 'subject_name', e.target.value)} />
                      <input className={numCls} type="number" min="1" value={r.max_marks} onChange={e => updateRow(cls, r.key, 'max_marks', e.target.value)} />
                      <input className={numCls} type="number" min="0" value={r.pass_marks} onChange={e => updateRow(cls, r.key, 'pass_marks', e.target.value)} />
                      <button type="button" onClick={() => removeRow(cls, r)} className="p-1 text-stone-400 hover:text-red-500" aria-label="Remove subject">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => addRow(cls)} className="inline-flex items-center gap-1 px-1 pt-1 text-xs font-bold text-emerald-700 hover:underline">
                    <Plus className="h-3.5 w-3.5" /> Add subject
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </ResultsModal>
  );
};

export default ExamFormModal;
