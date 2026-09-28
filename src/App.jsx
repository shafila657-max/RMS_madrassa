import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminDashboard from './pages/AdminDashboard';
import ParentDashboard from './pages/ParentDashboard';
import StudentDetailPage from './pages/StudentDetailPage';
import AlumniPage from './pages/AlumniPage';
import GalleryPage from './pages/GalleryPage';
import ProgramsPage from './pages/ProgramsPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ResultsPage from './pages/ResultsPage';
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
