import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { register } from '@/utils/auth';

const RegisterPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userType = searchParams.get('type') || 'parent';

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await register({ ...formData, role: userType });
      toast.success('Registration successful! Please wait for admin approval.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      toast.error(error.message || 'Registration failed');
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
            <h2 className="font-heading text-3xl text-stone-900 mb-2">
              {userType === 'parent' ? 'Parent' : 'Student'} Registration
            </h2>
            <p className="text-stone-600">Create your account to get started</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" data-testid="register-form">
            <div>
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                name="full_name"
                type="text"
                required
                value={formData.full_name}
                onChange={handleChange}
                className="mt-1"
                data-testid="register-fullname-input"
              />
            </div>

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
                data-testid="register-email-input"
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone Number (Optional)</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                className="mt-1"
                data-testid="register-phone-input"
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                value={formData.password}
                onChange={handleChange}
                className="mt-1"
                data-testid="register-password-input"
              />
            </div>

            <Button
              type="submit"
              className="w-full rounded-full bg-primary hover:bg-emerald-600 transform hover:scale-105 active:scale-95 transition-all"
              disabled={loading}
              data-testid="register-submit-button"
            >
              {loading ? 'Registering...' : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Register
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-stone-600">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Login here
              </Link>
            </p>
          </div>

          <div className="mt-4 text-center">
            <Link
              to={`/register?type=${userType === 'parent' ? 'student' : 'parent'}`}
              className="text-sm text-stone-600 hover:text-primary transition-colors"
            >
              Register as {userType === 'parent' ? 'Student' : 'Parent'} instead
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default RegisterPage;