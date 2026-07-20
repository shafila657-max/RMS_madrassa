import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, LogOut, ChevronRight, Users, AlertCircle,
  Calendar, TrendingUp, DollarSign, Award, Bell, Megaphone, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { logout, getCachedProfile, clearCachedProfile } from '@/utils/auth';
import { supabase } from '@/lib/supabase';

const ParentDashboard = () => {
  const navigate = useNavigate();
  const profile = getCachedProfile();
  const [children, setChildren] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchChildren(); }, []);

  const fetchChildren = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }

      // Fetch all students linked to this parent
      const { data: students, error } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', session.user.id)
        .order('full_name');

      if (error) throw error;

      // For each student, fetch quick summary stats
      const enriched = await Promise.all(
        (students || []).map(async (student) => {
          const [
            { data: attendanceRows },
            { data: fees },
            { data: scores },
          ] = await Promise.all([
            supabase.from('attendance').select('status').eq('student_id', student.id),
            supabase.from('fees').select('amount, status').eq('student_id', student.id),
            supabase.from('scores').select('marks_obtained, total_marks').eq('student_id', student.id),
          ]);

          const present = (attendanceRows || []).filter(a => a.status === 'present').length;
          const total = (attendanceRows || []).length;
          const attendancePct = total > 0 ? Math.round((present / total) * 100) : 0;

          const pendingFees = (fees || [])
            .filter(f => f.status === 'pending')
            .reduce((s, f) => s + Number(f.amount), 0);

          const avgScore = (scores || []).length > 0
            ? Math.round((scores || []).reduce((s, sc) => s + (sc.marks_obtained / sc.total_marks) * 100, 0) / scores.length)
            : null;

          return { ...student, attendancePct, pendingFees, avgScore, totalFees: (fees || []).length };
        })
      );

      setChildren(enriched);

      // Fetch announcements
      const childClasses = (students || []).map(s => s.class_level).filter(Boolean);
      const { data: allAnnouncements } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      const filtered = (allAnnouncements || []).filter(a =>
        a.target_class === 'All' || childClasses.includes(a.target_class)
      );

      setAnnouncements(filtered);
    } catch (error) {
      toast.error('Failed to load children profiles');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    clearCachedProfile();
    toast.success('Logged out');
    navigate('/');
  };

  // Color palette per child index
  const palettes = [
    { bg: 'from-emerald-500 to-emerald-600', light: 'bg-emerald-50', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700' },
    { bg: 'from-blue-500 to-blue-600', light: 'bg-blue-50', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700' },
    { bg: 'from-purple-500 to-purple-600', light: 'bg-purple-50', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-700' },
    { bg: 'from-amber-500 to-amber-600', light: 'bg-amber-50', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' },
    { bg: 'from-rose-500 to-rose-600', light: 'bg-rose-50', text: 'text-rose-700', badge: 'bg-rose-100 text-rose-700' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-stone-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-stone-500 font-medium">Loading family profiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-stone-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-stone-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center text-white font-bold shadow-md shadow-emerald-200">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-stone-900 text-sm">RMS Madrasa</span>
              <p className="text-[11px] text-stone-400 font-medium">Parent Family Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500 hidden sm:block">{profile?.full_name}</span>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl hover:bg-stone-100 text-stone-500 transition-colors"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Greeting */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-stone-500 text-sm font-medium">Good day,</p>
          <h1 className="text-2xl font-bold text-stone-900">{profile?.full_name || 'Parent'}</h1>
          <p className="text-stone-400 text-sm mt-1">
            {children.length === 0
              ? 'No children linked yet'
              : `${children.length} ${children.length === 1 ? 'child' : 'children'} enrolled`}
          </p>
        </motion.div>

        {/* ── ANNOUNCEMENTS / NOTIFICATIONS SECTION ── */}
        {announcements.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-500 animate-bounce" /> Announcements & Notifications
              </h2>
              <span className="text-xs font-semibold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                {announcements.length} new
              </span>
            </div>

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
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${badgeStyle}`}>
                          {isHigh ? 'Urgent' : isMedium ? 'Important' : 'Notice'}
                        </span>
                        {item.target_class !== 'All' && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                            {item.target_class}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-stone-400">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}
                      </span>
                    </div>

                    <div className="flex items-start gap-2">
                      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isHigh ? 'text-red-600' : isMedium ? 'text-amber-600' : 'text-emerald-600'}`} />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm leading-snug mb-1">{item.title}</h3>
                        <p className="text-xs leading-relaxed opacity-90 whitespace-pre-line">{item.message}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* No children state */}
        {children.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-8 text-center shadow-sm border border-stone-100"
          >
            <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-stone-400" />
            </div>
            <h3 className="text-lg font-bold text-stone-900 mb-2">No Children Linked</h3>
            <p className="text-stone-500 text-sm leading-relaxed">
              Your account doesn't have any children linked yet.
              Please contact the administrator to link your child's profile.
            </p>
            <div className="mt-5 p-3 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 text-left">
                Admin will link your child using your registered email: <strong>{profile?.email || 'your email'}</strong>
              </p>
            </div>
          </motion.div>
        )}

        {/* Children Cards */}
        {children.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-stone-900">Enrolled Children ({children.length})</h2>
            {children.map((child, idx) => {
              const palette = palettes[idx % palettes.length];
              return (
                <motion.div
                  key={child.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => navigate(`/parent/${child.id}`)}
                  className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
                >
                  {/* Child Header */}
                  <div className={`bg-gradient-to-r ${palette.bg} p-5 text-white`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center mb-3">
                          <span className="text-lg font-bold">{child.full_name.charAt(0).toUpperCase()}</span>
                        </div>
                        <h2 className="text-lg font-bold leading-tight">{child.full_name}</h2>
                        <p className="text-white/80 text-sm mt-0.5">{child.class_level}</p>
                      </div>
                      <div className="flex items-center gap-1 bg-white/20 rounded-full px-3 py-1.5 mt-1">
                        <span className="text-xs font-medium">View</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>

                  {/* Quick Stats Row */}
                  <div className="px-5 py-4 grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                      </div>
                      <p className="text-lg font-bold text-stone-900">{child.attendancePct}%</p>
                      <p className="text-xs text-stone-400">Attendance</p>
                    </div>
                    <div className="text-center border-x border-stone-100">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <TrendingUp className="w-3.5 h-3.5 text-stone-400" />
                      </div>
                      <p className="text-lg font-bold text-stone-900">
                        {child.avgScore !== null ? `${child.avgScore}%` : '—'}
                      </p>
                      <p className="text-xs text-stone-400">Avg Score</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <DollarSign className="w-3.5 h-3.5 text-stone-400" />
                      </div>
                      <p className={`text-lg font-bold ${child.pendingFees > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {child.pendingFees > 0 ? `₹${child.pendingFees}` : '✓'}
                      </p>
                      <p className="text-xs text-stone-400">Fees Due</p>
                    </div>
                  </div>

                  {/* Admission date footer */}
                  <div className="px-5 pb-4">
                    <p className="text-xs text-stone-400">
                      Admitted: {child.admission_date
                        ? new Date(child.admission_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentDashboard;