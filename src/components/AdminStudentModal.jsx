import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, User, Calendar, Award, TrendingUp, DollarSign, BarChart2,
  CheckCircle2, Clock, AlertCircle, Plus, Trash2, Edit3, Link, Check,
  XCircle, CheckCircle, ListTodo, Star, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { describeSaveError } from '@/utils/results';

const getGrade = (pct) => {
  if (pct >= 90) return { label: 'A+', color: 'text-emerald-600' };
  if (pct >= 80) return { label: 'A', color: 'text-emerald-500' };
  if (pct >= 70) return { label: 'B', color: 'text-blue-500' };
  if (pct >= 60) return { label: 'C', color: 'text-amber-500' };
  return { label: 'D', color: 'text-red-500' };
};

const AdminStudentModal = ({ student, parents = [], open, onClose, onRefresh }) => {
  const [activeSubTab, setActiveSubTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  // Student Data
  const [studentInfo, setStudentInfo] = useState(student);
  const [attendance, setAttendance] = useState([]);
  const [scores, setScores] = useState([]);
  const [fees, setFees] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [tasks, setTasks] = useState([]);

  // Edit Profile Form
  const [profileForm, setProfileForm] = useState({ full_name: '', class_level: '', admission_date: '', user_id: '', photo_url: '', registration_no: '', date_of_birth: '', student_user_id: '' });
  // Approved student-role accounts that can be linked as this student's own login.
  const [studentAccounts, setStudentAccounts] = useState([]);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Attendance Form
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0]);
  const [attStatus, setAttStatus] = useState('present');
  const [savingAtt, setSavingAtt] = useState(false);

  // Score Form
  const [showAddScore, setShowAddScore] = useState(false);
  const [scoreForm, setScoreForm] = useState({ exam_title: '', subject: '', marks_obtained: '', total_marks: '100' });

  // Fee Form
  const [showAddFee, setShowAddFee] = useState(false);
  const [feeForm, setFeeForm] = useState({ month: '', amount: '', due_date: '', status: 'pending' });

  // Achievement Form
  const [showAddAch, setShowAddAch] = useState(false);
  const [achForm, setAchForm] = useState({ title: '', description: '', date: new Date().toISOString().split('T')[0] });

  // Task Form
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', due_date: '' });

  const [actionLoading, setActionLoading] = useState(false);

  const fetchStudentFullDetails = useCallback(async () => {
    if (!student?.id) return;
    setLoading(true);
    try {
      const sid = student.id;
      const [
        { data: sData },
        { data: attData },
        { data: scData },
        { data: feeData },
        { data: achData },
        { data: taskData },
      ] = await Promise.all([
        supabase.from('students').select(`*, profiles(full_name, id)`).eq('id', sid).single(),
        supabase.from('attendance').select('*').eq('student_id', sid).order('date', { ascending: false }),
        supabase.from('scores').select('*').eq('student_id', sid).order('created_at', { ascending: false }),
        supabase.from('fees').select('*').eq('student_id', sid).order('created_at', { ascending: false }),
        supabase.from('achievements').select('*').eq('student_id', sid).order('date', { ascending: false }),
        supabase.from('student_tasks').select('*').eq('student_id', sid).order('created_at', { ascending: false }),
      ]);
      // Date of birth lives in an admin-only table.
      const [{ data: privateData }, { data: accounts }] = await Promise.all([
        supabase.from('student_private_details').select('date_of_birth').eq('student_id', sid).maybeSingle(),
        supabase.from('profiles').select('id, full_name, email').eq('role', 'student').eq('status', 'approved').order('full_name'),
      ]);
      setStudentAccounts(accounts || []);

      setStudentInfo(sData || student);
      setProfileForm({
        full_name: sData?.full_name || '',
        class_level: sData?.class_level || '',
        admission_date: sData?.admission_date || '',
        user_id: sData?.user_id || '',
        status: sData?.status || 'active',
        photo_url: sData?.photo_url || '',
        registration_no: sData?.registration_no || '',
        date_of_birth: privateData?.date_of_birth || '',
        student_user_id: sData?.student_user_id || '',
      });
      setPhotoFile(null);
      setPhotoPreview(sData?.photo_url || '');
      setAttendance(attData || []);
      setScores(scData || []);
      setFees(feeData || []);
      setAchievements(achData || []);
      setTasks(taskData || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load student full details');
    } finally {
      setLoading(false);
    }
  }, [student]);

  useEffect(() => {
    if (open && student) {
      fetchStudentFullDetails();
    }
  }, [open, student, fetchStudentFullDetails]);

  if (!open || !student) return null;

  // ── Handlers ──
  const handleUpdateProfile = async () => {
    setSavingProfile(true);
    try {
      let photoUrl = profileForm.photo_url || null;

      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const filePath = `students/${student.id}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('gallery')
          .upload(filePath, photoFile, { upsert: true, contentType: photoFile.type });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('gallery').getPublicUrl(filePath);
        photoUrl = publicUrlData.publicUrl;
      }

      const { error } = await supabase
        .from('students')
        .update({
          full_name: profileForm.full_name,
          class_level: profileForm.class_level,
          admission_date: profileForm.admission_date || null,
          user_id: profileForm.user_id || null,
          status: profileForm.status || 'active',
          photo_url: photoUrl,
          // Blank means "assign the next automatic number".
          registration_no: profileForm.registration_no.trim() || null,
          student_user_id: profileForm.student_user_id || null,
        })
        .eq('id', student.id);

      if (error) throw error;

      const { error: dobError } = await supabase
        .from('student_private_details')
        .upsert([{ student_id: student.id, date_of_birth: profileForm.date_of_birth || null, updated_at: new Date().toISOString() }]);
      if (dobError) throw dobError;

      toast.success('Student profile updated!');
      fetchStudentFullDetails();
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error('Failed to update profile: ' + describeSaveError(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleMarkAttendance = async () => {
    setSavingAtt(true);
    try {
      const { error } = await supabase
        .from('attendance')
        .upsert([{ student_id: student.id, date: attDate, status: attStatus }], { onConflict: 'student_id,date' });

      if (error) throw error;
      toast.success(`Attendance marked (${attStatus}) for ${attDate}`);
      fetchStudentFullDetails();
    } catch (err) {
      toast.error('Failed to mark attendance: ' + err.message);
    } finally {
      setSavingAtt(false);
    }
  };

  const handleAddScore = async () => {
    if (!scoreForm.exam_title || !scoreForm.subject || !scoreForm.marks_obtained) {
      toast.error('Exam title, subject and marks are required');
      return;
    }
    setActionLoading(true);
    try {
      const { error } = await supabase.from('scores').insert([{
        student_id: student.id,
        exam_title: scoreForm.exam_title,
        subject: scoreForm.subject,
        marks_obtained: Number(scoreForm.marks_obtained),
        total_marks: Number(scoreForm.total_marks || 100),
      }]);

      if (error) throw error;
      toast.success('Score record added!');
      setShowAddScore(false);
      setScoreForm({ exam_title: '', subject: '', marks_obtained: '', total_marks: '100' });
      fetchStudentFullDetails();
    } catch (err) {
      toast.error('Failed to add score: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteScore = (id) => {
    toast('Delete this score record?', {
      action: {
        label: 'Delete',
        onClick: async () => {
          await supabase.from('scores').delete().eq('id', id);
          toast.success('Score deleted');
          fetchStudentFullDetails();
        }
      }
    });
  };

  const handleAddFee = async () => {
    if (!feeForm.month || !feeForm.amount) {
      toast.error('Month and amount required');
      return;
    }
    setActionLoading(true);
    try {
      const { error } = await supabase.from('fees').insert([{
        student_id: student.id,
        month: feeForm.month,
        amount: Number(feeForm.amount),
        due_date: feeForm.due_date || null,
        status: feeForm.status,
      }]);

      if (error) throw error;
      toast.success('Fee record added!');
      setShowAddFee(false);
      setFeeForm({ month: '', amount: '', due_date: '', status: 'pending' });
      fetchStudentFullDetails();
    } catch (err) {
      toast.error('Failed to add fee: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleFeeStatus = async (feeId, currentStatus) => {
    const newStatus = currentStatus === 'paid' ? 'pending' : 'paid';
    await supabase.from('fees').update({ status: newStatus }).eq('id', feeId);
    toast.success(`Fee status updated to ${newStatus}`);
    fetchStudentFullDetails();
  };

  const handleDeleteFee = (id) => {
    toast('Delete this fee record?', {
      action: {
        label: 'Delete',
        onClick: async () => {
          await supabase.from('fees').delete().eq('id', id);
          toast.success('Fee deleted');
          fetchStudentFullDetails();
        }
      }
    });
  };

  const handleAddAchievement = async () => {
    if (!achForm.title) { toast.error('Title required'); return; }
    setActionLoading(true);
    try {
      const { error } = await supabase.from('achievements').insert([{
        student_id: student.id,
        title: achForm.title,
        description: achForm.description,
        date: achForm.date || null,
      }]);
      if (error) throw error;
      toast.success('Achievement added!');
      setShowAddAch(false);
      setAchForm({ title: '', description: '', date: new Date().toISOString().split('T')[0] });
      fetchStudentFullDetails();
    } catch (err) {
      toast.error('Failed to add achievement: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAchievement = (id) => {
    toast('Delete this achievement?', {
      action: {
        label: 'Delete',
        onClick: async () => {
          await supabase.from('achievements').delete().eq('id', id);
          toast.success('Achievement deleted');
          fetchStudentFullDetails();
        }
      }
    });
  };

  const handleAddTask = async () => {
    if (!taskForm.title) { toast.error('Task title required'); return; }
    setActionLoading(true);
    try {
      const { error } = await supabase.from('student_tasks').insert([{
        student_id: student.id,
        title: taskForm.title,
        description: taskForm.description,
        due_date: taskForm.due_date || null,
        status: 'pending',
      }]);
      if (error) throw error;
      toast.success('Task/Homework assigned!');
      setShowAddTask(false);
      setTaskForm({ title: '', description: '', due_date: '' });
      fetchStudentFullDetails();
    } catch (err) {
      toast.error('Failed to add task: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleTask = async (taskId, currentStatus) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    await supabase.from('student_tasks').update({ status: newStatus }).eq('id', taskId);
    toast.success(`Task marked ${newStatus}`);
    fetchStudentFullDetails();
  };

  const handleDeleteTask = (id) => {
    toast('Delete this task?', {
      action: {
        label: 'Delete',
        onClick: async () => {
          await supabase.from('student_tasks').delete().eq('id', id);
          toast.success('Task deleted');
          fetchStudentFullDetails();
        }
      }
    });
  };

  // Stats calculation
  const presentDays = attendance.filter(a => a.status === 'present').length;
  const totalDays = attendance.length;
  const attPct = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((s, sc) => s + (sc.marks_obtained / sc.total_marks) * 100, 0) / scores.length) : 0;
  const pendingFeesSum = fees.filter(f => f.status === 'pending').reduce((s, f) => s + Number(f.amount), 0);

  const subTabs = [
    { id: 'overview', label: 'Profile & Edit' },
    { id: 'attendance', label: `Attendance (${totalDays})` },
    { id: 'scores', label: `Scores (${scores.length})` },
    { id: 'fees', label: `Fees (${fees.length})` },
    { id: 'achievements', label: `Awards (${achievements.length})` },
    { id: 'tasks', label: `Tasks (${tasks.length})` },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          onClick={e => e.stopPropagation()}
          className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-6 text-white relative flex-shrink-0">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-2xl font-bold flex-shrink-0">
                {studentInfo?.full_name?.charAt(0)?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-2xl font-bold truncate">{studentInfo?.full_name}</h2>
                  <span className="text-xs font-semibold px-3 py-1 bg-white/20 rounded-full">
                    {studentInfo?.class_level}
                  </span>
                  {studentInfo?.registration_no && (
                    <span className="text-xs font-mono font-semibold px-3 py-1 bg-white/10 rounded-full">
                      {studentInfo.registration_no}
                    </span>
                  )}
                </div>
                <p className="text-emerald-100 text-xs mt-1">
                  Parent: {studentInfo?.profiles?.full_name ? `${studentInfo.profiles.full_name}` : '⚠️ Unlinked'}
                </p>
              </div>
            </div>

            {/* Quick Stats bar */}
            <div className="grid grid-cols-4 gap-2 mt-5 bg-black/10 rounded-2xl p-3 text-center">
              <div>
                <p className="text-xs text-emerald-200">Attendance</p>
                <p className="text-base font-bold">{attPct}%</p>
              </div>
              <div>
                <p className="text-xs text-emerald-200">Avg Score</p>
                <p className="text-base font-bold">{avgScore > 0 ? `${avgScore}%` : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-emerald-200">Fees Due</p>
                <p className="text-base font-bold">{pendingFeesSum > 0 ? `₹${pendingFeesSum}` : '✓ Clear'}</p>
              </div>
              <div>
                <p className="text-xs text-emerald-200">Tasks</p>
                <p className="text-base font-bold">{tasks.filter(t => t.status === 'pending').length} open</p>
              </div>
            </div>
          </div>

          {/* Sub Navigation Bar */}
          <div className="flex bg-stone-100 p-1 border-b border-stone-200 overflow-x-auto flex-shrink-0">
            {subTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex-1 min-w-[110px] py-2 px-3 text-xs font-semibold rounded-xl transition-all whitespace-nowrap text-center ${
                  activeSubTab === tab.id
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content Body */}
          <div className="p-6 overflow-y-auto flex-1 bg-stone-50">
            {loading ? (
              <div className="py-16 text-center">
                <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-3" />
                <p className="text-stone-400 text-sm">Loading student details...</p>
              </div>
            ) : (
              <>
                {/* ── SUBTAB 1: PROFILE & EDIT ── */}
                {activeSubTab === 'overview' && (
                  <div className="space-y-6">
                    <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm">
                      <h3 className="font-bold text-stone-900 mb-4 flex items-center gap-2">
                        <Edit3 className="w-4 h-4 text-emerald-600" /> Edit Student Details
                      </h3>

                      <div className="grid sm:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-medium text-stone-700 mb-1">Full Name *</label>
                          <input
                            value={profileForm.full_name}
                            onChange={e => setProfileForm(f => ({ ...f, full_name: e.target.value }))}
                            className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-stone-700 mb-1">Student Photo <span className="text-stone-400 font-normal">(Optional)</span></label>
                          <div className="flex items-center gap-3">
                            <div className="w-14 h-14 rounded-xl bg-stone-100 border border-stone-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                              {photoPreview ? (
                                <img src={photoPreview} alt="Student preview" className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-6 h-6 text-stone-300" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <input
                                id="student-photo-upload"
                                type="file"
                                accept="image/*"
                                onChange={e => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  setPhotoFile(file);
                                  setPhotoPreview(URL.createObjectURL(file));
                                }}
                                className="block w-full text-xs text-stone-500 file:mr-2 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-emerald-700 hover:file:bg-emerald-100"
                              />
                              <p className="text-[10px] text-stone-400 mt-1">Choose an image from your device. You can leave this empty.</p>
                              {(photoPreview || profileForm.photo_url) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPhotoFile(null);
                                    setPhotoPreview('');
                                    setProfileForm(f => ({ ...f, photo_url: '' }));
                                  }}
                                  className="text-[10px] text-red-600 font-semibold hover:underline mt-1"
                                >
                                  Remove photo
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-stone-700 mb-1">Class Level *</label>
                          <select
                            value={profileForm.class_level}
                            onChange={e => setProfileForm(f => ({ ...f, class_level: e.target.value }))}
                            className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                          >
                            {['Class 1','Class 2','Class 3','Class 4','Class 5','Class 6','Class 7','Class 8','Class 9','Class 10','Hifz','Alim'].map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-stone-700 mb-1">Registration No.</label>
                          <input
                            value={profileForm.registration_no}
                            onChange={e => setProfileForm(f => ({ ...f, registration_no: e.target.value }))}
                            placeholder="Leave empty for automatic"
                            className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          <p className="text-[10px] text-stone-400 mt-1">Used with date of birth to check exam results online.</p>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-stone-700 mb-1">Date of Birth</label>
                          <input
                            type="date"
                            value={profileForm.date_of_birth || ''}
                            max={new Date().toISOString().split('T')[0]}
                            onChange={e => setProfileForm(f => ({ ...f, date_of_birth: e.target.value }))}
                            className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          <p className="text-[10px] text-stone-400 mt-1">Private. Only admins can see it.</p>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-stone-700 mb-1">Admission Date</label>
                          <input
                            type="date"
                            value={profileForm.admission_date || ''}
                            onChange={e => setProfileForm(f => ({ ...f, admission_date: e.target.value }))}
                            className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-stone-700 mb-1">Link to Parent</label>
                          <select
                            value={profileForm.user_id || ''}
                            onChange={e => setProfileForm(f => ({ ...f, user_id: e.target.value }))}
                            className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                          >
                            <option value="">-- No Parent Linked --</option>
                            {parents.map(p => (
                              <option key={p.id} value={p.id}>{p.full_name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-stone-700 mb-1">Student Login Account</label>
                          <select
                            value={profileForm.student_user_id || ''}
                            onChange={e => setProfileForm(f => ({ ...f, student_user_id: e.target.value }))}
                            className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                          >
                            <option value="">-- No Student Login Linked --</option>
                            {studentAccounts.map(a => (
                              <option key={a.id} value={a.id}>{a.full_name || 'Unnamed'}{a.email ? ` (${a.email})` : ''}</option>
                            ))}
                          </select>
                          <p className="text-[10px] text-stone-400 mt-1">Lets the student sign in and see their own dashboard. Approve the account first.</p>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-stone-700 mb-1">Enrollment Lifecycle Status *</label>
                          <select
                            value={profileForm.status || 'active'}
                            onChange={e => setProfileForm(f => ({ ...f, status: e.target.value }))}
                            className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                          >
                            <option value="active">🟢 Active Enrolled Student</option>
                            <option value="completed">🎓 Completed / Graduated (Class 10 / Alim)</option>
                            <option value="dropped">⚠️ Dropped Out (Discontinued)</option>
                          </select>
                        </div>
                      </div>

                      <button
                        onClick={handleUpdateProfile}
                        disabled={savingProfile}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                        {savingProfile ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Save Changes
                      </button>
                    </div>
                  </div>
                )}

                {/* ── SUBTAB 2: ATTENDANCE & LEAVE ── */}
                {activeSubTab === 'attendance' && (
                  <div className="space-y-6">
                    {/* Mark / Edit Attendance Card */}
                    <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm">
                      <h3 className="font-bold text-stone-900 mb-3 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-emerald-600" /> Mark / Update Attendance
                      </h3>

                      <div className="flex items-center gap-3 flex-wrap">
                        <div>
                          <label className="block text-xs font-medium text-stone-600 mb-1">Date</label>
                          <input
                            type="date"
                            value={attDate}
                            onChange={e => setAttDate(e.target.value)}
                            className="border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-stone-600 mb-1">Status</label>
                          <select
                            value={attStatus}
                            onChange={e => setAttStatus(e.target.value)}
                            className="border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                          >
                            <option value="present">Present (P)</option>
                            <option value="absent">Absent (A)</option>
                            <option value="late">Late (L)</option>
                            <option value="leave">On Leave (Approved)</option>
                          </select>
                        </div>

                        <button
                          onClick={handleMarkAttendance}
                          disabled={savingAtt}
                          className="mt-5 px-4 py-2 bg-emerald-600 text-white font-semibold text-sm rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-1.5"
                        >
                          {savingAtt ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          Save Entry
                        </button>
                      </div>
                    </div>

                    {/* Attendance History */}
                    <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm">
                      <h4 className="font-bold text-stone-900 mb-3 text-sm">Attendance History ({attendance.length} records)</h4>
                      {attendance.length > 0 ? (
                        <div className="divide-y divide-stone-100 max-h-60 overflow-y-auto">
                          {attendance.map((rec) => (
                            <div key={rec.id} className="py-2.5 flex items-center justify-between">
                              <span className="text-sm font-medium text-stone-700">{rec.date}</span>
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${
                                rec.status === 'present' ? 'bg-emerald-100 text-emerald-800' :
                                rec.status === 'absent' ? 'bg-red-100 text-red-800' :
                                rec.status === 'leave' ? 'bg-blue-100 text-blue-800' :
                                'bg-amber-100 text-amber-800'
                              }`}>
                                {rec.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-stone-400 text-xs py-4 text-center">No attendance history records</p>
                      )}
                    </div>
                  </div>
                )}

                {/* ── SUBTAB 3: SCORES ── */}
                {activeSubTab === 'scores' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-stone-900 text-base">Exam Scores</h3>
                      <button
                        onClick={() => setShowAddScore(!showAddScore)}
                        className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Score
                      </button>
                    </div>

                    {showAddScore && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
                        <h4 className="font-bold text-emerald-900 text-xs uppercase tracking-wider">New Score Entry</h4>
                        <div className="grid sm:grid-cols-2 gap-3">
                          <input
                            placeholder="Exam Title (e.g. Midterm 2025)"
                            value={scoreForm.exam_title}
                            onChange={e => setScoreForm(f => ({ ...f, exam_title: e.target.value }))}
                            className="border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white"
                          />
                          <input
                            placeholder="Subject (e.g. Quran Tajweed)"
                            value={scoreForm.subject}
                            onChange={e => setScoreForm(f => ({ ...f, subject: e.target.value }))}
                            className="border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white"
                          />
                          <input
                            type="number"
                            placeholder="Marks Obtained (e.g. 85)"
                            value={scoreForm.marks_obtained}
                            onChange={e => setScoreForm(f => ({ ...f, marks_obtained: e.target.value }))}
                            className="border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white"
                          />
                          <input
                            type="number"
                            placeholder="Total Marks (Default 100)"
                            value={scoreForm.total_marks}
                            onChange={e => setScoreForm(f => ({ ...f, total_marks: e.target.value }))}
                            className="border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white"
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setShowAddScore(false)} className="px-3 py-1.5 text-xs text-stone-600">Cancel</button>
                          <button onClick={handleAddScore} disabled={actionLoading} className="px-4 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl">Save Score</button>
                        </div>
                      </div>
                    )}

                    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm divide-y divide-stone-100">
                      {scores.length > 0 ? (
                        scores.map(sc => {
                          const pct = Math.round((sc.marks_obtained / sc.total_marks) * 100);
                          const gr = getGrade(pct);
                          return (
                            <div key={sc.id} className="p-4 flex items-center justify-between">
                              <div>
                                <p className="font-bold text-stone-900 text-sm">{sc.exam_title}</p>
                                <p className="text-xs text-stone-500">{sc.subject}</p>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <span className={`text-lg font-extrabold ${gr.color}`}>{gr.label}</span>
                                  <p className="text-xs text-stone-400">{sc.marks_obtained}/{sc.total_marks} ({pct}%)</p>
                                </div>
                                <button onClick={() => handleDeleteScore(sc.id)} className="p-1 text-stone-300 hover:text-red-600">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="p-8 text-center text-stone-400 text-xs">No exam score entries</p>
                      )}
                    </div>
                  </div>
                )}

                {/* ── SUBTAB 4: FEES ── */}
                {activeSubTab === 'fees' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-stone-900 text-base">Fee Records</h3>
                      <button
                        onClick={() => setShowAddFee(!showAddFee)}
                        className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Fee
                      </button>
                    </div>

                    {showAddFee && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
                        <h4 className="font-bold text-emerald-900 text-xs uppercase tracking-wider">New Fee Record</h4>
                        <div className="grid sm:grid-cols-2 gap-3">
                          <input
                            placeholder="Month (e.g. July 2025)"
                            value={feeForm.month}
                            onChange={e => setFeeForm(f => ({ ...f, month: e.target.value }))}
                            className="border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white"
                          />
                          <input
                            type="number"
                            placeholder="Amount (₹)"
                            value={feeForm.amount}
                            onChange={e => setFeeForm(f => ({ ...f, amount: e.target.value }))}
                            className="border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white"
                          />
                          <input
                            type="date"
                            value={feeForm.due_date}
                            onChange={e => setFeeForm(f => ({ ...f, due_date: e.target.value }))}
                            className="border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white"
                          />
                          <select
                            value={feeForm.status}
                            onChange={e => setFeeForm(f => ({ ...f, status: e.target.value }))}
                            className="border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white"
                          >
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                          </select>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setShowAddFee(false)} className="px-3 py-1.5 text-xs text-stone-600">Cancel</button>
                          <button onClick={handleAddFee} disabled={actionLoading} className="px-4 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl">Save Fee</button>
                        </div>
                      </div>
                    )}

                    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm divide-y divide-stone-100">
                      {fees.length > 0 ? (
                        fees.map(f => (
                          <div key={f.id} className="p-4 flex items-center justify-between">
                            <div>
                              <p className="font-bold text-stone-900 text-sm">{f.month}</p>
                              <p className="text-xs text-stone-400">Due: {f.due_date || 'N/A'}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-stone-900 text-sm">₹{f.amount}</span>
                              <button
                                onClick={() => handleToggleFeeStatus(f.id, f.status)}
                                className={`text-xs font-bold px-3 py-1 rounded-full capitalize transition-colors ${
                                  f.status === 'paid' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                }`}
                              >
                                {f.status} (Toggle)
                              </button>
                              <button onClick={() => handleDeleteFee(f.id)} className="p-1 text-stone-300 hover:text-red-600">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="p-8 text-center text-stone-400 text-xs">No fee records</p>
                      )}
                    </div>
                  </div>
                )}

                {/* ── SUBTAB 5: ACHIEVEMENTS ── */}
                {activeSubTab === 'achievements' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-stone-900 text-base">Achievements & Awards</h3>
                      <button
                        onClick={() => setShowAddAch(!showAddAch)}
                        className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Award
                      </button>
                    </div>

                    {showAddAch && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
                        <h4 className="font-bold text-emerald-900 text-xs uppercase tracking-wider">New Award Record</h4>
                        <input
                          placeholder="Award Title (e.g. 1st Place Quran Recitation)"
                          value={achForm.title}
                          onChange={e => setAchForm(f => ({ ...f, title: e.target.value }))}
                          className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white"
                        />
                        <textarea
                          placeholder="Description / Note..."
                          rows={2}
                          value={achForm.description}
                          onChange={e => setAchForm(f => ({ ...f, description: e.target.value }))}
                          className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white"
                        />
                        <input
                          type="date"
                          value={achForm.date}
                          onChange={e => setAchForm(f => ({ ...f, date: e.target.value }))}
                          className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white"
                        />
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setShowAddAch(false)} className="px-3 py-1.5 text-xs text-stone-600">Cancel</button>
                          <button onClick={handleAddAchievement} disabled={actionLoading} className="px-4 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl">Save Award</button>
                        </div>
                      </div>
                    )}

                    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm divide-y divide-stone-100">
                      {achievements.length > 0 ? (
                        achievements.map(a => (
                          <div key={a.id} className="p-4 flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Star className="w-4 h-4 text-purple-600" />
                              </div>
                              <div>
                                <p className="font-bold text-stone-900 text-sm">{a.title}</p>
                                {a.description && <p className="text-xs text-stone-500 mt-0.5">{a.description}</p>}
                                <p className="text-[10px] text-stone-400 mt-1">{a.date}</p>
                              </div>
                            </div>
                            <button onClick={() => handleDeleteAchievement(a.id)} className="p-1 text-stone-300 hover:text-red-600">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="p-8 text-center text-stone-400 text-xs">No achievements recorded</p>
                      )}
                    </div>
                  </div>
                )}

                {/* ── SUBTAB 6: TASKS & HOMEWORK ── */}
                {activeSubTab === 'tasks' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-stone-900 text-base">Student Tasks & Homework</h3>
                      <button
                        onClick={() => setShowAddTask(!showAddTask)}
                        className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Assign Task
                      </button>
                    </div>

                    {showAddTask && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
                        <h4 className="font-bold text-emerald-900 text-xs uppercase tracking-wider">Assign New Task / Homework</h4>
                        <input
                          placeholder="Task Title (e.g. Memorize Surah Yasin v1-10)"
                          value={taskForm.title}
                          onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
                          className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white"
                        />
                        <textarea
                          placeholder="Task details or remarks..."
                          rows={2}
                          value={taskForm.description}
                          onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))}
                          className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white"
                        />
                        <input
                          type="date"
                          value={taskForm.due_date}
                          onChange={e => setTaskForm(f => ({ ...f, due_date: e.target.value }))}
                          className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white"
                        />
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setShowAddTask(false)} className="px-3 py-1.5 text-xs text-stone-600">Cancel</button>
                          <button onClick={handleAddTask} disabled={actionLoading} className="px-4 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl">Assign Task</button>
                        </div>
                      </div>
                    )}

                    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm divide-y divide-stone-100">
                      {tasks.length > 0 ? (
                        tasks.map(t => (
                          <div key={t.id} className="p-4 flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <button
                                onClick={() => handleToggleTask(t.id, t.status)}
                                className={`w-6 h-6 rounded-lg border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                                  t.status === 'completed' ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-stone-300 hover:border-emerald-500'
                                }`}
                              >
                                {t.status === 'completed' && <Check className="w-3.5 h-3.5" />}
                              </button>
                              <div>
                                <p className={`font-bold text-stone-900 text-sm ${t.status === 'completed' ? 'line-through text-stone-400' : ''}`}>
                                  {t.title}
                                </p>
                                {t.description && <p className="text-xs text-stone-500 mt-0.5">{t.description}</p>}
                                {t.due_date && <p className="text-[10px] text-stone-400 mt-1">Due: {t.due_date}</p>}
                              </div>
                            </div>
                            <button onClick={() => handleDeleteTask(t.id)} className="p-1 text-stone-300 hover:text-red-600">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="p-8 text-center text-stone-400 text-xs">No tasks or homework assigned</p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AdminStudentModal;
