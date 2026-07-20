import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, LogOut, Users, UserCheck, DollarSign, TrendingUp,
  CheckCircle, XCircle, Plus, X, Link, Calendar, Search,
  GraduationCap, ChevronDown, AlertCircle, RefreshCw,
  Bell, Megaphone, AlertTriangle, Trash2, Volume2, Edit3
} from 'lucide-react';
import { toast } from 'sonner';
import { logout, getCachedProfile, clearCachedProfile } from '@/utils/auth';
import { supabase } from '@/lib/supabase';
import AdminStudentModal from '@/components/AdminStudentModal';

// ─── Reusable Modal ────────────────────────────────────────────────────────────
const Modal = ({ open, onClose, title, children }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between p-5 border-b border-stone-100">
            <h3 className="font-bold text-stone-900 text-lg">{title}</h3>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-stone-100 text-stone-400 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5">{children}</div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

const Input = ({ label, ...props }) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-medium text-stone-700 mb-1">{label}</label>}
    <input
      {...props}
      className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
    />
  </div>
);

const Select = ({ label, children, ...props }) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-medium text-stone-700 mb-1">{label}</label>}
    <select
      {...props}
      className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all bg-white"
    >
      {children}
    </select>
  </div>
);

const Btn = ({ children, variant = 'primary', loading, className = '', ...props }) => {
  const base = 'inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all disabled:opacity-50';
  const variants = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100',
    ghost: 'bg-stone-100 text-stone-700 hover:bg-stone-200',
    outline: 'border border-stone-200 text-stone-700 hover:bg-stone-50',
  };
  return (
    <button {...props} disabled={loading || props.disabled} className={`${base} ${variants[variant]} ${className}`}>
      {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : children}
    </button>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color, delay = 0 }) => (
  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
    className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <p className="text-xs text-stone-500 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-stone-900">{value}</p>
    </div>
  </motion.div>
);

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const navigate = useNavigate();
  const profile = getCachedProfile();

  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Pending users
  const [pendingUsers, setPendingUsers] = useState([]);

  // Students
  const [students, setStudents] = useState([]);
  const [parents, setParents] = useState([]);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showLinkParent, setShowLinkParent] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentForm, setStudentForm] = useState({ full_name: '', class_level: '', admission_date: '' });
  const [linkParentEmail, setLinkParentEmail] = useState('');
  const [selectedParentId, setSelectedParentId] = useState(null);
  const [show360Modal, setShow360Modal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentStatusFilter, setStudentStatusFilter] = useState('active'); // default active!

  // Attendance
  const [attendanceStudents, setAttendanceStudents] = useState([]);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const [attendanceLoaded, setAttendanceLoaded] = useState(false);

  // Fees
  const [feeStudents, setFeeStudents] = useState([]);
  const [showAddFee, setShowAddFee] = useState(false);
  const [feeForm, setFeeForm] = useState({ student_id: '', month: '', amount: '', due_date: '', status: 'pending' });

  // Announcements
  const [announcements, setAnnouncements] = useState([]);
  const [showAddAnnouncement, setShowAddAnnouncement] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({ title: '', message: '', target_class: 'All', severity: 'normal' });

  // Alumni
  const [alumniData, setAlumniData] = useState([]);
  const [alumniEvents, setAlumniEvents] = useState([]);
  const [alumniRSVPs, setAlumniRSVPs] = useState([]);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [eventForm, setEventForm] = useState({ title: '', description: '', event_date: '', location: 'Madrasa Main Auditorium' });

  // Gallery
  const [galleryItems, setGalleryItems] = useState([]);
  const [showAddGallery, setShowAddGallery] = useState(false);
  const [galleryForm, setGalleryForm] = useState({ title: '', category: 'Meelad Fest', media_type: 'image', media_url: '' });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [
        { data: pending },
        { count: studentCount },
        { count: parentCount },
        { count: pendingCount },
        { data: feesData },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'parent').eq('status', 'approved'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('fees').select('amount, status'),
      ]);

      setPendingUsers(pending || []);
      setStats({
        total_students: studentCount || 0,
        total_parents: parentCount || 0,
        pending_approvals: pendingCount || 0,
        fees_collected: (feesData || []).filter(f => f.status === 'paid').reduce((s, f) => s + Number(f.amount), 0),
        fees_pending: (feesData || []).filter(f => f.status === 'pending').reduce((s, f) => s + Number(f.amount), 0),
      });
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = useCallback(async () => {
    const { data } = await supabase
      .from('students')
      .select(`*, profiles(full_name, id)`)
      .order('full_name');
    setStudents(data || []);
  }, []);

  const fetchParents = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'parent')
      .eq('status', 'approved')
      .order('full_name');
    setParents(data || []);
  }, []);

  const fetchAttendanceForDate = useCallback(async (date) => {
    setAttendanceLoaded(false);
    const { data: studentsData } = await supabase
      .from('students')
      .select('id, full_name, class_level, status')
      .or('status.eq.active,status.is.null')
      .order('full_name');
    setAttendanceStudents(studentsData || []);

    const { data: existing } = await supabase
      .from('attendance')
      .select('student_id, status')
      .eq('date', date);

    const map = {};
    (studentsData || []).forEach(s => { map[s.id] = 'present'; }); // default present
    (existing || []).forEach(r => { map[r.student_id] = r.status; });
    setAttendanceMap(map);
    setAttendanceLoaded(true);
  }, []);

  const fetchFeeStudents = useCallback(async () => {
    const { data } = await supabase.from('students').select('id, full_name, class_level').order('full_name');
    setFeeStudents(data || []);
  }, []);

  const fetchAnnouncements = useCallback(async () => {
    const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
    setAnnouncements(data || []);
  }, []);

  const fetchAdminAlumni = useCallback(async () => {
    const [
      { data: profiles },
      { data: events },
      { data: rsvps },
    ] = await Promise.all([
      supabase.from('alumni_profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('alumni_events').select('*').order('created_at', { ascending: false }),
      supabase.from('alumni_rsvps').select('*').order('created_at', { ascending: false }),
    ]);

    setAlumniData(profiles || []);
    setAlumniEvents(events || []);
    setAlumniRSVPs(rsvps || []);
  }, []);

  const fetchGalleryItems = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('gallery_items')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setGalleryItems(data || []);
    } catch (err) {
      toast.error('Failed to fetch gallery items: ' + err.message);
    }
  }, []);

  // Tab switch: lazy load
  useEffect(() => {
    if (activeTab === 'students') { fetchStudents(); fetchParents(); }
    if (activeTab === 'attendance') { fetchAttendanceForDate(attendanceDate); }
    if (activeTab === 'fees') { fetchFeeStudents(); }
    if (activeTab === 'announcements') { fetchAnnouncements(); }
    if (activeTab === 'alumni') { fetchAdminAlumni(); }
    if (activeTab === 'gallery') { fetchGalleryItems(); }
  }, [activeTab, fetchGalleryItems]);

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleApprove = async (userId) => {
    await supabase.from('profiles').update({ status: 'approved' }).eq('id', userId);
    toast.success('User approved');
    fetchAll();
  };

  const handleReject = async (userId) => {
    await supabase.from('profiles').update({ status: 'rejected' }).eq('id', userId);
    toast.success('User rejected');
    fetchAll();
  };

  const handleAddStudent = async () => {
    if (!studentForm.full_name || !studentForm.class_level) { toast.error('Name and class are required'); return; }
    setFormLoading(true);
    try {
      const { error } = await supabase.from('students').insert([{ ...studentForm }]);
      if (error) throw error;
      toast.success('Student added!');
      setShowAddStudent(false);
      setStudentForm({ full_name: '', class_level: '', admission_date: '' });
      fetchStudents();
      fetchAll();
    } catch (err) {
      toast.error('Failed to add student: ' + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleLinkParent = async () => {
    if (!selectedStudent) return;

    // Must have either a selected parent from the list OR an email entered
    if (!selectedParentId && !linkParentEmail) {
      toast.error('Please select a parent from the list');
      return;
    }

    setFormLoading(true);
    try {
      let parentId = selectedParentId;

      // If no parent selected from list but email was typed, try to find by full_name match
      if (!parentId && linkParentEmail) {
        const match = parents.find(p =>
          p.full_name.toLowerCase().includes(linkParentEmail.toLowerCase())
        );
        if (match) parentId = match.id;
      }

      if (!parentId) {
        toast.error('Parent not found. Please select from the list.');
        setFormLoading(false);
        return;
      }

      const { error } = await supabase
        .from('students')
        .update({ user_id: parentId })
        .eq('id', selectedStudent.id);

      if (error) throw error;

      const parentName = parents.find(p => p.id === parentId)?.full_name || 'parent';
      toast.success(`${selectedStudent.full_name} linked to ${parentName}`);
      setShowLinkParent(false);
      setLinkParentEmail('');
      setSelectedParentId(null);
      fetchStudents();
    } catch (err) {
      toast.error('Failed to link: ' + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteStudent = async (studentId, name) => {
    if (!window.confirm(`Delete ${name}? This will also remove their fees, attendance, and scores.`)) return;
    const { error } = await supabase.from('students').delete().eq('id', studentId);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success(`${name} deleted`);
    fetchStudents();
    fetchAll();
  };

  const handleSaveAttendance = async () => {
    setAttendanceSaving(true);
    try {
      const rows = Object.entries(attendanceMap).map(([student_id, status]) => ({
        student_id,
        date: attendanceDate,
        status,
      }));

      // Upsert (insert or update for that date)
      const { error } = await supabase
        .from('attendance')
        .upsert(rows, { onConflict: 'student_id,date' });

      if (error) throw error;
      toast.success(`Attendance saved for ${attendanceDate}`);
    } catch (err) {
      toast.error('Failed to save: ' + err.message);
    } finally {
      setAttendanceSaving(false);
    }
  };

  const handleAddFee = async () => {
    if (!feeForm.student_id || !feeForm.month || !feeForm.amount) {
      toast.error('Student, month, and amount are required');
      return;
    }
    setFormLoading(true);
    try {
      const { error } = await supabase.from('fees').insert([{ ...feeForm }]);
      if (error) throw error;
      toast.success('Fee record added!');
      setShowAddFee(false);
      setFeeForm({ student_id: '', month: '', amount: '', due_date: '', status: 'pending' });
      fetchAll();
    } catch (err) {
      toast.error('Failed: ' + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!announcementForm.title || !announcementForm.message) {
      toast.error('Title and Message are required');
      return;
    }
    setFormLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase.from('announcements').insert([{
        ...announcementForm,
        created_by: session?.user?.id
      }]);
      if (error) throw error;
      toast.success('Announcement published!');
      setShowAddAnnouncement(false);
      setAnnouncementForm({ title: '', message: '', target_class: 'All', severity: 'normal' });
      fetchAnnouncements();
    } catch (err) {
      toast.error('Failed to post announcement: ' + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
      toast.success('Announcement deleted');
      fetchAnnouncements();
    } catch (err) {
      toast.error('Failed to delete announcement');
    }
  };

  const handleApproveAlumni = async (id) => {
    try {
      const { error } = await supabase.from('alumni_profiles').update({ status: 'approved' }).eq('id', id);
      if (error) throw error;
      toast.success('Alumni profile approved!');
      fetchAdminAlumni();
    } catch (err) {
      toast.error('Failed to approve alumni');
    }
  };

  const handleRejectAlumni = async (id) => {
    try {
      const { error } = await supabase.from('alumni_profiles').update({ status: 'rejected' }).eq('id', id);
      if (error) throw error;
      toast.success('Alumni profile rejected');
      fetchAdminAlumni();
    } catch (err) {
      toast.error('Failed to reject alumni');
    }
  };

  const handleDeleteAlumni = async (id) => {
    if (!window.confirm('Delete this alumni record?')) return;
    try {
      const { error } = await supabase.from('alumni_profiles').delete().eq('id', id);
      if (error) throw error;
      toast.success('Alumni record deleted');
      fetchAdminAlumni();
    } catch (err) {
      toast.error('Failed to delete alumni');
    }
  };

  const handleToggleMentorStatus = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('alumni_profiles')
        .update({ is_mentor: !currentStatus })
        .eq('id', id);
      if (error) throw error;
      toast.success(`Mentor status updated!`);
      fetchAdminAlumni();
    } catch (err) {
      toast.error('Failed to update mentor status');
    }
  };

  const handleCreateAlumniEvent = async () => {
    if (!eventForm.title || !eventForm.event_date) {
      toast.error('Title and Date are required');
      return;
    }
    setFormLoading(true);
    try {
      const { error } = await supabase.from('alumni_events').insert([{
        title: eventForm.title,
        description: eventForm.description,
        event_date: eventForm.event_date,
        location: eventForm.location || 'Madrasa Main Auditorium',
      }]);
      if (error) throw error;
      toast.success('Alumni Event published!');
      setShowAddEvent(false);
      setEventForm({ title: '', description: '', event_date: '', location: 'Madrasa Main Auditorium' });
      fetchAdminAlumni();
    } catch (err) {
      toast.error('Failed to create event: ' + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteAlumniEvent = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    try {
      const { error } = await supabase.from('alumni_events').delete().eq('id', id);
      if (error) throw error;
      toast.success('Event deleted');
      fetchAdminAlumni();
    } catch (err) {
      toast.error('Failed to delete event');
    }
  };

  const handleAddGalleryItem = async (e) => {
    e.preventDefault();
    if (!galleryForm.title || !galleryForm.media_url) {
      toast.error('Title and Media URL are required');
      return;
    }
    setFormLoading(true);
    try {
      const { error } = await supabase.from('gallery_items').insert([{
        title: galleryForm.title,
        category: galleryForm.category,
        media_type: galleryForm.media_type,
        media_url: galleryForm.media_url
      }]);
      if (error) throw error;
      toast.success('Gallery item added successfully!');
      setGalleryForm({ title: '', category: 'Meelad Fest', media_type: 'image', media_url: '' });
      setShowAddGallery(false);
      fetchGalleryItems();
    } catch (err) {
      toast.error('Failed to add gallery item: ' + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteGalleryItem = async (id) => {
    if (!window.confirm('Are you sure you want to delete this gallery item?')) return;
    try {
      const { error } = await supabase.from('gallery_items').delete().eq('id', id);
      if (error) throw error;
      toast.success('Gallery item deleted');
      fetchGalleryItems();
    } catch (err) {
      toast.error('Failed to delete gallery item: ' + err.message);
    }
  };

  const handleLogout = async () => {
    await logout(); clearCachedProfile(); navigate('/');
  };

  const handleQuickStudentStatusChange = async (studentId, newStatus) => {
    try {
      const { error } = await supabase
        .from('students')
        .update({ status: newStatus })
        .eq('id', studentId);
      if (error) throw error;
      toast.success(`Student status changed to ${newStatus}`);
      fetchStudents();
    } catch (err) {
      toast.error('Failed to change status');
    }
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const filteredStudents = students.filter(s => {
    const matchesSearch =
      s.full_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.class_level?.toLowerCase().includes(studentSearch.toLowerCase());

    const sStatus = s.status || 'active';
    const matchesStatus =
      studentStatusFilter === 'all' ? true : sStatus === studentStatusFilter;

    return matchesSearch && matchesStatus;
  });

  const pendingAlumniCount = alumniData.filter(a => a.status === 'pending').length;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'approvals', label: `Approvals${pendingUsers.length > 0 ? ` (${pendingUsers.length})` : ''}` },
    { id: 'alumni', label: `Alumni${pendingAlumniCount > 0 ? ` (${pendingAlumniCount})` : ''}` },
    { id: 'announcements', label: 'Announcements' },
    { id: 'students', label: 'Students' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'fees', label: 'Fees' },
    { id: 'gallery', label: '📸 Gallery' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-stone-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-stone-500 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-stone-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-stone-900 text-sm leading-tight">RMS Madrasa</p>
              <p className="text-xs text-stone-400 leading-tight">Admin Panel</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-stone-600 hidden sm:block">{profile?.full_name}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-stone-100 text-stone-500 text-sm transition-colors"
              data-testid="admin-logout-button"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:block">Logout</span>
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto pb-0 scrollbar-hide">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === id
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">

          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h1 className="text-2xl font-bold text-stone-900 mb-6">Dashboard Overview</h1>
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <StatCard icon={GraduationCap} label="Students" value={stats?.total_students || 0} color="bg-blue-500" delay={0} />
                <StatCard icon={Users} label="Parents" value={stats?.total_parents || 0} color="bg-emerald-500" delay={0.05} />
                <StatCard icon={UserCheck} label="Pending" value={stats?.pending_approvals || 0} color="bg-amber-500" delay={0.1} />
                <StatCard icon={DollarSign} label="Collected" value={`₹${(stats?.fees_collected || 0).toFixed(0)}`} color="bg-emerald-600" delay={0.15} />
                <StatCard icon={TrendingUp} label="Dues" value={`₹${(stats?.fees_pending || 0).toFixed(0)}`} color="bg-red-500" delay={0.2} />
              </div>
              {pendingUsers.length > 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  <p className="text-sm text-amber-800">
                    <strong>{pendingUsers.length} user{pendingUsers.length > 1 ? 's' : ''}</strong> waiting for approval.
                    <button onClick={() => setActiveTab('approvals')} className="ml-2 text-amber-700 font-semibold underline">Review now</button>
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* ── APPROVALS ── */}
          {activeTab === 'approvals' && (
            <motion.div key="approvals" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="text-xl font-bold text-stone-900 mb-5">Pending User Approvals</h2>
              {pendingUsers.length > 0 ? (
                <div className="space-y-3">
                  {pendingUsers.map((u) => (
                    <div key={u.id} className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm flex items-center justify-between gap-4" data-testid={`pending-user-${u.id}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center font-bold text-emerald-700">
                          {u.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-semibold text-stone-900">{u.full_name}</p>
                          <p className="text-sm text-stone-400">{u.phone || 'No phone'}</p>
                          <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 mt-0.5">{u.role}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Btn variant="primary" onClick={() => handleApprove(u.id)} data-testid={`approve-user-${u.id}`}>
                          <CheckCircle className="w-3.5 h-3.5" /> Approve
                        </Btn>
                        <Btn variant="danger" onClick={() => handleReject(u.id)} data-testid={`reject-user-${u.id}`}>
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </Btn>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-16 text-center border border-stone-100">
                  <UserCheck className="w-14 h-14 text-stone-200 mx-auto mb-3" />
                  <p className="text-stone-400">No pending approvals</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ── ALUMNI MANAGEMENT ── */}
          {activeTab === 'alumni' && (
            <motion.div key="alumni" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-stone-900">Alumni Directory & Registration Approvals</h2>
                <span className="text-xs font-semibold px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full">
                  {alumniData.filter(a => a.status === 'approved').length} Approved Alumni
                </span>
              </div>

              {/* Pending Alumni Approvals */}
              {alumniData.filter(a => a.status === 'pending').length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm space-y-3">
                  <h3 className="font-bold text-amber-900 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600" /> Pending Alumni Registrations ({alumniData.filter(a => a.status === 'pending').length})
                  </h3>

                  <div className="space-y-3">
                    {alumniData.filter(a => a.status === 'pending').map((a) => (
                      <div key={a.id} className="bg-white rounded-xl p-4 border border-amber-200 flex flex-wrap items-center justify-between gap-3 shadow-sm">
                        <div>
                          <p className="font-bold text-stone-900 text-sm">{a.full_name} <span className="text-xs font-normal text-stone-500">(Batch of {a.passout_year})</span></p>
                          <p className="text-xs text-stone-600 font-medium">{a.working_area} {a.company_org ? `at ${a.company_org}` : ''}</p>
                          <p className="text-[11px] text-stone-400 mt-0.5">WhatsApp: {a.whatsapp_number} {a.location ? `· ${a.location}` : ''}</p>
                        </div>
                        <div className="flex gap-2">
                          <Btn variant="primary" onClick={() => handleApproveAlumni(a.id)}>
                            <CheckCircle className="w-3.5 h-3.5" /> Approve
                          </Btn>
                          <Btn variant="danger" onClick={() => handleRejectAlumni(a.id)}>
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </Btn>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Approved Alumni List */}
              <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden p-5">
                <h3 className="font-bold text-stone-900 text-sm mb-4">Approved Alumni Directory ({alumniData.filter(a => a.status === 'approved').length})</h3>
                {alumniData.filter(a => a.status === 'approved').length > 0 ? (
                  <div className="divide-y divide-stone-100">
                    {alumniData.filter(a => a.status === 'approved').map((a) => (
                      <div key={a.id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <p className="font-bold text-stone-900 text-sm flex items-center gap-2">
                            {a.full_name}
                            <span className="text-xs font-normal text-stone-400">· Batch {a.passout_year}</span>
                            {a.is_mentor && (
                              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                                🏅 Active Mentor
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-stone-600">{a.working_area} {a.company_org ? `@ ${a.company_org}` : ''}</p>
                          <p className="text-[11px] text-stone-400">{a.location || 'Location N/A'} · WA: {a.whatsapp_number}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleMentorStatus(a.id, a.is_mentor)}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors ${
                              a.is_mentor
                                ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                                : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                            }`}
                          >
                            {a.is_mentor ? '✓ Mentor' : '+ Make Mentor'}
                          </button>

                          <Btn variant="danger" onClick={() => handleDeleteAlumni(a.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Btn>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center text-stone-400 text-sm">
                    No approved alumni in directory yet.
                  </div>
                )}
              </div>

              {/* Alumni Events & Reunions Section */}
              <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-amber-500" /> Alumni Gatherings & Reunions
                    </h3>
                    <p className="text-xs text-stone-400">Post upcoming alumni events & view event RSVPs</p>
                  </div>
                  <Btn onClick={() => setShowAddEvent(true)}>
                    <Plus className="w-4 h-4" /> Create Event
                  </Btn>
                </div>

                {/* Event RSVPs count summary */}
                {alumniRSVPs.length > 0 && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2">
                    <h4 className="font-bold text-emerald-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-600" /> Event RSVPs / Registered Attendees ({alumniRSVPs.length})
                    </h4>
                    <div className="divide-y divide-emerald-100 max-h-48 overflow-y-auto">
                      {alumniRSVPs.map(r => (
                        <div key={r.id} className="py-2 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-stone-900">{r.attendee_name}</span>
                            <span className="text-stone-500 ml-2">({r.phone})</span>
                          </div>
                          <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-medium">
                            {r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'RSVPd'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Published Events list */}
                {alumniEvents.length > 0 ? (
                  <div className="space-y-3">
                    {alumniEvents.map(evt => (
                      <div key={evt.id} className="bg-stone-50 rounded-2xl p-4 border border-stone-200 flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-bold text-stone-900 text-sm">{evt.title}</h4>
                          <p className="text-xs text-stone-600 mt-0.5">{evt.description}</p>
                          <div className="flex items-center gap-3 text-[11px] text-stone-400 mt-2">
                            <span>📅 {evt.event_date ? new Date(evt.event_date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Date TBD'}</span>
                            <span>📍 {evt.location}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteAlumniEvent(evt.id)}
                          className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-stone-200/50 rounded-lg"
                          title="Delete event"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-stone-400 text-xs py-4 text-center">No alumni events scheduled yet. Click "Create Event" to post one.</p>
                )}
              </div>
            </motion.div>
          )}

          {/* ── ANNOUNCEMENTS ── */}
          {activeTab === 'announcements' && (
            <motion.div key="announcements" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-stone-900">Announcements & Notices</h2>
                <Btn onClick={() => setShowAddAnnouncement(true)}>
                  <Plus className="w-4 h-4" /> New Announcement
                </Btn>
              </div>

              {announcements.length > 0 ? (
                <div className="space-y-4">
                  {announcements.map((item) => {
                    const isHigh = item.severity === 'high';
                    const isMedium = item.severity === 'medium';
                    const cardStyle = isHigh
                      ? 'bg-red-50 border-red-200 border-l-4 border-l-red-600'
                      : isMedium
                      ? 'bg-amber-50 border-amber-200 border-l-4 border-l-amber-500'
                      : 'bg-white border-stone-200 border-l-4 border-l-stone-400 shadow-sm';

                    const badgeStyle = isHigh
                      ? 'bg-red-600 text-white'
                      : isMedium
                      ? 'bg-amber-500 text-white'
                      : 'bg-stone-200 text-stone-700';

                    return (
                      <div key={item.id} className={`rounded-2xl p-5 border transition-all ${cardStyle}`}>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${badgeStyle}`}>
                              {item.severity}
                            </span>
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700">
                              Target: {item.target_class || 'All'}
                            </span>
                            <span className="text-xs text-stone-400">
                              {item.created_at ? new Date(item.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : ''}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteAnnouncement(item.id)}
                            className="p-1.5 rounded-xl hover:bg-stone-200/50 text-stone-400 hover:text-red-600 transition-colors"
                            title="Delete Announcement"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <h3 className="font-bold text-stone-900 text-base mb-1">{item.title}</h3>
                        <p className="text-sm text-stone-700 whitespace-pre-line leading-relaxed">{item.message}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-16 text-center border border-stone-100">
                  <Megaphone className="w-14 h-14 text-stone-200 mx-auto mb-3" />
                  <p className="text-stone-400 mb-3">No announcements posted yet</p>
                  <Btn onClick={() => setShowAddAnnouncement(true)}>
                    <Plus className="w-4 h-4" /> Make Announcement
                  </Btn>
                </div>
              )}
            </motion.div>
          )}

          {/* ── STUDENTS ── */}
          {activeTab === 'students' && (
            <motion.div key="students" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-stone-900">Student Directory ({filteredStudents.length})</h2>
                  <p className="text-xs text-stone-400">Default view shows active enrolled students</p>
                </div>
                <Btn onClick={() => setShowAddStudent(true)}>
                  <Plus className="w-4 h-4" /> Add Student
                </Btn>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex flex-wrap items-center gap-2 p-1.5 bg-stone-100/80 rounded-2xl">
                {[
                  { id: 'active', label: '🟢 Active Enrolled', count: students.filter(s => (s.status || 'active') === 'active').length },
                  { id: 'completed', label: '🎓 Completed (Graduates)', count: students.filter(s => s.status === 'completed').length },
                  { id: 'dropped', label: '⚠️ Dropped Out', count: students.filter(s => s.status === 'dropped').length },
                  { id: 'all', label: '📂 All Students', count: students.length },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setStudentStatusFilter(tab.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      studentStatusFilter === tab.id
                        ? 'bg-white text-stone-900 shadow-sm'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      studentStatusFilter === tab.id ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  placeholder="Search by student name or class level..."
                  className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {filteredStudents.length > 0 ? (
                <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
                  <div className="divide-y divide-stone-50">
                    {filteredStudents.map((s) => {
                      const stStatus = s.status || 'active';
                      return (
                        <div key={s.id} className="p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-stone-50/80 transition-colors">
                          <div
                            className="flex items-center gap-3 flex-1 min-w-[200px] cursor-pointer"
                            onClick={() => { setSelectedStudent(s); setShow360Modal(true); }}
                          >
                            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center font-bold text-emerald-700 flex-shrink-0">
                              {s.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-stone-900 truncate flex items-center gap-2">
                                {s.full_name}
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">360° View</span>
                              </p>
                              <div className="flex items-center gap-2 text-xs text-stone-500 flex-wrap mt-0.5">
                                <span>{s.class_level}</span>
                                <span>·</span>
                                {s.user_id ? (
                                  <span className="text-emerald-600 font-medium">✓ Parent linked</span>
                                ) : (
                                  <span className="text-amber-500">No parent linked</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Quick Lifecycle Status Selector */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <select
                              value={stStatus}
                              onChange={(e) => handleQuickStudentStatusChange(s.id, e.target.value)}
                              className={`text-xs font-bold px-2.5 py-1.5 rounded-xl border focus:outline-none ${
                                stStatus === 'completed'
                                  ? 'bg-purple-50 text-purple-800 border-purple-200'
                                  : stStatus === 'dropped'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              <option value="active">🟢 Active Enrolled</option>
                              <option value="completed">🎓 Completed (Graduate)</option>
                              <option value="dropped">⚠️ Dropped Out</option>
                            </select>

                            <Btn
                              variant="primary"
                              onClick={() => { setSelectedStudent(s); setShow360Modal(true); }}
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Manage
                            </Btn>
                            <Btn
                              variant="ghost"
                              onClick={() => { setSelectedStudent(s); setShowLinkParent(true); }}
                            >
                              <Link className="w-3.5 h-3.5" /> Link Parent
                            </Btn>
                            <Btn
                              variant="danger"
                              onClick={() => handleDeleteStudent(s.id, s.full_name)}
                            >
                              <X className="w-3.5 h-3.5" />
                            </Btn>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-16 text-center border border-stone-100">
                  <GraduationCap className="w-14 h-14 text-stone-200 mx-auto mb-3" />
                  <p className="text-stone-400 mb-3">No students yet</p>
                  <Btn onClick={() => setShowAddStudent(true)}><Plus className="w-4 h-4" /> Add First Student</Btn>
                </div>
              )}
            </motion.div>
          )}

          {/* ── ATTENDANCE ── */}
          {activeTab === 'attendance' && (
            <motion.div key="attendance" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <h2 className="text-xl font-bold text-stone-900">Mark Attendance</h2>
                <div className="flex items-center gap-3">
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={e => { setAttendanceDate(e.target.value); fetchAttendanceForDate(e.target.value); }}
                    className="border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <Btn onClick={handleSaveAttendance} loading={attendanceSaving}>
                    <CheckCircle className="w-4 h-4" /> Save Attendance
                  </Btn>
                </div>
              </div>

              {attendanceStudents.length > 0 ? (
                <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
                  {/* Quick toggle all */}
                  <div className="p-3 border-b border-stone-50 flex gap-2">
                    <button
                      onClick={() => { const m = {}; attendanceStudents.forEach(s => m[s.id] = 'present'); setAttendanceMap(m); }}
                      className="text-xs px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg font-medium hover:bg-emerald-200"
                    >All Present</button>
                    <button
                      onClick={() => { const m = {}; attendanceStudents.forEach(s => m[s.id] = 'absent'); setAttendanceMap(m); }}
                      className="text-xs px-3 py-1.5 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200"
                    >All Absent</button>
                  </div>
                  <div className="divide-y divide-stone-50">
                    {attendanceStudents.map((s) => (
                      <div key={s.id} className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-stone-100 rounded-xl flex items-center justify-center font-bold text-stone-600 flex-shrink-0">
                            {s.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-stone-900">{s.full_name}</p>
                            <p className="text-xs text-stone-400">{s.class_level}</p>
                          </div>
                        </div>
                        <div className="flex rounded-xl overflow-hidden border border-stone-200">
                          {['present', 'absent', 'late'].map(status => (
                            <button
                              key={status}
                              onClick={() => setAttendanceMap(m => ({ ...m, [s.id]: status }))}
                              className={`px-3 py-1.5 text-xs font-semibold transition-colors capitalize ${
                                attendanceMap[s.id] === status
                                  ? status === 'present' ? 'bg-emerald-500 text-white'
                                    : status === 'absent' ? 'bg-red-500 text-white'
                                    : 'bg-amber-400 text-white'
                                  : 'text-stone-400 hover:bg-stone-50'
                              }`}
                            >
                              {status === 'present' ? 'P' : status === 'absent' ? 'A' : 'L'}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-16 text-center border border-stone-100">
                  <Calendar className="w-14 h-14 text-stone-200 mx-auto mb-3" />
                  <p className="text-stone-400">No students to mark attendance for</p>
                  <p className="text-sm text-stone-300 mt-1">Add students first</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ── FEES ── */}
          {activeTab === 'fees' && (
            <motion.div key="fees" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-stone-900">Fee Management</h2>
                <Btn onClick={() => setShowAddFee(true)}>
                  <Plus className="w-4 h-4" /> Add Fee Record
                </Btn>
              </div>
              <div className="bg-white rounded-2xl p-8 text-center border border-stone-100">
                <DollarSign className="w-12 h-12 text-stone-200 mx-auto mb-3" />
                <p className="text-stone-500">Use "Add Fee Record" to create fee entries for students.</p>
                <p className="text-stone-400 text-sm mt-1">₹{(stats?.fees_collected || 0).toFixed(0)} collected · ₹{(stats?.fees_pending || 0).toFixed(0)} pending</p>
              </div>
            </motion.div>
          )}

          {/* ── GALLERY ── */}
          {activeTab === 'gallery' && (
            <motion.div key="gallery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-bold text-stone-900">Media Gallery Manager</h2>
                  <p className="text-xs text-stone-500 mt-1">Upload event photos and YouTube video links for the public landing page</p>
                </div>
                <Btn onClick={() => {
                  setGalleryForm({ title: '', category: 'Meelad Fest', media_type: 'image', media_url: '' });
                  setShowAddGallery(true);
                }}>
                  <Plus className="w-4 h-4" /> Add Gallery Item
                </Btn>
              </div>

              <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-stone-50 text-stone-500 uppercase text-[10px] tracking-wider border-b border-stone-100">
                      <tr>
                        <th className="px-6 py-4">Preview</th>
                        <th className="px-6 py-4">Title</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">Type</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-stone-700">
                      {galleryItems.length > 0 ? (
                        galleryItems.map(item => (
                          <tr key={item.id} className="hover:bg-stone-50/55 transition-colors">
                            <td className="px-6 py-4">
                              {item.media_type === 'image' ? (
                                <img
                                  src={item.media_url}
                                  alt={item.title}
                                  className="w-12 h-12 object-cover rounded-xl border border-stone-100"
                                  onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100'; }}
                                />
                              ) : (
                                <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center border border-red-100 font-bold text-[10px]">
                                  Video
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 font-semibold text-stone-900">{item.title}</td>
                            <td className="px-6 py-4">
                              <span className="inline-block text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-medium">
                                {item.category}
                              </span>
                            </td>
                            <td className="px-6 py-4 capitalize font-medium text-stone-500">{item.media_type}</td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => handleDeleteGalleryItem(item.id)}
                                className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                title="Delete Item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="text-center py-12 text-stone-400">
                            <Plus className="w-12 h-12 text-stone-200 mx-auto mb-3" />
                            <p>No gallery items yet. Click "Add Gallery Item" to start!</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── MODAL: Add Student ── */}
      <Modal open={showAddStudent} onClose={() => setShowAddStudent(false)} title="Add New Student">
        <Input label="Full Name *" value={studentForm.full_name} onChange={e => setStudentForm(f => ({ ...f, full_name: e.target.value }))} placeholder="e.g. Ahmed Ali" />
        <Select label="Class Level *" value={studentForm.class_level} onChange={e => setStudentForm(f => ({ ...f, class_level: e.target.value }))}>
          <option value="">Select class...</option>
          {['Class 1','Class 2','Class 3','Class 4','Class 5','Class 6','Class 7','Class 8','Class 9','Class 10','Hifz','Alim'].map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
        <Input label="Admission Date" type="date" value={studentForm.admission_date} onChange={e => setStudentForm(f => ({ ...f, admission_date: e.target.value }))} />
        <div className="flex gap-2 mt-2">
          <Btn className="flex-1" onClick={handleAddStudent} loading={formLoading}>Add Student</Btn>
          <Btn variant="ghost" className="flex-1" onClick={() => setShowAddStudent(false)}>Cancel</Btn>
        </div>
      </Modal>

      {/* ── MODAL: Link Parent ── */}
      <Modal open={showLinkParent} onClose={() => setShowLinkParent(false)} title={`Link Parent to ${selectedStudent?.full_name}`}>
        <div className="mb-4 p-3 bg-stone-50 rounded-xl">
          <p className="text-sm text-stone-600">
            Enter the <strong>parent's registered email</strong> to link them. The parent must have a registered and approved account.
          </p>
        </div>
        <Input
          label="Parent's Email Address"
          type="email"
          value={linkParentEmail}
          onChange={e => setLinkParentEmail(e.target.value)}
          placeholder="parent@email.com"
        />

        {/* Or pick from approved parents */}
        {parents.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-stone-500 mb-2 font-medium">Or select from approved parents:</p>
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {parents.map(p => (
                <button
                  key={p.id}
                  onClick={() => setLinkParentEmail(p.full_name)} // We'll use ID directly below
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-stone-100 text-sm flex items-center gap-2"
                >
                  <div className="w-6 h-6 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-700 font-bold text-xs flex-shrink-0">
                    {p.full_name?.charAt(0)?.toUpperCase()}
                  </div>
                  {p.full_name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="bg-blue-50 rounded-xl p-3 mb-4">
          <p className="text-xs text-blue-700">
            💡 If you select from the list above, the link will use the parent's ID directly. 
            Alternatively, run this SQL in Supabase:
          </p>
          <code className="text-xs text-blue-600 block mt-1 break-all">
            UPDATE students SET user_id = (SELECT id FROM auth.users WHERE email = 'EMAIL') WHERE id = '{selectedStudent?.id}';
          </code>
        </div>

        <div className="flex gap-2">
          <Btn className="flex-1" onClick={handleLinkParent} loading={formLoading}>
            <Link className="w-3.5 h-3.5" /> Link Parent
          </Btn>
          <Btn variant="ghost" className="flex-1" onClick={() => setShowLinkParent(false)}>Cancel</Btn>
        </div>
      </Modal>

      {/* ── MODAL: Add Announcement ── */}
      <Modal open={showAddAnnouncement} onClose={() => setShowAddAnnouncement(false)} title="New Announcement / Notice">
        <Input
          label="Announcement Title *"
          value={announcementForm.title}
          onChange={e => setAnnouncementForm(f => ({ ...f, title: e.target.value }))}
          placeholder="e.g. Madrasa Holiday Notice"
        />

        <div className="mb-4">
          <label className="block text-sm font-medium text-stone-700 mb-1">Target Class *</label>
          <select
            value={announcementForm.target_class}
            onChange={e => setAnnouncementForm(f => ({ ...f, target_class: e.target.value }))}
            className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="All">All Classes (General Announcement)</option>
            {['Class 1','Class 2','Class 3','Class 4','Class 5','Class 6','Class 7','Class 8','Class 9','Class 10','Hifz','Alim'].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-stone-700 mb-1">Importance / Severity *</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'normal', label: 'Normal', color: 'border-stone-300 bg-white text-stone-700', active: 'ring-2 ring-stone-400 bg-stone-50' },
              { id: 'medium', label: 'Medium', color: 'border-amber-300 bg-amber-50 text-amber-800', active: 'ring-2 ring-amber-500 bg-amber-100 font-bold' },
              { id: 'high', label: 'High (Urgent)', color: 'border-red-300 bg-red-50 text-red-800', active: 'ring-2 ring-red-600 bg-red-100 font-bold' },
            ].map(sev => (
              <button
                key={sev.id}
                type="button"
                onClick={() => setAnnouncementForm(f => ({ ...f, severity: sev.id }))}
                className={`py-2 px-3 rounded-xl border text-xs text-center transition-all ${sev.color} ${
                  announcementForm.severity === sev.id ? sev.active : 'opacity-70 hover:opacity-100'
                }`}
              >
                {sev.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-stone-700 mb-1">Message / Details *</label>
          <textarea
            rows={4}
            value={announcementForm.message}
            onChange={e => setAnnouncementForm(f => ({ ...f, message: e.target.value }))}
            placeholder="Type your message here..."
            className="w-full border border-stone-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
          />
        </div>

        <div className="flex gap-2 mt-2">
          <Btn className="flex-1" onClick={handleCreateAnnouncement} loading={formLoading}>
            <Megaphone className="w-3.5 h-3.5" /> Publish Notice
          </Btn>
          <Btn variant="ghost" className="flex-1" onClick={() => setShowAddAnnouncement(false)}>Cancel</Btn>
        </div>
      </Modal>

      {/* ── MODAL: Add Fee ── */}
      <Modal open={showAddFee} onClose={() => setShowAddFee(false)} title="Add Fee Record">
        <Select label="Student *" value={feeForm.student_id} onChange={e => setFeeForm(f => ({ ...f, student_id: e.target.value }))}>
          <option value="">Select student...</option>
          {feeStudents.map(s => <option key={s.id} value={s.id}>{s.full_name} – {s.class_level}</option>)}
        </Select>
        <Input label="Month *" value={feeForm.month} onChange={e => setFeeForm(f => ({ ...f, month: e.target.value }))} placeholder="e.g. July 2025" />
        <Input label="Amount (₹) *" type="number" value={feeForm.amount} onChange={e => setFeeForm(f => ({ ...f, amount: e.target.value }))} placeholder="e.g. 500" />
        <Input label="Due Date" type="date" value={feeForm.due_date} onChange={e => setFeeForm(f => ({ ...f, due_date: e.target.value }))} />
        <Select label="Status" value={feeForm.status} onChange={e => setFeeForm(f => ({ ...f, status: e.target.value }))}>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
        </Select>
        <div className="flex gap-2 mt-2">
          <Btn className="flex-1" onClick={handleAddFee} loading={formLoading}>Add Fee</Btn>
          <Btn variant="ghost" className="flex-1" onClick={() => setShowAddFee(false)}>Cancel</Btn>
        </div>
      </Modal>

      {/* ── MODAL: Create Alumni Event ── */}
      <Modal open={showAddEvent} onClose={() => setShowAddEvent(false)} title="Create Alumni Event / Gathering">
        <Input
          label="Event Title *"
          value={eventForm.title}
          onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))}
          placeholder="e.g. Annual Alumni Gathering 2026"
        />

        <div className="mb-4">
          <label className="block text-sm font-medium text-stone-700 mb-1">Event Date & Time *</label>
          <input
            type="datetime-local"
            value={eventForm.event_date}
            onChange={e => setEventForm(f => ({ ...f, event_date: e.target.value }))}
            className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <Input
          label="Venue / Location"
          value={eventForm.location}
          onChange={e => setEventForm(f => ({ ...f, location: e.target.value }))}
          placeholder="Madrasa Main Auditorium & Online Stream"
        />

        <div className="mb-4">
          <label className="block text-sm font-medium text-stone-700 mb-1">Description / Agenda</label>
          <textarea
            rows={3}
            value={eventForm.description}
            onChange={e => setEventForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Details about the reunion meetup..."
            className="w-full border border-stone-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex gap-2 mt-2">
          <Btn className="flex-1" onClick={handleCreateAlumniEvent} loading={formLoading}>
            <Calendar className="w-3.5 h-3.5" /> Publish Event
          </Btn>
          <Btn variant="ghost" className="flex-1" onClick={() => setShowAddEvent(false)}>Cancel</Btn>
        </div>
      </Modal>

      {/* ── MODAL: Add Gallery Item ── */}
      <Modal open={showAddGallery} onClose={() => setShowAddGallery(false)} title="Add Gallery Item">
        <form onSubmit={handleAddGalleryItem} className="space-y-4">
          <Input
            label="Item Title *"
            value={galleryForm.title}
            onChange={e => setGalleryForm(f => ({ ...f, title: e.target.value }))}
            placeholder="e.g. Meelad Fest Celebrations 2026"
            required
          />

          <Select
            label="Category *"
            value={galleryForm.category}
            onChange={e => setGalleryForm(f => ({ ...f, category: e.target.value }))}
          >
            {['Meelad Fest', 'Alumni Meet', 'Conference', 'Uroos Mubarak', 'Classes', 'General'].map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </Select>

          <div className="mb-3">
            <label className="block text-sm font-medium text-stone-700 mb-1.5">Media Type *</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-stone-700 font-medium cursor-pointer">
                <input
                  type="radio"
                  name="media_type"
                  value="image"
                  checked={galleryForm.media_type === 'image'}
                  onChange={e => setGalleryForm(f => ({ ...f, media_type: e.target.value }))}
                  className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-stone-300"
                />
                📷 Image
              </label>
              <label className="flex items-center gap-2 text-sm text-stone-700 font-medium cursor-pointer">
                <input
                  type="radio"
                  name="media_type"
                  value="video"
                  checked={galleryForm.media_type === 'video'}
                  onChange={e => setGalleryForm(f => ({ ...f, media_type: e.target.value }))}
                  className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-stone-300"
                />
                🎥 YouTube Video
              </label>
            </div>
          </div>

          <Input
            label={galleryForm.media_type === 'image' ? 'Image URL *' : 'YouTube Video URL *'}
            value={galleryForm.media_url}
            onChange={e => setGalleryForm(f => ({ ...f, media_url: e.target.value }))}
            placeholder={
              galleryForm.media_type === 'image'
                ? 'e.g. https://images.unsplash.com/... or Supabase storage link'
                : 'e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ'
            }
            required
          />

          <div className="flex gap-2 pt-2">
            <Btn type="submit" className="flex-1" loading={formLoading}>
              <Plus className="w-4 h-4" /> Add Item
            </Btn>
            <Btn variant="ghost" className="flex-1" onClick={() => setShowAddGallery(false)}>Cancel</Btn>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: Admin Student 360° Management ── */}
      <AdminStudentModal
        student={selectedStudent}
        parents={parents}
        open={show360Modal}
        onClose={() => setShow360Modal(false)}
        onRefresh={() => { fetchStudents(); fetchAll(); }}
      />
    </div>
  );
};

export default AdminDashboard;