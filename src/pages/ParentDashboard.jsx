import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, LogOut, ChevronRight, Users, AlertCircle,
  Calendar, TrendingUp, DollarSign, Award, Bell, Megaphone, AlertTriangle, Trophy, ShieldCheck, X
} from 'lucide-react';
import { toast } from 'sonner';
import { logout, clearCachedProfile } from '@/utils/auth';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { fetchFullLeaderboardData } from '@/utils/leaderboard';
import LeaderboardShowcase from '@/components/LeaderboardShowcase';
import {
  filterAnnouncementsForParent,
  getNotificationPermission,
  requestNotificationPermission,
  sendPushNotification
} from '@/utils/notifications';

const ParentDashboard = () => {
  const navigate = useNavigate();
  const { session, profile } = useAuth();
  const [children, setChildren] = useState([]);
  const [leaderboardStandings, setLeaderboardStandings] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pushPermission, setPushPermission] = useState(getNotificationPermission());
  const [dismissedNotifs, setDismissedNotifs] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => { fetchChildren(); }, [session?.user?.id]);
  useEffect(() => {
    let alive = true;

    const loadLeaderboard = async () => {
      if (!session?.user) return;
      try {
        const { standings } = await fetchFullLeaderboardData();
        if (alive) {
          setLeaderboardStandings(standings || []);
        }
      } catch (error) {
        console.error(error);
      }
    };

    loadLeaderboard();
    const timer = setInterval(loadLeaderboard, 30000);

    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [session?.user?.id]);

  const fetchChildren = async () => {
    try {
      if (!session?.user) return;
      
      setUserId(session.user.id);
      const storedDismissed = JSON.parse(localStorage.getItem(`dismissed_notifs_${session.user.id}`) || '[]');
      setDismissedNotifs(storedDismissed);

      // Fetch all students linked to this parent
      const { data: students, error } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', session.user.id)
        .order('full_name');

      if (error) throw error;

      // Read a fresh snapshot for rank badges and child leaderboard cards.
      const { standings: currentStandings } = await fetchFullLeaderboardData();

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

          const lbInfo = currentStandings.find(s => s.id === student.id) || {
            rank: '—',
            totalPoints: 0,
            attendancePoints: 0,
            examPoints: 0,
            taskPoints: 0,
            disciplinePoints: 0,
          };

          return { ...student, attendancePct, pendingFees, avgScore, totalFees: (fees || []).length, lbInfo };
        })
      );

      setChildren(enriched);

      // Fetch announcements filtered strictly for parent's linked child classes
      const childClasses = (students || []).map(s => s.class_level).filter(Boolean);
      const { data: allAnnouncements } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      const filtered = filterAnnouncementsForParent(allAnnouncements, childClasses).filter(a => {
        if (a.expires_at && new Date(a.expires_at) < new Date()) return false;
        return true;
      });
      setAnnouncements(filtered);

      // Trigger browser push notification for newest targeted announcement if permission granted
      if (filtered.length > 0 && Notification.permission === 'granted') {
        const latest = filtered[0];
        // Send push notification if posted within the last 15 minutes
        const diffMinutes = (new Date() - new Date(latest.created_at)) / (1000 * 60);
        if (diffMinutes <= 15) {
          sendPushNotification(latest.title, { body: latest.message });
        }
      }
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

  const handleDismissNotif = (id) => {
    const updated = [...dismissedNotifs, id];
    setDismissedNotifs(updated);
    if (userId) {
      localStorage.setItem(`dismissed_notifs_${userId}`, JSON.stringify(updated));
    }
  };

  const activeAnnouncements = announcements.filter(a => !dismissedNotifs.includes(a.id));

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
          <div className="flex items-center gap-2 relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-xl hover:bg-stone-100 text-stone-500 transition-colors"
            >
              <Bell className="w-5 h-5" />
              {activeAnnouncements.length > 0 && (
                <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute top-full right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden z-50">
                <div className="p-3 border-b border-stone-100 flex items-center justify-between bg-stone-50">
                  <h3 className="font-bold text-sm text-stone-800">Notifications</h3>
                  {activeAnnouncements.length > 0 && (
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{activeAnnouncements.length} New</span>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto p-2 space-y-2">
                  {activeAnnouncements.length === 0 ? (
                    <div className="p-4 text-center text-stone-400">
                      <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      <p className="text-xs">No new notifications</p>
                    </div>
                  ) : (
                    activeAnnouncements.map(ann => (
                      <div key={ann.id} className="relative p-3 rounded-xl bg-white border border-stone-100 shadow-sm hover:border-stone-200 transition-colors pr-8">
                        <button
                          onClick={() => handleDismissNotif(ann.id)}
                          className="absolute top-2 right-2 p-1 text-stone-300 hover:text-stone-500 hover:bg-stone-100 rounded-lg transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <h4 className="text-xs font-bold text-stone-800 mb-1 line-clamp-1">{ann.title}</h4>
                        <p className="text-[10px] text-stone-500 line-clamp-2">{ann.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <span className="text-xs text-stone-500 hidden sm:block pl-2 border-l border-stone-200 ml-2">{profile?.full_name}</span>
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

        {/* ── PUSH NOTIFICATION PERMISSION BANNER ── */}
        {pushPermission === 'default' && (
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-4 shadow-md flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div>
                <p className="font-bold text-xs">Enable Audience Push Notifications</p>
                <p className="text-[11px] text-emerald-100 mt-0.5">Receive instant alerts for your child's class homework &amp; notices.</p>
              </div>
            </div>
            <button
              onClick={async () => {
                const res = await requestNotificationPermission();
                setPushPermission(res);
                if (res === 'granted') {
                  toast.success('Push notifications enabled!');
                  sendPushNotification('RMS Madrasa Push Notifications Enabled', {
                    body: 'You will now receive instant alerts for your child’s class homework and announcements.',
                  });
                }
              }}
              className="bg-white text-emerald-800 text-xs font-bold px-3.5 py-2 rounded-xl hover:bg-emerald-50 transition-colors flex-shrink-0 shadow-sm"
            >
              Enable
            </button>
          </div>
        )}

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
            {leaderboardStandings.length > 0 && (
              <LeaderboardShowcase
                standings={leaderboardStandings}
                highlightIds={children.map(child => child.id)}
                title="Top Performers"
              />
            )}
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

                  {/* Leaderboard & Points Breakdown Banner */}
                  <div className="mx-5 mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-amber-600" />
                        <span className="text-xs font-bold text-amber-900">Leaderboard Position</span>
                      </div>
                      <span className="bg-amber-500 text-white font-black text-xs px-2.5 py-0.5 rounded-full shadow-sm">
                        Rank #{child.lbInfo.rank} ({child.lbInfo.totalPoints} pts)
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] pt-1 border-t border-amber-500/10">
                      <div className="bg-white/80 p-1 rounded-lg">
                        <p className="font-bold text-stone-700">+{child.lbInfo.attendancePoints}</p>
                        <p className="text-stone-400">Attendance</p>
                      </div>
                      <div className="bg-white/80 p-1 rounded-lg">
                        <p className="font-bold text-stone-700">+{child.lbInfo.examPoints}</p>
                        <p className="text-stone-400">Exams</p>
                      </div>
                      <div className="bg-white/80 p-1 rounded-lg">
                        <p className="font-bold text-stone-700">+{child.lbInfo.taskPoints}</p>
                        <p className="text-stone-400">Tasks</p>
                      </div>
                      <div className="bg-white/80 p-1 rounded-lg">
                        <p className="font-bold text-stone-700">+{child.lbInfo.disciplinePoints}</p>
                        <p className="text-stone-400">Discipline</p>
                      </div>
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
