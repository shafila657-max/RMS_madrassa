import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminDashboard from './pages/AdminDashboard';
import ParentDashboard from './pages/ParentDashboard';
import StudentDetailPage from './pages/StudentDetailPage';
import AlumniPage from './pages/AlumniPage';
import { Toaster } from './components/ui/toaster';
import PWAInstallPrompt from './components/PWAInstallPrompt';

function App() {
    return (
        <Router>
            <div className="App">
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/admin" element={<AdminDashboard />} />
                    {/* Alumni Community & Directory */}
                    <Route path="/alumni" element={<AlumniPage />} />
                    {/* Parent: family home (child picker) */}
                    <Route path="/parent" element={<ParentDashboard />} />
                    {/* Parent: individual child detail */}
                    <Route path="/parent/:studentId" element={<StudentDetailPage />} />
                </Routes>
                <Toaster />
                <PWAInstallPrompt />
            </div>
        </Router>
    );
}

export default App;
