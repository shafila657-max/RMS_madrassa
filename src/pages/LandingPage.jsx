import React, { useState, useEffect, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen, Users, Award, GraduationCap, ArrowRight,
  Sparkles, HeartHandshake, Briefcase, QrCode,
  Play, Image as ImageIcon, Download, Trophy, Menu, X
} from 'lucide-react';
import { toast } from 'sonner';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { fetchFullLeaderboardData } from '@/utils/leaderboard';
import LeaderboardShowcase from '@/components/LeaderboardShowcase';

// Lazy-load heavy modals — they're NOT needed on first paint
const AlumniRegisterModal = lazy(() => import('@/components/AlumniRegisterModal'));
const MobileQRModal       = lazy(() => import('@/components/MobileQRModal'));

// ─── Framer Motion variants (defined OUTSIDE component to prevent re-creation) ──
const fadeUp = {
  hidden:  { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};
const fadeLeft = {
  hidden:  { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0,  transition: { duration: 0.35, ease: 'easeOut' } },
};
const fadeScale = {
  hidden:  { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1,    transition: { duration: 0.35, ease: 'easeOut' } },
};
const VIEWPORT = { once: true, amount: 0.15 };

// ─── YouTube ID helper ─────────────────────────────────────────────────────────
const getYouTubeId = (url) => {
  const m = url?.match(/(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]{11})/);
  return m ? m[1] : null;
};

