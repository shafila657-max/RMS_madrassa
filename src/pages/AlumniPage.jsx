import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap, Search, Phone, MessageSquare, MapPin, Briefcase,
  Building, Plus, Sparkles, Users, Award, Calendar, ChevronRight, ArrowLeft,
  X, CheckCircle2, RefreshCw, Send, Check, Lock, ShieldCheck, KeyRound, LogIn, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import AlumniRegisterModal from '@/components/AlumniRegisterModal';

const AlumniPage = () => {
  const navigate = useNavigate();
  const [alumniList, setAlumniList] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('All');
  const [industryFilter, setIndustryFilter] = useState('All');
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // Privacy & Auth Check. Directory details are only fetched for approved members.
  const [isApprovedAlumni, setIsApprovedAlumni] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userStatusMsg, setUserStatusMsg] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  // Modals for cards
  const [showMentorsModal, setShowMentorsModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // RSVP Form State
  const [rsvpForm, setRsvpForm] = useState({ attendee_name: '', email: '', phone: '' });
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [rsvpSuccess, setRsvpSuccess] = useState(false);

  useEffect(() => {
    checkUserAccessAndFetch();
  }, []);

  const checkUserAccessAndFetch = async () => {
    setCheckingAuth(true);
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUser(session?.user || null);
      let directoryAccess = false;

      if (!session?.user) {
        setIsApprovedAlumni(false);
        setUserStatusMsg('guest');
      } else {
        const uid = session.user.id;

        // Any approved signed-in member (admin, parent, student, teacher, or alumni)
        // can view the directory. Teachers are treated as approved by auth rules.
        const { data: prof } = await supabase
          .from('profiles')
          .select('role, status')
          .eq('id', uid)
          .maybeSingle();

        const approvedMember = prof?.status === 'approved' || prof?.role === 'teacher';

        if (approvedMember) {
          directoryAccess = true;
          setIsApprovedAlumni(true);
          setUserStatusMsg(prof.role === 'admin' ? 'admin' : 'approved');
        } else {
          // Alumni profiles are separately approved and may be linked to a parent/student account.
          const { data: alumProf } = await supabase
            .from('alumni_profiles')
            .select('status')
            .eq('user_id', uid)
            .maybeSingle();

          if (alumProf?.status === 'approved') {
            directoryAccess = true;
            setIsApprovedAlumni(true);
            setUserStatusMsg('approved');
          } else if (alumProf?.status === 'pending') {
            setIsApprovedAlumni(false);
            setUserStatusMsg('pending');
          } else {
            setIsApprovedAlumni(false);
            setUserStatusMsg('unregistered');
          }
        }
      }

      // Fetch Events (Public)
      const { data: eventsData } = await supabase
        .from('alumni_events')
        .select('*')
        .order('event_date', { ascending: true });
      setEvents(eventsData || []);

      // Never fetch directory records for guests, pending users, or unapproved accounts.
      // The public page remains a showcase with registration and event actions only.
      if (directoryAccess) {
        const { data: alumniData } = await supabase
          .from('alumni_profiles')
          .select('*')
          .eq('status', 'approved')
          .order('created_at', { ascending: false });

        setAlumniList(alumniData || []);
      } else {
        setAlumniList([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingAuth(false);
      setLoading(false);
    }
  };

  const handleRSVP = async (e) => {
    e.preventDefault();
    if (!rsvpForm.attendee_name || !rsvpForm.phone) {
      toast.error('Name and Phone number are required');
      return;
    }
    setRsvpLoading(true);
    try {
      const eventId = selectedEvent?.id || null;
      const { error } = await supabase.from('alumni_rsvps').insert([{
        event_id: eventId,
        attendee_name: rsvpForm.attendee_name,
        email: rsvpForm.email,
        phone: rsvpForm.phone,
      }]);
      if (error) throw error;
      setRsvpSuccess(true);
      toast.success('RSVP confirmed!');
    } catch (err) {
      toast.error('Failed to submit RSVP: ' + err.message);
    } finally {
      setRsvpLoading(false);
    }
  };

  // Format WhatsApp Link
  const getWhatsAppLink = (number, customMsg) => {
    if (!number) return '#';
    const cleanNum = number.replace(/[^\d+]/g, '');
    const text = encodeURIComponent(customMsg || 'Assalamu Alaikum! Reaching out from the RMS Madrasa Community.');
    return `https://wa.me/${cleanNum}?text=${text}`;
  };

  // Filtered List
  const filteredAlumni = alumniList.filter(item => {
    const matchesSearch =
      item.full_name.toLowerCase().includes(search.toLowerCase()) ||
      item.working_area.toLowerCase().includes(search.toLowerCase()) ||
      (item.company_org && item.company_org.toLowerCase().includes(search.toLowerCase())) ||
      (item.location && item.location.toLowerCase().includes(search.toLowerCase()));

    const matchesYear = yearFilter === 'All' || item.passout_year === yearFilter;
    const matchesIndustry = industryFilter === 'All' || item.working_area === industryFilter;

    return matchesSearch && matchesYear && matchesIndustry;
  });

  const mentorsList = alumniList.filter(a => a.is_mentor);
  const uniqueYears = Array.from(new Set(alumniList.map(a => a.passout_year))).filter(Boolean).sort();
  const uniqueIndustries = Array.from(new Set(alumniList.map(a => a.working_area))).filter(Boolean).sort();

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-stone-50 to-emerald-100/40">
      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-stone-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-xl hover:bg-stone-100 text-stone-500 transition-colors"
              title="Back to home"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <img src="/apple-touch-icon.png" alt="RMS Madrasa" className="w-8 h-8 rounded-xl object-cover" />
              <div>
                <p className="font-bold text-stone-900 text-sm leading-tight">RMS Alumni Community</p>
                <p className="text-[10px] text-stone-400 leading-tight">Madrasa Network & Directory</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isApprovedAlumni && (
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full hidden sm:flex items-center gap-1 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Verified Access
              </span>
            )}
            <button
              onClick={() => setShowRegisterModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-200 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Join Alumni Network
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero Banner ── */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white py-12 px-4 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1 rounded-full text-xs text-emerald-200 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Inspiring Generations of Madrasa Graduates
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Our Alumni Network & Community</h1>
          <p className="text-emerald-100 text-sm max-w-xl mx-auto leading-relaxed">
            Discover where our Madrasa graduates are making an impact worldwide. Connect, collaborate, and mentor the next generation.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">

        {/* ── PRIVACY ENFORCEMENT SECTION ── */}
        {!checkingAuth && !isApprovedAlumni ? (
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl p-8 border-2 border-stone-200 shadow-xl text-center max-w-2xl mx-auto space-y-5">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
                Exclusive Alumni Privacy
              </span>
              <h2 className="text-2xl font-extrabold text-stone-900 mt-2">Alumni Directory is Private</h2>
              <p className="text-stone-600 text-sm leading-relaxed mt-2 max-w-md mx-auto">
                To protect our graduates' privacy, alumni names, contact numbers, WhatsApp links, and working details are <strong>only visible to approved RMS members</strong>.
              </p>
            </div>

            {/* Status Message Context */}
            {userStatusMsg === 'pending' && (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-left flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-900 leading-relaxed">
                  <strong>Approval Pending:</strong> Your alumni registration has been submitted and is currently being reviewed by the admin. Once approved, you will get access to the private directory.
                </p>
              </div>
            )}

            {userStatusMsg === 'guest' && (
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-xs text-stone-600">
                Are you an alumnus? Please <strong>Login</strong> or <strong>Register</strong> below to request verified alumni access.
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => setShowRegisterModal(true)}
                className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Register as Alumni
              </button>

              {!currentUser ? (
                <button
                  onClick={() => navigate('/login', { state: { loginIntent: true } })}
                  className="px-6 py-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" /> Login to Account
                </button>
              ) : (
                <button
                  onClick={checkUserAccessAndFetch}
                  className="px-6 py-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" /> Refresh Status
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          <>
            {/* ── Search & Filter Controls (UNLOCKED FOR APPROVED ALUMNI) ── */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search alumni by name, occupation, company, or city..."
                  className="w-full pl-10 pr-4 py-3 border border-stone-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-stone-50/50"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="font-semibold text-stone-500">Filter by:</span>

                <select
                  value={yearFilter}
                  onChange={e => setYearFilter(e.target.value)}
                  className="border border-stone-200 rounded-xl px-3 py-2 text-stone-700 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="All">All Passout Batches</option>
                  {uniqueYears.map(y => <option key={y} value={y}>Batch {y}</option>)}
                </select>

                <select
                  value={industryFilter}
                  onChange={e => setIndustryFilter(e.target.value)}
                  className="border border-stone-200 rounded-xl px-3 py-2 text-stone-700 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="All">All Professions</option>
                  {uniqueIndustries.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                </select>

                {(search || yearFilter !== 'All' || industryFilter !== 'All') && (
                  <button
                    onClick={() => { setSearch(''); setYearFilter('All'); setIndustryFilter('All'); }}
                    className="text-emerald-600 hover:underline font-semibold ml-auto"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>

            {/* ── Alumni Directory Showcase Grid ── */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-600" /> Alumni Directory ({filteredAlumni.length})
                </h2>
                <span className="text-xs text-stone-400 font-medium">Click WhatsApp to connect directly</span>
              </div>

              {loading ? (
                <div className="py-20 text-center">
                  <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-stone-400 text-sm">Loading alumni directory...</p>
                </div>
              ) : filteredAlumni.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredAlumni.map((alumni) => (
                    <motion.div
                      key={alumni.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-2xl flex items-center justify-center text-white text-lg font-bold shadow-md shadow-emerald-200 shrink-0 overflow-hidden">
                              {alumni.photo_url ? (
                                <img src={alumni.photo_url} alt={alumni.full_name} className="w-full h-full object-cover" />
                              ) : (
                                alumni.full_name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div>
                              <h3 className="font-bold text-stone-900 text-base leading-snug">{alumni.full_name}</h3>
                              <p className="text-xs text-stone-400 font-medium mt-0.5">Batch of {alumni.passout_year}</p>
                            </div>
                          </div>
                          {alumni.is_mentor && (
                            <span className="text-[10px] font-bold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full flex items-center gap-1 border border-amber-200">
                              <Award className="w-3 h-3 text-amber-600" /> Mentor
                            </span>
                          )}
                        </div>

                        {/* Working Area */}
                        <div className="bg-stone-50 rounded-2xl p-3.5 space-y-2 border border-stone-100">
                          <div className="flex items-center gap-2 text-xs font-semibold text-stone-800">
                            <Briefcase className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            <span className="truncate">{alumni.working_area}</span>
                          </div>

                          {alumni.company_org && (
                            <div className="flex items-center gap-2 text-xs text-stone-600">
                              <Building className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
                              <span className="truncate">{alumni.company_org}</span>
                            </div>
                          )}

                          {alumni.location && (
                            <div className="flex items-center gap-2 text-xs text-stone-500">
                              <MapPin className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                              <span className="truncate">{alumni.location}</span>
                            </div>
                          )}
                        </div>

                        {alumni.bio && (
                          <p className="text-xs text-stone-600 italic leading-relaxed bg-emerald-50/50 p-3 rounded-xl border border-emerald-100/60">
                            "{alumni.bio}"
                          </p>
                        )}
                      </div>

                      {/* Buttons */}
                      <div className="pt-4 mt-4 border-t border-stone-100 flex items-center gap-2">
                        {alumni.whatsapp_number && (
                          <a
                            href={getWhatsAppLink(alumni.whatsapp_number)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 py-2.5 px-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                          </a>
                        )}

                        {alumni.phone && (
                          <a
                            href={`tel:${alumni.phone}`}
                            className="py-2.5 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                            title="Call Alumni"
                          >
                            <Phone className="w-3.5 h-3.5" /> Call
                          </a>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-16 text-center border border-stone-200">
                  <GraduationCap className="w-14 h-14 text-stone-300 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-stone-800">No Alumni Found</h3>
                  <p className="text-stone-400 text-sm max-w-xs mx-auto mt-1 mb-4">
                    Be the first to join or adjust your filter search.
                  </p>
                  <button
                    onClick={() => setShowRegisterModal(true)}
                    className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors"
                  >
                    Register as Alumni
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── 2 INTERACTIVE CARDS (Mentorship & Events) ── */}
        <div className="grid md:grid-cols-2 gap-6 pt-4">

          {/* CARD 1: Alumni Mentorship Program */}
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-3xl p-6 shadow-md relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                <Award className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold">Alumni Mentorship Program</h3>
              <p className="text-emerald-100 text-xs leading-relaxed">
                Madrasa alumni provide career guidance, Quranic memorization coaching, and higher education mentorship to current Madrasa students.
              </p>
              <div className="inline-block bg-white/10 px-3 py-1 rounded-full text-xs font-semibold text-emerald-200">
                ✨ {mentorsList.length} Active Alumni Mentors Available
              </div>
            </div>

            <div className="pt-4 flex gap-2">
              <button
                onClick={() => {
                  if (!isApprovedAlumni) {
                    toast.error('Directory access is limited to approved RMS members');
                    return;
                  }
                  setShowMentorsModal(true);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-white text-emerald-800 font-bold text-xs hover:bg-emerald-50 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Users className="w-4 h-4 text-emerald-600" /> View Mentors Directory
              </button>

              <button
                onClick={() => setShowRegisterModal(true)}
                className="py-2.5 px-4 rounded-xl bg-emerald-800/80 hover:bg-emerald-800 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Join as Mentor
              </button>
            </div>
          </div>

          {/* CARD 2: Annual Alumni Gathering */}
          <div className="bg-gradient-to-br from-stone-900 to-stone-800 text-white rounded-3xl p-6 shadow-md relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="text-xl font-bold">Annual Alumni Gathering 2026</h3>
              <p className="text-stone-300 text-xs leading-relaxed">
                Join us for our upcoming Annual Reunion & Networking Meetup. Reconnect with teachers, classmates, and fellow Madrasa graduates.
              </p>
              <div className="text-xs text-amber-300 font-semibold flex items-center gap-1 pt-1">
                📍 Madrasa Main Auditorium & Virtual Live Stream
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={() => { setSelectedEvent(events[0] || null); setShowEventModal(true); setRsvpSuccess(false); }}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-amber-900/40"
              >
                <CheckCircle2 className="w-4 h-4" /> RSVP / Register Attendance
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* ── MODAL 1: Mentors Directory Drawer ── */}
      <AnimatePresence>
        {showMentorsModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setShowMentorsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-6 max-h-[85vh] flex flex-col"
            >
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white relative flex-shrink-0 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-300" /> Alumni Mentors ({mentorsList.length})
                  </h3>
                  <p className="text-emerald-100 text-xs mt-0.5">Contact any alumni mentor directly for career & Quranic guidance</p>
                </div>
                <button onClick={() => setShowMentorsModal(false)} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-4 bg-stone-50">
                {mentorsList.length > 0 ? (
                  mentorsList.map(m => (
                    <div key={m.id} className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full overflow-hidden bg-emerald-100 border border-emerald-300 shrink-0 flex items-center justify-center font-bold text-emerald-800 text-xs shadow-sm">
                          {m.photo_url ? (
                            <img src={m.photo_url} alt={m.full_name} className="w-full h-full object-cover" />
                          ) : (
                            m.full_name?.charAt(0) || 'M'
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="font-bold text-stone-900 text-sm flex items-center gap-2">
                            {m.full_name}
                            <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                              Batch {m.passout_year}
                            </span>
                          </p>
                          <p className="text-xs text-stone-600 font-medium">{m.working_area} {m.company_org ? `@ ${m.company_org}` : ''}</p>
                          {m.mentor_topics && (
                            <p className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 inline-block font-medium">
                              Mentors in: {m.mentor_topics}
                            </p>
                          )}
                        </div>
                      </div>
                      {m.whatsapp_number && (
                        <a
                          href={getWhatsAppLink(m.whatsapp_number, `Assalamu Alaikum ${m.full_name}, I am reaching out regarding mentorship through the RMS Madrasa Alumni Program.`)}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> Request Mentorship
                        </a>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-stone-400 text-sm">
                    No alumni mentors registered yet. Click "Join as Mentor" to register!
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL 2: Event RSVP Modal ── */}
      <AnimatePresence>
        {showEventModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setShowEventModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden my-6"
            >
              <div className="bg-stone-900 p-6 text-white relative">
                <button onClick={() => setShowEventModal(false)} className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white">
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center text-stone-950 font-bold">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">RSVP for Annual Gathering 2026</h3>
                    <p className="text-xs text-amber-300">RMS Madrasa Reunion & Meetup</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {rsvpSuccess ? (
                  <div className="py-6 text-center space-y-3">
                    <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
                    <h4 className="text-lg font-bold text-stone-900">RSVP Confirmed!</h4>
                    <p className="text-xs text-stone-500">
                      We have reserved your spot for the Annual Alumni Gathering. We look forward to welcoming you!
                    </p>
                    <button
                      onClick={() => setShowEventModal(false)}
                      className="w-full py-2.5 rounded-xl bg-stone-900 text-white text-xs font-bold"
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleRSVP} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">Your Full Name *</label>
                      <input
                        required
                        placeholder="e.g. Ahmed Kutty"
                        value={rsvpForm.attendee_name}
                        onChange={e => setRsvpForm(f => ({ ...f, attendee_name: e.target.value }))}
                        className="w-full border border-stone-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">Phone Number *</label>
                      <input
                        required
                        placeholder="e.g. +91 9876543210"
                        value={rsvpForm.phone}
                        onChange={e => setRsvpForm(f => ({ ...f, phone: e.target.value }))}
                        className="w-full border border-stone-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">Email Address</label>
                      <input
                        type="email"
                        placeholder="yourname@example.com"
                        value={rsvpForm.email}
                        onChange={e => setRsvpForm(f => ({ ...f, email: e.target.value }))}
                        className="w-full border border-stone-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div className="pt-2 flex gap-2">
                      <button
                        type="submit"
                        disabled={rsvpLoading}
                        className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                      >
                        {rsvpLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Confirm RSVP
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Registration Modal */}
      <AlumniRegisterModal open={showRegisterModal} onClose={() => setShowRegisterModal(false)} />
    </div>
  );
};

export default AlumniPage;
