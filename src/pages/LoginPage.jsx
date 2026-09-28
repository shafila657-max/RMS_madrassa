import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { login, setCachedProfile } from '@/utils/auth';
import { supabase } from '@/lib/supabase';

const LoginPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { profile } = await login(formData);
      setCachedProfile(profile);

      toast.success(`Welcome back, ${profile.full_name}!`);

      if (profile.role === 'admin' || profile.role === 'teacher') {
        navigate('/admin');
      } else if (profile.role === 'parent') {
        navigate('/parent');
      } else if (profile.role === 'student') {
        navigate('/student');
      } else {
        navigate('/');
      }
    } catch (error) {
      toast.error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail) { toast.error('Enter your email'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success('Password reset email sent! Check your inbox.');
      setForgotMode(false);
    } catch (err) {
      toast.error(err.message || 'Failed to send reset email');
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
            <h2 className="font-heading text-3xl text-stone-900 mb-2">Welcome Back</h2>
            <p className="text-stone-600">Sign in to access your account</p>
          </div>

          {forgotMode ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <Label htmlFor="forgot-email">Your Email Address</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1"
                />
              </div>
              <Button type="submit" className="w-full rounded-full bg-primary hover:bg-emerald-600 transition-colors" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
              <button type="button" onClick={() => setForgotMode(false)} className="w-full text-sm text-stone-500 hover:text-stone-700 transition-colors pt-1">
                ← Back to Login
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="login-form">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="mt-1"
                  data-testid="login-email-input"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="password">Password</Label>
                  <button type="button" onClick={() => setForgotMode(true)} className="text-xs text-primary hover:underline">Forgot password?</button>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  data-testid="login-password-input"
                />
              </div>

              <Button
                type="submit"
                className="w-full rounded-full bg-primary hover:bg-emerald-600 transition-colors"
                disabled={loading}
                data-testid="login-submit-button"
              >
                {loading ? 'Signing in...' : (
                  <><LogIn className="w-4 h-4 mr-2" /> Sign In</>
                )}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-stone-600">
              Don't have an account?{' '}
              <Link to="/register?type=parent" className="text-primary hover:underline font-medium">
                Register here
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
