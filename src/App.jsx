import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminDashboard from './pages/AdminDashboard';
import ParentDashboard from './pages/ParentDashboard';
import StudentDetailPage from './pages/StudentDetailPage';
import AlumniPage from './pages/AlumniPage';
import GalleryPage from './pages/GalleryPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ProtectedRoute from './components/ProtectedRoute';
import { Toaster } from './components/ui/toaster';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import AuthProvider from './context/AuthContext';

function App() {
    return (
        <Router>
            <AuthProvider>
              <div className="App">
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    
                    {/* Protected Admin & Teacher Routes */}
                    <Route path="/admin" element={
                        <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                            <AdminDashboard />
                        </ProtectedRoute>
                    } />
                    
                    {/* Alumni Community & Directory */}
                    <Route path="/alumni" element={<AlumniPage />} />
                    
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
                    
                    {/* Password reset */}
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                </Routes>
                <Toaster />
                <PWAInstallPrompt />
              </div>
            </AuthProvider>
        </Router>
    );
}

export default App;
