import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Users, Award, GraduationCap, ArrowRight, CheckCircle, Sparkles, HeartHandshake, Briefcase, QrCode } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import AlumniRegisterModal from '@/components/AlumniRegisterModal';
import MobileQRModal from '@/components/MobileQRModal';

const LandingPage = () => {
  const [showAlumniModal, setShowAlumniModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-stone-100"
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-8 h-8 text-primary" />
              <span className="font-heading text-2xl font-bold text-stone-900">Al-Noor Madrasa</span>
            </div>
            <nav className="flex items-center gap-4 md:gap-8">
              <a href="#about" className="hidden md:inline-block text-stone-600 hover:text-primary transition-colors">About</a>
              <a href="#programs" className="hidden md:inline-block text-stone-600 hover:text-primary transition-colors">Programs</a>
              <Link to="/alumni" className="hidden md:flex text-stone-600 hover:text-primary transition-colors items-center gap-1 font-semibold text-emerald-700">
                <GraduationCap className="w-4 h-4 text-emerald-600" /> Alumni Network
              </Link>
              <Button
                onClick={() => setShowQRModal(true)}
                variant="outline"
                className="rounded-full border-emerald-300 text-emerald-800 bg-emerald-50/50 hover:bg-emerald-100 flex items-center gap-1.5 text-xs font-bold"
              >
                <QrCode className="w-4 h-4 text-emerald-600" /> Scan QR
              </Button>
              <Link to="/login">
                <Button variant="outline" className="rounded-full" data-testid="header-login-button">
                  Login
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="/hero-madrasa-boy.jpg"
            alt="Islamic Madrasa student studying in library"
            className="w-full h-full object-cover opacity-15"
          />
        </div>
        <div className="container mx-auto px-6 md:px-12 lg:px-24 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 bg-emerald-100/80 border border-emerald-200 px-3.5 py-1.5 rounded-full text-xs font-bold text-emerald-800 mb-4">
                <Sparkles className="w-4 h-4 text-emerald-600" /> RMS Madrasa Management Platform
              </div>
              <h1 className="font-heading text-5xl md:text-7xl tracking-tight text-stone-900 mb-6">
                Nurturing Excellence in Islamic Education
              </h1>
              <p className="text-base md:text-lg leading-relaxed text-stone-600 mb-8">
                Building a foundation of faith, Quranic knowledge, and character for the leaders of tomorrow.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/register?type=student">
                  <Button
                    size="lg"
                    className="rounded-full bg-primary hover:bg-emerald-600 transform hover:scale-105 active:scale-95 transition-all shadow-md shadow-emerald-200"
                    data-testid="student-register-button"
                  >
                    Student Registration
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
                <Link to="/register?type=parent">
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-full transform hover:scale-105 active:scale-95 transition-all border-emerald-300 text-emerald-900"
                    data-testid="parent-register-button"
                  >
                    Parent Registration
                  </Button>
                </Link>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="hidden md:block relative"
            >
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white/80 ring-1 ring-stone-200">
                <img
                  src="/hero-madrasa-boy.jpg"
                  alt="Muslim Madrasa student wearing topi reading Quran studies in library"
                  className="w-full h-[460px] object-cover hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-6">
                  <div className="text-white space-y-1">
                    <p className="text-xs text-stone-200">Inspiring Quranic Memorization & Islamic Studies</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 bg-secondary">
        <div className="container mx-auto px-6 md:px-12">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h2 className="font-heading text-4xl md:text-5xl text-stone-900 mb-6">Our Mission</h2>
            <p className="text-stone-600 text-lg leading-relaxed mb-12">
              At RMS Madrasa, we provide a holistic Islamic education that empowers students with authentic knowledge, moral values, and life skills needed to thrive in modern society.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="bg-white p-8 rounded-xl border border-stone-200 shadow-sm"
            >
              <BookOpen className="w-12 h-12 text-primary mb-4" />
              <h3 className="font-heading text-xl font-bold text-stone-900 mb-2">Authentic Curriculum</h3>
              <p className="text-stone-600 text-sm">Comprehensive Islamic studies covering Quran, Hadith, Fiqh, Seerah, and Arabic language.</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white p-8 rounded-xl border border-stone-200 shadow-sm"
            >
              <Users className="w-12 h-12 text-primary mb-4" />
              <h3 className="font-heading text-xl font-bold text-stone-900 mb-2">Qualified Faculty</h3>
              <p className="text-stone-600 text-sm">Dedicated and certified scholars passionate about nurturing the next generation.</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-white p-8 rounded-xl border border-stone-200 shadow-sm"
            >
              <Award className="w-12 h-12 text-primary mb-4" />
              <h3 className="font-heading text-xl font-bold text-stone-900 mb-2">Character Building</h3>
              <p className="text-stone-600 text-sm">Focusing on tarbiyah, adab, and leadership development in every student.</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-stone-900 text-white relative overflow-hidden">
        <div className="container mx-auto px-6 md:px-12 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h2 className="font-heading text-4xl md:text-5xl mb-6">Begin Your Spiritual Journey</h2>
            <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
              Join our community of learners and embark on a path of knowledge and spiritual growth
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register?type=student">
                <Button
                  size="lg"
                  className="rounded-full bg-white text-primary hover:bg-stone-100 transform hover:scale-105 active:scale-95 transition-all"
                  data-testid="cta-student-register"
                >
                  Register as Student
                </Button>
              </Link>
              <Link to="/register?type=parent">
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full border-white text-white hover:bg-white/10 transform hover:scale-105 active:scale-95 transition-all"
                  data-testid="cta-parent-register"
                >
                  Register as Parent
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── ALUMNI COMMUNITY SECTION ── */}
      <section className="py-20 bg-gradient-to-br from-emerald-900 via-teal-900 to-stone-900 text-white relative overflow-hidden border-t border-emerald-800">
        <div className="container mx-auto px-6 md:px-12 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-2 bg-emerald-800/80 border border-emerald-700 px-3.5 py-1 rounded-full text-xs text-emerald-200 font-semibold">
                <GraduationCap className="w-4 h-4 text-emerald-400" /> Madrasa Alumni & Graduates Community
              </div>

              <h2 className="font-heading text-4xl md:text-5xl text-white font-extrabold tracking-tight">
                Are You a Madrasa Graduate? Join Our Alumni Network!
              </h2>

              <p className="text-emerald-100/90 text-base leading-relaxed">
                Reconnect with fellow Madrasa graduates, showcase your professional working area, offer mentorship to younger students, and stay connected with Madrasa community events.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3 text-sm text-emerald-100">
                  <div className="w-8 h-8 rounded-full bg-emerald-800/80 flex items-center justify-center text-emerald-300 flex-shrink-0">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <span>Showcase your current occupation & working area with contact/WhatsApp</span>
                </div>

                <div className="flex items-center gap-3 text-sm text-emerald-100">
                  <div className="w-8 h-8 rounded-full bg-emerald-800/80 flex items-center justify-center text-emerald-300 flex-shrink-0">
                    <HeartHandshake className="w-4 h-4" />
                  </div>
                  <span>Provide career guidance & Quranic mentorship for current Madrasa students</span>
                </div>

                <div className="flex items-center gap-3 text-sm text-emerald-100">
                  <div className="w-8 h-8 rounded-full bg-emerald-800/80 flex items-center justify-center text-emerald-300 flex-shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span>Dual role support: Alumni who are now parents can manage both seamlessly</span>
                </div>
              </div>

              <div className="pt-4 flex flex-wrap gap-4">
                <Button
                  onClick={() => setShowAlumniModal(true)}
                  size="lg"
                  className="rounded-full bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold shadow-lg shadow-emerald-900/50 transform hover:scale-105 transition-all"
                >
                  <GraduationCap className="mr-2 w-5 h-5" /> Register as Alumni
                </Button>

                <Link to="/alumni">
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-full border-emerald-400 text-emerald-200 hover:bg-white/10 transition-all"
                  >
                    Explore Alumni Directory
                  </Button>
                </Link>
              </div>
            </motion.div>

            {/* Visual Card Preview */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-8 text-white space-y-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center font-bold text-xl text-stone-950">
                    M
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">Muhammed Fasil</h4>
                    <p className="text-xs text-emerald-300">Batch of 2016 · Software Engineer</p>
                  </div>
                </div>
                <span className="text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/30">
                  Approved Alumni
                </span>
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

      {/* Footer */}
      <footer className="bg-stone-950 text-white py-12 border-t border-stone-800">
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
                <li><a href="#about" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#programs" className="hover:text-white transition-colors">Programs</a></li>
                <li><Link to="/alumni" className="hover:text-emerald-300 transition-colors font-medium">Alumni Directory</Link></li>
                <li><button onClick={() => setShowAlumniModal(true)} className="hover:text-emerald-300 transition-colors">Register as Alumni</button></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Login</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-heading text-lg mb-4 text-emerald-400">Contact</h4>
              <ul className="space-y-2 text-sm text-stone-400">
                <li>123 Madrasa Street</li>
                <li>City, State 12345</li>
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

      {/* Alumni Registration Modal & Mobile QR Modal */}
      <AlumniRegisterModal open={showAlumniModal} onClose={() => setShowAlumniModal(false)} />
      <MobileQRModal open={showQRModal} onClose={() => setShowQRModal(false)} />
    </div>
  );
};

export default LandingPage;