// ─── Marquee card — memoised to avoid re-renders every scroll tick ─────────────
const MarqueeCard = React.memo(({ item }) => {
  const ytId = item.media_type !== 'image' ? getYouTubeId(item.media_url) : null;
  return (
    <Link
      to="/gallery"
      className="flex-shrink-0 w-64 h-44 rounded-2xl overflow-hidden relative group border border-white/5 shadow-xl"
    >
      {item.media_type === 'image' ? (
        <img
          src={item.media_url}
          alt={item.title}
          className="w-full h-full object-cover gpu-img brightness-90 group-hover:brightness-100 transition-[filter] duration-500"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="relative w-full h-full">
          <img
            src={`https://img.youtube.com/vi/${ytId || 'default'}/mqdefault.jpg`}
            alt={item.title}
            className="w-full h-full object-cover brightness-75 gpu-img"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
              <Play className="w-4 h-4 fill-red-600 text-red-600 ml-0.5" />
            </div>
          </div>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
        <div>
          <span className="text-[9px] font-bold text-emerald-300 uppercase tracking-wider">{item.category}</span>
          <p className="text-white text-xs font-semibold line-clamp-2 leading-snug">{item.title}</p>
        </div>
      </div>
    </Link>
  );
});
MarqueeCard.displayName = 'MarqueeCard';

// ═══════════════════════════════════════════════════════════════════════════════
const LandingPage = () => {
  const [showAlumniModal, setShowAlumniModal] = useState(false);
  const [showQRModal,     setShowQRModal]     = useState(false);
  const [galleryPreview,  setGalleryPreview]  = useState([]);
  const [deferredPrompt,  setDeferredPrompt]  = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();

  // Fetch featured gallery items
  useEffect(() => {
    supabase
      .from('gallery_items')
      .select('id, title, category, media_type, media_url')
      .eq('is_featured', true)
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => { if (data) setGalleryPreview(data); });
  }, []);

  // Leaderboard data
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const loadLeaderboard = async () => {
      try {
        const res = await fetchFullLeaderboardData();
        if (alive) {
          setLeaderboardData(res?.standings || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (alive) {
          setLeaderboardLoading(false);
        }
      }
    };

    loadLeaderboard();
    const timer = setInterval(loadLeaderboard, 30000);

    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  // PWA install prompt
  useEffect(() => {
    const fn = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true); // show the banner when install is available
    };
    window.addEventListener('beforeinstallprompt', fn, { passive: true });
    return () => window.removeEventListener('beforeinstallprompt', fn);
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">

      {/* ── HEADER — sticky, minimal repaints ─────────────────────────── */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.3 }}
        className="sticky top-0 z-50 h-20 border-b border-stone-200/80 bg-white/80 supports-[backdrop-filter]:backdrop-blur-md supports-[backdrop-filter]:bg-white/70"
        style={{ willChange: 'transform' }}
      >
        <div className="container relative mx-auto h-full px-5 sm:px-6 lg:px-10">
          <div className="grid h-full grid-cols-[auto_1fr_auto] items-center gap-6">
            <div className="flex min-w-max items-center gap-2">
              <img src="/apple-touch-icon.png" alt="RMS Madrasa" className="w-9 h-9 rounded-xl object-cover" />
              <span className="font-heading text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">RMS Madrasa</span>
            </div>
            <nav className="hidden items-center justify-center gap-9 md:flex" aria-label="Primary navigation">
              <a href="#about" className="text-sm font-medium text-stone-600 transition-colors hover:text-primary">About</a>
              <a href="#programs" className="text-sm font-medium text-stone-600 transition-colors hover:text-primary">Programs</a>
              <Link to="/alumni" className={`items-center gap-1 text-sm font-medium transition-colors hover:text-primary md:flex ${location.pathname === '/alumni' ? 'font-semibold text-primary underline underline-offset-8' : 'text-stone-600'}`}>
                <GraduationCap className="w-4 h-4 text-emerald-600" /> Alumni
              </Link>
              <Link to="/gallery" className={`items-center gap-1 text-sm font-medium transition-colors hover:text-primary md:flex ${location.pathname === '/gallery' ? 'font-semibold text-primary underline underline-offset-8' : 'text-stone-600'}`}>
                <ImageIcon className="w-4 h-4 text-stone-600" /> Gallery
              </Link>
            </nav>
            <div className="hidden items-center justify-end gap-3 md:flex">
              <Button
                onClick={() => setShowQRModal(true)}
                variant="outline"
                className="items-center gap-1.5 rounded-full border-transparent bg-transparent text-xs font-bold text-stone-600 hover:border-stone-200 hover:bg-stone-50 hover:text-primary"
              >
                <QrCode className="w-4 h-4 text-emerald-600" /> Scan QR
              </Button>
              <Link to="/login" state={{ loginIntent: true }}>
                <Button className="rounded-full bg-primary px-5 text-sm font-bold text-white hover:bg-emerald-600" data-testid="header-login-button">Login</Button>
              </Link>
            </div>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full text-stone-700 transition-colors hover:bg-stone-100 md:hidden"
              onClick={() => setMobileNavOpen((open) => !open)}
              aria-label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileNavOpen}
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
          {mobileNavOpen && (
            <div className="absolute left-0 right-0 top-full border-b border-stone-200 bg-white/95 px-5 py-4 shadow-lg backdrop-blur-md md:hidden">
              <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
                <a href="#about" onClick={() => setMobileNavOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 hover:text-primary">About</a>
                <a href="#programs" onClick={() => setMobileNavOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 hover:text-primary">Programs</a>
                <Link to="/alumni" onClick={() => setMobileNavOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 hover:text-primary">Alumni</Link>
                <Link to="/gallery" onClick={() => setMobileNavOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 hover:text-primary">Gallery</Link>
                <div className="mt-2 flex items-center gap-2 border-t border-stone-100 pt-3">
                  <Button onClick={() => { setMobileNavOpen(false); setShowQRModal(true); }} variant="outline" className="flex-1 rounded-full border-transparent text-xs font-bold text-stone-600 hover:border-stone-200 hover:bg-stone-50">
                    <QrCode className="mr-1.5 h-4 w-4 text-emerald-600" /> Scan QR
                  </Button>
                  <Link to="/login" state={{ loginIntent: true }} onClick={() => setMobileNavOpen(false)} className="flex-1">
                    <Button className="w-full rounded-full bg-primary text-xs font-bold text-white hover:bg-emerald-600">Login</Button>
                  </Link>
                </div>
              </nav>
            </div>
          )}
        </div>
      </motion.header>

      {/* ── HERO — critical path, NO lazy loading here ────────────────── */}
      <section className="relative flex min-h-[90vh] items-center overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-stone-100 py-16 md:py-20">
        <div className="absolute inset-0 z-0">
          <img
            src="/hero-madrasa-boy.jpg"
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover opacity-15 gpu-img"
            fetchPriority="high"
          />
        </div>
        <div className="container relative z-10 mx-auto px-5 md:px-12 lg:px-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-100 px-3.5 py-1.5 text-xs font-bold text-emerald-800 shadow-sm">
                <Sparkles className="w-4 h-4 text-emerald-600" /> RMS Madrasa Management Platform
              </div>
              <h1 className="mb-6 font-heading text-5xl font-extrabold tracking-tight text-stone-900 md:text-7xl">
                Nurturing Excellence in Islamic Education
              </h1>
              <p className="mb-8 max-w-xl text-base leading-relaxed text-stone-600 md:text-lg">
                Building a foundation of faith, Quranic knowledge, and character for the leaders of tomorrow.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/register?type=student">
                  <Button size="lg" className="rounded-full bg-primary shadow-md shadow-emerald-200 transition-colors hover:bg-emerald-600" data-testid="student-register-button">
                    Student Registration <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
                <Link to="/register?type=parent">
                  <Button size="lg" variant="outline" className="rounded-full border-emerald-300 bg-white/70 text-emerald-900 transition-colors hover:bg-emerald-50" data-testid="parent-register-button">
                    Parent Registration
                  </Button>
                </Link>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} className="hidden md:block relative">
              <div className="relative overflow-hidden rounded-[2rem] border-4 border-white/90 shadow-2xl ring-1 ring-stone-200">
                <img
                  src="/hero-madrasa-boy.jpg"
                  alt="Muslim Madrasa student reading Quran in library"
                  className="w-full h-[460px] object-cover gpu-img"
                  fetchPriority="high"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-6">
                  <p className="text-xs text-stone-200">Inspiring Quranic Memorization &amp; Islamic Studies</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── ABOUT — section-lazy skips rendering until near viewport ─────── */}
      <section id="about" className="bg-secondary py-20 section-lazy md:py-24">
        <div className="container mx-auto px-5 md:px-12">
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="visible" viewport={VIEWPORT}
            className="mx-auto max-w-3xl text-center"
          >
            <h2 className="mb-5 font-heading text-4xl font-extrabold text-stone-900 md:text-5xl">Our Mission</h2>
            <p className="mb-12 text-base leading-relaxed text-stone-600 md:text-lg">
              At RMS Madrasa, we provide a holistic Islamic education that empowers students with authentic knowledge, moral values, and life skills needed to thrive in modern society.
            </p>
          </motion.div>

          <div className="grid gap-5 md:grid-cols-3 md:gap-7">
            {[
              { icon: BookOpen, title: 'Authentic Curriculum', text: 'Comprehensive Islamic studies covering Quran, Hadith, Fiqh, Seerah, and Arabic language.' },
              { icon: Users,    title: 'Qualified Faculty',   text: 'Dedicated and certified scholars passionate about nurturing the next generation.' },
              { icon: Award,    title: 'Character Building',  text: 'Focusing on tarbiyah, adab, and leadership development in every student.' },
            ].map(({ icon: Icon, title, text }, i) => (
              <motion.div
                key={title}
                variants={fadeUp} initial="hidden" whileInView="visible" viewport={VIEWPORT}
                transition={{ delay: i * 0.07 }}
                className="rounded-2xl border border-stone-200/80 bg-white p-7 shadow-sm transition-shadow hover:shadow-md md:p-8"
              >
                <Icon className="mb-4 h-11 w-11 text-primary" />
                <h3 className="mb-2 font-heading text-xl font-bold text-stone-900">{title}</h3>
                <p className="text-stone-600 text-sm">{text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA DARK SECTION ──────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-stone-950 via-emerald-950 to-stone-900 py-20 text-white section-lazy md:py-24">
        <div className="container mx-auto px-5 md:px-12">
          <motion.div
            variants={fadeScale} initial="hidden" whileInView="visible" viewport={VIEWPORT}
            className="mx-auto max-w-3xl text-center"
          >
            <h2 className="mb-5 font-heading text-4xl font-extrabold md:text-5xl">Begin Your Spiritual Journey</h2>
            <p className="mx-auto mb-8 max-w-2xl text-base leading-relaxed text-stone-200 md:text-xl">
              Join our community of learners and embark on a path of knowledge and spiritual growth
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register?type=student">
                  <Button size="lg" className="rounded-full bg-white text-primary transition-colors hover:bg-emerald-50" data-testid="cta-student-register">
                  Register as Student
                </Button>
              </Link>
              <Link to="/register?type=parent">
                  <Button size="lg" variant="outline" className="rounded-full border-emerald-300 text-white transition-colors hover:bg-white/10" data-testid="cta-parent-register">
                  Register as Parent
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── HALL OF FAME LEADERBOARD ────────────────────────────────────────────── */}
      <section className="bg-transparent py-8 text-stone-900 section-lazy md:py-10">
        <div className="mx-auto w-full px-0">
          {leaderboardData.length > 0 ? (
            <LeaderboardShowcase standings={leaderboardData} variant="screen" screenTone="transparent" showScreenHeader={false} showRankedList={false} />
          ) : leaderboardLoading ? (
            <p className="text-center text-stone-400 text-sm animate-pulse">Leaderboard standings updating...</p>
          ) : (
            <div className="mx-auto max-w-lg rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
              <Trophy className="w-12 h-12 text-stone-600 mx-auto mb-4" />
              <p className="font-medium text-stone-700">New academic year started!</p>
              <p className="mt-1 text-xs text-stone-500">Scores and rankings will appear here once students start earning points.</p>
            </div>
          )}
        </div>
      </section>

      {/* ── ALUMNI SECTION ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-t border-emerald-800 bg-gradient-to-br from-emerald-950 via-teal-950 to-stone-950 py-20 text-white section-lazy md:py-24">
        <div className="container relative z-10 mx-auto px-5 md:px-12">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div variants={fadeLeft} initial="hidden" whileInView="visible" viewport={VIEWPORT} className="space-y-6">
              <div className="inline-flex items-center gap-2 bg-emerald-800/80 border border-emerald-700 px-3.5 py-1 rounded-full text-xs text-emerald-200 font-semibold">
                <GraduationCap className="w-4 h-4 text-emerald-400" /> Madrasa Alumni &amp; Graduates Community
              </div>
              <h2 className="font-heading text-4xl font-extrabold tracking-tight text-white md:text-5xl">
                Are You a Madrasa Graduate? Join Our Alumni Network!
              </h2>
              <p className="text-base leading-relaxed text-emerald-100/90">
                Reconnect with fellow Madrasa graduates, showcase your professional working area, offer mentorship to younger students, and stay connected with Madrasa community events.
              </p>
              <div className="space-y-3 pt-2">
                {[
                  { icon: Briefcase,     text: 'Showcase your current occupation & working area with contact/WhatsApp' },
                  { icon: HeartHandshake,text: 'Provide career guidance & Quranic mentorship for current Madrasa students' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3 text-sm text-emerald-100">
                    <div className="w-8 h-8 rounded-full bg-emerald-800/80 flex items-center justify-center text-emerald-300 flex-shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span>{text}</span>
                  </div>
                ))}
              </div>
              <div className="pt-4 flex flex-wrap gap-4">
                <Button onClick={() => setShowAlumniModal(true)} size="lg" className="rounded-full bg-emerald-400 font-bold text-stone-950 shadow-lg shadow-black/20 transition-colors hover:bg-emerald-300">
                  <GraduationCap className="mr-2 w-5 h-5" /> Register as Alumni
                </Button>
                <Link to="/alumni">
                  <Button size="lg" variant="outline" className="rounded-full border-emerald-300 text-emerald-100 transition-colors hover:bg-white/10">
                    Explore Alumni Directory
                  </Button>
                </Link>
              </div>
            </motion.div>

            <motion.div
              variants={fadeScale} initial="hidden" whileInView="visible" viewport={VIEWPORT}
              className="space-y-6 rounded-3xl border border-white/15 bg-white/10 p-7 text-white shadow-2xl backdrop-blur-sm md:p-8"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center font-bold text-xl text-stone-950">M</div>
                  <div>
                    <h4 className="font-bold text-lg">Muhammed Fasil</h4>
                    <p className="text-xs text-emerald-300">Batch of 2016 · Business</p>
                  </div>
                </div>
                <span className="text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/30">Approved Alumni</span>
              </div>
              <p className="text-xs text-stone-200 italic bg-black/20 p-4 rounded-2xl border border-white/10 leading-relaxed">
                "RMS Madrasa shaped my morals and career. Always proud to give back to the community!"
              </p>
              <div className="flex items-center justify-between text-xs text-stone-300 border-t border-white/10 pt-4">
                <span>📍 Dubai, UAE</span>
                <span className="text-emerald-400 font-semibold">📱 Direct WhatsApp Available</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FEATURED GALLERY MARQUEE ─────────────────────────────────────── */}
      {galleryPreview.length > 0 && (
        <section id="gallery" className="py-20 bg-stone-950 overflow-hidden relative section-lazy">
          {/* Subtle static decorations — no blur-3xl to avoid expensive filter layers */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-600/8 rounded-full pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/8 rounded-full pointer-events-none" />

          <div className="container mx-auto px-6 mb-10">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs uppercase tracking-widest font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full inline-block mb-3">
                  ✦ Featured Moments
                </span>
                <h2 className="font-heading text-3xl md:text-4xl font-bold text-white">Our Gallery</h2>
                <p className="text-stone-400 text-sm mt-1">Events, classes &amp; celebrations at RMS Madrasa</p>
              </div>
              <Link
                to="/gallery"
                className="shrink-0 whitespace-nowrap flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-full bg-white/10 hover:bg-emerald-600 text-white text-xs sm:text-sm font-semibold border border-white/10 hover:border-emerald-600 transition-colors group"
              >
                <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>View Gallery</span>
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          <div className="relative flex">
            <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-stone-950 to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-stone-950 to-transparent z-10 pointer-events-none" />
            <div className="flex gap-5 animate-marquee" style={{ width: 'max-content' }}>
              {galleryPreview.map((item) => <MarqueeCard key={`a-${item.id}`} item={item} />)}
              {galleryPreview.map((item) => <MarqueeCard key={`b-${item.id}`} item={item} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="bg-stone-950 text-white py-12 border-t border-stone-800 section-lazy">
        <div className="container mx-auto px-6 md:px-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-6 h-6 text-emerald-500" />
                <span className="font-heading text-xl font-bold">RMS Madrasa</span>
              </div>
              <p className="text-stone-400 text-sm max-w-sm">
                Building bridges between tradition and modernity in Islamic education, connecting students, parents, and alumni worldwide.
              </p>
            </div>
            <div>
              <h4 className="font-heading text-lg mb-4 text-emerald-400">Quick Links</h4>
              <ul className="space-y-2 text-sm text-stone-400">
                <li><a href="#about"    className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#programs" className="hover:text-white transition-colors">Programs</a></li>
                <li><Link to="/alumni"  className="hover:text-emerald-300 transition-colors font-medium">Alumni Directory</Link></li>
                <li><button onClick={() => setShowAlumniModal(true)} className="hover:text-emerald-300 transition-colors">Register as Alumni</button></li>
                <li><Link to="/login" state={{ loginIntent: true }} className="hover:text-white transition-colors">Login</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-heading text-lg mb-4 text-emerald-400">Contact</h4>
              <ul className="space-y-2 text-sm text-stone-400">
                <li>Vilayil,</li>
                <li>673641,</li>
                <li>Malappuram,kerala</li>
                <li>contact@rmsmadrasa.edu</li>
                <li>(123) 456-7890</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-stone-800 mt-8 pt-8 text-center text-sm text-stone-400">
            © 2026 RMS Madrasa. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Modals — lazy-loaded, only rendered when opened */}
      <Suspense fallback={null}>
        {showAlumniModal && <AlumniRegisterModal open onClose={() => setShowAlumniModal(false)} />}
        {showQRModal     && <MobileQRModal       open onClose={() => setShowQRModal(false)} />}
      </Suspense>

      {/* ── FLOATING INSTALL BANNER ─────────────────────────────────── */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={showInstallBanner ? { y: 0, opacity: 1 } : { y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 200 }}
        className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
        style={{ width: 'min(92vw, 420px)' }}
      >
        <div className="pointer-events-auto bg-stone-900 text-white rounded-2xl shadow-2xl shadow-black/30 px-5 py-4 flex items-center gap-4 border border-white/10">
          {/* Icon */}
          <div className="w-11 h-11 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0">
            <Download className="w-5 h-5 text-white" />
          </div>
          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-white">Install RMS Madrasa</p>
            <p className="text-xs text-stone-400 truncate">Add to your home screen for quick access</p>
          </div>
          {/* Install & Download buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href="/rms-madrasa.apk"
              download="RMS_Madrasa.apk"
              onClick={() => {
                if (deferredPrompt) handleInstallPWA();
                toast.success('Downloading Android APK...');
              }}
              className="bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors inline-flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" /> Download App
            </a>
          </div>
          {/* Close button */}
          <button
            onClick={() => setShowInstallBanner(false)}
            className="flex-shrink-0 p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Dismiss"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default LandingPage;
