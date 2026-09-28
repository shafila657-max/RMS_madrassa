import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
// ResetPasswordPage reads the reset link from the URL as soon as it loads, before the
// Supabase client clears it, so it must stay in the main bundle (not lazy).
import ResetPasswordPage from './pages/ResetPasswordPage';

// Every other page loads on demand, so visitors to the landing page don't download
// the admin dashboard and the rest of the app.
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const ParentDashboard = lazy(() => import('./pages/ParentDashboard'));
const StudentDetailPage = lazy(() => import('./pages/StudentDetailPage'));
const AlumniPage = lazy(() => import('./pages/AlumniPage'));
const GalleryPage = lazy(() => import('./pages/GalleryPage'));
const ProgramsPage = lazy(() => import('./pages/ProgramsPage'));
const ResultsPage = lazy(() => import('./pages/ResultsPage'));

const PageLoader = () => (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
    </div>
);
import ProtectedRoute from './components/ProtectedRoute';
import { Toaster } from 'sonner';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import AuthProvider from './context/AuthContext';
import PullToRefresh from './components/PullToRefresh';

// `/login` is only a destination for an intentional in-app login action.
// This keeps copied/bookmarked login URLs from bypassing the public landing page.
function LoginRoute() {
    const location = useLocation();

    if (!location.state?.loginIntent) {
        return <Navigate to="/" replace />;
    }

    return <LoginPage />;
}

function App() {
    return (
        <Router>
            <AuthProvider>
              <PullToRefresh>
                <div className="App">
                  <Suspense fallback={<PageLoader />}>
                  <Routes>
                      <Route path="/" element={<LandingPage />} />
                      <Route path="/login" element={<LoginRoute />} />
                      <Route path="/register" element={<RegisterPage />} />
                      
                      {/* Programs & Events Showcase */}
                      <Route path="/programs" element={<ProgramsPage />} />

                      {/* Protected Admin & Teacher Routes */}
                      <Route path="/admin" element={
                          <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                              <AdminDashboard />
                          </ProtectedRoute>
                      } />
                      
                      {/* Alumni Community & Directory */}
                      <Route path="/alumni" element={<AlumniPage />} />
                      
                      {/* Public Exam Results (shareable, no login) */}
                      <Route path="/results" element={<ResultsPage />} />

                      {/* Public Media Gallery */}
                      <Route path="/gallery" element={<GalleryPage />} />
                      
                      {/* Protected Parent Routes */}
                      <Route path="/parent" element={
                          <ProtectedRoute allowedRoles={['parent']}>
                              <ParentDashboard />
                          </ProtectedRoute>
                      } />
                      <Route path="/parent/:studentId" element={
                          <ProtectedRoute allowedRoles={['parent', 'admin']}>
                              <StudentDetailPage />
                          </ProtectedRoute>
                      } />
                      
                      {/* Protected Student Route: the student's own dashboard */}
                      <Route path="/student" element={
                          <ProtectedRoute allowedRoles={['student']}>
                              <StudentDetailPage viewer="student" />
                          </ProtectedRoute>
                      } />

                      {/* Password reset */}
                      <Route path="/reset-password" element={<ResetPasswordPage />} />
                  </Routes>
                  </Suspense>
                  {/* Every screen calls toast() from 'sonner', so this is the toaster that must be mounted. */}
                  <Toaster position="top-center" richColors closeButton />
                  <PWAInstallPrompt />
                </div>
              </PullToRefresh>
            </AuthProvider>
        </Router>
    );
}

export default App;
