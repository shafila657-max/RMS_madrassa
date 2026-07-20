import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { login, setCachedProfile } from '@/utils/auth';

const LoginPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

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

      if (profile.role === 'admin') {
        navigate('/admin');
      } else if (profile.role === 'parent') {
        navigate('/parent');
      } else {
        navigate('/');
      }
    } catch (error) {
      toast.error(error.message || 'Login failed');
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
            <h2 className="font-heading text-3xl text-stone-900 mb-2">Welcome Back</h2>
            <p className="text-stone-600">Sign in to access your account</p>
          </div>

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
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="mt-1"
                data-testid="login-password-input"
              />
            </div>

            <Button
              type="submit"
              className="w-full rounded-full bg-primary hover:bg-emerald-600 transform hover:scale-105 active:scale-95 transition-all"
              disabled={loading}
              data-testid="login-submit-button"
            >
              {loading ? 'Signing in...' : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </>
              )}
            </Button>
          </form>

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