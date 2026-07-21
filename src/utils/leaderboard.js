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
 * Fetches all necessary data from Supabase and computes the leaderboard standings
 */
export async function fetchFullLeaderboardData() {
  try {
    const [
      { data: students },
      { data: attendance },
      { data: scores },
      { data: tasks },
      { data: disciplineRecords },
      { data: profiles },
      { data: settings },
    ] = await Promise.all([
      supabase.from('students').select('*'),
      supabase.from('attendance').select('*'),
      supabase.from('scores').select('*'),
      supabase.from('student_tasks').select('*'),
      supabase.from('discipline_records').select('*'),
      supabase.from('profiles').select('id, full_name').eq('role', 'parent'),
      supabase.from('leaderboard_settings').select('*').single(),
    ]);

    const resetTimestamp = settings?.last_reset_at || null;

    const standings = computeStudentLeaderboard({
      students: students || [],
      attendance: attendance || [],
      scores: scores || [],
      tasks: tasks || [],
      disciplineRecords: disciplineRecords || [],
      profiles: profiles || [],
      resetTimestamp,
    });

    return {
      standings,
      resetTimestamp,
    };
  } catch (error) {
    console.error('Error fetching leaderboard data:', error);
    return { standings: [], resetTimestamp: null };
  }
}
