import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, GraduationCap, CheckCircle2, RefreshCw, Send, Award, Camera, Upload, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const AlumniRegisterModal = ({ open, onClose }) => {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    whatsapp_number: '',
    passout_year: '',
    working_area: '',
    company_org: '',
    location: '',
    bio: '',
    linkedin_url: '',
    is_mentor: true,
    mentor_topics: 'Career Guidance, Higher Education',
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be under 5MB');
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.passout_year || !form.working_area || !form.whatsapp_number) {
      toast.error('Full Name, Passout Year, Working Area, and WhatsApp Number are required.');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;

      let photoUrl = null;
      if (photoFile) {
        try {
          const fileExt = photoFile.name.split('.').pop();
          const fileName = `alumni_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('alumni-photos').upload(fileName, photoFile);
          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage.from('alumni-photos').getPublicUrl(fileName);
            photoUrl = publicUrlData?.publicUrl || null;
          }
        } catch (imgErr) {
          console.warn('Photo upload warning:', imgErr);
        }
      }

      const { error } = await supabase.from('alumni_profiles').insert([{
        user_id: userId,
        full_name: form.full_name,
        email: form.email || session?.user?.email || null,
        phone: form.phone,
        whatsapp_number: form.whatsapp_number,
        passout_year: form.passout_year,
        working_area: form.working_area,
        company_org: form.company_org,
        location: form.location,
        bio: form.bio,
        linkedin_url: form.linkedin_url,
        is_mentor: form.is_mentor,
        mentor_topics: form.mentor_topics,
        photo_url: photoUrl,
        status: 'pending',
      }]);

      if (error) throw error;

      if (userId) {
        await supabase.from('profiles').update({ is_alumni: true }).eq('id', userId);
      }

      setSubmitted(true);
      toast.success('Alumni registration submitted for admin approval!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit registration: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setPhotoFile(null);
    setPhotoPreview('');
    setForm({
      full_name: '',
      email: '',
      phone: '',
      whatsapp_number: '',
      passout_year: '',
      working_area: '',
      company_org: '',
      location: '',
      bio: '',
      linkedin_url: '',
      is_mentor: true,
      mentor_topics: 'Career Guidance, Higher Education',
    });
    onClose();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          onClick={e => e.stopPropagation()}
          className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-6 max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 p-6 text-white relative flex-shrink-0">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Join Alumni Network</h3>
                <p className="text-emerald-100 text-xs mt-0.5">Connect with your Madrasa community & inspire students</p>
              </div>
            </div>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            {submitted ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h4 className="text-xl font-bold text-stone-900">Registration Received!</h4>
                <p className="text-stone-500 text-sm max-w-xs mx-auto">
                  Thank you! Your alumni profile has been submitted. The admin will review and approve your entry shortly.
                </p>
                <button
                  onClick={handleReset}
                  className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Profile Photo Upload */}
                <div className="flex items-center gap-4 p-3.5 bg-stone-50 border border-stone-200 rounded-2xl">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden bg-stone-200 border-2 border-emerald-500 shrink-0 flex items-center justify-center shadow-sm">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-7 h-7 text-stone-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs font-bold text-stone-800 mb-1">Profile Photo (Optional)</label>
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-stone-200 hover:border-emerald-400 text-xs font-semibold text-stone-700 shadow-sm hover:bg-emerald-50 transition-colors">
                        <Upload className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{photoFile ? 'Change Photo' : 'Upload Photo'}</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                      </label>
                      {photoFile && (
                        <button
                          type="button"
                          onClick={() => { setPhotoFile(null); setPhotoPreview(''); }}
                          className="text-xs text-red-500 hover:underline font-semibold flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Remove
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-stone-400 mt-1">PNG, JPG, or WEBP up to 5MB</p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Full Name *</label>
                    <input
                      required
                      value={form.full_name}
                      onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                      placeholder="e.g. Abdul Rahman"
                      className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Passout Year / Batch *</label>
                    <input
                      required
                      placeholder="e.g. 2018 or Batch of 2015"
                      value={form.passout_year}
                      onChange={e => setForm(f => ({ ...f, passout_year: e.target.value }))}
                      className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Working Area / Profession *</label>
                    <input
                      required
                      placeholder="e.g. Software Engineer, Doctor, Business"
                      value={form.working_area}
                      onChange={e => setForm(f => ({ ...f, working_area: e.target.value }))}
                      className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Company / Organization</label>
                    <input
                      placeholder="e.g. Google, Local Hospital, Freelance"
                      value={form.company_org}
                      onChange={e => setForm(f => ({ ...f, company_org: e.target.value }))}
                      className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">WhatsApp Number *</label>
                    <input
                      required
                      placeholder="e.g. +91 9876543210"
                      value={form.whatsapp_number}
                      onChange={e => setForm(f => ({ ...f, whatsapp_number: e.target.value }))}
                      className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Phone Number</label>
                    <input
                      placeholder="e.g. +91 9876543210"
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">City / Country</label>
                    <input
                      placeholder="e.g. Dubai, UAE or Calicut, India"
                      value={form.location}
                      onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                      className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="alumni@example.com"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Mentorship Option */}
                <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-4 space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_mentor}
                      onChange={e => setForm(f => ({ ...f, is_mentor: e.target.checked }))}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-emerald-600" /> Available as a Student Mentor
                    </span>
                  </label>

                  {form.is_mentor && (
                    <div className="pt-1">
                      <label className="block text-[11px] font-medium text-emerald-800 mb-1">Mentorship Expertise / Topics</label>
                      <input
                        placeholder="e.g. Career Guidance, Higher Education, Quran Memorization"
                        value={form.mentor_topics}
                        onChange={e => setForm(f => ({ ...f, mentor_topics: e.target.value }))}
                        className="w-full border border-emerald-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Message / Advice to Madrasa Students</label>
                  <textarea
                    rows={2}
                    placeholder="Share your experience or advice for current students..."
                    value={form.bio}
                    onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                    className="w-full border border-stone-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Submit Profile
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AlumniRegisterModal;
