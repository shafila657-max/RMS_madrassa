import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import {
  BookOpen, ArrowLeft, Calendar, Award, TrendingUp,
  DollarSign, BarChart2, CheckCircle2, Clock, AlertCircle, Star,
  Bell, Megaphone, AlertTriangle, ListTodo, Check,
  Table, BookMarked, Phone, FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getGrade = (pct) => {
  if (pct >= 90) return { label: 'A+', color: 'text-emerald-600' };
  if (pct >= 80) return { label: 'A', color: 'text-emerald-500' };
  if (pct >= 70) return { label: 'B', color: 'text-blue-500' };
  if (pct >= 60) return { label: 'C', color: 'text-amber-500' };
  return { label: 'D', color: 'text-red-500' };
};

const RingProgress = ({ value, size = 80, stroke = 7, color = '#fff' }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1.2s ease' }} />
    </svg>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const StudentDetailPage = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // New feature state
  const [timetable, setTimetable] = useState([]);
  const [subjectsList, setSubjectsList] = useState([]);
  const [teacherContacts, setTeacherContacts] = useState([]);
  const [leaveApplications, setLeaveApplications] = useState([]);
  const [leaveForm, setLeaveForm] = useState({ from_date: '', to_date: '', reason: '' });
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [classLevel, setClassLevel] = useState('');
  const [studentIdState, setStudentIdState] = useState(null);

  useEffect(() => { fetchStudentData(); }, [studentId, session?.user?.id]);

  const fetchStudentData = async () => {
    try {
      if (!session?.user) return;

      // Security: verify this student belongs to the logged-in parent
      const { data: student, error: sErr } = await supabase
        .from('students').select('*')
        .eq('id', studentId)
        .eq('user_id', session.user.id)
        .single();

      if (sErr || !student) {
        toast.error('Student not found or access denied');
        navigate('/parent');
        return;
      }

      const sid = student.id;

      const [
        { data: attendanceRows },
        { data: recentScores },
        { data: achievementsRows },
        { data: feesRows },
        { data: allAnnouncements },
        { data: taskRows },
      ] = await Promise.all([
        supabase.from('attendance').select('*').eq('student_id', sid).order('date', { ascending: false }),
        supabase.from('scores').select('*').eq('student_id', sid).order('created_at', { ascending: false }),
        supabase.from('achievements').select('*').eq('student_id', sid).order('date', { ascending: false }),
        supabase.from('fees').select('*').eq('student_id', sid).order('created_at', { ascending: false }),
        supabase.from('announcements').select('*').order('created_at', { ascending: false }),
        supabase.from('student_tasks').select('*').eq('student_id', sid).order('created_at', { ascending: false }),
      ]);

      const present = (attendanceRows || []).filter(a => a.status === 'present').length;
      const total = (attendanceRows || []).length;

      // Filter announcements for this student's class or 'All'
      const announcements = (allAnnouncements || []).filter(a =>
        a.target_class === 'All' || a.target_class === student.class_level
      );

      // Class rank
      const { data: classStudents } = await supabase
        .from('students').select('id').eq('class_level', student.class_level);
      const classIds = (classStudents || []).map(s => s.id);

      let leaderboard_position = null;
      if (classIds.length > 0) {
        const { data: allScores } = await supabase
          .from('scores').select('student_id, marks_obtained, total_marks').in('student_id', classIds);

        const avgMap = {};
        (allScores || []).forEach(({ student_id, marks_obtained, total_marks }) => {
          if (!avgMap[student_id]) avgMap[student_id] = { sum: 0, count: 0 };
          avgMap[student_id].sum += (marks_obtained / total_marks) * 100;
          avgMap[student_id].count += 1;
        });
        const sorted = Object.entries(avgMap)
          .map(([id, { sum, count }]) => ({ id, avg: sum / count }))
          .sort((a, b) => b.avg - a.avg);
        const rank = sorted.findIndex(s => s.id === sid);
        leaderboard_position = rank >= 0 ? rank + 1 : null;
      }

      const scores = (recentScores || []).map(s => ({
        ...s,
        percentage: Math.round((s.marks_obtained / s.total_marks) * 100),
      }));

      setData({
        student,
        attendance: { rows: attendanceRows || [], present, total },
        scores,
        achievements: achievementsRows || [],
        announcements,
        tasks: taskRows || [],
        fees: (feesRows || []).map(f => ({
          ...f,
          due_date: f.due_date ? new Date(f.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
        })),
        leaderboard_position,
        total_students_in_class: classIds.length,
      });

      // Fetch additional feature data based on class level
      setClassLevel(student.class_level);
      setStudentIdState(sid);
      const [{ data: ttData }, { data: subData }, { data: tcData }, { data: leaveData }] = await Promise.all([
        supabase.from('timetable').select('*').eq('class_level', student.class_level).order('day_of_week').order('period_number'),
        supabase.from('subjects').select('*').eq('class_level', student.class_level).order('name'),
        supabase.from('teacher_contacts').select('*').order('full_name'),
        supabase.from('leave_applications').select('*').eq('student_id', sid).order('created_at', { ascending: false }),
      ]);
      if (ttData) setTimetable(ttData);
      if (subData) setSubjectsList(subData);
      if (tcData) setTeacherContacts(tcData);
      if (leaveData) setLeaveApplications(leaveData);
    } catch (err) {
      toast.error('Failed to load student data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-stone-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-stone-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { student, attendance, scores, achievements, announcements, tasks = [], fees, leaderboard_position, total_students_in_class } = data;
  const attendancePct = attendance.total > 0 ? Math.round((attendance.present / attendance.total) * 100) : 0;
  const pendingFees = fees.filter(f => f.status === 'pending').reduce((s, f) => s + Number(f.amount), 0);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((s, sc) => s + sc.percentage, 0) / scores.length) : 0;

  const tabs = [
    { id: 'overview',  label: 'Overview',  icon: Calendar },
    { id: 'notices',   label: `Notices${announcements.length > 0 ? ` (${announcements.length})` : ''}`, icon: Bell },
    { id: 'tasks',     label: `Homework${tasks.length > 0 ? ` (${tasks.length})` : ''}`, icon: ListTodo },
    { id: 'scores',    label: 'Scores',    icon: BarChart2 },
    { id: 'fees',      label: 'Fees',      icon: DollarSign },
    { id: 'awards',    label: 'Awards',    icon: Award },
    { id: 'timetable', label: 'Timetable', icon: Table },
    { id: 'subjects',  label: 'Subjects',  icon: BookMarked },
    { id: 'teachers',  label: 'Teachers',  icon: Phone },
    { id: 'leave',     label: 'Leave',     icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-stone-50">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-stone-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/parent')}
            className="p-2 rounded-xl hover:bg-stone-100 text-stone-500 transition-colors flex-shrink-0"
            aria-label="Back to family"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-stone-900 text-sm truncate">{student.full_name}</p>
              <p className="text-xs text-stone-400 truncate">{student.class_level}</p>
            </div>
          </div>
          {leaderboard_position && (
            <div className="flex items-center gap-1 bg-amber-50 border border-amber-100 rounded-full px-2.5 py-1 flex-shrink-0">
              <Star className="w-3 h-3 text-amber-500" />
              <span className="text-xs font-bold text-amber-700">#{leaderboard_position}</span>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pb-28">
        {/* Hero Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-5 mb-5">
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-3xl p-6 text-white shadow-lg shadow-emerald-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-28 h-28 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="relative flex items-start justify-between">
              <div className="flex-1">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-3">
                  <span className="text-xl font-bold">{student.full_name.charAt(0).toUpperCase()}</span>
                </div>
                <h1 className="text-xl font-bold" data-testid="student-name">{student.full_name}</h1>
                <p className="text-emerald-200 text-sm mt-0.5">{student.class_level}</p>
                {leaderboard_position && (
                  <div className="mt-3 inline-flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1">
                    <Star className="w-3.5 h-3.5 text-amber-300" />
                    <span className="text-xs font-semibold">Rank {leaderboard_position} of {total_students_in_class}</span>
                  </div>
                )}
              </div>
              <div className="relative flex-shrink-0">
                <RingProgress value={attendancePct} size={80} stroke={7} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold">{attendancePct}%</span>
                  <span className="text-[9px] text-emerald-200">Attend.</span>
                </div>
              </div>
            </div>

            {/* Quick stat row */}
            <div className="relative mt-5 grid grid-cols-3 gap-2">
              {[
                { label: 'Avg Score', value: avgScore > 0 ? `${avgScore}%` : '—', icon: TrendingUp },
                { label: 'Days Present', value: `${attendance.present}/${attendance.total}`, icon: Calendar },
                { label: 'Fees Due', value: pendingFees > 0 ? `₹${pendingFees}` : '✓', icon: DollarSign },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="bg-white/10 rounded-2xl p-3 text-center">
                  <p className="font-bold text-base">{value}</p>
                  <p className="text-emerald-200 text-[10px] mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Tab bar */}
        <div className="flex bg-stone-100 rounded-2xl p-1 mb-5 gap-1 overflow-x-auto">
          {tabs.map(({ id, label }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex-1 py-2 px-1 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
                activeTab === id ? 'bg-white text-emerald-700 shadow-sm' : 'text-stone-500 hover:text-stone-700'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {/* ── Overview ── */}
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="space-y-4">
              {/* Urgent notice alert preview if any high severity */}
              {announcements.some(a => a.severity === 'high') && (
                <div
                  onClick={() => setActiveTab('notices')}
                  className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 cursor-pointer flex items-center justify-between gap-3 shadow-sm hover:bg-red-100/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 animate-bounce" />
                    <div>
                      <p className="font-bold text-sm text-red-950">Urgent Notice!</p>
                      <p className="text-xs text-red-800 line-clamp-1">
                        {announcements.find(a => a.severity === 'high')?.title}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-red-700 bg-red-200 px-2.5 py-1 rounded-full flex-shrink-0">Read</span>
                </div>
              )}

              {/* Attendance */}
              <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
                <h3 className="font-semibold text-stone-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" /> Attendance Summary
                </h3>
                <div className="flex gap-3 mb-3">
                  {[
                    { label: 'Present', val: attendance.present, color: 'bg-emerald-500' },
                    { label: 'Absent', val: attendance.total - attendance.present, color: 'bg-red-400' },
                    { label: 'Total', val: attendance.total, color: 'bg-stone-400' },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="flex-1 text-center">
                      <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center text-white font-bold text-sm mx-auto mb-1`}>{val}</div>
                      <p className="text-xs text-stone-500">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${attendancePct}%` }} />
                </div>
                <p className="text-xs text-stone-400 mt-1.5">{attendancePct}% attendance rate</p>
              </div>

              {/* Recent 3 scores */}
              {scores.length > 0 && (
                <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-stone-900 flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-blue-500" /> Recent Scores
                    </h3>
                    <button onClick={() => setActiveTab('scores')} className="text-xs text-emerald-600 font-medium">View all</button>
                  </div>
                  <div className="space-y-3">
                    {scores.slice(0, 3).map((sc, idx) => {
                      const g = getGrade(sc.percentage);
                      return (
                        <div key={idx} className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-stone-900 text-sm truncate">{sc.exam_title}</p>
                            <p className="text-xs text-stone-400">{sc.subject}</p>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <div className="w-20 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${sc.percentage}%` }} />
                            </div>
                            <span className={`text-sm font-bold w-8 text-right ${g.color}`}>{g.label}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── NOTICES / ANNOUNCEMENTS ── */}
          {activeTab === 'notices' && (
            <motion.div key="notices" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
              <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden p-5 space-y-4">
                <h3 className="font-semibold text-stone-900 flex items-center gap-2 mb-2">
                  <Bell className="w-5 h-5 text-amber-500" /> Class & General Notices ({announcements.length})
                </h3>

                {announcements.length > 0 ? (
                  <div className="space-y-3">
                    {announcements.map((item) => {
                      const isHigh = item.severity === 'high';
                      const isMedium = item.severity === 'medium';

                      const cardStyle = isHigh
                        ? 'bg-red-50 border-red-200 border-l-4 border-l-red-600 text-red-950'
                        : isMedium
                        ? 'bg-amber-50 border-amber-200 border-l-4 border-l-amber-500 text-amber-950'
                        : 'bg-white border-stone-200 border-l-4 border-l-emerald-500 text-stone-900 shadow-sm';

                      const badgeStyle = isHigh
                        ? 'bg-red-600 text-white'
                        : isMedium
                        ? 'bg-amber-500 text-white'
                        : 'bg-emerald-600 text-white';

                      const Icon = isHigh ? AlertTriangle : isMedium ? Bell : Megaphone;

                      return (
                        <div key={item.id} className={`rounded-2xl p-4 border transition-all ${cardStyle}`}>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${badgeStyle}`}>
                                {isHigh ? 'Urgent' : isMedium ? 'Important' : 'Notice'}
                              </span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                                {item.target_class === 'All' ? 'All Classes' : item.target_class}
                              </span>
                            </div>
                            <span className="text-[10px] text-stone-400">
                              {item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}
                            </span>
                          </div>

                          <div className="flex items-start gap-2.5">
                            <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isHigh ? 'text-red-600' : isMedium ? 'text-amber-600' : 'text-emerald-600'}`} />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-sm mb-1 leading-snug">{item.title}</h4>
                              <p className="text-xs leading-relaxed opacity-90 whitespace-pre-line">{item.message}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <Bell className="w-12 h-12 text-stone-200 mx-auto mb-3" />
                    <p className="text-stone-400 text-sm">No notices for {student.class_level}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── TASKS & HOMEWORK ── */}
          {activeTab === 'tasks' && (
            <motion.div key="tasks" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
              <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden p-5">
                <h3 className="font-semibold text-stone-900 flex items-center gap-2 mb-4">
                  <ListTodo className="w-5 h-5 text-emerald-600" /> Assigned Homework & Tasks ({tasks.length})
                </h3>

                {tasks.length > 0 ? (
                  <div className="divide-y divide-stone-100">
                    {tasks.map(t => (
                      <div key={t.id} className="py-3 flex items-start gap-3">
                        <div className={`w-6 h-6 rounded-lg border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          t.status === 'completed' ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-stone-300'
                        }`}>
                          {t.status === 'completed' && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <div className="flex-1">
                          <p className={`font-bold text-stone-900 text-sm ${t.status === 'completed' ? 'line-through text-stone-400' : ''}`}>
                            {t.title}
                          </p>
                          {t.description && <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{t.description}</p>}
                          {t.due_date && <p className="text-[10px] font-medium text-amber-600 mt-1">Due Date: {t.due_date}</p>}
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                          t.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {t.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <ListTodo className="w-12 h-12 text-stone-200 mx-auto mb-3" />
                    <p className="text-stone-400 text-sm">No homework or tasks assigned yet</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Scores ── */}
          {activeTab === 'scores' && (
            <motion.div key="scores" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
              <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-stone-50">
                  <h3 className="font-semibold text-stone-900 flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-blue-500" /> All Exam Scores
                  </h3>
                </div>
                {scores.length > 0 ? (
                  <div className="divide-y divide-stone-50">
                    {scores.map((sc, idx) => {
                      const g = getGrade(sc.percentage);
                      return (
                        <div key={idx} className="p-4 flex items-center justify-between" data-testid={`score-${idx}`}>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-stone-900">{sc.exam_title}</p>
                            <p className="text-sm text-stone-400">{sc.subject}</p>
                            <div className="mt-2 h-1.5 bg-stone-100 rounded-full overflow-hidden w-full max-w-[160px]">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${sc.percentage}%` }} />
                            </div>
                          </div>
                          <div className="ml-4 text-right flex-shrink-0">
                            <p className={`text-2xl font-bold ${g.color}`}>{g.label}</p>
                            <p className="text-xs text-stone-400 mt-0.5">{sc.marks_obtained}/{sc.total_marks}</p>
                            <p className="text-xs font-semibold text-stone-600">{sc.percentage}%</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <BarChart2 className="w-12 h-12 text-stone-200 mx-auto mb-3" />
                    <p className="text-stone-400 text-sm">No exam scores yet</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Fees ── */}
          {activeTab === 'fees' && (
            <motion.div key="fees" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
              {pendingFees > 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-4 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Payment Due</p>
                    <p className="text-xs text-amber-600">Total pending: ₹{pendingFees.toFixed(2)}</p>
                  </div>
                </div>
              )}
              <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
                {fees.length > 0 ? (
                  <div className="divide-y divide-stone-50">
                    {fees.map((fee) => (
                      <div key={fee.id} className="p-4 flex items-center justify-between" data-testid={`fee-${fee.id}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${fee.status === 'paid' ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                            {fee.status === 'paid' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Clock className="w-4 h-4 text-amber-600" />}
                          </div>
                          <div>
                            <p className="font-medium text-stone-900 text-sm">{fee.month}</p>
                            <p className="text-xs text-stone-400">Due: {fee.due_date}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-stone-900">₹{Number(fee.amount).toLocaleString('en-IN')}</p>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${fee.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {fee.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <DollarSign className="w-12 h-12 text-stone-200 mx-auto mb-3" />
                    <p className="text-stone-400 text-sm">No fee records yet</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Achievements ── */}
          {activeTab === 'awards' && (
            <motion.div key="awards" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
              <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-stone-50">
                  <h3 className="font-semibold text-stone-900 flex items-center gap-2">
                    <Award className="w-4 h-4 text-purple-500" /> Achievements ({achievements.length})
                  </h3>
                </div>
                {achievements.length > 0 ? (
                  <div className="divide-y divide-stone-50">
                    {achievements.map((a) => (
                      <div key={a.id} className="p-4 flex items-start gap-3" data-testid={`achievement-${a.id}`}>
                        <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Star className="w-4 h-4 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-stone-900 text-sm">{a.title}</p>
                          {a.description && <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{a.description}</p>}
                          <p className="text-xs text-stone-400 mt-1">
                            {a.date ? new Date(a.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <Award className="w-12 h-12 text-stone-200 mx-auto mb-3" />
                    <p className="text-stone-400 text-sm">No achievements yet</p>
                    <p className="text-xs text-stone-300 mt-1">Keep working hard!</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
      {/* ── TIMETABLE TAB ── */}
      {activeTab === 'timetable' && (
        <motion.div key="timetable" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <h3 className="font-bold text-stone-900 text-base">📅 Class Timetable</h3>
          {Object.entries(
            timetable.reduce((acc, r) => { (acc[r.day_of_week] = acc[r.day_of_week] || []).push(r); return acc; }, {})
          ).map(([day, rows]) => (
            <div key={day} className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
              <div className="px-4 py-2.5 bg-emerald-50 border-b border-stone-100">
                <span className="text-sm font-bold text-emerald-800">{day}</span>
              </div>
              {rows.map(r => (
                <div key={r.id} className="flex items-center justify-between px-4 py-3 border-b border-stone-50 last:border-0">
                  <div>
                    <p className="font-semibold text-stone-900 text-sm">{r.subject}</p>
                    <p className="text-xs text-stone-500">{r.teacher_name} · Period {r.period_number}</p>
                  </div>
                  <span className="text-xs font-medium text-stone-500 bg-stone-100 px-2.5 py-1 rounded-full">
                    {r.start_time?.slice(0,5)} – {r.end_time?.slice(0,5)}
                  </span>
                </div>
              ))}
            </div>
          ))}
          {timetable.length === 0 && (
            <div className="text-center py-16">
              <Table className="w-10 h-10 text-stone-200 mx-auto mb-3" />
              <p className="text-stone-400 text-sm">No timetable set yet</p>
            </div>
          )}
        </motion.div>
      )}

      {/* ── SUBJECTS TAB ── */}
      {activeTab === 'subjects' && (
        <motion.div key="subjects" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <h3 className="font-bold text-stone-900 text-base">📚 Subjects</h3>
          {subjectsList.map(s => (
            <div key={s.id} className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm">
              <p className="font-bold text-stone-900">{s.name}</p>
              {s.teacher_name && <p className="text-xs text-stone-500 mt-0.5">👤 {s.teacher_name}</p>}
              {s.description && <p className="text-xs text-stone-400 mt-1">{s.description}</p>}
            </div>
          ))}
          {subjectsList.length === 0 && (
            <div className="text-center py-16">
              <BookMarked className="w-10 h-10 text-stone-200 mx-auto mb-3" />
              <p className="text-stone-400 text-sm">No subjects added yet</p>
            </div>
          )}
        </motion.div>
      )}

      {/* ── TEACHERS TAB ── */}
      {activeTab === 'teachers' && (
        <motion.div key="teachers" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <h3 className="font-bold text-stone-900 text-base">📞 Teacher Contacts</h3>
          {teacherContacts.map(t => (
            <div key={t.id} className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-stone-900">{t.full_name}</p>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{t.subject}</span>
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                {t.phone && (
                  <a href={`tel:${t.phone}`} className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl hover:bg-emerald-100 transition-colors">
                    <Phone className="w-3.5 h-3.5" /> {t.phone}
                  </a>
                )}
                {t.email && (
                  <a href={`mailto:${t.email}`} className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition-colors">
                    ✉️ Email
                  </a>
                )}
              </div>
            </div>
          ))}
          {teacherContacts.length === 0 && (
            <div className="text-center py-16">
              <Phone className="w-10 h-10 text-stone-200 mx-auto mb-3" />
              <p className="text-stone-400 text-sm">No teacher contacts added yet</p>
            </div>
          )}
        </motion.div>
      )}

      {/* ── LEAVE TAB ── */}
      {activeTab === 'leave' && (
        <motion.div key="leave" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <h3 className="font-bold text-stone-900 text-base">📝 Apply for Leave</h3>
          <form onSubmit={async e => {
            e.preventDefault();
            if (!leaveForm.from_date || !leaveForm.to_date || !leaveForm.reason) {
              toast.error('All fields are required');
              return;
            }
            setLeaveLoading(true);
            try {
              const { error } = await supabase.from('leave_applications').insert([{
                student_id: studentIdState,
                from_date: leaveForm.from_date,
                to_date: leaveForm.to_date,
                reason: leaveForm.reason,
              }]);
              if (error) throw error;
              toast.success('Leave application submitted!');
              setLeaveForm({ from_date: '', to_date: '', reason: '' });
              const { data: leaveData } = await supabase.from('leave_applications').select('*').eq('student_id', studentIdState).order('created_at', { ascending: false });
              if (leaveData) setLeaveApplications(leaveData);
            } catch (err) {
              toast.error('Failed to submit: ' + err.message);
            } finally {
              setLeaveLoading(false);
            }
          }} className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">From Date *</label>
                <input type="date" value={leaveForm.from_date} onChange={e => setLeaveForm(f => ({...f, from_date: e.target.value}))} className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">To Date *</label>
                <input type="date" value={leaveForm.to_date} onChange={e => setLeaveForm(f => ({...f, to_date: e.target.value}))} className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Reason *</label>
              <textarea value={leaveForm.reason} onChange={e => setLeaveForm(f => ({...f, reason: e.target.value}))} rows={3} className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" placeholder="Please explain the reason for leave..." required />
            </div>
            <button type="submit" disabled={leaveLoading} className="w-full bg-emerald-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-60">
              {leaveLoading ? 'Submitting...' : 'Submit Leave Application'}
            </button>
          </form>

          <h3 className="font-bold text-stone-900 text-base mt-6">Past Applications</h3>
          {leaveApplications.map(l => (
            <div key={l.id} className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-stone-600">{new Date(l.from_date).toLocaleDateString('en-IN')} → {new Date(l.to_date).toLocaleDateString('en-IN')}</p>
                  <p className="text-xs text-stone-500 mt-1">{l.reason}</p>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full flex-shrink-0 ${
                  l.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                  l.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-amber-100 text-amber-700'
                }`}>{l.status.toUpperCase()}</span>
              </div>
            </div>
          ))}
          {leaveApplications.length === 0 && <p className="text-stone-400 text-xs text-center py-4">No leave applications yet.</p>}
        </motion.div>
      )}

        </AnimatePresence>
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-stone-100 z-50">
        <div className="max-w-2xl mx-auto px-4 py-2 flex items-center justify-around">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-colors ${activeTab === id ? 'text-emerald-600' : 'text-stone-400'}`}>
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default StudentDetailPage;
