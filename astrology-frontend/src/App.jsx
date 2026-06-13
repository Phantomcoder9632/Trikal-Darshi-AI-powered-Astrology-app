import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './styles/theme.css';

// Pages
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import { useAuth } from './context/AuthContext';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0e12] flex items-center justify-center">
        <span className="material-symbols-outlined text-primary text-[48px] animate-spin">
          hourglass_empty
        </span>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/" replace />;
}

export default function App() {
  React.useEffect(() => {
    const savedTheme = localStorage.getItem('app-theme') || 'theme-vedic-gold';
    document.body.className = savedTheme;
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route
          path="/dashboard/:chartId"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}
