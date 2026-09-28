import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { MIN_PASSWORD_LENGTH } from '@/utils/auth';

// Read the reset link's URL when this module loads, before the Supabase client
// swaps the token in the hash for a session and clears it.
const INITIAL_HASH = typeof window !== 'undefined' ? window.location.hash : '';
const INITIAL_SEARCH = typeof window !== 'undefined' ? window.location.search : '';
const RECOVERY_FLAG = 'rms-password-recovery';

const linkParams = new URLSearchParams(INITIAL_HASH.replace(/^#/, '') || INITIAL_SEARCH.replace(/^\?/, ''));
const LINK_IS_RECOVERY = linkParams.get('type') === 'recovery' || new URLSearchParams(INITIAL_SEARCH).has('code');
const LINK_ERROR = linkParams.get('error_description');

// Remembers (for this tab, up to an hour) that the session came from a reset link,
// so a page refresh still works after the link's token has been cleared from the URL.
const FLAG_TTL_MS = 60 * 60 * 1000;
const readFlag = () => {
  try { return Date.now() - Number(sessionStorage.getItem(RECOVERY_FLAG) || 0) < FLAG_TTL_MS; } catch { return false; }
};
const writeFlag = (on) => {
  try { on ? sessionStorage.setItem(RECOVERY_FLAG, String(Date.now())) : sessionStorage.removeItem(RECOVERY_FLAG); } catch { /* storage unavailable */ }
};

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  // 'checking' until we know whether this browser holds a password-reset session.
  const [linkState, setLinkState] = useState(LINK_ERROR ? 'invalid' : 'checking');

  useEffect(() => {
    if (LINK_ERROR) return undefined;
    let settled = false;
    const accept = () => { settled = true; writeFlag(true); setLinkState('ready'); };

    // Only a session that came from a reset link may change the password here;
    // an ordinary signed-in session must not (someone else could be using the device).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') accept();
    });

    const check = async (attempt = 0) => {
      if (settled) return;
      const { data } = await supabase.auth.getSession();
      if (data.session && (LINK_IS_RECOVERY || readFlag())) { accept(); return; }
      // The link's token may still be being exchanged; wait briefly before giving up.
      if (LINK_IS_RECOVERY && attempt < 8) { setTimeout(() => check(attempt + 1), 500); return; }
      if (!settled) setLinkState('invalid');
    };
    check();

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      toast.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
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
      writeFlag(false);
      // End the reset session so the person signs in fresh with the new password.
      await supabase.auth.signOut();
      setDone(true);
      toast.success('Password updated successfully!');
      setTimeout(() => navigate('/login', { state: { loginIntent: true } }), 3000);
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
              <img src="/apple-touch-icon.png" alt="RMS Madrasa" className="w-10 h-10 rounded-xl object-cover" />
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
          ) : linkState === 'checking' ? (
            <div className="text-center py-10">
              <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-stone-500 text-sm mt-3">Checking your reset link…</p>
            </div>
          ) : linkState === 'invalid' ? (
            <div className="text-center py-6 space-y-3">
              <Lock className="w-16 h-16 text-stone-300 mx-auto" />
              <p className="text-stone-500 text-sm">
                {LINK_ERROR
                  ? `${LINK_ERROR}. `
                  : 'This page only works from the link in a password reset email, and that link has expired or is invalid. '}
                Please request a new password reset from the login page.
              </p>
              <Button onClick={() => navigate('/login', { state: { loginIntent: true } })} className="rounded-full mt-2">
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
                  minLength={MIN_PASSWORD_LENGTH}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={`Minimum ${MIN_PASSWORD_LENGTH} characters`}
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
