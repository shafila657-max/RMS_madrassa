import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import {
  LogOut, Users, UserCheck, DollarSign, TrendingUp,
  CheckCircle, XCircle, Plus, X, Link, Calendar, Search,
  GraduationCap, ChevronDown, AlertCircle, RefreshCw,
  Bell, Megaphone, AlertTriangle, Trash2, Volume2, Edit3, Star,
  School, Camera, Phone, Mail, User, ClipboardList, Lightbulb,
  FileText, Clock, BookOpenCheck, Wallet, PenLine, Pencil, Upload,
  Trophy, Award, RotateCcw, Crown, Medal, Sparkles, ShieldCheck, Image as ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { logout, getCachedProfile, clearCachedProfile } from '@/utils/auth';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import AdminStudentModal from '@/components/AdminStudentModal';
import { fetchFullLeaderboardData } from '@/utils/leaderboard';
import { localDateString } from '@/utils/date';
import ResultsManager from '@/components/results/ResultsManager';
import { describeSaveError, CLASS_LEVELS } from '@/utils/results';
import ProfileMenu from '@/components/account/ProfileMenu';
import ProfilePage from '@/components/account/ProfilePage';
import SettingsPage from '@/components/account/SettingsPage';
import UsersPage from '@/components/account/UsersPage';

const DISCIPLINE_DAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

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

// ─── Default Programs ────────────────────────────────────────────────────────
const DEFAULT_PROGRAMS = [
  {
    id: 'default-1',
    title: 'Al-Suffa Nattudarsu',
    tag: 'Weekly',
    schedule_text: 'Every Sunday at 7:30 PM',
    location: 'Madrasa Main Hall & Online Stream',
    description: 'Weekly community dars and Islamic learning session conducted every Sunday evening. Covers Quranic commentary, Seerah, and daily guidance.',
    image_url: 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?auto=format&fit=crop&w=800&q=80',
    is_active: true,
  },
  {
    id: 'default-2',
    title: 'Malharatul Badriya',
    tag: 'Monthly',
    schedule_text: 'Monthly Special Gathering',
    location: 'Madrasa Main Campus',
    description: 'Monthly spiritual gathering of dhikr, Badriyath recitation, and Islamic education for the community.',
    image_url: 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?auto=format&fit=crop&w=800&q=80',
    is_active: true,
  },
];

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(getCachedProfile);
  
  const isTeacher = profile?.role === 'teacher';
  const isAdmin = profile?.role === 'admin';

  // Each section has its own address (/admin/students, /admin/results, …) so refresh,
  // the Back button and shared links keep the section.
  const ADMIN_TABS = ['overview', 'classes', 'approvals', 'alumni', 'programs', 'announcements',
    'students', 'results', 'gallery', 'teachers', 'leaderboard'];
  // Pages opened from the profile menu rather than the tab bar.
  const ACCOUNT_PAGES = isTeacher ? ['profile', 'settings'] : ['profile', 'settings', 'users'];
  const { tab: tabParam } = useParams();
  const allowedTabs = [...(isTeacher ? ['classes'] : ADMIN_TABS), ...ACCOUNT_PAGES];
  const activeTab = allowedTabs.includes(tabParam) ? tabParam : (isTeacher ? 'classes' : 'overview');
  const setActiveTab = useCallback((id) => {
    if (id === activeTab) return;
    navigate(`/admin/${id}`);
    window.scrollTo(0, 0);
  }, [activeTab, navigate]);
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
  const [studentForm, setStudentForm] = useState({ full_name: '', class_level: '', admission_date: '', registration_no: '', date_of_birth: '' });
  // student_id -> date_of_birth (admin-only table, kept off the public students table)
  const [studentDobs, setStudentDobs] = useState({});
  const [linkParentEmail, setLinkParentEmail] = useState('');
  const [selectedParentId, setSelectedParentId] = useState(null);
  const [show360Modal, setShow360Modal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentStatusFilter, setStudentStatusFilter] = useState('active'); // default active!

  // Attendance
  const [attendanceStudents, setAttendanceStudents] = useState([]);
  const [attendanceDate, setAttendanceDate] = useState(localDateString());
  const [attendanceMap, setAttendanceMap] = useState({});
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const [attendanceLoaded, setAttendanceLoaded] = useState(false);
  const [attendanceSearch, setAttendanceSearch] = useState('');

  // Fees
  const [feeStudents, setFeeStudents] = useState([]);
  const [showAddFee, setShowAddFee] = useState(false);
  const [feeForm, setFeeForm] = useState({ student_id: '', month: '', amount: '', due_date: '', status: 'pending' });

  // Announcements
  const [announcements, setAnnouncements] = useState([]);
  const [showAddAnnouncement, setShowAddAnnouncement] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({ title: '', message: '', target_class: 'All', severity: 'normal', expiry_days: 'never' });

  // Alumni
  const [alumniData, setAlumniData] = useState([]);
  const [alumniEvents, setAlumniEvents] = useState([]);
  const [alumniRSVPs, setAlumniRSVPs] = useState([]);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [eventForm, setEventForm] = useState({ title: '', description: '', event_date: '', location: 'Madrasa Main Auditorium' });
  const [alumniToDelete, setAlumniToDelete] = useState(null);
  const [deletingAlumni, setDeletingAlumni] = useState(false);
  const [editingAlumni, setEditingAlumni] = useState(null);
  const [savingAlumni, setSavingAlumni] = useState(false);
  const [editAlumniPhotoFile, setEditAlumniPhotoFile] = useState(null);
  const [editAlumniPhotoPreview, setEditAlumniPhotoPreview] = useState('');
  const [editAlumniForm, setEditAlumniForm] = useState({
    full_name: '',
    passout_year: '',
    working_area: '',
    company_org: '',
    whatsapp_number: '',
    phone: '',
    email: '',
    location: '',
    linkedin_url: '',
    bio: '',
    status: 'approved',
    is_mentor: false,
    mentor_topics: '',
    photo_url: '',
  });

  // Programs & Fixed Events
  const [programsData, setProgramsData] = useState([]);
  const [editingProgram, setEditingProgram] = useState(null);
  const [programForm, setProgramForm] = useState({
    title: '', tag: 'Weekly', schedule_text: '', location: 'Madrasa Main Hall',
    description: '', image_url: '', is_active: true
  });
  const [programPhotoFile, setProgramPhotoFile] = useState(null);
  const [programPhotoPreview, setProgramPhotoPreview] = useState('');
  const [savingProgram, setSavingProgram] = useState(false);

  // Gallery
  const [galleryItems, setGalleryItems] = useState([]);
  const [showAddGallery, setShowAddGallery] = useState(false);
  const [galleryForm, setGalleryForm] = useState({ title: '', category: 'Meelad Fest', media_type: 'image', media_url: '', imageFile: null, is_featured: false });

  // Timetable
  const [timetable, setTimetable] = useState([]);
  const [showAddTimetable, setShowAddTimetable] = useState(false);
  const [timetableForm, setTimetableForm] = useState({ class_level: '', day_of_week: 'Monday', period_number: 1, subject: '', teacher_name: '', start_time: '', end_time: '' });

  // Subjects
  const [subjectsList, setSubjectsList] = useState([]);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [subjectForm, setSubjectForm] = useState({ class_level: '', name: '', description: '', teacher_name: '' });

  // Teachers
  const [teacherContacts, setTeacherContacts] = useState([]);
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [teacherForm, setTeacherForm] = useState({ full_name: '', subject: '', phone: '', email: '', password: '', classes: [] });
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [editTeacherForm, setEditTeacherForm] = useState({ full_name: '', subject: '', phone: '', email: '', classes: [] });

  // Leaves
  const [leaveApplications, setLeaveApplications] = useState([]);

  // Class Level Management
  const [classTeachers, setClassTeachers] = useState([]);
  const [selectedClassLevel, setSelectedClassLevel] = useState('Class 1');
  const [classSubTab, setClassSubTab] = useState('students');
  const [classAttendanceDate, setClassAttendanceDate] = useState(localDateString());
  const [classAttendanceMap, setClassAttendanceMap] = useState({});
  const [showAddClassTask, setShowAddClassTask] = useState(false);
  const [classTaskForm, setClassTaskForm] = useState({ title: '', description: '', due_date: '' });
  const [classTaskLoading, setClassTaskLoading] = useState(false);
  const [classTasks, setClassTasks] = useState([]);

  // Leaderboard System
  const [disciplineRecords, setDisciplineRecords] = useState([]);
  // Standings come from the database (get_leaderboard), the same numbers parents and visitors see.
  const [leaderboardStandings, setLeaderboardStandings] = useState([]);
  const [leaderboardResetDate, setLeaderboardResetDate] = useState(null);
  const [disciplineWeekDate, setDisciplineWeekDate] = useState(localDateString());
  const [disciplineClassFilter, setDisciplineClassFilter] = useState('Class 1');
  const [disciplineMap, setDisciplineMap] = useState({});
  const [savingDiscipline, setSavingDiscipline] = useState(false);
  const [disciplineAllowedDay, setDisciplineAllowedDay] = useState(1);
  const [savingDisciplineDay, setSavingDisciplineDay] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [leaderboardClassFilter, setLeaderboardClassFilter] = useState('all');

  useEffect(() => { fetchAll(); }, []);

  // A teacher's classes are stored against their name in the Teachers list. Match that entry
  // by email first, so the classes survive the admin editing how the name is written.
  const myTeacherName = (() => {
    const email = profile?.email?.toLowerCase();
    const contact = email && teacherContacts.find(t => t.email?.toLowerCase() === email);
    return contact?.full_name || profile?.full_name;
  })();

  // Classes this person is class teacher of (teachers, and admins who also teach).
  const myClassLevels = CLASS_LEVELS.filter(cls =>
    myTeacherName && classTeachers.some(ct => ct.class_level === cls && ct.teacher_name === myTeacherName)
  );
  const myClassKey = myClassLevels.join('|');
  // Admins who teach see their own classes first, with a switch to all classes.
  const [classScope, setClassScope] = useState('mine');
  const showOnlyMyClasses = isTeacher || (myClassLevels.length > 0 && classScope === 'mine');

  // Start on one of my classes: always for teachers, once on arrival for admins who teach.
  const openedMyClass = React.useRef(false);
  useEffect(() => {
    if (myClassLevels.length === 0) return;
    if (isTeacher) {
      if (!myClassLevels.includes(selectedClassLevel)) setSelectedClassLevel(myClassLevels[0]);
    } else if (!openedMyClass.current) {
      openedMyClass.current = true;
      setSelectedClassLevel(myClassLevels[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTeacher, myClassKey, selectedClassLevel]);

  const openMyClasses = (cls) => {
    setClassScope('mine');
    if (cls || !myClassLevels.includes(selectedClassLevel)) setSelectedClassLevel(cls || myClassLevels[0]);
    setActiveTab('classes');
  };

  const fetchStudents = useCallback(async () => {
    const { data, error } = await supabase
      .from('students')
      .select(`*, profiles!user_id(full_name, id)`)
      .order('full_name');
    if (error) {
      // Keep the current list rather than showing an empty directory when the query fails.
      console.error('Students fetch error:', error);
      toast.error(`Could not load students: ${error.message}`);
      return;
    }
    setStudents(data || []);
  }, []);

  const fetchStudentDobs = useCallback(async () => {
    const { data, error } = await supabase.from('student_private_details').select('student_id, date_of_birth');
    if (error) return; // Table missing until supabase_exam_results.sql is run.
    setStudentDobs(Object.fromEntries((data || []).filter(d => d.date_of_birth).map(d => [d.student_id, d.date_of_birth])));
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

  const fetchAdminPrograms = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('madrasa_programs')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        setProgramsData(data);
      }
    } catch (err) {
      console.error(err);
    }
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

  // New feature fetchers
  const fetchTimetable = async () => {
    const { data } = await supabase.from('timetable').select('*').order('class_level').order('day_of_week').order('period_number');
    if (data) setTimetable(data);
  };
  const fetchSubjects = async () => {
    const { data } = await supabase.from('subjects').select('*').order('class_level').order('name');
    if (data) setSubjectsList(data);
  };
  const fetchTeachers = async () => {
    const { data } = await supabase.from('teacher_contacts').select('*').order('full_name');
    if (data) setTeacherContacts(data);
  };
  const fetchLeaves = async () => {
    const { data } = await supabase.from('leave_applications').select('*, students(full_name, class_level)').order('created_at', { ascending: false });
    if (data) setLeaveApplications(data);
  };
  const fetchClassTeachers = async () => {
    const { data } = await supabase.from('class_teachers').select('*');
    if (data) setClassTeachers(data);
  };
  const fetchPendingUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('status', 'pending').order('created_at', { ascending: false });
    if (data) setPendingUsers(data);
  };
  const fetchClassTasks = async (classLevel) => {
    try {
      const { data, error } = await supabase
        .from('student_tasks')
        .select('*, students(id, full_name, class_level)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data) {
        const filtered = data.filter(t => (t.students?.class_level || '').trim().toLowerCase() === (classLevel || '').trim().toLowerCase());
        setClassTasks(filtered);
      }
    } catch (e) {
      console.error('Error fetching class tasks:', e);
    }
  };
  // Discipline scores for the selected week plus the scoring settings. Loading only one week
  // keeps this small (a whole-table read is capped at 1,000 rows by the API).
  const fetchDisciplineWeek = async (weekDate = disciplineWeekDate) => {
    try {
      const [{ data: disc, error: discError }, { data: settings }] = await Promise.all([
        supabase.from('discipline_records').select('*').eq('week_date', weekDate),
        supabase.from('leaderboard_settings').select('*').maybeSingle(),
      ]);
      if (discError) throw discError;
      setDisciplineRecords(disc || []);
      if (settings?.last_reset_at) setLeaderboardResetDate(settings.last_reset_at);
      if (Number.isInteger(settings?.discipline_day_of_week)) {
        setDisciplineAllowedDay(settings.discipline_day_of_week);
      }
    } catch (e) {
      console.error('Discipline fetch error:', e);
      toast.error('Could not load discipline scores: ' + (e.message || e));
    }
  };

  const fetchLeaderboardTab = async () => {
    fetchDisciplineWeek();
    try {
      const { standings } = await fetchFullLeaderboardData();
      setLeaderboardStandings(standings || []);
    } catch (e) {
      console.error('Leaderboard fetch error:', e);
      toast.error('Could not load the leaderboard');
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [
        { data: pending, error: pErr },
        { data: studentsDataRes, error: sErr },
        { data: parentsDataRes, error: prErr },
        { data: pendingDataRes, error: pcErr },
        { data: feesData, error: fErr },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
        supabase.from('students').select('id'),
        supabase.from('profiles').select('id').eq('role', 'parent').eq('status', 'approved'),
        supabase.from('profiles').select('id').eq('status', 'pending'),
        supabase.from('fees').select('amount, status'),
      ]);

      if (pErr || sErr || prErr || pcErr || fErr) {
        console.error('Fetch error details:', { pErr, sErr, prErr, pcErr, fErr });
      }

      setPendingUsers(pending || []);
      setStats({
        total_students: studentsDataRes?.length || 0,
        total_parents: parentsDataRes?.length || 0,
        pending_approvals: pendingDataRes?.length || 0,
        fees_collected: (feesData || []).filter(f => f.status === 'paid').reduce((s, f) => s + Number(f.amount), 0),
        fees_pending: (feesData || []).filter(f => f.status === 'pending').reduce((s, f) => s + Number(f.amount), 0),
      });
      fetchTeachers();
      fetchClassTeachers();
      fetchStudents();
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };



  // Tab switch: lazy load
  useEffect(() => {
    if (activeTab === 'overview') { fetchStudents(); fetchParents(); }
    if (activeTab === 'approvals') { fetchPendingUsers(); }
    if (activeTab === 'students') { fetchStudents(); fetchParents(); fetchStudentDobs(); }
    if (activeTab === 'results') { fetchStudents(); }
    if (activeTab === 'announcements') { fetchAnnouncements(); }
    if (activeTab === 'alumni') { fetchAdminAlumni(); }
    if (activeTab === 'gallery') { fetchGalleryItems(); }
    if (activeTab === 'teachers') { fetchTeachers(); fetchClassTeachers(); }
    if (activeTab === 'leaderboard') { fetchStudents(); fetchParents(); fetchLeaderboardTab(); }
    if (activeTab === 'classes') { 
      fetchStudents(); 
      fetchTeachers(); 
      fetchClassTeachers(); 
      fetchTimetable(); 
      fetchSubjects(); 
      fetchAttendanceForDate(attendanceDate);
      fetchFeeStudents();
      fetchLeaves();
      fetchClassTasks(selectedClassLevel);
      fetchDisciplineWeek();
    }
  }, [activeTab, fetchGalleryItems, selectedClassLevel, classSubTab]);

  // Reload discipline scores when a different week is picked.
  useEffect(() => {
    if (activeTab === 'leaderboard' || activeTab === 'classes') fetchDisciplineWeek(disciplineWeekDate);
    setDisciplineMap({});
  }, [disciplineWeekDate]);

  // Pull-to-refresh listener
  useEffect(() => {
    const handlePullRefresh = () => {
      if (activeTab === 'alumni') fetchAdminAlumni();
      else if (activeTab === 'overview') { fetchStudents(); fetchParents(); }
      else if (activeTab === 'approvals') fetchPendingUsers();
      else if (activeTab === 'announcements') fetchAnnouncements();
      else if (activeTab === 'gallery') fetchGalleryItems();
      else if (activeTab === 'teachers') { fetchTeachers(); fetchClassTeachers(); }
      else if (activeTab === 'leaderboard') { fetchStudents(); fetchLeaderboardTab(); }
      else { fetchStudents(); fetchParents(); fetchTeachers(); }
    };
    window.addEventListener('app-pull-refresh', handlePullRefresh);
    return () => window.removeEventListener('app-pull-refresh', handlePullRefresh);
  }, [activeTab, fetchAdminAlumni, fetchAnnouncements, fetchGalleryItems, fetchPendingUsers, fetchStudents, fetchParents, fetchTeachers, fetchClassTeachers, fetchLeaderboardTab]);

  // Restore quick-attendance values whenever its class or date changes.
  // Without this, a new date appeared as all-present and could overwrite saved data.
  useEffect(() => {
    if (activeTab !== 'classes' || classSubTab !== 'students') return;

    const classStudentIds = students
      .filter(s => (s.class_level || '').trim().toLowerCase() === (selectedClassLevel || '').trim().toLowerCase())
      .map(s => s.id);

    if (classStudentIds.length === 0) {
      setClassAttendanceMap({});
      return;
    }

    supabase
      .from('attendance')
      .select('student_id, status')
      .eq('date', classAttendanceDate)
      .in('student_id', classStudentIds)
      .then(({ data, error }) => {
        if (error) {
          toast.error('Failed to load attendance');
          return;
        }
        const map = {};
        (data || []).forEach(row => { map[row.student_id] = row.status; });
        setClassAttendanceMap(map);
      });
  }, [activeTab, classSubTab, classAttendanceDate, selectedClassLevel, students]);

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const setUserStatus = async (userId, status) => {
    const { error } = await supabase.from('profiles').update({ status }).eq('id', userId);
    if (error) { toast.error(`Could not update the account: ${error.message}`); return; }
    toast.success(status === 'approved' ? 'User approved' : 'User rejected');
    fetchAll();
  };
  const handleApprove = (userId) => setUserStatus(userId, 'approved');
  const handleReject = (userId) => setUserStatus(userId, 'rejected');

  // Removes a teacher from the list, their class assignments, and their dashboard access.
  const handleDeleteTeacher = async (t) => {
    if (!window.confirm(`Remove ${t.full_name}? Their class assignments are cleared and they can no longer sign in to the dashboard.`)) return;
    try {
      const { error } = await supabase.from('teacher_contacts').delete().eq('id', t.id);
      if (error) throw error;
      const { error: ctError } = await supabase.from('class_teachers').delete().eq('teacher_name', t.full_name);
      if (ctError) throw ctError;
      let loginRevoked = false;
      if (t.email) {
        // Sign-in emails are stored lowercase; match exactly (ilike would treat _ and % as wildcards).
        const { data: revoked, error: pError } = await supabase
          .from('profiles')
          .update({ status: 'rejected' })
          .eq('role', 'teacher')
          .eq('email', t.email.trim().toLowerCase())
          .select('id');
        if (pError && pError.code !== '42703') throw pError; // 42703: profiles has no email column
        loginRevoked = (revoked || []).length > 0;
      }
      if (loginRevoked) {
        toast.success(`${t.full_name} removed and their login disabled`);
      } else {
        toast.warning(`${t.full_name} removed, but no teacher login with the email ${t.email || '(none)'} was found to disable.`, { duration: 8000 });
      }
    } catch (err) {
      toast.error('Could not remove teacher: ' + err.message);
    } finally {
      fetchTeachers();
      fetchClassTeachers();
    }
  };

  // Deletes one row after confirming, and reports failures instead of a false "Deleted".
  const confirmAndDelete = async (table, id, label, refresh) => {
    if (!window.confirm(`Delete this ${label}?`)) return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) { toast.error(`Could not delete ${label}: ${error.message}`); return; }
    toast.success(`${label.charAt(0).toUpperCase()}${label.slice(1)} deleted`);
    refresh();
  };

  const setLeaveStatus = async (id, status) => {
    const { error } = await supabase.from('leave_applications').update({ status }).eq('id', id);
    if (error) { toast.error(`Could not update leave: ${error.message}`); return; }
    toast.success(status === 'approved' ? 'Leave approved' : 'Leave rejected');
    fetchLeaves();
  };

  const handleSaveDisciplineDay = async () => {
    setSavingDisciplineDay(true);
    try {
      const { error } = await supabase
        .from('leaderboard_settings')
        .upsert({ id: 1, discipline_day_of_week: Number(disciplineAllowedDay) }, { onConflict: 'id' });
      if (error) throw error;
      toast.success(`Teachers can now assign discipline scores on ${DISCIPLINE_DAYS[disciplineAllowedDay].label}s.`);
    } catch (err) {
      toast.error(`Failed to save scoring day: ${err.message}`);
    } finally {
      setSavingDisciplineDay(false);
    }
  };

  const handleAddStudent = async () => {
    if (!studentForm.full_name || !studentForm.class_level) { toast.error('Name and class are required'); return; }
    setFormLoading(true);
    try {
      const { date_of_birth, registration_no, ...rest } = studentForm;
      const payload = { ...rest, admission_date: rest.admission_date || null };
      // Left empty, the database assigns the next number in the admin's format.
      if (registration_no.trim()) payload.registration_no = registration_no.trim();
      const { data: created, error } = await supabase.from('students').insert([payload]).select('id, registration_no').single();
      if (error) throw error;
      if (date_of_birth) {
        const { error: dobError } = await supabase
          .from('student_private_details')
          .upsert([{ student_id: created.id, date_of_birth, updated_at: new Date().toISOString() }]);
        if (dobError) toast.error('Student added, but date of birth was not saved: ' + dobError.message);
      }
      toast.success(created?.registration_no ? `Student added · Reg. No ${created.registration_no}` : 'Student added!');
      setShowAddStudent(false);
      setStudentForm({ full_name: '', class_level: '', admission_date: '', registration_no: '', date_of_birth: '' });
      fetchStudents();
      fetchStudentDobs();
      fetchAll();
    } catch (err) {
      toast.error('Failed to add student: ' + describeSaveError(err));
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

  const handleDeleteStudent = (studentId, name) => {
    toast(`Delete ${name}? This will also remove their fees, attendance, and scores.`, {
      action: {
        label: 'Delete',
        onClick: async () => {
          const { error } = await supabase.from('students').delete().eq('id', studentId);
          if (error) { toast.error('Failed to delete'); return; }
          toast.success(`${name} deleted`);
          fetchStudents();
          fetchAll();
        }
      }
    });
  };

  const handleSaveAttendance = async () => {
    setAttendanceSaving(true);
    try {
      const selectedClassStudents = attendanceStudents.filter(s =>
        (s.class_level || '').trim().toLowerCase() === (selectedClassLevel || '').trim().toLowerCase()
      );
      const selectedClassStudentIds = new Set(selectedClassStudents.map(s => s.id));
      const rows = Object.entries(attendanceMap)
        .filter(([student_id, status]) => selectedClassStudentIds.has(student_id) && status)
        .map(([student_id, status]) => ({ student_id, date: attendanceDate, status }));

      if (rows.length === 0) {
        toast.error('Mark at least one student before saving');
        return;
      }

      // Upsert (insert or update for that date)
      const { error } = await supabase
        .from('attendance')
        .upsert(rows, { onConflict: 'student_id,date' });

      if (error) throw error;
      toast.success(`Attendance saved for ${selectedClassLevel} on ${attendanceDate}`);
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
      const { error } = await supabase.from('fees').insert([{ ...feeForm, due_date: feeForm.due_date || null }]);
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
      let expires_at = null;
      if (announcementForm.expiry_days !== 'never') {
        const days = parseInt(announcementForm.expiry_days, 10);
        if (!isNaN(days)) {
          const date = new Date();
          date.setDate(date.getDate() + days);
          expires_at = date.toISOString();
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase.from('announcements').insert([{
        title: announcementForm.title,
        message: announcementForm.message,
        target_class: announcementForm.target_class,
        severity: announcementForm.severity,
        expires_at,
        created_by: session?.user?.id
      }]);
      if (error) throw error;
      toast.success('Announcement published!');
      setShowAddAnnouncement(false);
      setAnnouncementForm({ title: '', message: '', target_class: 'All', severity: 'normal', expiry_days: 'never' });
      fetchAnnouncements();
    } catch (err) {
      toast.error('Failed to post announcement: ' + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm("Are you sure you want to delete this announcement? This action cannot be undone.")) return;
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
      toast.success('Announcement deleted');
      fetchAnnouncements();
    } catch (err) {
      toast.error('Failed to delete announcement');
      console.error(err);
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

  const handleDeleteAlumni = (alumniObj) => {
    setAlumniToDelete(alumniObj);
  };

  const confirmDeleteAlumni = async () => {
    if (!alumniToDelete) return;
    setDeletingAlumni(true);
    try {
      const { error } = await supabase.from('alumni_profiles').delete().eq('id', alumniToDelete.id);
      if (error) throw error;
      toast.success(`Alumni member "${alumniToDelete.full_name}" deleted`);
      setAlumniToDelete(null);
      fetchAdminAlumni();
    } catch (err) {
      toast.error('Failed to delete alumni: ' + err.message);
    } finally {
      setDeletingAlumni(false);
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

  const handleOpenCreateAlumni = () => {
    setEditingAlumni({ id: null, is_new: true });
    setEditAlumniPhotoFile(null);
    setEditAlumniPhotoPreview('');
    setEditAlumniForm({
      full_name: '',
      passout_year: '',
      working_area: '',
      company_org: '',
      whatsapp_number: '',
      phone: '',
      email: '',
      location: '',
      linkedin_url: '',
      bio: '',
      status: 'approved',
      is_mentor: false,
      mentor_topics: 'Career Guidance, Higher Education',
      photo_url: '',
    });
  };

  const handleOpenEditAlumni = (alumniObj) => {
    setEditingAlumni(alumniObj);
    setEditAlumniPhotoFile(null);
    setEditAlumniPhotoPreview(alumniObj.photo_url || '');
    setEditAlumniForm({
      full_name: alumniObj.full_name || '',
      passout_year: alumniObj.passout_year || '',
      working_area: alumniObj.working_area || '',
      company_org: alumniObj.company_org || '',
      whatsapp_number: alumniObj.whatsapp_number || '',
      phone: alumniObj.phone || '',
      email: alumniObj.email || '',
      location: alumniObj.location || '',
      linkedin_url: alumniObj.linkedin_url || '',
      bio: alumniObj.bio || '',
      status: alumniObj.status || 'approved',
      is_mentor: alumniObj.is_mentor || false,
      mentor_topics: alumniObj.mentor_topics || '',
      photo_url: alumniObj.photo_url || '',
    });
  };

  const handleSaveEditAlumni = async (e) => {
    e.preventDefault();
    if (!editingAlumni) return;
    if (!editAlumniForm.full_name || !editAlumniForm.passout_year || !editAlumniForm.working_area) {
      toast.error('Full Name, Passout Year, and Working Area are required');
      return;
    }

    setSavingAlumni(true);
    try {
      let photoUrl = editAlumniForm.photo_url;
      if (editAlumniPhotoFile) {
        try {
          const fileExt = editAlumniPhotoFile.name.split('.').pop();
          const fileName = `alumni_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('alumni-photos').upload(fileName, editAlumniPhotoFile);
          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage.from('alumni-photos').getPublicUrl(fileName);
            photoUrl = publicUrlData?.publicUrl || photoUrl;
          }
        } catch (uploadErr) {
          console.warn('Admin photo upload error:', uploadErr);
        }
      }

      if (editingAlumni.is_new) {
        const { error } = await supabase.from('alumni_profiles').insert([{
          full_name: editAlumniForm.full_name,
          passout_year: editAlumniForm.passout_year,
          working_area: editAlumniForm.working_area,
          company_org: editAlumniForm.company_org,
          whatsapp_number: editAlumniForm.whatsapp_number,
          phone: editAlumniForm.phone,
          email: editAlumniForm.email,
          location: editAlumniForm.location,
          linkedin_url: editAlumniForm.linkedin_url,
          bio: editAlumniForm.bio,
          status: editAlumniForm.status || 'approved',
          is_mentor: editAlumniForm.is_mentor,
          mentor_topics: editAlumniForm.mentor_topics,
          photo_url: photoUrl,
        }]);

        if (error) throw error;
        toast.success(`Alumni member "${editAlumniForm.full_name}" added successfully!`);
      } else {
        const { error } = await supabase
          .from('alumni_profiles')
          .update({
            full_name: editAlumniForm.full_name,
            passout_year: editAlumniForm.passout_year,
            working_area: editAlumniForm.working_area,
            company_org: editAlumniForm.company_org,
            whatsapp_number: editAlumniForm.whatsapp_number,
            phone: editAlumniForm.phone,
            email: editAlumniForm.email,
            location: editAlumniForm.location,
            linkedin_url: editAlumniForm.linkedin_url,
            bio: editAlumniForm.bio,
            status: editAlumniForm.status,
            is_mentor: editAlumniForm.is_mentor,
            mentor_topics: editAlumniForm.mentor_topics,
            photo_url: photoUrl,
          })
          .eq('id', editingAlumni.id);

        if (error) throw error;
        toast.success(`Alumni member "${editAlumniForm.full_name}" updated successfully!`);
      }

      setEditingAlumni(null);
      fetchAdminAlumni();
    } catch (err) {
      toast.error('Failed to save alumni: ' + err.message);
    } finally {
      setSavingAlumni(false);
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

  const handleDeleteAlumniEvent = (id) => {
    toast('Delete this event?', {
      action: {
        label: 'Delete',
        onClick: async () => {
          try {
            const { error } = await supabase.from('alumni_events').delete().eq('id', id);
            if (error) throw error;
            toast.success('Event deleted');
            fetchAdminAlumni();
          } catch (err) {
            toast.error('Failed to delete event');
          }
        }
      }
    });
  };

  const handleOpenCreateProgram = () => {
    setEditingProgram({ id: null, is_new: true });
    setProgramPhotoFile(null);
    setProgramPhotoPreview('');
    setProgramForm({
      title: '',
      tag: 'Weekly',
      schedule_text: 'Every Sunday at 7:30 PM',
      location: 'Madrasa Main Hall',
      description: '',
      image_url: '',
      is_active: true,
    });
  };

  const handleOpenEditProgram = (progObj) => {
    setEditingProgram(progObj);
    setProgramPhotoFile(null);
    setProgramPhotoPreview(progObj.image_url || '');
    setProgramForm({
      title: progObj.title || '',
      tag: progObj.tag || 'Weekly',
      schedule_text: progObj.schedule_text || '',
      location: progObj.location || '',
      description: progObj.description || '',
      image_url: progObj.image_url || '',
      is_active: progObj.is_active ?? true,
    });
  };

  const handleSaveProgram = async (e) => {
    e.preventDefault();
    if (!editingProgram) return;
    if (!programForm.title || !programForm.schedule_text) {
      toast.error('Title and Schedule text are required');
      return;
    }

    setSavingProgram(true);
    try {
      let imageUrl = programForm.image_url;
      if (programPhotoFile) {
        try {
          const fileExt = programPhotoFile.name.split('.').pop();
          const fileName = `prog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('program-images').upload(fileName, programPhotoFile);
          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage.from('program-images').getPublicUrl(fileName);
            imageUrl = publicUrlData?.publicUrl || imageUrl;
          }
        } catch (uploadErr) {
          console.warn('Program photo upload error:', uploadErr);
        }
      }

      if (editingProgram.is_new) {
        const { error } = await supabase.from('madrasa_programs').insert([{
          title: programForm.title,
          tag: programForm.tag,
          schedule_text: programForm.schedule_text,
          location: programForm.location,
          description: programForm.description,
          image_url: imageUrl,
          is_active: programForm.is_active,
        }]);
        if (error) throw error;
        toast.success(`Program "${programForm.title}" created successfully!`);
      } else {
        const { error } = await supabase
          .from('madrasa_programs')
          .update({
            title: programForm.title,
            tag: programForm.tag,
            schedule_text: programForm.schedule_text,
            location: programForm.location,
            description: programForm.description,
            image_url: imageUrl,
            is_active: programForm.is_active,
          })
          .eq('id', editingProgram.id);
        if (error) throw error;
        toast.success(`Program "${programForm.title}" updated successfully!`);
      }

      setEditingProgram(null);
      fetchAdminPrograms();
    } catch (err) {
      toast.error('Failed to save program: ' + err.message);
    } finally {
      setSavingProgram(false);
    }
  };

  const handleToggleProgramActive = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('madrasa_programs')
        .update({ is_active: !currentStatus })
        .eq('id', id);
      if (error) throw error;
      toast.success('Program visibility updated!');
      fetchAdminPrograms();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleDeleteProgram = async (id) => {
    try {
      const { error } = await supabase.from('madrasa_programs').delete().eq('id', id);
      if (error) throw error;
      toast.success('Program deleted');
      fetchAdminPrograms();
    } catch (err) {
      toast.error('Failed to delete program');
    }
  };

  const handleAddGalleryItem = async (e) => {
    e.preventDefault();
    if (!galleryForm.title) {
      toast.error('Title is required');
      return;
    }
    if (galleryForm.media_type === 'image' && !galleryForm.imageFile) {
      toast.error('Please select an image file');
      return;
    }
    if (galleryForm.media_type === 'video' && !galleryForm.media_url) {
      toast.error('YouTube Video URL is required');
      return;
    }
    setFormLoading(true);
    try {
      let finalMediaUrl = galleryForm.media_url;

      if (galleryForm.media_type === 'image' && galleryForm.imageFile) {
        const fileExt = galleryForm.imageFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `uploads/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('gallery')
          .upload(filePath, galleryForm.imageFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('gallery')
          .getPublicUrl(filePath);

        finalMediaUrl = publicUrlData.publicUrl;
      }

      const { error } = await supabase.from('gallery_items').insert([{
        title: galleryForm.title,
        category: galleryForm.category,
        media_type: galleryForm.media_type,
        media_url: finalMediaUrl,
        is_featured: galleryForm.is_featured
      }]);
      if (error) throw error;
      toast.success('Gallery item added');
      setGalleryForm({ title: '', category: 'Meelad Fest', media_type: 'image', media_url: '', is_featured: false });
      setShowAddGallery(false);
      fetchGalleryItems();
    } catch (err) {
      toast.error('Failed to add gallery item: ' + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleFeatured = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('gallery_items')
        .update({ is_featured: !currentStatus })
        .eq('id', id);
      if (error) throw error;
      toast.success(`Item ${!currentStatus ? 'featured' : 'unfeatured'} successfully`);
      fetchGalleryItems();
    } catch (err) {
      toast.error('Failed to update featured status: ' + err.message);
    }
  };

  const handleDeleteGalleryItem = async (id) => {
    if (!window.confirm('Are you sure you want to delete this gallery item?')) return;
    try {
      const { error } = await supabase.from('gallery_items').delete().eq('id', id);
      if (error) throw error;
      toast.success('Gallery item deleted successfully');
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
  // Dropped-out and graduated students keep their history but are left out of new
  // attendance, homework and discipline entries.
  const activeInClass = (cls) => students.filter(s =>
    (s.class_level || '').trim().toLowerCase() === (cls || '').trim().toLowerCase() &&
    (s.status || 'active') === 'active'
  );

  const filteredStudents = students.filter(s => {
    const matchesSearch =
      s.full_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.class_level?.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.registration_no?.toLowerCase().includes(studentSearch.trim().toLowerCase());

    const sStatus = s.status || 'active';
    const matchesStatus =
      studentStatusFilter === 'all' ? true
        : studentStatusFilter === 'missing_dob' ? sStatus === 'active' && !studentDobs[s.id]
        : sStatus === studentStatusFilter;

    return matchesSearch && matchesStatus;
  });

  const pendingAlumniCount = alumniData.filter(a => a.status === 'pending').length;

  const tabs = isTeacher 
    ? [
        { id: 'classes', label: 'Classes' }
      ] 
    : [
        { id: 'overview', label: 'Overview' },
        { id: 'classes', label: 'Classes' },
        { id: 'approvals', label: `Approvals${pendingUsers.length > 0 ? ` (${pendingUsers.length})` : ''}` },
        { id: 'alumni', label: `Alumni${pendingAlumniCount > 0 ? ` (${pendingAlumniCount})` : ''}` },
        { id: 'programs', label: 'Programs' },
        { id: 'announcements', label: 'Announcements' },
        { id: 'students', label: 'Students' },
        { id: 'results', label: '📝 Results' },
        { id: 'gallery', label: 'Gallery' },
        { id: 'teachers', label: 'Teachers' },
        { id: 'leaderboard', label: '🏆 Leaderboard' },
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
    <div className="min-h-screen bg-stone-50 pb-24 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-stone-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/apple-touch-icon.png" alt="RMS Madrasa" className="w-10 h-10 rounded-xl object-cover shadow-sm" />
            <div>
              <p className="font-bold text-stone-900 text-lg leading-tight">RMS Madrasa</p>
              <p className="text-sm text-emerald-700 font-semibold leading-tight">{isTeacher ? 'Teacher Dashboard' : 'Admin Dashboard'}</p>
            </div>
          </div>
          <ProfileMenu profile={profile} onNavigate={setActiveTab} onLogout={handleLogout} onMyClasses={!isTeacher && myClassLevels.length > 0 ? () => openMyClasses() : undefined} />
        </div>

        {/* Tab bar */}
        <div className="max-w-6xl mx-auto px-4 flex gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar touch-pan-x flex-nowrap pb-0 pt-2 border-t border-stone-100 sm:border-t-0">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`relative flex-shrink-0 px-4 py-3 text-[15px] transition-all whitespace-nowrap ${
                activeTab === id
                  ? 'font-bold text-emerald-700'
                  : 'font-semibold text-stone-500 hover:text-stone-800 hover:bg-stone-50 rounded-t-xl'
              }`}
            >
              {label}
              {activeTab === id && (
                <motion.div
                  layoutId="activeAdminTab"
                  className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-600 rounded-t-full"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>
      </header>

      <div className={`max-w-6xl mx-auto px-4 ${isTeacher ? 'py-2 md:py-6' : 'py-6'}`}>
        <AnimatePresence mode="wait">

          {/* ── ACCOUNT PAGES (profile menu) ── */}
          {activeTab === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ProfilePage profile={profile} onProfileChange={setProfile} />
            </motion.div>
          )}
          {activeTab === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SettingsPage profile={profile} onSignedOut={() => navigate('/')} />
            </motion.div>
          )}
          {activeTab === 'users' && isAdmin && (
            <motion.div key="users" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <UsersPage me={profile} />
            </motion.div>
          )}

          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h1 className="text-2xl font-bold text-stone-900 mb-6">Dashboard Overview</h1>
              {myClassLevels.length > 0 && (
                <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-emerald-900">⭐ My classes</p>
                    <p className="text-xs text-emerald-700">You're class teacher here. Take attendance, give homework and more.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {myClassLevels.map(cls => (
                      <button
                        key={cls}
                        type="button"
                        onClick={() => openMyClasses(cls)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                      >
                        {cls} <span className="rounded-full bg-white/20 px-1.5 text-[10px]">{activeInClass(cls).length}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
                <div>
                  <h2 className="text-xl font-bold text-stone-900">Alumni Directory & Management</h2>
                  <p className="text-xs text-stone-500 mt-0.5">Manage alumni profiles, edit member details, approve registrations & post alumni events</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-full">
                    {alumniData.filter(a => a.status === 'approved').length} Approved Alumni
                  </span>
                  <Btn variant="primary" onClick={handleOpenCreateAlumni} className="flex items-center gap-1.5">
                    <Plus className="w-4 h-4" /> Add Alumni Member
                  </Btn>
                </div>
              </div>

              {/* Pending Alumni Approvals */}
              {alumniData.filter(a => a.status === 'pending').length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm space-y-3">
                  <h3 className="font-bold text-amber-900 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600" /> Pending Alumni Registrations ({alumniData.filter(a => a.status === 'pending').length})
                  </h3>

                  <div className="space-y-3">
                    {alumniData.filter(a => a.status === 'pending').map((a) => (
                      <div key={a.id} className="bg-white rounded-xl p-4 border border-amber-200 flex flex-wrap items-center justify-between gap-3 shadow-sm hover:border-amber-300 transition-colors">
                        <div
                          onClick={() => handleOpenEditAlumni(a)}
                          className="flex items-center gap-3 cursor-pointer group flex-1 min-w-[220px]"
                          title="Click to view & edit pending alumni profile"
                        >
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-amber-100 border border-amber-300 shrink-0 flex items-center justify-center font-bold text-amber-800 text-xs shadow-sm group-hover:border-amber-500 transition-colors">
                            {a.photo_url ? (
                              <img src={a.photo_url} alt={a.full_name} className="w-full h-full object-cover" />
                            ) : (
                              a.full_name?.charAt(0) || 'A'
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-stone-900 text-sm flex items-center gap-2 group-hover:text-amber-800 transition-colors">
                              {a.full_name} <span className="text-xs font-normal text-stone-500">(Batch of {a.passout_year})</span>
                              <Pencil className="w-3.5 h-3.5 text-stone-300 group-hover:text-amber-600 opacity-0 group-hover:opacity-100 transition-all" />
                            </p>
                            <p className="text-xs text-stone-600 font-medium">{a.working_area} {a.company_org ? `at ${a.company_org}` : ''}</p>
                            <p className="text-[11px] text-stone-400 mt-0.5">WhatsApp: {a.whatsapp_number} {a.location ? `· ${a.location}` : ''}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEditAlumni(a)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-semibold text-xs transition-colors"
                            title="Edit Details & Photo"
                          >
                            <Pencil className="w-3.5 h-3.5 text-amber-700" /> Edit
                          </button>
                          <Btn variant="primary" onClick={() => handleApproveAlumni(a.id)}>
                            <CheckCircle className="w-3.5 h-3.5" /> Approve
                          </Btn>
                          <Btn variant="danger" onClick={() => handleRejectAlumni(a.id)}>
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </Btn>
                          <Btn variant="danger" onClick={() => handleDeleteAlumni(a)} title="Delete Alumni Registration">
                            <Trash2 className="w-3.5 h-3.5" />
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
                      <div key={a.id} className="py-3 px-2 hover:bg-stone-50/80 rounded-2xl flex items-center justify-between gap-3 flex-wrap transition-colors">
                        <div
                          onClick={() => handleOpenEditAlumni(a)}
                          className="flex items-center gap-3.5 cursor-pointer group flex-1 min-w-[240px]"
                          title="Click to view & edit alumni details"
                        >
                          <div className="relative w-11 h-11 rounded-full overflow-hidden bg-emerald-100 border-2 border-emerald-400 shrink-0 flex items-center justify-center font-bold text-emerald-800 text-xs shadow-sm group-hover:border-emerald-600 transition-colors">
                            {a.photo_url ? (
                              <img src={a.photo_url} alt={a.full_name} className="w-full h-full object-cover" />
                            ) : (
                              a.full_name?.charAt(0)?.toUpperCase() || 'A'
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-stone-900 text-sm flex items-center gap-2 group-hover:text-emerald-700 transition-colors">
                              {a.full_name}
                              <span className="text-xs font-normal text-stone-400">· Batch {a.passout_year}</span>
                              {a.is_mentor && (
                                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                                  🏅 Active Mentor
                                </span>
                              )}
                              <Pencil className="w-3.5 h-3.5 text-stone-300 group-hover:text-emerald-600 opacity-0 group-hover:opacity-100 transition-all" />
                            </p>
                            <p className="text-xs text-stone-600 font-medium">{a.working_area} {a.company_org ? `@ ${a.company_org}` : ''}</p>
                            <p className="text-[11px] text-stone-400 mt-0.5">{a.location || 'Location N/A'} · WA: {a.whatsapp_number}</p>
                          </div>
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

                          <button
                            onClick={() => handleOpenEditAlumni(a)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold text-xs transition-colors"
                            title="Edit Alumni Profile & Photo"
                          >
                            <Pencil className="w-3.5 h-3.5 text-emerald-600" /> Edit Profile
                          </button>

                          <Btn variant="danger" onClick={() => handleDeleteAlumni(a)} title="Delete Alumni Profile">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Btn>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center text-stone-400 text-sm">
                    No approved alumni in directory yet. Click "+ Add Alumni Member" above to add one.
                  </div>
                )}
              </div>

              {/* Rejected Alumni Registrations */}
              {alumniData.filter(a => a.status === 'rejected').length > 0 && (
                <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 shadow-sm space-y-3">
                  <h3 className="font-bold text-stone-700 text-sm flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500" /> Rejected Alumni Registrations ({alumniData.filter(a => a.status === 'rejected').length})
                  </h3>

                  <div className="space-y-3">
                    {alumniData.filter(a => a.status === 'rejected').map((a) => (
                      <div key={a.id} className="bg-white rounded-xl p-4 border border-stone-200 flex flex-wrap items-center justify-between gap-3 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-stone-100 border border-stone-300 shrink-0 flex items-center justify-center font-bold text-stone-600 text-xs">
                            {a.photo_url ? (
                              <img src={a.photo_url} alt={a.full_name} className="w-full h-full object-cover" />
                            ) : (
                              a.full_name?.charAt(0) || 'A'
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-stone-900 text-sm">{a.full_name} <span className="text-xs font-normal text-stone-500">(Batch of {a.passout_year})</span></p>
                            <p className="text-xs text-stone-600 font-medium">{a.working_area} {a.company_org ? `at ${a.company_org}` : ''}</p>
                            <p className="text-[11px] text-stone-400 mt-0.5">WhatsApp: {a.whatsapp_number} {a.location ? `· ${a.location}` : ''}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEditAlumni(a)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs transition-colors"
                            title="Edit Alumni Details"
                          >
                            <Pencil className="w-3.5 h-3.5 text-stone-600" /> Edit
                          </button>
                          <Btn variant="primary" onClick={() => handleApproveAlumni(a.id)}>
                            <CheckCircle className="w-3.5 h-3.5" /> Approve
                          </Btn>
                          <Btn variant="danger" onClick={() => handleDeleteAlumni(a)} title="Delete Alumni Profile">
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </Btn>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                            <span>{evt.event_date ? new Date(evt.event_date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Date TBD'}</span>
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

          {/* ── PROGRAMS & FIXED EVENTS ── */}
          {activeTab === 'programs' && (
            <motion.div key="programs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
                <div>
                  <h2 className="text-xl font-bold text-stone-900">Programs & Fixed Events Management</h2>
                  <p className="text-xs text-stone-500 mt-0.5">Manage weekly dars, monthly events, cover photos, schedules, and program cards</p>
                </div>
                <Btn variant="primary" onClick={handleOpenCreateProgram} className="flex items-center gap-1.5">
                  <Plus className="w-4 h-4" /> Add New Program / Event
                </Btn>
              </div>

              {/* Programs List */}
              <div className="grid gap-6 md:grid-cols-2">
                {(programsData.length > 0 ? programsData : DEFAULT_PROGRAMS).map((prog) => (
                  <div key={prog.id} className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="relative h-44 bg-stone-900 overflow-hidden">
                        <img
                          src={prog.image_url || 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?auto=format&fit=crop&w=800&q=80'}
                          alt={prog.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-3 left-3 bg-stone-950/80 backdrop-blur-sm border border-stone-700 text-emerald-400 text-[10px] font-extrabold px-3 py-1 rounded-full">
                          ✦ {prog.tag || 'Weekly'} Event
                        </div>
                      </div>

                      <div className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-stone-900 text-base">{prog.title}</h3>
                          <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${prog.is_active !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-500'}`}>
                            {prog.is_active !== false ? 'Active' : 'Hidden'}
                          </span>
                        </div>

                        <p className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 inline-block">
                          ⏰ {prog.schedule_text || 'Scheduled Event'}
                        </p>

                        {prog.location && (
                          <p className="text-xs text-stone-500">📍 {prog.location}</p>
                        )}

                        <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                          {prog.description}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 pt-0 flex gap-2 justify-end border-t border-stone-100 mt-2">
                      <button
                        onClick={() => handleToggleProgramActive(prog.id, prog.is_active)}
                        className="px-3 py-1.5 rounded-xl border text-xs font-semibold bg-stone-50 hover:bg-stone-100 text-stone-700"
                      >
                        {prog.is_active !== false ? 'Hide' : 'Show'}
                      </button>
                      <button
                        onClick={() => handleOpenEditProgram(prog)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold"
                      >
                        <Pencil className="w-3.5 h-3.5 text-emerald-600" /> Edit
                      </button>
                      <Btn variant="danger" onClick={() => handleDeleteProgram(prog.id)} title="Delete Program">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Btn>
                    </div>
                  </div>
                ))}
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

              {(() => {
                const validAnnouncements = announcements.filter(a => !a.expires_at || new Date(a.expires_at) > new Date());
                return validAnnouncements.length > 0 ? (
                  <div className="space-y-4">
                    {validAnnouncements.map((item) => {
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
                            {item.expires_at && (
                              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Expires: {new Date(item.expires_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                              </span>
                            )}
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
              );
              })()}
            </motion.div>
          )}

          {/* ── STUDENTS ── */}
          {activeTab === 'students' && (
            <motion.div key="students" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-stone-900">Student Directory ({filteredStudents.length})</h2>
                  <p className="text-xs text-stone-400">Default view shows active enrolled students</p>
                </div>
                <Btn className="w-full sm:w-auto flex-shrink-0" onClick={() => setShowAddStudent(true)}>
                  <Plus className="w-4 h-4" /> Add Student
                </Btn>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex flex-wrap items-center gap-2 p-1.5 bg-stone-100/80 rounded-2xl">
                {[
                  { id: 'active', label: '🟢 Active Enrolled', count: students.filter(s => (s.status || 'active') === 'active').length },
                  { id: 'completed', label: 'Completed (Graduates)', count: students.filter(s => s.status === 'completed').length },
                  { id: 'dropped', label: '⚠️ Dropped Out', count: students.filter(s => s.status === 'dropped').length },
                  { id: 'all', label: '📂 All Students', count: students.length },
                  { id: 'missing_dob', label: '🎂 Missing DOB', count: students.filter(s => (s.status || 'active') === 'active' && !studentDobs[s.id]).length },
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
                  placeholder="Search by name, class or registration number..."
                  className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {filteredStudents.length > 0 ? (
                <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
                  <div className="divide-y divide-stone-50">
                    {filteredStudents.map((s) => {
                      const stStatus = s.status || 'active';
                      return (
                        <div key={s.id} className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0 hover:bg-stone-50/80 transition-colors">
                          <div
                            className="flex items-center gap-3 w-full sm:flex-1 min-w-0 cursor-pointer"
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
                                {s.registration_no && (
                                  <span className="font-mono font-semibold text-stone-700 bg-stone-100 px-1.5 py-0.5 rounded-md">{s.registration_no}</span>
                                )}
                                <span>{s.class_level}</span>
                                {!studentDobs[s.id] && studentStatusFilter === 'missing_dob' && (
                                  <span className="text-amber-600 font-medium">DOB missing</span>
                                )}
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
                          <div className="w-full sm:w-auto flex flex-wrap items-center gap-2 min-w-0">
                            <select
                              value={stStatus}
                              onChange={(e) => handleQuickStudentStatusChange(s.id, e.target.value)}
                              className={`w-full sm:w-auto flex-1 sm:flex-none min-w-0 text-xs font-bold px-2.5 py-1.5 rounded-xl border focus:outline-none ${
                                stStatus === 'completed'
                                  ? 'bg-purple-50 text-purple-800 border-purple-200'
                                  : stStatus === 'dropped'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              <option value="active">🟢 Active Enrolled</option>
                              <option value="completed">Completed (Graduate)</option>
                              <option value="dropped">⚠️ Dropped Out</option>
                            </select>

                            <Btn
                              variant="primary"
                              className="flex-1 sm:flex-none min-w-0 px-3 sm:px-4"
                              onClick={() => { setSelectedStudent(s); setShow360Modal(true); }}
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Manage
                            </Btn>
                            <Btn
                              variant="ghost"
                              className="flex-1 sm:flex-none min-w-0 px-3 sm:px-4"
                              onClick={() => { setSelectedStudent(s); setShowLinkParent(true); }}
                            >
                              <Link className="w-3.5 h-3.5" /> Link Parent
                            </Btn>
                            <Btn
                              variant="danger"
                              className="flex-none px-3 sm:px-4"
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

          {/* ── RESULTS ── */}
          {activeTab === 'results' && (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ResultsManager students={students} />
            </motion.div>
          )}

          {/* ── ATTENDANCE ── */}
          {activeTab === 'gallery' && (
            <motion.div key="gallery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-bold text-stone-900">Media Gallery Manager</h2>
                  <p className="text-xs text-stone-500 mt-1">Upload event photos and YouTube video links for the public landing page</p>
                </div>
                <Btn onClick={() => {
                  setGalleryForm({ title: '', category: 'Meelad Fest', media_type: 'image', media_url: '', is_featured: false });
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
                        <th className="px-6 py-4 text-center">Featured</th>
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
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() => handleToggleFeatured(item.id, item.is_featured)}
                                className={`p-2 rounded-xl transition-all ${item.is_featured ? 'text-amber-500 bg-amber-50 hover:bg-amber-100' : 'text-stone-300 hover:text-amber-500 hover:bg-stone-100'}`}
                                title={item.is_featured ? 'Unfeature Item' : 'Feature Item'}
                              >
                                <Star className="w-5 h-5" fill={item.is_featured ? "currentColor" : "none"} />
                              </button>
                            </td>
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
                          <td colSpan={6} className="text-center py-12 text-stone-400">
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
          {CLASS_LEVELS.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
        <Input label="Admission Date" type="date" value={studentForm.admission_date} onChange={e => setStudentForm(f => ({ ...f, admission_date: e.target.value }))} />
        <Input label="Date of Birth (for online results)" type="date" value={studentForm.date_of_birth} onChange={e => setStudentForm(f => ({ ...f, date_of_birth: e.target.value }))} />
        <Input label="Registration No. (leave empty for automatic)" value={studentForm.registration_no} onChange={e => setStudentForm(f => ({ ...f, registration_no: e.target.value }))} placeholder="Auto-generated" />
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
                  onClick={() => {
                    setSelectedParentId(p.id);
                    setLinkParentEmail('');
                  }}
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
            {CLASS_LEVELS.map(c => (
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
          <label className="block text-sm font-medium text-stone-700 mb-1">Auto-Remove / Expiry</label>
          <Select value={announcementForm.expiry_days} onChange={e => setAnnouncementForm(f => ({ ...f, expiry_days: e.target.value }))}>
            <option value="never">Never (Keep Forever)</option>
            <option value="1">After 1 Day</option>
            <option value="3">After 3 Days</option>
            <option value="7">After 1 Week</option>
            <option value="14">After 2 Weeks</option>
            <option value="30">After 1 Month</option>
          </Select>
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

      {/* ── MODAL: Delete Alumni Confirmation ── */}
      <Modal open={!!alumniToDelete} onClose={() => !deletingAlumni && setAlumniToDelete(null)} title="Delete Alumni Member">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-900 text-sm">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-950">Are you sure you want to delete this alumni member?</p>
              <p className="text-xs text-red-800 mt-1 leading-relaxed">
                You are about to permanently delete <strong>{alumniToDelete?.full_name}</strong> (Batch of {alumniToDelete?.passout_year}) from the database.
              </p>
            </div>
          </div>

          {alumniToDelete && (
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 text-xs space-y-1.5 text-stone-700">
              <p><strong>Name:</strong> {alumniToDelete.full_name}</p>
              <p><strong>Passout Year:</strong> {alumniToDelete.passout_year}</p>
              <p><strong>Working Area:</strong> {alumniToDelete.working_area} {alumniToDelete.company_org ? `@ ${alumniToDelete.company_org}` : ''}</p>
              {alumniToDelete.location && <p><strong>Location:</strong> {alumniToDelete.location}</p>}
              {alumniToDelete.whatsapp_number && <p><strong>WhatsApp:</strong> {alumniToDelete.whatsapp_number}</p>}
              <p><strong>Status:</strong> <span className="capitalize font-semibold">{alumniToDelete.status}</span></p>
            </div>
          )}

          <p className="text-xs text-stone-500 italic">
            This action cannot be undone and will remove the record from public showcases and directory lists.
          </p>

          <div className="flex gap-3 justify-end pt-2">
            <Btn variant="ghost" disabled={deletingAlumni} onClick={() => setAlumniToDelete(null)}>
              Cancel
            </Btn>
            <Btn variant="danger" disabled={deletingAlumni} onClick={confirmDeleteAlumni} className="flex items-center gap-1.5">
              {deletingAlumni ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" /> Delete Member
                </>
              )}
            </Btn>
          </div>
        </div>
      </Modal>

      {/* ── MODAL: Create / Edit Program ── */}
      <Modal open={!!editingProgram} onClose={() => !savingProgram && setEditingProgram(null)} title={editingProgram?.is_new ? 'Create New Program / Event' : 'Edit Program Details'}>
        {editingProgram && (
          <form onSubmit={handleSaveProgram} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            {/* Cover Photo Upload */}
            <div className="flex items-center gap-4 p-3 bg-stone-50 border border-stone-200 rounded-2xl">
              <div className="relative w-20 h-16 rounded-xl overflow-hidden bg-stone-200 border border-stone-300 shrink-0 flex items-center justify-center shadow-sm">
                {programPhotoPreview ? (
                  <img src={programPhotoPreview} alt="Cover Preview" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-stone-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-xs font-bold text-stone-800 mb-1">Cover Image</label>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-stone-200 hover:border-emerald-400 text-xs font-semibold text-stone-700 shadow-sm hover:bg-emerald-50 transition-colors">
                    <Upload className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Upload Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setProgramPhotoFile(file);
                          setProgramPhotoPreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </label>
                  {programPhotoPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setProgramPhotoFile(null);
                        setProgramPhotoPreview('');
                        setProgramForm(f => ({ ...f, image_url: '' }));
                      }}
                      className="text-xs text-red-500 hover:underline font-semibold"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Program Title *</label>
                <input
                  required
                  placeholder="e.g. Al-Suffa Nattudarsu"
                  value={programForm.title}
                  onChange={e => setProgramForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Event Tag / Frequency *</label>
                <select
                  value={programForm.tag}
                  onChange={e => setProgramForm(f => ({ ...f, tag: e.target.value }))}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Daily">Daily</option>
                  <option value="Special">Special Event</option>
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Schedule / Time Text *</label>
                <input
                  required
                  placeholder="e.g. Every Sunday at 7:30 PM"
                  value={programForm.schedule_text}
                  onChange={e => setProgramForm(f => ({ ...f, schedule_text: e.target.value }))}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Location</label>
                <input
                  placeholder="e.g. Madrasa Main Hall"
                  value={programForm.location}
                  onChange={e => setProgramForm(f => ({ ...f, location: e.target.value }))}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Program Description</label>
              <textarea
                rows={3}
                placeholder="Details about the dars, topic, target audience..."
                value={programForm.description}
                onChange={e => setProgramForm(f => ({ ...f, description: e.target.value }))}
                className="w-full border border-stone-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <Btn variant="ghost" disabled={savingProgram} onClick={() => setEditingProgram(null)}>
                Cancel
              </Btn>
              <Btn variant="primary" disabled={savingProgram} type="submit" className="flex items-center gap-1.5">
                {savingProgram ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Save Program
              </Btn>
            </div>
          </form>
        )}
      </Modal>

      {/* ── MODAL: Edit Alumni Member ── */}
      <Modal open={!!editingAlumni} onClose={() => !savingAlumni && setEditingAlumni(null)} title="Edit Alumni Details">
        {editingAlumni && (
          <form onSubmit={handleSaveEditAlumni} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            {/* Photo Avatar & File Upload */}
            <div className="flex items-center gap-4 p-3 bg-stone-50 border border-stone-200 rounded-2xl">
              <div className="relative w-16 h-16 rounded-full overflow-hidden bg-stone-200 border-2 border-emerald-500 shrink-0 flex items-center justify-center shadow-sm">
                {editAlumniPhotoPreview ? (
                  <img src={editAlumniPhotoPreview} alt="Alumni" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-7 h-7 text-stone-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-xs font-bold text-stone-800 mb-1">Alumni Photo</label>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-stone-200 hover:border-emerald-400 text-xs font-semibold text-stone-700 shadow-sm hover:bg-emerald-50 transition-colors">
                    <Upload className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Upload New Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setEditAlumniPhotoFile(file);
                          setEditAlumniPhotoPreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </label>
                  {editAlumniPhotoPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditAlumniPhotoFile(null);
                        setEditAlumniPhotoPreview('');
                        setEditAlumniForm(f => ({ ...f, photo_url: '' }));
                      }}
                      className="text-xs text-red-500 hover:underline font-semibold"
                    >
                      Clear Photo
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Full Name *</label>
                <input
                  required
                  value={editAlumniForm.full_name}
                  onChange={e => setEditAlumniForm(f => ({ ...f, full_name: e.target.value }))}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Passout Year / Batch *</label>
                <input
                  required
                  value={editAlumniForm.passout_year}
                  onChange={e => setEditAlumniForm(f => ({ ...f, passout_year: e.target.value }))}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Working Area / Profession *</label>
                <input
                  required
                  value={editAlumniForm.working_area}
                  onChange={e => setEditAlumniForm(f => ({ ...f, working_area: e.target.value }))}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Company / Organization</label>
                <input
                  value={editAlumniForm.company_org}
                  onChange={e => setEditAlumniForm(f => ({ ...f, company_org: e.target.value }))}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">WhatsApp Number</label>
                <input
                  value={editAlumniForm.whatsapp_number}
                  onChange={e => setEditAlumniForm(f => ({ ...f, whatsapp_number: e.target.value }))}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Phone Number</label>
                <input
                  value={editAlumniForm.phone}
                  onChange={e => setEditAlumniForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">City / Country Location</label>
                <input
                  value={editAlumniForm.location}
                  onChange={e => setEditAlumniForm(f => ({ ...f, location: e.target.value }))}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Approval Status</label>
                <select
                  value={editAlumniForm.status}
                  onChange={e => setEditAlumniForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editAlumniForm.email}
                  onChange={e => setEditAlumniForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">LinkedIn Profile URL</label>
                <input
                  value={editAlumniForm.linkedin_url}
                  onChange={e => setEditAlumniForm(f => ({ ...f, linkedin_url: e.target.value }))}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Mentorship Option */}
            <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-3 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editAlumniForm.is_mentor}
                  onChange={e => setEditAlumniForm(f => ({ ...f, is_mentor: e.target.checked }))}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <span className="text-xs font-bold text-emerald-950 flex items-center gap-1">
                  <Award className="w-4 h-4 text-emerald-600" /> Active Student Mentor
                </span>
              </label>

              {editAlumniForm.is_mentor && (
                <div>
                  <label className="block text-[11px] font-medium text-emerald-800 mb-1">Mentor Topics / Expertise</label>
                  <input
                    value={editAlumniForm.mentor_topics}
                    onChange={e => setEditAlumniForm(f => ({ ...f, mentor_topics: e.target.value }))}
                    className="w-full border border-emerald-200 rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Bio / Message to Students</label>
              <textarea
                rows={2}
                value={editAlumniForm.bio}
                onChange={e => setEditAlumniForm(f => ({ ...f, bio: e.target.value }))}
                className="w-full border border-stone-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <Btn variant="ghost" disabled={savingAlumni} onClick={() => setEditingAlumni(null)}>
                Cancel
              </Btn>
              <Btn variant="primary" disabled={savingAlumni} type="submit">
                {savingAlumni ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Save Changes
              </Btn>
            </div>
          </form>
        )}
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

          {galleryForm.media_type === 'image' ? (
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-stone-700">Upload Image *</label>
              <input
                type="file"
                accept="image/*"
                onChange={e => setGalleryForm(f => ({ ...f, imageFile: e.target.files[0] }))}
                className="w-full p-2.5 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                required
              />
            </div>
          ) : (
            <Input
              label="YouTube Video URL *"
              value={galleryForm.media_url}
              onChange={e => setGalleryForm(f => ({ ...f, media_url: e.target.value }))}
              placeholder="e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ"
              required
            />
          )}

          <label className="flex items-center gap-3 p-4 border border-stone-200 rounded-xl cursor-pointer hover:bg-stone-50 transition-colors">
            <input
              type="checkbox"
              checked={galleryForm.is_featured}
              onChange={(e) => setGalleryForm(f => ({ ...f, is_featured: e.target.checked }))}
              className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 border-stone-300"
            />
            <div>
              <span className="font-semibold text-stone-900 block">Feature on Landing Page</span>
              <span className="text-xs text-stone-500">Show this item in the marquee on the home page</span>
            </div>
          </label>

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
        onRefresh={() => { fetchStudents(); fetchStudentDobs(); fetchAll(); }}
      />

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TIMETABLE TAB                                                  */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'teachers' && (
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-xl text-stone-900">Teacher Contacts</h2>
            <button onClick={() => setShowAddTeacher(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors">
              <Plus className="w-4 h-4" /> Add Teacher
            </button>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teacherContacts.map(t => (
              <div key={t.id} className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-stone-900">{t.full_name}</p>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{t.subject}</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => {
                      const assignedClasses = classTeachers.filter(ct => ct.teacher_name === t.full_name).map(ct => ct.class_level);
                      setEditTeacherForm({ full_name: t.full_name, subject: t.subject, phone: t.phone || '', email: t.email || '', classes: assignedClasses });
                      setEditingTeacher(t);
                    }} className="text-blue-400 hover:text-blue-600 transition-colors p-1">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDeleteTeacher(t)} className="text-red-400 hover:text-red-600 transition-colors p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {t.phone && <p className="text-xs text-stone-500 flex items-center gap-1"><Phone className="w-3 h-3" />{t.phone}</p>}
                {t.email && <p className="text-xs text-stone-500 flex items-center gap-1"><Mail className="w-3 h-3" />{t.email}</p>}
                {(() => { const assigned = classTeachers.filter(ct => ct.teacher_name === t.full_name).map(ct => ct.class_level); return assigned.length > 0 ? <div className="flex flex-wrap gap-1 pt-1">{assigned.map(c => <span key={c} className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">{c}</span>)}</div> : null; })()}
              </div>
            ))}
          </div>
          {teacherContacts.length === 0 && <p className="text-stone-400 text-sm text-center py-12">No teachers added yet.</p>}

          <Modal open={showAddTeacher} onClose={() => setShowAddTeacher(false)} title="Add Teacher Contact">
            <form onSubmit={async e => {
              e.preventDefault();
              if (!teacherForm.email || !teacherForm.password) {
                toast.error("Email and password are required.");
                return;
              }
              
              // 1. Create a non-persisting Supabase client so Admin doesn't get logged out
              const supabaseAdmin = createClient(
                import.meta.env.VITE_SUPABASE_URL,
                import.meta.env.VITE_SUPABASE_ANON_KEY,
                { auth: { autoRefreshToken: false, persistSession: false } }
              );

              // 2. Create the auth user
              const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
                email: teacherForm.email,
                password: teacherForm.password,
                options: {
                  data: { full_name: teacherForm.full_name, phone: teacherForm.phone, role: 'teacher' }
                }
              });

              if (authError) { toast.error(authError.message); return; }
              
              const newUserId = authData?.user?.id;
              
              // 3. Wait for trigger to create the profile, then approve it
              if (newUserId) {
                let approved = false;
                for (let attempt = 0; attempt < 5; attempt++) {
                  await new Promise(r => setTimeout(r, 1000)); // wait 1s
                  const { data: prof } = await supabase.from('profiles').select('id').eq('id', newUserId).single();
                  if (prof) {
                    await supabase.from('profiles').update({ status: 'approved', role: 'teacher' }).eq('id', newUserId);
                    approved = true;
                    break;
                  }
                }
                if (!approved) {
                  toast.error('Profile creation delayed. Please manually approve this teacher in the Approvals tab.');
                }
              }

              // 4. Insert into teacher_contacts so it shows up in UI
              const { error: tcError } = await supabase.from('teacher_contacts').insert([{
                full_name: teacherForm.full_name,
                subject: teacherForm.subject,
                phone: teacherForm.phone,
                email: teacherForm.email
              }]);
              if (tcError) { toast.error(tcError.message); return; }

              // 5. Assign to selected classes
              if (teacherForm.classes.length > 0) {
                const classAssignments = teacherForm.classes.map(c => ({
                  class_level: c,
                  teacher_name: teacherForm.full_name
                }));
                // We use upsert in case the class already has a teacher.
                await supabase.from('class_teachers').upsert(classAssignments, { onConflict: 'class_level' });
              }

              toast.success('Teacher created and assigned successfully!');
              setShowAddTeacher(false);
              setTeacherForm({ full_name: '', subject: '', phone: '', email: '', password: '', classes: [] });
              fetchTeachers();
              fetchClassTeachers();
            }} className="space-y-3">
              <Input label="Full Name *" value={teacherForm.full_name} onChange={e => setTeacherForm(f => ({...f, full_name: e.target.value}))} placeholder="e.g. Ustadh Ahmed Ali" required />
              <Input label="Subject *" value={teacherForm.subject} onChange={e => setTeacherForm(f => ({...f, subject: e.target.value}))} placeholder="e.g. Quran Memorization" required />
              <Input label="Phone" type="tel" value={teacherForm.phone} onChange={e => setTeacherForm(f => ({...f, phone: e.target.value}))} placeholder="+91 9876543210" />
              <Input label="Email *" type="email" value={teacherForm.email} onChange={e => setTeacherForm(f => ({...f, email: e.target.value}))} placeholder="teacher@rmsmadrasa.edu" required />
              <Input label="Password *" type="password" value={teacherForm.password} onChange={e => setTeacherForm(f => ({...f, password: e.target.value}))} placeholder="Min 8 characters" required minLength={8} />
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-stone-700 mb-2">Assign Classes</label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border border-stone-200 rounded-xl bg-stone-50">
                  {CLASS_LEVELS.map(cls => (
                    <label key={cls} className="flex items-center gap-2 text-xs font-medium text-stone-700 cursor-pointer p-1">
                      <input 
                        type="checkbox" 
                        checked={teacherForm.classes.includes(cls)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setTeacherForm(f => ({...f, classes: [...f.classes, cls]}));
                          } else {
                            setTeacherForm(f => ({...f, classes: f.classes.filter(c => c !== cls)}));
                          }
                        }}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      {cls}
                    </label>
                  ))}
                </div>
              </div>
              <button type="submit" className="w-full bg-emerald-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors">Add Teacher</button>
            </form>
          </Modal>

          {/* Edit Teacher Modal */}
          <Modal open={!!editingTeacher} onClose={() => setEditingTeacher(null)} title="Edit Teacher">
            <form onSubmit={async e => {
              e.preventDefault();
              const oldName = editingTeacher.full_name;
              // 1. Update teacher_contacts
              const { error } = await supabase.from('teacher_contacts').update({
                full_name: editTeacherForm.full_name,
                subject: editTeacherForm.subject,
                phone: editTeacherForm.phone,
                email: editTeacherForm.email
              }).eq('id', editingTeacher.id);
              if (error) { toast.error(error.message); return; }

              // Keep the teacher's login profile name in step with the list entry.
              const teacherEmail = editTeacherForm.email || editingTeacher.email;
              if (teacherEmail) {
                await supabase.from('profiles').update({ full_name: editTeacherForm.full_name })
                  .eq('role', 'teacher').eq('email', teacherEmail.trim().toLowerCase());
              }

              // 2. Remove old class assignments for this teacher
              const { error: delErr } = await supabase.from('class_teachers').delete().eq('teacher_name', oldName);
              if (delErr) { toast.error('Failed to remove old classes: ' + delErr.message); return; }

              // 3. Insert new class assignments
              if (editTeacherForm.classes.length > 0) {
                const classAssignments = editTeacherForm.classes.map(c => ({
                  class_level: c,
                  teacher_name: editTeacherForm.full_name
                }));
                const { error: upsertErr } = await supabase.from('class_teachers').upsert(classAssignments, { onConflict: 'class_level' });
                if (upsertErr) { toast.error('Failed to assign classes: ' + upsertErr.message); return; }
              }

              toast.success('Teacher updated!');
              setEditingTeacher(null);
              fetchTeachers();
              fetchClassTeachers();
            }} className="space-y-3">
              <Input label="Full Name *" value={editTeacherForm.full_name} onChange={e => setEditTeacherForm(f => ({...f, full_name: e.target.value}))} required />
              <Input label="Subject *" value={editTeacherForm.subject} onChange={e => setEditTeacherForm(f => ({...f, subject: e.target.value}))} required />
              <Input label="Phone" type="tel" value={editTeacherForm.phone} onChange={e => setEditTeacherForm(f => ({...f, phone: e.target.value}))} />
              <Input label="Email" type="email" value={editTeacherForm.email} onChange={e => setEditTeacherForm(f => ({...f, email: e.target.value}))} />
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-stone-700 mb-2">Assigned Classes</label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border border-stone-200 rounded-xl bg-stone-50">
                  {CLASS_LEVELS.map(cls => (
                    <label key={cls} className="flex items-center gap-2 text-xs font-medium text-stone-700 cursor-pointer p-1">
                      <input 
                        type="checkbox" 
                        checked={editTeacherForm.classes.includes(cls)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditTeacherForm(f => ({...f, classes: [...f.classes, cls]}));
                          } else {
                            setEditTeacherForm(f => ({...f, classes: f.classes.filter(c => c !== cls)}));
                          }
                        }}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      {cls}
                    </label>
                  ))}
                </div>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors">Save Changes</button>
            </form>
          </Modal>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* LEADERBOARD TAB                                                */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'leaderboard' && (() => {
        const parentNameById = Object.fromEntries(parents.map(p => [p.id, p.full_name]));
        const studentById = Object.fromEntries(students.map(st => [st.id, st]));
        const activeStandings = leaderboardStandings.map(row => {
          const parentId = studentById[row.id]?.user_id;
          return { ...row, parent_name: parentId ? parentNameById[parentId] || 'Parent' : 'Parent' };
        });

        const filteredStandings = leaderboardClassFilter === 'all'
          ? activeStandings
          : activeStandings.filter(s => (s.class_level || '').trim().toLowerCase() === leaderboardClassFilter.trim().toLowerCase());

        const top3 = filteredStandings.slice(0, 3);
        const rank1 = top3[0];
        const rank2 = top3[1];
        const rank3 = top3[2];

        const discClassStudents = students.filter(s => (s.class_level || '').trim().toLowerCase() === disciplineClassFilter.trim().toLowerCase());

        return (
          <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
              <div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-amber-500" />
                  <h2 className="font-bold text-xl text-stone-900">Madrasa Leaderboard &amp; Discipline Ratings</h2>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Automated points: Attendance (+1), Exam Marks (+1 per 10 marks), Homework (+5), &amp; Weekly Discipline (0–10).
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={fetchLeaderboardTab}
                  className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
                {isAdmin && (
                  <button
                    onClick={() => setShowResetModal(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl border border-red-200 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset Season Points
                  </button>
                )}
              </div>
            </div>

            {isAdmin && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-emerald-900 text-sm">Discipline scoring day</h3>
                  <p className="text-xs text-emerald-700 mt-1">
                    Teachers can enter or update discipline scores only on the selected day. Admins can score anytime.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <select
                    value={disciplineAllowedDay}
                    onChange={e => setDisciplineAllowedDay(Number(e.target.value))}
                    className="border border-emerald-200 rounded-xl px-3 py-2 text-xs font-bold text-emerald-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {DISCIPLINE_DAYS.map(day => <option key={day.value} value={day.value}>{day.label}</option>)}
                  </select>
                  <button
                    onClick={handleSaveDisciplineDay}
                    disabled={savingDisciplineDay}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {savingDisciplineDay ? 'Saving...' : 'Save day'}
                  </button>
                </div>
              </div>
            )}

            {filteredStandings.length > 0 && (
              <div className="grid md:grid-cols-3 gap-6 pt-4">
                <div className="order-2 md:order-1 bg-gradient-to-b from-slate-50 to-white border-2 border-slate-200 rounded-3xl p-6 shadow-md flex flex-col items-center text-center relative overflow-hidden">
                  <div className="bg-slate-200 text-slate-800 text-xs font-bold px-3 py-1 rounded-full mb-3 flex items-center gap-1">
                    <Medal className="w-4 h-4 text-slate-500" /> Rank #2 (Silver)
                  </div>
                  {rank2 ? (
                    <>
                      <div className="w-20 h-20 rounded-full bg-slate-100 border-4 border-slate-300 overflow-hidden mb-3 shadow-inner flex items-center justify-center">
                        {rank2.photo_url ? (
                          <img src={rank2.photo_url} alt={rank2.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-10 h-10 text-slate-400" />
                        )}
                      </div>
                      <h4 className="font-bold text-stone-900 text-base">{rank2.full_name}</h4>
                      <p className="text-xs text-stone-500">Father: {rank2.parent_name}</p>
                      <span className="text-xs bg-slate-100 text-slate-700 font-semibold px-2.5 py-0.5 rounded-full mt-2">{rank2.class_level}</span>
                      <div className="mt-4 pt-3 border-t border-slate-100 w-full">
                        <span className="text-2xl font-black text-slate-700">{rank2.totalPoints} <span className="text-xs font-medium">pts</span></span>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-stone-400 my-auto">No student yet</p>
                  )}
                </div>

                <div className="order-1 md:order-2 bg-gradient-to-b from-amber-500/10 via-amber-50 to-white border-2 border-amber-400 rounded-3xl p-6 shadow-xl flex flex-col items-center text-center relative overflow-hidden md:-mt-4">
                  <div className="bg-amber-400 text-amber-950 text-xs font-black px-3 py-1 rounded-full mb-3 flex items-center gap-1 shadow-sm">
                    <Crown className="w-4 h-4 text-amber-900" /> RANK #1 (GOLD)
                  </div>
                  {rank1 ? (
                    <>
                      <div className="w-24 h-24 rounded-full bg-amber-100 border-4 border-amber-400 overflow-hidden mb-3 shadow-md flex items-center justify-center">
                        {rank1.photo_url ? (
                          <img src={rank1.photo_url} alt={rank1.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-12 h-12 text-amber-600" />
                        )}
                      </div>
                      <h4 className="font-bold text-stone-900 text-lg">{rank1.full_name}</h4>
                      <p className="text-xs text-stone-600 font-medium">Father: {rank1.parent_name}</p>
                      <span className="text-xs bg-amber-100 text-amber-800 font-bold px-3 py-0.5 rounded-full mt-2">{rank1.class_level}</span>
                      <div className="mt-4 pt-3 border-t border-amber-200/60 w-full">
                        <span className="text-3xl font-black text-amber-700">{rank1.totalPoints} <span className="text-xs font-bold">pts</span></span>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-stone-400 my-auto">No student yet</p>
                  )}
                </div>

                <div className="order-3 bg-gradient-to-b from-amber-900/5 to-white border-2 border-amber-700/30 rounded-3xl p-6 shadow-md flex flex-col items-center text-center relative overflow-hidden">
                  <div className="bg-amber-800/10 text-amber-900 text-xs font-bold px-3 py-1 rounded-full mb-3 flex items-center gap-1">
                    <Medal className="w-4 h-4 text-amber-700" /> Rank #3 (Bronze)
                  </div>
                  {rank3 ? (
                    <>
                      <div className="w-20 h-20 rounded-full bg-amber-50 border-4 border-amber-700/40 overflow-hidden mb-3 shadow-inner flex items-center justify-center">
                        {rank3.photo_url ? (
                          <img src={rank3.photo_url} alt={rank3.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-10 h-10 text-amber-700" />
                        )}
                      </div>
                      <h4 className="font-bold text-stone-900 text-base">{rank3.full_name}</h4>
                      <p className="text-xs text-stone-500">Father: {rank3.parent_name}</p>
                      <span className="text-xs bg-amber-50 text-amber-900 font-semibold px-2.5 py-0.5 rounded-full mt-2">{rank3.class_level}</span>
                      <div className="mt-4 pt-3 border-t border-stone-100 w-full">
                        <span className="text-2xl font-black text-amber-900">{rank3.totalPoints} <span className="text-xs font-medium">pts</span></span>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-stone-400 my-auto">No student yet</p>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-stone-100">
                <div>
                  <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" /> Weekly Discipline Ratings (Out of 10)
                  </h3>
                  <p className="text-xs text-stone-500">Award discipline points (0 to 10) to students for the selected week.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={disciplineClassFilter}
                    onChange={e => setDisciplineClassFilter(e.target.value)}
                    className="border border-stone-200 rounded-xl px-3 py-1.5 text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {CLASS_LEVELS.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={disciplineWeekDate}
                    onChange={e => setDisciplineWeekDate(e.target.value)}
                    className="border border-stone-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={() => {
                      const m = {};
                      discClassStudents.forEach(s => m[s.id] = 10);
                      setDisciplineMap(m);
                    }}
                    className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold hover:bg-emerald-100"
                  >
                    All 10/10
                  </button>
                  <button
                    disabled={savingDiscipline}
                    onClick={async () => {
                      setSavingDiscipline(true);
                      try {
                        const rows = discClassStudents.map(s => ({
                          student_id: s.id,
                          week_date: disciplineWeekDate,
                          // Untouched students keep their saved score (10 only if none was saved yet).
                          score: disciplineMap[s.id] !== undefined
                            ? Number(disciplineMap[s.id])
                            : Number(disciplineRecords.find(d => d.student_id === s.id && d.week_date === disciplineWeekDate)?.score ?? 10),
                        }));
                        if (rows.length === 0) { toast.error('No students in selected class'); setSavingDiscipline(false); return; }
                        const { error } = await supabase.from('discipline_records').upsert(rows, { onConflict: 'student_id,week_date' });
                        if (error) throw error;
                        toast.success(`Discipline points saved for ${disciplineClassFilter}!`);
                        fetchLeaderboardTab();
                      } catch (err) {
                        toast.error(err.message || 'Failed to save discipline records');
                      } finally {
                        setSavingDiscipline(false);
                      }
                    }}
                    className="px-4 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-sm disabled:opacity-50"
                  >
                    {savingDiscipline ? 'Saving...' : 'Save Discipline'}
                  </button>
                </div>
              </div>

              {discClassStudents.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {discClassStudents.map(s => {
                    const currentScore = disciplineMap[s.id] !== undefined 
                      ? disciplineMap[s.id] 
                      : (disciplineRecords.find(d => d.student_id === s.id && d.week_date === disciplineWeekDate)?.score ?? 10);
                    return (
                      <div key={s.id} className="bg-stone-50 rounded-xl p-3 border border-stone-200 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-bold text-stone-900 text-xs truncate">{s.full_name}</p>
                          <p className="text-[10px] text-stone-400">Class: {s.class_level}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <input
                            type="number"
                            min="0"
                            max="10"
                            value={currentScore}
                            onChange={e => {
                              const val = Math.min(10, Math.max(0, Number(e.target.value)));
                              setDisciplineMap(m => ({ ...m, [s.id]: val }));
                            }}
                            className="w-14 border border-stone-300 rounded-lg text-center font-bold text-sm py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                          />
                          <span className="text-xs text-stone-400 font-bold">/ 10</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-stone-400 text-center py-6">No students enrolled in {disciplineClassFilter}.</p>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
                <div>
                  <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" /> Full Standings &amp; Score Breakdown
                  </h3>
                  <p className="text-xs text-stone-500">View overall rank, father's name, and breakdown across all point categories.</p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-stone-600">Filter Class:</label>
                  <select
                    value={leaderboardClassFilter}
                    onChange={e => setLeaderboardClassFilter(e.target.value)}
                    className="border border-stone-200 rounded-xl px-3 py-1.5 text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="all">All Classes</option>
                    {CLASS_LEVELS.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {filteredStandings.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-stone-200 text-stone-500 uppercase tracking-wider bg-stone-50">
                        <th className="py-3 px-3">Rank</th>
                        <th className="py-3 px-3">Student</th>
                        <th className="py-3 px-3">Father Name</th>
                        <th className="py-3 px-3">Class</th>
                        <th className="py-3 px-3 text-center">Attendance</th>
                        <th className="py-3 px-3 text-center">Exams</th>
                        <th className="py-3 px-3 text-center">Homework</th>
                        <th className="py-3 px-3 text-center">Discipline</th>
                        <th className="py-3 px-3 text-right">Total Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {filteredStandings.map(s => (
                        <tr key={s.id} className="hover:bg-stone-50/80 transition-colors">
                          <td className="py-3 px-3 font-bold text-stone-900">
                            {s.rank === 1 && <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-black text-xs">🥇 #1</span>}
                            {s.rank === 2 && <span className="inline-flex items-center gap-1 bg-slate-200 text-slate-800 px-2 py-0.5 rounded-full font-bold text-xs">🥈 #2</span>}
                            {s.rank === 3 && <span className="inline-flex items-center gap-1 bg-amber-900/10 text-amber-900 px-2 py-0.5 rounded-full font-bold text-xs">🥉 #3</span>}
                            {s.rank > 3 && <span className="text-stone-500 font-semibold px-2">#{s.rank}</span>}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-stone-100 border border-stone-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                                {s.photo_url ? (
                                  <img src={s.photo_url} alt={s.full_name} className="w-full h-full object-cover" />
                                ) : (
                                  <User className="w-4 h-4 text-stone-400" />
                                )}
                              </div>
                              <span className="font-bold text-stone-900">{s.full_name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-stone-600 font-medium">{s.parent_name}</td>
                          <td className="py-3 px-3"><span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-semibold">{s.class_level}</span></td>
                          <td className="py-3 px-3 text-center text-stone-600 font-semibold">+{s.attendancePoints} <span className="text-[10px] text-stone-400">({s.presentDays}d)</span></td>
                          <td className="py-3 px-3 text-center text-stone-600 font-semibold">+{s.examPoints} <span className="text-[10px] text-stone-400">({s.totalExamMarks}m)</span></td>
                          <td className="py-3 px-3 text-center text-stone-600 font-semibold">+{s.taskPoints} <span className="text-[10px] text-stone-400">({s.completedTasks}t)</span></td>
                          <td className="py-3 px-3 text-center text-stone-600 font-semibold">+{s.disciplinePoints}</td>
                          <td className="py-3 px-3 text-right">
                            <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-2.5 py-1 rounded-full">
                              {s.totalPoints} pts
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-stone-400 text-center py-8">No students found.</p>
              )}
            </div>

            <Modal open={showResetModal} onClose={() => setShowResetModal(false)} title="Reset Leaderboard Season">
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-800 text-xs">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Are you sure you want to reset the Leaderboard?</p>
                    <p className="mt-1">
                      This sets a new season timestamp (`last_reset_at = NOW()`). Points calculated from attendance, exams, homework, and discipline will start fresh from this moment. Past student records will remain completely safe.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    onClick={() => setShowResetModal(false)}
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const nowISO = new Date().toISOString();
                        const { error } = await supabase
                          .from('leaderboard_settings')
                          .upsert({ id: 1, last_reset_at: nowISO, updated_at: nowISO });
                        if (error) throw error;
                        toast.success('Leaderboard season reset successfully!');
                        setShowResetModal(false);
                        fetchLeaderboardTab();
                      } catch (err) {
                        toast.error(err.message || 'Failed to reset leaderboard');
                      }
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl"
                  >
                    Confirm Reset
                  </button>
                </div>
              </div>
            </Modal>
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* LEAVES TAB                                                     */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'classes' && (
        <div className={`max-w-6xl mx-auto px-4 space-y-4 md:space-y-6 ${isTeacher ? 'py-0 md:py-8' : 'py-8'}`}>
          <div className={`flex items-center justify-between ${isTeacher ? 'hidden md:flex' : ''}`}>
            <div>
              <h2 className="font-bold text-xl text-stone-900">Class Level Management</h2>
              <p className="text-xs text-stone-500">Manage Class 1 to Plus Two roster, teachers, attendance & homework</p>
            </div>
          </div>

          {/* Admins who are also class teachers: their classes, or every class */}
          {!isTeacher && myClassLevels.length > 0 && (
            <div className="inline-flex rounded-2xl bg-stone-100 p-1">
              {[
                { id: 'mine', label: `⭐ My classes (${myClassLevels.length})` },
                { id: 'all', label: 'All classes' },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setClassScope(opt.id);
                    if (opt.id === 'mine' && !myClassLevels.includes(selectedClassLevel)) setSelectedClassLevel(myClassLevels[0]);
                  }}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors ${classScope === opt.id ? 'bg-white text-emerald-700 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* 10 Class Pills Bar */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar touch-pan-x flex-nowrap pb-2">
            {CLASS_LEVELS
              .filter(cls => !showOnlyMyClasses || myClassLevels.includes(cls))
              .map(cls => {
              const count = activeInClass(cls).length;
              const isSelected = selectedClassLevel === cls;
              return (
                <button
                  key={cls}
                  onClick={() => setSelectedClassLevel(cls)}
                  className={`flex-shrink-0 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200 scale-105'
                      : 'bg-white text-stone-600 border-stone-200 hover:border-emerald-300'
                  }`}
                >
                  <span>{!isTeacher && !showOnlyMyClasses && myClassLevels.includes(cls) ? `⭐ ${cls}` : cls}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${isSelected ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Class Overview Header Card */}
          {(() => {
            const clsStudents = activeInClass(selectedClassLevel);
            const currentCT = classTeachers.find(ct => ct.class_level === selectedClassLevel);
            const clsSubjects = subjectsList.filter(s => s.class_level === selectedClassLevel);

            return (
              <div className={`bg-gradient-to-br from-stone-900 via-emerald-950 to-stone-900 text-white rounded-3xl p-6 shadow-xl space-y-4 border border-white/10 ${isTeacher ? 'hidden md:block' : ''}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/30">
                      Selected Class Level
                    </span>
                    <h3 className="font-heading text-3xl font-bold mt-2 text-white">{selectedClassLevel}</h3>
                    <p className="text-xs text-stone-300 mt-1">
                      {clsStudents.length} Students Enrolled &nbsp;·&nbsp; {clsSubjects.length} Active Subjects
                    </p>
                  </div>

                  {/* Assign Class Teacher Form (Admin Only) */}
                  {!isTeacher && (
                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 space-y-2 min-w-[280px]">
                      <p className="text-xs font-bold text-emerald-300 flex items-center gap-1">
                        Assigned Class Teacher
                      </p>
                      <select
                        value={currentCT?.teacher_name || ''}
                        onChange={async (e) => {
                          const val = e.target.value;
                          const { error } = await supabase
                            .from('class_teachers')
                            .upsert({ class_level: selectedClassLevel, teacher_name: val }, { onConflict: 'class_level' });
                          if (error) { toast.error(error.message); return; }
                          toast.success(`Assigned ${val || 'None'} to ${selectedClassLevel}`);
                          fetchClassTeachers();
                        }}
                        className="w-full bg-stone-800 text-white border border-white/20 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      >
                        <option value="">-- No Teacher Assigned --</option>
                        {teacherContacts.map(t => (
                          <option key={t.id} value={t.full_name}>{t.full_name} ({t.subject})</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Sub-tabs Inside Class Manager */}
                <div className="flex gap-2 border-t border-white/10 pt-4 pb-2 overflow-x-auto no-scrollbar touch-pan-x flex-nowrap snap-x snap-mandatory">
                  {[
                    { id: 'students', label: `Students Roster (${clsStudents.length})` },
                    { id: 'attendance', label: 'Attendance' },
                    { id: 'fees', label: 'Fees', adminOnly: true },
                    { id: 'tasks', label: 'Homework' },
                    { id: 'discipline', label: 'Discipline' },
                    { id: 'timetable', label: 'Timetable' },
                    { id: 'subjects', label: '📚 Subjects', adminOnly: true },
                    { id: 'leaves', label: 'Leaves' },
                  ].filter(st => !st.adminOnly || !isTeacher).map(st => (
                    <button
                      key={st.id}
                      onClick={() => setClassSubTab(st.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors snap-start whitespace-nowrap ${
                        classSubTab === st.id
                          ? 'bg-emerald-500 text-stone-950 shadow-md'
                          : 'bg-white/10 text-stone-300 hover:bg-white/20'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* SUB-TAB 1: STUDENTS ROSTER & QUICK ATTENDANCE */}
          {classSubTab === 'students' && (() => {
            const clsStudents = activeInClass(selectedClassLevel);
            return (
              <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-6 shadow-sm space-y-4 relative">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-stone-100">
                  <h4 className="font-bold text-stone-900 text-base">Class Roster &amp; Batch Attendance</h4>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={classAttendanceDate}
                      onChange={e => setClassAttendanceDate(e.target.value)}
                      className="border border-stone-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-auto"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {clsStudents.map(s => {
                    const attStatus = classAttendanceMap[s.id] || 'unmarked';
                    return (
                      <div
                        key={s.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => { setSelectedStudent(s); setShow360Modal(true); }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedStudent(s);
                            setShow360Modal(true);
                          }
                        }}
                        className="border border-stone-200 rounded-2xl p-4 flex flex-col gap-3 bg-stone-50/50 hover:bg-emerald-50 hover:border-emerald-200 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-bold text-stone-900 text-sm mb-0.5 line-clamp-1">{s.full_name}</h5>
                            <p className="text-[10px] font-medium text-emerald-600">Click to view profile</p>
                          </div>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${s.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-600'}`}>
                            {s.status}
                          </span>
                        </div>
                        <div className="flex gap-2 pt-2 border-t border-stone-100">
                          <button
                            onClick={e => { e.stopPropagation(); setClassAttendanceMap(m => ({ ...m, [s.id]: 'present' })); }}
                            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${attStatus === 'present' ? 'bg-emerald-500 text-white shadow-md' : 'bg-white border border-stone-200 text-stone-500 hover:bg-stone-100'}`}
                          >
                            Present
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); setClassAttendanceMap(m => ({ ...m, [s.id]: 'absent' })); }}
                            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${attStatus === 'absent' ? 'bg-red-500 text-white shadow-md' : 'bg-white border border-stone-200 text-stone-500 hover:bg-stone-100'}`}
                          >
                            Absent
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {clsStudents.length === 0 && (
                  <p className="text-stone-400 text-xs text-center py-8">No students currently enrolled in {selectedClassLevel}.</p>
                )}

                {/* Sticky Action Bar for Mobile Attendance */}
                {clsStudents.length > 0 && (
                  <div className="sticky bottom-4 z-10 bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-stone-200 flex items-center justify-between gap-3 mt-8 max-w-sm mx-auto w-full">
                    <div className="flex gap-2 flex-1">
                      <button
                        onClick={() => {
                          const m = {};
                          clsStudents.forEach(s => m[s.id] = 'present');
                          setClassAttendanceMap(m);
                        }}
                        className="px-2 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-[11px] font-bold hover:bg-emerald-100 shadow-sm flex-1 text-center"
                      >
                        All Pre
                      </button>
                      <button
                        onClick={() => {
                          const m = {};
                          clsStudents.forEach(s => m[s.id] = 'absent');
                          setClassAttendanceMap(m);
                        }}
                        className="px-2 py-2 bg-red-50 text-red-700 border border-red-200 rounded-xl text-[11px] font-bold hover:bg-red-100 shadow-sm flex-1 text-center"
                      >
                        All Abs
                      </button>
                    </div>
                    <button
                      onClick={async () => {
                        const rows = Object.entries(classAttendanceMap).map(([sid, status]) => ({
                          student_id: sid,
                          date: classAttendanceDate,
                          status,
                        }));
                        if (rows.length === 0) { toast.error('No status toggled'); return; }
                        const { error } = await supabase.from('attendance').upsert(rows, { onConflict: 'student_id,date' });
                        if (error) { toast.error(error.message); return; }
                        toast.success(`Attendance saved for ${selectedClassLevel} on ${classAttendanceDate}`);
                      }}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-md whitespace-nowrap"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* SUB-TAB 2: CLASS HOMEWORK & TASKS */}
          {classSubTab === 'tasks' && (() => {
            const clsStudents = activeInClass(selectedClassLevel);
            return (
              <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                  <h4 className="font-bold text-stone-900 text-base">Class Homework &amp; Assignments ({selectedClassLevel})</h4>
                  <button onClick={() => setShowAddClassTask(true)} className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700">
                    <Plus className="w-4 h-4" /> Assign Homework
                  </button>
                </div>

                <p className="text-xs text-stone-500">Assigning homework here sends it to all {clsStudents.length} students in {selectedClassLevel}.</p>

                <Modal open={showAddClassTask} onClose={() => setShowAddClassTask(false)} title={`Assign Homework to ${selectedClassLevel}`}>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!classTaskForm.title) { toast.error('Title is required'); return; }
                    setClassTaskLoading(true);
                    try {
                      const taskRows = clsStudents.map(s => ({
                        student_id: s.id,
                        title: classTaskForm.title,
                        description: classTaskForm.description,
                        due_date: classTaskForm.due_date || null,
                        status: 'pending',
                      }));
                      if (taskRows.length === 0) { toast.error('No students in this class to assign tasks to'); setClassTaskLoading(false); return; }
                      const { error } = await supabase.from('student_tasks').insert(taskRows);
                      if (error) throw error;

                      // Auto-publish targeted push notification for parents of this class
                      const { data: { session } } = await supabase.auth.getSession();
                      await supabase.from('announcements').insert([{
                        title: `📚 New Homework: ${classTaskForm.title}`,
                        message: `${classTaskForm.description || 'New homework task assigned.'}${classTaskForm.due_date ? ` (Due: ${classTaskForm.due_date})` : ''}`,
                        target_class: selectedClassLevel,
                        severity: 'medium',
                        created_by: session?.user?.id,
                      }]);

                      toast.success(`Homework & targeted parent notification assigned for ${selectedClassLevel}!`);
                      setShowAddClassTask(false);
                      setClassTaskForm({ title: '', description: '', due_date: '' });
                      fetchClassTasks(selectedClassLevel);
                    } catch (err) {
                      toast.error(err.message);
                    } finally {
                      setClassTaskLoading(false);
                    }
                  }} className="space-y-3">
                    <Input label="Homework Title *" value={classTaskForm.title} onChange={e => setClassTaskForm(f => ({...f, title: e.target.value}))} placeholder="e.g. Surah Al-Mulk Memorization Lines 1-10" required />
                    <Input label="Due Date" type="date" value={classTaskForm.due_date} onChange={e => setClassTaskForm(f => ({...f, due_date: e.target.value}))} />
                    <div>
                      <label className="block text-xs font-semibold text-stone-600 mb-1">Instructions / Description</label>
                      <textarea value={classTaskForm.description} onChange={e => setClassTaskForm(f => ({...f, description: e.target.value}))} rows={3} className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" placeholder="Detailed instructions for students..." />
                    </div>
                    <button type="submit" disabled={classTaskLoading} className="w-full bg-emerald-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-60">
                      {classTaskLoading ? 'Assigning...' : 'Assign to All Students'}
                    </button>
                  </form>
                </Modal>

                {/* CLASS HOMEWORK TASKS HISTORY & ROSTER TABLE */}
                {classTasks.length > 0 ? (
                  <div className="overflow-x-auto no-scrollbar touch-scroll border border-stone-200 rounded-2xl">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-stone-200 text-stone-500 uppercase tracking-wider bg-stone-50">
                          <th className="py-3 px-3">Student</th>
                          <th className="py-3 px-3">Homework Title &amp; Description</th>
                          <th className="py-3 px-3">Assigned Date</th>
                          <th className="py-3 px-3">Due Date</th>
                          <th className="py-3 px-3 text-center">Status</th>
                          <th className="py-3 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {classTasks.map(t => (
                          <tr key={t.id} className="hover:bg-stone-50/80 transition-colors">
                            <td className="py-3 px-3 font-bold text-stone-900">{t.students?.full_name || 'Student'}</td>
                            <td className="py-3 px-3">
                              <p className="font-bold text-stone-900">{t.title}</p>
                              {t.description && <p className="text-[11px] text-stone-500 mt-0.5">{t.description}</p>}
                            </td>
                            <td className="py-3 px-3 text-stone-600 font-medium">
                              {t.created_at ? new Date(t.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                            </td>
                            <td className="py-3 px-3 text-stone-600 font-medium">
                              {t.due_date ? new Date(t.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'No due date'}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                t.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {t.status === 'completed' ? '✓ Completed' : 'Pending'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                onClick={async () => {
                                  if (!window.confirm('Delete this homework assignment?')) return;
                                  try {
                                    const { error } = await supabase.from('student_tasks').delete().eq('id', t.id);
                                    if (error) throw error;
                                    toast.success('Homework task deleted');
                                    fetchClassTasks(selectedClassLevel);
                                  } catch (err) {
                                    toast.error(err.message);
                                  }
                                }}
                                className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Homework"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                    <ClipboardList className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-stone-600">No homework tasks assigned to {selectedClassLevel} yet.</p>
                    <p className="text-[11px] text-stone-400 mt-1">Click "+ Assign Homework" above to send homework to all students in {selectedClassLevel}.</p>
                  </div>
                )}
              </div>
            );
          })()}

          {/* SUB-TAB: DISCIPLINE RATINGS */}
          {classSubTab === 'discipline' && (() => {
            const discClassStudents = activeInClass(selectedClassLevel);
            const disciplineDayIsOpen = !isTeacher || new Date().getDay() === disciplineAllowedDay;
            const disciplineDayLabel = DISCIPLINE_DAYS.find(day => day.value === disciplineAllowedDay)?.label || 'the permitted day';
            return (
              <motion.div key="discipline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-stone-100">
                    <div>
                      <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-600" /> Weekly Discipline Ratings
                      </h3>
                      <p className="text-xs text-stone-500">Award discipline points (0 to 10) to {selectedClassLevel} students for the week.</p>
                      {isTeacher && (
                        <div className={`mt-2 text-xs rounded-xl px-3 py-2 ${disciplineDayIsOpen ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {disciplineDayIsOpen
                            ? `Scoring is open today (${disciplineDayLabel}).`
                            : `Scoring is locked. Teachers can update scores on ${disciplineDayLabel}.`}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="date"
                        value={disciplineWeekDate}
                        onChange={e => setDisciplineWeekDate(e.target.value)}
                        className="border border-stone-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        disabled={!disciplineDayIsOpen}
                        onClick={() => {
                          const m = {};
                          discClassStudents.forEach(s => m[s.id] = 10);
                          setDisciplineMap(m);
                        }}
                        className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        All 10/10
                      </button>
                      <button
                        disabled={savingDiscipline || !disciplineDayIsOpen}
                        onClick={async () => {
                          if (!disciplineDayIsOpen) {
                            toast.error(`Teachers can only update scores on ${disciplineDayLabel}.`);
                            return;
                          }
                          setSavingDiscipline(true);
                          try {
                            const rows = discClassStudents.map(s => ({
                              student_id: s.id,
                              week_date: disciplineWeekDate,
                              // Untouched students keep their saved score (10 only if none was saved yet).
                          score: disciplineMap[s.id] !== undefined
                            ? Number(disciplineMap[s.id])
                            : Number(disciplineRecords.find(d => d.student_id === s.id && d.week_date === disciplineWeekDate)?.score ?? 10),
                            }));
                            if (rows.length === 0) { toast.error('No students in selected class'); setSavingDiscipline(false); return; }
                            const { error } = await supabase.from('discipline_records').upsert(rows, { onConflict: 'student_id,week_date' });
                            if (error) throw error;
                            toast.success(`Discipline points saved for ${selectedClassLevel}!`);
                            fetchDisciplineWeek();
                          } catch (err) {
                            toast.error(err.message || 'Failed to save discipline records');
                          } finally {
                            setSavingDiscipline(false);
                          }
                        }}
                        className="px-4 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {savingDiscipline ? 'Saving...' : 'Save Discipline'}
                      </button>
                    </div>
                  </div>

                  {discClassStudents.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {discClassStudents.map(s => {
                        const currentScore = disciplineMap[s.id] !== undefined 
                          ? disciplineMap[s.id] 
                          : (disciplineRecords.find(d => d.student_id === s.id && d.week_date === disciplineWeekDate)?.score ?? 10);
                        return (
                          <div key={s.id} className="bg-stone-50 rounded-xl p-3 border border-stone-200 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-bold text-stone-900 text-xs truncate">{s.full_name}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <input
                                type="number"
                                min="0"
                                max="10"
                                value={currentScore}
                                disabled={!disciplineDayIsOpen}
                                onChange={e => {
                                  const val = Math.min(10, Math.max(0, Number(e.target.value)));
                                  setDisciplineMap(m => ({ ...m, [s.id]: val }));
                                }}
                                className="w-14 border border-stone-300 rounded-lg text-center font-bold text-sm py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white disabled:bg-stone-100 disabled:text-stone-400"
                              />
                              <span className="text-xs text-stone-400 font-bold">/ 10</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-stone-400 text-center py-6">No students enrolled in {selectedClassLevel}.</p>
                  )}
                </div>
              </motion.div>
            );
          })()}

          {/* SUB-TAB 3: TIMETABLE & SUBJECTS */}


          {classSubTab === 'attendance' && (() => {
            const clsAttendanceStudents = attendanceStudents.filter(s =>
              (s.class_level || '').trim().toLowerCase() === (selectedClassLevel || '').trim().toLowerCase()
            );
            const visibleAttendanceStudents = clsAttendanceStudents.filter(s =>
              s.full_name.toLowerCase().includes(attendanceSearch.toLowerCase())
            );
            const attendanceCounts = clsAttendanceStudents.reduce((counts, student) => {
              const status = attendanceMap[student.id];
              if (status === 'present') counts.present += 1;
              if (status === 'absent') counts.absent += 1;
              if (status === 'late') counts.late += 1;
              if (!status) counts.unmarked += 1;
              return counts;
            }, { present: 0, absent: 0, late: 0, unmarked: 0 });
            return (
            <motion.div key="attendance" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 sm:p-5 mb-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-stone-900">Daily Attendance</h2>
                        <p className="text-xs text-stone-500">{selectedClassLevel} · {clsAttendanceStudents.length} students</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={e => { setAttendanceDate(e.target.value); fetchAttendanceForDate(e.target.value); }}
                    max={localDateString()}
                    className="border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-auto"
                  />
                    <Btn className="whitespace-nowrap" onClick={handleSaveAttendance} loading={attendanceSaving}>
                      <CheckCircle className="w-4 h-4" /> Save
                    </Btn>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5">
                  {[
                    ['Present', attendanceCounts.present, 'text-emerald-700 bg-emerald-50'],
                    ['Absent', attendanceCounts.absent, 'text-red-700 bg-red-50'],
                    ['Late', attendanceCounts.late, 'text-amber-700 bg-amber-50'],
                    ['Unmarked', attendanceCounts.unmarked, 'text-stone-600 bg-stone-100'],
                  ].map(([label, count, color]) => (
                    <div key={label} className={`rounded-xl px-3 py-2 ${color}`}>
                      <p className="text-[10px] font-bold uppercase tracking-wide opacity-75">{label}</p>
                      <p className="text-lg font-bold">{count}</p>
                    </div>
                  ))}
                </div>
              </div>

              {clsAttendanceStudents.length > 0 ? (
                <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
                  {/* Quick toggle all */}
                  <div className="p-3 border-b border-stone-50 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <input
                        value={attendanceSearch}
                        onChange={e => setAttendanceSearch(e.target.value)}
                        placeholder="Search students..."
                        className="w-full pl-9 pr-3 py-2 text-xs border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="flex gap-2">
                    <button
                      onClick={() => { const m = {}; clsAttendanceStudents.forEach(s => m[s.id] = 'present'); setAttendanceMap(m); }}
                      className="text-xs px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg font-medium hover:bg-emerald-200"
                    >All Present</button>
                    <button
                      onClick={() => { const m = {}; clsAttendanceStudents.forEach(s => m[s.id] = 'absent'); setAttendanceMap(m); }}
                      className="text-xs px-3 py-1.5 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200"
                    >All Absent</button>
                    </div>
                  </div>
                  <div className="divide-y divide-stone-50">
                    {visibleAttendanceStudents.map((s) => (
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
                    {visibleAttendanceStudents.length === 0 && (
                      <p className="text-sm text-stone-400 text-center py-8">No students match your search.</p>
                    )}
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
            );
          })()}

          {/* ── FEES ── */}
          
          {classSubTab === 'fees' && (function(feeStudents) {
            return (
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
            );
          })(feeStudents.filter(s => s.class_level === selectedClassLevel))}

          {/* ── GALLERY ── */}
          
          {classSubTab === 'timetable' && (
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-xl text-stone-900">Class Timetable</h2>
            <button onClick={() => setShowAddTimetable(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors">
              <Plus className="w-4 h-4" /> Add Slot
            </button>
          </div>
          {Object.entries(
            timetable.reduce((acc, row) => { (acc[row.class_level] = acc[row.class_level] || []).push(row); return acc; }, {})
          ).map(([cls, rows]) => (
            <div key={cls} className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
              <div className="px-5 py-3 bg-emerald-50 border-b border-stone-200">
                <span className="font-bold text-emerald-800 text-sm">{cls}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-stone-100 text-stone-500 text-xs">
                    <th className="px-4 py-2 text-left">Day</th>
                    <th className="px-4 py-2 text-left">Period</th>
                    <th className="px-4 py-2 text-left">Subject</th>
                    <th className="px-4 py-2 text-left">Teacher</th>
                    <th className="px-4 py-2 text-left">Time</th>
                    <th className="px-4 py-2 text-left">Action</th>
                  </tr></thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r.id} className="border-b border-stone-50 hover:bg-stone-50">
                        <td className="px-4 py-2 font-medium text-stone-700">{r.day_of_week}</td>
                        <td className="px-4 py-2 text-stone-500">P{r.period_number}</td>
                        <td className="px-4 py-2 font-semibold text-stone-900">{r.subject}</td>
                        <td className="px-4 py-2 text-stone-600">{r.teacher_name}</td>
                        <td className="px-4 py-2 text-stone-500">{r.start_time?.slice(0,5)} – {r.end_time?.slice(0,5)}</td>
                        <td className="px-4 py-2">
                          <button onClick={() => confirmAndDelete('timetable', r.id, 'timetable slot', fetchTimetable)} className="text-red-400 hover:text-red-600 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {timetable.length === 0 && <p className="text-stone-400 text-sm text-center py-12">No timetable entries yet. Add slots using the button above.</p>}

          <Modal open={showAddTimetable} onClose={() => setShowAddTimetable(false)} title="Add Timetable Slot">
            <form onSubmit={async e => {
              e.preventDefault();
              const { error } = await supabase.from('timetable').insert([timetableForm]);
              if (error) { toast.error(error.message); return; }
              toast.success('Slot added');
              setShowAddTimetable(false);
              setTimetableForm({ class_level: '', day_of_week: 'Monday', period_number: 1, subject: '', teacher_name: '', start_time: '', end_time: '' });
              fetchTimetable();
            }} className="space-y-3">
              <Input label="Class Level *" value={timetableForm.class_level} onChange={e => setTimetableForm(f => ({...f, class_level: e.target.value}))} placeholder="e.g. Class 5" required />
              <div className="mb-4">
                <label className="block text-sm font-medium text-stone-700 mb-1">Day *</label>
                <select value={timetableForm.day_of_week} onChange={e => setTimetableForm(f => ({...f, day_of_week: e.target.value}))} className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <Input label="Period No. *" type="number" min="1" value={timetableForm.period_number} onChange={e => setTimetableForm(f => ({...f, period_number: parseInt(e.target.value)}))} required />
              <Input label="Subject *" value={timetableForm.subject} onChange={e => setTimetableForm(f => ({...f, subject: e.target.value}))} placeholder="e.g. Quran" required />
              <Input label="Teacher Name *" value={timetableForm.teacher_name} onChange={e => setTimetableForm(f => ({...f, teacher_name: e.target.value}))} placeholder="e.g. Ustadh Ahmed" required />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Start Time *" type="time" value={timetableForm.start_time} onChange={e => setTimetableForm(f => ({...f, start_time: e.target.value}))} required />
                <Input label="End Time *" type="time" value={timetableForm.end_time} onChange={e => setTimetableForm(f => ({...f, end_time: e.target.value}))} required />
              </div>
              <button type="submit" className="w-full bg-emerald-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors">Add Slot</button>
            </form>
          </Modal>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* SUBJECTS TAB                                                   */}
      {/* ══════════════════════════════════════════════════════════════ */}
      
          {classSubTab === 'subjects' && (function(subjectsList) {
            return (
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-xl text-stone-900">📚 Subjects</h2>
            <button onClick={() => setShowAddSubject(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors">
              <Plus className="w-4 h-4" /> Add Subject
            </button>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjectsList.map(s => (
              <div key={s.id} className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-stone-900">{s.name}</p>
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{s.class_level}</span>
                  </div>
                  <button onClick={() => confirmAndDelete('subjects', s.id, 'subject', fetchSubjects)} className="text-red-400 hover:text-red-600 transition-colors p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {s.teacher_name && <p className="text-xs text-stone-500">{s.teacher_name}</p>}
                {s.description && <p className="text-xs text-stone-400">{s.description}</p>}
              </div>
            ))}
          </div>
          {subjectsList.length === 0 && <p className="text-stone-400 text-sm text-center py-12">No subjects yet. Add subjects using the button above.</p>}

          <Modal open={showAddSubject} onClose={() => setShowAddSubject(false)} title="Add Subject">
            <form onSubmit={async e => {
              e.preventDefault();
              const { error } = await supabase.from('subjects').insert([subjectForm]);
              if (error) { toast.error(error.message); return; }
              toast.success('Subject added');
              setShowAddSubject(false);
              setSubjectForm({ class_level: '', name: '', description: '', teacher_name: '' });
              fetchSubjects();
            }} className="space-y-3">
              <Input label="Class Level *" value={subjectForm.class_level} onChange={e => setSubjectForm(f => ({...f, class_level: e.target.value}))} placeholder="e.g. Class 5" required />
              <Input label="Subject Name *" value={subjectForm.name} onChange={e => setSubjectForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Quran" required />
              <Input label="Teacher Name" value={subjectForm.teacher_name} onChange={e => setSubjectForm(f => ({...f, teacher_name: e.target.value}))} placeholder="e.g. Ustadh Ahmed" />
              <div className="mb-4">
                <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
                <textarea value={subjectForm.description} onChange={e => setSubjectForm(f => ({...f, description: e.target.value}))} rows={3} className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Brief description..." />
              </div>
              <button type="submit" className="w-full bg-emerald-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors">Add Subject</button>
            </form>
          </Modal>
        </div>
            );
          })(subjectsList.filter(s => s.class_level === selectedClassLevel))}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TEACHERS TAB                                                   */}
      {/* ══════════════════════════════════════════════════════════════ */}
      
          {classSubTab === 'leaves' && (function(leaveApplications) {
            return (
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-4">
          <h2 className="font-bold text-xl text-stone-900">Leave Applications</h2>
          {leaveApplications.length === 0 && <p className="text-stone-400 text-sm text-center py-12">No leave applications submitted yet.</p>}
          {leaveApplications.map(l => (
            <div key={l.id} className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-bold text-stone-900">{l.students?.full_name}</p>
                  <p className="text-xs text-stone-500">{l.students?.class_level} &nbsp;·&nbsp; {new Date(l.from_date).toLocaleDateString('en-IN')} → {new Date(l.to_date).toLocaleDateString('en-IN')}</p>
                  <p className="text-sm text-stone-700 mt-1">{l.reason}</p>
                </div>
                <div className="flex-shrink-0 flex flex-col items-end gap-2">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                    l.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                    l.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>{l.status.toUpperCase()}</span>
                  {l.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => setLeaveStatus(l.id, 'approved')} className="px-3 py-1 bg-emerald-600 text-white text-xs rounded-lg font-semibold hover:bg-emerald-700 transition-colors">Approve</button>
                      <button onClick={() => setLeaveStatus(l.id, 'rejected')} className="px-3 py-1 bg-red-500 text-white text-xs rounded-lg font-semibold hover:bg-red-600 transition-colors">Reject</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
            );
          })(leaveApplications.filter(l => l.students?.class_level === selectedClassLevel))}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* CLASS LEVEL MANAGEMENT TAB (Class 1 to Plus Two, Hifz, Alim)   */}
      {/* ══════════════════════════════════════════════════════════════ */}
      
          </div>
      )}

      {/* ── MOBILE QUICK DOCK (Sticky Bottom Navigation for Mobile Phones) ── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 px-2 py-2 flex items-center justify-between overflow-x-auto no-scrollbar shadow-lg">
        {isTeacher ? (
          [
            { id: 'students', label: 'Students', icon: Users },
            { id: 'attendance', label: 'Attendance', icon: UserCheck },
            { id: 'tasks', label: 'Homework', icon: ClipboardList },
            { id: 'discipline', label: 'Discipline', icon: ShieldCheck },
            { id: 'timetable', label: 'Timetable', icon: Clock },
            { id: 'leaves', label: 'Leaves', icon: Calendar },
          ].map(({ id, label, icon: Icon }) => {
            const isActive = classSubTab === id;
            return (
              <button
                key={id}
                onClick={() => {
                  setActiveTab('classes');
                  setClassSubTab(id);
                }}
                className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all flex-shrink-0 ${
                  isActive ? 'text-emerald-700 font-bold scale-105' : 'text-stone-400 hover:text-stone-700 font-medium'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-stone-400'}`} />
                <span className="text-[9px] tracking-tight">{label}</span>
              </button>
            );
          })
        ) : (
          [
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'classes', label: 'Classes', icon: School },
            { id: 'students', label: 'Students', icon: Users },
            { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
            { id: 'approvals', label: 'Approvals', icon: UserCheck },
          ].map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all flex-shrink-0 ${
                  isActive ? 'text-emerald-700 font-bold scale-105' : 'text-stone-400 hover:text-stone-700 font-medium'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-stone-400'}`} />
                <span className="text-[9px] tracking-tight">{label}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
