import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Lock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    // Supabase automatically exchanges the token in the URL hash for a session
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setHasSession(true);
      }
    });
    // Also check if already in a recovery session
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setHasSession(true);
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      toast.success('Password updated successfully!');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      toast.error(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-xl p-8 border border-stone-200 shadow-lg">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <BookOpen className="w-8 h-8 text-primary" />
              <span className="font-heading text-2xl font-bold text-stone-900">RMS Madrasa</span>
            </div>
            <h2 className="font-heading text-3xl text-stone-900 mb-2">Reset Password</h2>
            <p className="text-stone-600 text-sm">Enter your new password below</p>
          </div>

          {done ? (
            <div className="text-center py-6 space-y-3">
              <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto" />
              <p className="font-bold text-stone-900 text-lg">Password Updated!</p>
              <p className="text-stone-500 text-sm">Redirecting you to login...</p>
            </div>
          ) : !hasSession ? (
            <div className="text-center py-6 space-y-3">
              <Lock className="w-16 h-16 text-stone-300 mx-auto" />
              <p className="text-stone-500 text-sm">
                This link has expired or is invalid. Please request a new password reset from the login page.
              </p>
              <Button onClick={() => navigate('/login')} className="rounded-full mt-2">
                Back to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="confirm">Confirm New Password</Label>
                <Input
                  id="confirm"
                  type="password"
                  required
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat your new password"
                  className="mt-1"
                />
              </div>
              <Button
                type="submit"
                className="w-full rounded-full bg-primary hover:bg-emerald-600 transition-colors"
                disabled={loading}
              >
                {loading ? 'Updating...' : (
                  <><Lock className="w-4 h-4 mr-2" /> Update Password</>
                )}
              </Button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPasswordPage;
