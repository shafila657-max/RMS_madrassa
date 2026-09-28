import { supabase } from '@/lib/supabase';

/**
 * Calculates leaderboard ranks and points breakdown for a set of students
 */
export function computeStudentLeaderboard({
  students = [],
  attendance = [],
  scores = [],
  tasks = [],
  disciplineRecords = [],
  profiles = [],
  resetTimestamp = null,
}) {
  const resetDate = resetTimestamp ? new Date(resetTimestamp) : null;

  // Filter records by resetDate if applicable
  const validAttendance = resetDate
    ? attendance.filter(a => new Date(a.date || a.created_at) >= resetDate)
    : attendance;

  const validScores = resetDate
    ? scores.filter(s => new Date(s.date || s.created_at) >= resetDate)
    : scores;

  const validTasks = resetDate
    ? tasks.filter(t => new Date(t.due_date || t.created_at) >= resetDate)
    : tasks;

  const validDiscipline = resetDate
    ? disciplineRecords.filter(d => new Date(d.week_date || d.created_at) >= resetDate)
    : disciplineRecords;

  const parentMap = {};
  profiles.forEach(p => {
    parentMap[p.id] = p.full_name;
  });

  const rankedList = students.map(student => {
    // 1. Attendance Points: 1 point per 'present' day
    const presentDays = validAttendance.filter(
      a => a.student_id === student.id && a.status === 'present'
    ).length;
    const attendancePoints = presentDays * 1;

    // 2. Exam Points: 1 point for every 10 marks gained
    const studentScores = validScores.filter(s => s.student_id === student.id);
    const totalExamMarks = studentScores.reduce(
      (sum, s) => sum + Number(s.marks_obtained || 0),
      0
    );
    const examPoints = Math.floor(totalExamMarks / 10);

    // 3. Homework Task Points: 5 points per completed task
    const completedTasks = validTasks.filter(
      t => t.student_id === student.id && t.status === 'completed'
    ).length;
    const taskPoints = completedTasks * 5;

    // 4. Discipline Points: Sum of weekly discipline scores (out of 10 each)
    const studentDiscipline = validDiscipline.filter(
      d => d.student_id === student.id
    );
    const disciplinePoints = studentDiscipline.reduce(
      (sum, d) => sum + Number(d.score || 0),
      0
    );

    const totalPoints = attendancePoints + examPoints + taskPoints + disciplinePoints;
    const parentName = student.user_id ? parentMap[student.user_id] || 'Parent' : 'Parent';

    return {
      ...student,
      parent_name: parentName,
      attendancePoints,
      examPoints,
      taskPoints,
      disciplinePoints,
      totalPoints,
      presentDays,
      completedTasks,
      totalExamMarks,
    };
  });

  // Sort descending by totalPoints, then by student full_name
  rankedList.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    return (a.full_name || '').localeCompare(b.full_name || '');
  });

  // Assign ranks (1, 2, 3...)
  return rankedList.map((item, idx) => ({
    ...item,
    rank: idx + 1,
  }));
}

/**
 * Leaderboard for the landing page and parent dashboard.
 * Uses the get_leaderboard() database function, which returns only names, classes,
 * photos and points (the raw student records are not readable by parents or visitors).
 * Its points formula mirrors computeStudentLeaderboard above; keep the two in sync.
 */
export async function fetchFullLeaderboardData() {
  const { data, error } = await supabase.rpc('get_leaderboard');
  if (!error && data) {
    const standings = (data.standings || []).map(row => {
      const presentDays = Number(row.present_days || 0);
      const totalExamMarks = Number(row.total_exam_marks || 0);
      const completedTasks = Number(row.completed_tasks || 0);
      const disciplinePoints = Number(row.discipline_points || 0);
      return {
        id: row.id,
        full_name: row.full_name,
        class_level: row.class_level,
        photo_url: row.photo_url,
        status: row.status,
        presentDays,
        totalExamMarks,
        completedTasks,
        attendancePoints: presentDays,
        examPoints: Math.floor(totalExamMarks / 10),
        taskPoints: completedTasks * 5,
        disciplinePoints,
        totalPoints: Number(row.total_points || 0),
        rank: Number(row.rank),
      };
    });
    return { standings, resetTimestamp: data.reset_at || null };
  }

  // Fallback until supabase_security_fixes.sql has been run.
  if (error) console.warn('get_leaderboard unavailable, using direct reads:', error.message);
  return fetchLeaderboardFromTables();
}

async function fetchLeaderboardFromTables() {
  const results = await Promise.allSettled([
    supabase.from('students').select('*'),
    supabase.from('attendance').select('*'),
    supabase.from('scores').select('*'),
    supabase.from('student_tasks').select('*'),
    supabase.from('discipline_records').select('*'),
    supabase.from('profiles').select('id, full_name').eq('role', 'parent'),
    supabase.from('leaderboard_settings').select('*').maybeSingle(),
  ]);

  const readData = (result, label) => {
    if (result.status === 'fulfilled') {
      const { data, error } = result.value || {};
      if (error) {
        console.error(`Leaderboard ${label} query error:`, error);
        return [];
      }
      return data || [];
    }

    console.error(`Leaderboard ${label} query failed:`, result.reason);
    return [];
  };

  const students = readData(results[0], 'students');
  const attendance = readData(results[1], 'attendance');
  const scores = readData(results[2], 'scores');
  const tasks = readData(results[3], 'tasks');
  const disciplineRecords = readData(results[4], 'discipline');
  const profiles = readData(results[5], 'profiles');

  let resetTimestamp = null;
  if (results[6].status === 'fulfilled') {
    const { data: settings, error } = results[6].value || {};
    if (error) {
      console.error('Leaderboard settings query error:', error);
    } else {
      resetTimestamp = settings?.last_reset_at || null;
    }
  } else {
    console.error('Leaderboard settings query failed:', results[6].reason);
  }

  const standings = computeStudentLeaderboard({
    students,
    attendance,
    scores,
    tasks,
    disciplineRecords,
    profiles,
    resetTimestamp,
  });

  return { standings, resetTimestamp };
}
