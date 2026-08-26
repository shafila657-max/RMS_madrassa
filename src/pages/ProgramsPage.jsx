import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, MapPin, ArrowLeft, Sparkles, BookOpen,
  CheckCircle2, Users, Tag, ChevronRight, X, Phone, MessageSquare
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

const DEFAULT_PROGRAMS = [
  {
    id: 'default-1',
    title: 'Al-Suffa Nattudarsu',
    tag: 'Weekly',
    schedule_text: 'Every Sunday at 7:30 PM',
    location: 'Madrasa Main Hall & Online Stream',
    description: 'Weekly community dars and Islamic learning session conducted every Sunday evening. Covers Quranic commentary, Seerah of Prophet Muhammad (ﷺ), and practical Islamic guidance for everyday life.',
    image_url: 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?auto=format&fit=crop&w=800&q=80',
    is_active: true,
  },
  {
    id: 'default-2',
    title: 'Malharatul Badriya',
    tag: 'Monthly',
    schedule_text: 'Monthly Special Gathering',
    location: 'Madrasa Main Campus',
    description: 'Monthly spiritual gathering of dhikr, Badriyath recitation, and Islamic education for the community, bringing together students, parents, and local well-wishers.',
    image_url: 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?auto=format&fit=crop&w=800&q=80',
    is_active: true,
  },
];

const TAG_COLORS = {
  Weekly: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  Monthly: 'bg-amber-100 text-amber-900 border-amber-300',
  Daily: 'bg-teal-100 text-teal-800 border-teal-300',
  Special: 'bg-purple-100 text-purple-800 border-purple-300',
};

