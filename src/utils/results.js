import { supabase } from '@/lib/supabase';

export const CLASS_LEVELS = [
  'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6',
  'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Plus One', 'Plus Two', 'Hifz', 'Alim',
];

// Highest band first. Admins can edit this per exam.
export const DEFAULT_GRADE_SCALE = [
  { min: 90, grade: 'A+' },
  { min: 80, grade: 'A' },
  { min: 70, grade: 'B+' },
  { min: 60, grade: 'B' },
  { min: 50, grade: 'C' },
  { min: 40, grade: 'D' },
  { min: 0, grade: 'E' },
];

export const RESULTS_PATH = '/results';

// Drop trailing ".00" so 45.00 shows as 45 and 45.5 stays 45.5.
export const formatMarks = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, '');
};

export const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

export const getResultsShareUrl = () =>
  typeof window !== 'undefined' ? `${window.location.origin}${RESULTS_PATH}` : RESULTS_PATH;

export async function shareResultsLink(examName) {
  const url = getResultsShareUrl();
  const title = examName ? `${examName} Results · RMS Madrasa` : 'Exam Results · RMS Madrasa';
  if (navigator.share) {
    try {
      await navigator.share({ title, text: 'Check your exam result with your registration number and date of birth.', url });
      return 'shared';
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled';
    }
  }
  await navigator.clipboard.writeText(url);
  return 'copied';
}

export async function fetchLatestPublishedExam() {
  const { data, error } = await supabase.rpc('get_latest_published_exam');
  if (error) throw error;
  return data || null;
}

export async function fetchPublicResult(registrationNo, dateOfBirth) {
  const { data, error } = await supabase.rpc('get_public_result', {
    p_registration_no: registrationNo,
    p_date_of_birth: dateOfBirth,
  });
  if (error) throw error;
  return data || null;
}

export async function fetchMyChildrenResults() {
  const { data, error } = await supabase.rpc('get_my_children_results');
  if (error) throw error;
  return data || [];
}

export async function fetchAdminPreviewResult(examId, studentId) {
  const { data, error } = await supabase.rpc('admin_preview_result', {
    p_exam_id: examId,
    p_student_id: studentId,
  });
  if (error) throw error;
  return data || null;
}

// Friendly text for the database's unique registration number index.
export const describeSaveError = (err) => {
  const msg = err?.message || String(err);
  if (msg.includes('students_registration_no_unique')) {
    return 'This registration number is already used by another student.';
  }
  if (msg.includes('students_student_user_id_unique')) {
    return 'That student login is already linked to another student.';
  }
  return msg;
};

/**
 * Students who belong in a class's marks sheet: active students currently in the class,
 * plus anyone who already has marks for it (e.g. moved up after the exam).
 */
export const studentsForExamClass = (students, classLevel, markedStudentIds = new Set()) =>
  students
    .filter(s => markedStudentIds.has(s.id) || (s.class_level === classLevel && (s.status || 'active') === 'active'))
    .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));

export const markKey = (subjectId, studentId) => `${subjectId}:${studentId}`;

// PostgREST returns at most 1000 rows per request, so page through larger mark sheets.
export async function fetchAllMarks(subjectIds) {
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
