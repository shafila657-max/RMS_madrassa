import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Plus, Copy, Trash2, Edit3, ChevronRight, RefreshCw, Hash, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import ExamFormModal from './ExamFormModal';
import ExamWorkspace from './ExamWorkspace';
import RegistrationSettingsModal from './RegistrationSettingsModal';
import { PublishBadge } from './ExamWorkspace';

/**
 * Admin "Results" tab: list of exams → workspace for entering marks, reviewing and publishing.
 * `students` comes from the dashboard's student list.
 */
const ResultsManager = ({ students = [] }) => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openExamId, setOpenExamId] = useState(null);
  const [form, setForm] = useState({ open: false, mode: 'create', source: null });
  const [showRegSettings, setShowRegSettings] = useState(false);
  // Bumped after the exam is edited so the open workspace reloads its subjects.
  const [editVersion, setEditVersion] = useState(0);

  const fetchExams = useCallback(async () => {
    const { data, error } = await supabase
      .from('exams')
      .select('*, exam_subjects(id, class_level), exam_class_publications(class_level)')
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('Could not load exams. Has the results SQL been run in Supabase? ' + error.message);
    }
    setExams(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchExams(); }, [fetchExams]);

  const loadFullExam = async (exam) => {
    const { data, error } = await supabase.from('exam_subjects').select('*').eq('exam_id', exam.id).order('sort_order');
    if (error) throw error;
    return { ...exam, subjects: data || [] };
  };

  const openForm = async (mode, exam = null) => {
    try {
      const source = exam && !exam.subjects ? await loadFullExam(exam) : exam;
      setForm({ open: true, mode, source });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (exam) => {
    if (!window.confirm(`Delete "${exam.name}" and all its marks? This cannot be undone.`)) return;
    const { error } = await supabase.from('exams').delete().eq('id', exam.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Exam deleted');
    fetchExams();
  };

  const openExam = exams.find(e => e.id === openExamId);

  if (openExam) {
    return (
      <>
        <ExamWorkspace
          key={`${openExam.id}-${editVersion}`}
          exam={openExam}
          students={students}
          onBack={() => setOpenExamId(null)}
          onEdit={(full) => openForm('edit', full)}
          onChanged={fetchExams}
        />
        <ExamFormModal
          open={form.open}
          mode={form.mode}
          source={form.source}
          onClose={() => setForm(f => ({ ...f, open: false }))}
          onSaved={() => { setForm(f => ({ ...f, open: false })); setEditVersion(v => v + 1); fetchExams(); }}
        />
      </>
    );
  }

  const missingRegNo = students.filter(s => !s.registration_no).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Exam Results</h2>
          <p className="text-xs text-stone-400">Create an exam → enter marks → review → publish to the website.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setShowRegSettings(true)} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-stone-100 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-200 sm:flex-none">
            <Hash className="h-4 w-4" /> Reg. No. format
          </button>
          <button type="button" onClick={() => openForm('create')} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 sm:flex-none">
            <Plus className="h-4 w-4" /> New Exam
          </button>
        </div>
      </div>

      {missingRegNo > 0 && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
          {missingRegNo} student{missingRegNo > 1 ? 's have' : ' has'} no registration number. Run <b>supabase_exam_results.sql</b> in Supabase to assign them automatically.
        </p>
      )}

      {loading ? (
        <div className="py-16 text-center"><RefreshCw className="mx-auto h-7 w-7 animate-spin text-emerald-500" /></div>
      ) : exams.length === 0 ? (
        <div className="rounded-2xl border border-stone-100 bg-white p-12 text-center">
          <FileSpreadsheet className="mx-auto mb-3 h-14 w-14 text-stone-200" />
          <p className="mb-1 font-semibold text-stone-700">No exams yet</p>
          <p className="mb-4 text-sm text-stone-400">Create your first exam to start entering marks.</p>
          <button type="button" onClick={() => openForm('create')} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
            <Plus className="h-4 w-4" /> Create Exam
          </button>
        </div>
      ) : (
        <div className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm">
          {exams.map((exam, idx) => {
            const classCount = new Set((exam.exam_subjects || []).map(s => s.class_level)).size;
            const liveCount = (exam.exam_class_publications || []).length;
            const published = liveCount > 0;
            const fullyPublished = published && liveCount >= classCount;
            return (
              <motion.div
                key={exam.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="flex flex-col gap-3 p-4 transition-colors hover:bg-stone-50/80 sm:flex-row sm:items-center"
              >
                <button type="button" onClick={() => setOpenExamId(exam.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${published ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>
                    {published ? <CheckCircle2 className="h-5 w-5" /> : <FileSpreadsheet className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-semibold text-stone-900">
                      <span className="truncate">{exam.name}</span>
                      <PublishBadge live={liveCount} total={classCount} />
                    </p>
                    <p className="text-xs text-stone-500">
                      {[exam.academic_year, `${classCount} class${classCount === 1 ? '' : 'es'}`, published && exam.published_at && `published ${new Date(exam.published_at).toLocaleDateString('en-IN')}`].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </button>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setOpenExamId(exam.id)} className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 sm:flex-none">
                    {fullyPublished ? 'View' : 'Enter marks'} <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openForm('edit', { ...exam, liveClasses: (exam.exam_class_publications || []).map(p => p.class_level) })}
                    className="rounded-xl bg-stone-100 p-2 text-stone-600 hover:bg-stone-200"
                    title={published ? 'Add a class or edit exam details' : 'Edit exam'}
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => openForm('duplicate', exam)} className="rounded-xl bg-stone-100 p-2 text-stone-600 hover:bg-stone-200" title="Duplicate (reuse subjects for the next exam)">
                    <Copy className="h-4 w-4" />
                  </button>
                  {!published && (
                    <button type="button" onClick={() => handleDelete(exam)} className="rounded-xl border border-red-100 bg-red-50 p-2 text-red-600 hover:bg-red-100" title="Delete exam">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <ExamFormModal
        open={form.open}
        mode={form.mode}
        source={form.source}
        onClose={() => setForm(f => ({ ...f, open: false }))}
        onSaved={(examId) => {
          setForm(f => ({ ...f, open: false }));
          fetchExams();
          setOpenExamId(examId);
        }}
      />
      <RegistrationSettingsModal open={showRegSettings} onClose={() => setShowRegSettings(false)} />
    </div>
  );
};

export default ResultsManager;
