import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, X, ArrowLeft, ArrowRight, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Helper to extract YouTube video ID
const getYouTubeId = (url) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const CATEGORIES = ['All', 'Meelad Fest', 'Alumni Meet', 'Conference', 'Uroos Mubarak', 'Classes', 'General'];

export default function GalleryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Lightbox State
  const [lightboxIndex, setLightboxIndex] = useState(null);

  useEffect(() => {
    fetchGallery();
  }, []);

  const fetchGallery = async () => {
    setLoading(false);
    try {
      const { data, error } = await supabase
        .from('gallery_items')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        setItems(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredItems = selectedCategory === 'All'
    ? items
    : items.filter(item => item.category === selectedCategory);

  const activeItem = lightboxIndex !== null ? filteredItems[lightboxIndex] : null;

  const handlePrev = (e) => {
    e.stopPropagation();
    if (lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
    } else {
      setLightboxIndex(filteredItems.length - 1);
    }
  };

  const handleNext = (e) => {
    e.stopPropagation();
    if (lightboxIndex < filteredItems.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
    } else {
      setLightboxIndex(0);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 selection:bg-emerald-500 selection:text-white">
      {/* Navigation */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-stone-200">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/apple-touch-icon.png" alt="RMS Madrasa" className="w-8 h-8 rounded-lg object-cover" />
            <span className="font-heading text-xl font-bold tracking-tight text-stone-900">RMS Madrasa</span>
          </Link>
          <Link
            to="/"
            className="flex items-center gap-1 text-sm text-stone-600 hover:text-emerald-600 transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </header>

      {/* Main Section */}
      <main className="container mx-auto px-6 py-12">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs uppercase tracking-widest font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
            RMS Media Hub
          </span>
          <h1 className="font-heading text-4xl md:text-5xl font-bold text-stone-900 mt-4 mb-4">
            Our Gallery & Events
          </h1>
          <p className="text-stone-500 text-sm md:text-base leading-relaxed">
            Take a look at our classes, spiritual sessions, Meelad festivals, and alumni gatherings.
          </p>
        </div>

        {/* Categories Navigation */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {CATEGORIES.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-5 py-2 rounded-full text-xs font-semibold border transition-all duration-300 ${
                selectedCategory === category
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100 scale-105'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-emerald-500 hover:text-emerald-600'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Gallery Grid */}
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredItems.length > 0 ? (
          <motion.div
            layout
            className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
          >
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item, idx) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  onClick={() => setLightboxIndex(idx)}
                  className="group bg-white rounded-3xl overflow-hidden border border-stone-200/60 shadow-sm cursor-pointer hover:shadow-xl transition-all duration-500 flex flex-col relative"
                >
                  {/* Media Wrapper */}
                  <div className="aspect-[4/3] overflow-hidden relative bg-stone-100 flex items-center justify-center">
                    {item.media_type === 'image' ? (
                      <>
                        <img
                          src={item.media_url}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          loading="lazy"
                        />
                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm p-1.5 rounded-full border border-stone-100 text-stone-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ImageIcon className="w-4 h-4 text-emerald-600" />
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Get YouTube thumbnail */}
                        <img
                          src={`https://img.youtube.com/vi/${getYouTubeId(item.media_url) || 'dQw4w9WgXcQ'}/hqdefault.jpg`}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 brightness-75"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-12 h-12 bg-white/95 text-stone-900 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                            <Play className="w-5 h-5 fill-red-600 text-red-600 ml-0.5" />
                          </div>
                        </div>
                      </>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>

                  {/* Details */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100/50 inline-block mb-2">
                        {item.category}
                      </span>
                      <h3 className="font-heading text-sm font-bold text-stone-900 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-snug">
                        {item.title}
                      </h3>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="text-center py-24 bg-white rounded-3xl border border-stone-200/60 max-w-md mx-auto">
            <ImageIcon className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <h3 className="font-heading text-lg font-bold text-stone-800">No media found</h3>
            <p className="text-stone-400 text-sm mt-1">There are no photos or videos in this category yet.</p>
          </div>
        )}
      </main>

      {/* Lightbox / Video Player Modal */}
      <AnimatePresence>
        {activeItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-4"
            onClick={() => setLightboxIndex(null)}
          >
            {/* Header Controls */}
            <div className="w-full flex items-center justify-between text-white p-4">
              <span className="text-xs font-semibold bg-emerald-600/80 px-3 py-1 rounded-full border border-emerald-500/30">
                {activeItem.category}
              </span>
              <button
                onClick={() => setLightboxIndex(null)}
                className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="Close lightbox"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Media Content */}
            <div className="flex-1 w-full max-w-4xl flex items-center justify-center relative">
              {/* Left Arrow */}
              <button
                onClick={handlePrev}
                className="absolute left-0 p-3 rounded-full bg-white/5 hover:bg-white/15 text-white z-10 transition-colors"
                aria-label="Previous item"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>

              <div
                className="w-full max-h-[70vh] flex items-center justify-center p-2"
                onClick={e => e.stopPropagation()}
              >
                {activeItem.media_type === 'image' ? (
                  <img
                    src={activeItem.media_url}
                    alt={activeItem.title}
                    className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl border border-white/10"
                  />
                ) : (
                  <div className="w-full max-w-3xl aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                    <iframe
                      width="100%"
                      height="100%"
                      src={`https://www.youtube.com/embed/${getYouTubeId(activeItem.media_url) || 'dQw4w9WgXcQ'}?autoplay=1`}
                      title={activeItem.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="w-full h-full"
                    ></iframe>
                  </div>
                )}
              </div>

              {/* Right Arrow */}
              <button
                onClick={handleNext}
                className="absolute right-0 p-3 rounded-full bg-white/5 hover:bg-white/15 text-white z-10 transition-colors"
                aria-label="Next item"
              >
                <ArrowRight className="w-6 h-6" />
              </button>
            </div>

            {/* Footer Title */}
            <div className="w-full text-center text-white pb-6 max-w-xl px-6">
              <h3 className="font-heading text-lg font-bold leading-snug">{activeItem.title}</h3>
              <p className="text-stone-400 text-xs mt-2">
                Item {lightboxIndex + 1} of {filteredItems.length}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