export default function ProgramsPage() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState('All');
  const [selectedProgram, setSelectedProgram] = useState(null);

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('madrasa_programs')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        setPrograms(data);
      } else {
        setPrograms(DEFAULT_PROGRAMS);
      }
    } catch (err) {
      console.error(err);
      setPrograms(DEFAULT_PROGRAMS);
    } finally {
      setLoading(false);
    }
  };

  const tags = ['All', 'Weekly', 'Monthly', 'Daily', 'Special'];

  const filteredPrograms = selectedTag === 'All'
    ? programs
    : programs.filter(p => (p.tag || '').toLowerCase() === selectedTag.toLowerCase());

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col">
      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-stone-950/90 backdrop-blur-md text-white border-b border-stone-800">
        <div className="container mx-auto px-4 sm:px-6 md:px-12 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 text-white hover:text-emerald-400 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-bold">Back to Home</span>
          </Link>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            <span className="font-heading font-extrabold text-base tracking-tight text-white">
              RMS Madrasa Programs
            </span>
          </div>
          <Link
            to="/login"
            state={{ loginIntent: true }}
            className="px-4 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
          >
            Portal Login
          </Link>
        </div>
      </header>

      {/* ── HERO BANNER ─────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-stone-950 via-emerald-950 to-stone-900 text-white py-14 sm:py-20 relative overflow-hidden star-pattern-bg">
        <div className="container mx-auto px-5 md:px-12 relative z-10 text-center max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="text-[11px] sm:text-xs uppercase tracking-widest font-bold text-emerald-300 bg-emerald-900/60 border border-emerald-700/50 px-3.5 py-1 rounded-full inline-flex items-center gap-1.5 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Fixed Events & Community Programs
            </span>
            <h1 className="font-heading text-3xl sm:text-5xl font-extrabold text-white mb-4 tracking-tight">
              Madrasa Educational & Spiritual Events
            </h1>
            <p className="text-xs sm:text-base text-emerald-100/80 leading-relaxed max-w-xl mx-auto">
              Explore our regular weekly dars sessions, monthly spiritual gatherings, and special educational workshops organized by RMS Madrasa.
            </p>
          </motion.div>

          {/* Filter Tags */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
            {tags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  selectedTag === tag
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/50 scale-105'
                    : 'bg-stone-800/80 text-stone-300 hover:bg-stone-700 hover:text-white border border-stone-700/60'
                }`}
              >
                {tag === 'All' ? 'All Programs' : `${tag} Events`}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROGRAMS GRID ───────────────────────────────────────────────── */}
      <main className="container mx-auto px-4 sm:px-6 md:px-12 py-12 flex-1">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-stone-500">Loading Madrasa programs...</p>
          </div>
        ) : filteredPrograms.length > 0 ? (
          <div className="grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filteredPrograms.map((program) => (
              <motion.div
                key={program.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group bg-white rounded-3xl border border-stone-200 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Image Container */}
                  <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-stone-900">
                    <img
                      src={program.image_url || 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?auto=format&fit=crop&w=800&q=80'}
                      alt={program.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent" />
                    <span
                      className={`absolute top-4 left-4 text-[11px] font-extrabold px-3 py-1 rounded-full border shadow-md ${
                        TAG_COLORS[program.tag] || 'bg-stone-100 text-stone-800 border-stone-300'
                      }`}
                    >
                      ✦ {program.tag || 'Special'} Event
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 sm:p-6 space-y-3">
                    <h3 className="font-heading text-xl font-bold text-stone-900 group-hover:text-emerald-700 transition-colors">
                      {program.title}
                    </h3>

                    {/* Schedule Badge */}
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 rounded-xl">
                      <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{program.schedule_text || 'Scheduled Event'}</span>
                    </div>

                    {/* Location */}
                    {program.location && (
                      <div className="flex items-center gap-2 text-xs text-stone-500">
                        <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="truncate">{program.location}</span>
                      </div>
                    )}

                    <p className="text-xs text-stone-600 leading-relaxed line-clamp-3 pt-1">
                      {program.description}
                    </p>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="p-5 sm:p-6 pt-0 border-t border-stone-100/80 mt-4">
                  <button
                    onClick={() => setSelectedProgram(program)}
                    className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-emerald-600 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <span>View Event Details</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 max-w-md mx-auto my-8">
            <BookOpen className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-stone-800">No Programs Found</h3>
            <p className="text-stone-400 text-xs mt-1">Adjust your filter selection or check back soon for upcoming events.</p>
          </div>
        )}
      </main>

      {/* ── PROGRAM DETAILS MODAL ────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedProgram && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setSelectedProgram(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-6"
            >
              <div className="relative h-56 w-full bg-stone-900">
                <img
                  src={selectedProgram.image_url || 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?auto=format&fit=crop&w=800&q=80'}
                  alt={selectedProgram.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent" />
                <button
                  onClick={() => setSelectedProgram(null)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="absolute bottom-4 left-6 right-6">
                  <span
                    className={`text-[10px] font-extrabold px-3 py-1 rounded-full border mb-2 inline-block ${
                      TAG_COLORS[selectedProgram.tag] || 'bg-stone-100 text-stone-800'
                    }`}
                  >
                    ✦ {selectedProgram.tag || 'Special'} Event
                  </span>
                  <h3 className="text-2xl font-bold text-white leading-tight">{selectedProgram.title}</h3>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-4 space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-bold text-emerald-800">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <span>{selectedProgram.schedule_text || 'Scheduled Event'}</span>
                  </div>
                  {selectedProgram.location && (
                    <div className="flex items-center gap-2 text-stone-600 font-medium">
                      <MapPin className="w-4 h-4 text-amber-500" />
                      <span>{selectedProgram.location}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">About this Program</h4>
                  <p className="text-xs sm:text-sm text-stone-700 leading-relaxed font-normal">
                    {selectedProgram.description}
                  </p>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    onClick={() => setSelectedProgram(null)}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors"
                  >
                    Close & Return to Programs
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="bg-stone-950 text-white py-8 border-t border-stone-800 text-center text-xs text-stone-400">
        © 2026 RMS Madrasa. All rights reserved.
      </footer>
    </div>
  );
}
