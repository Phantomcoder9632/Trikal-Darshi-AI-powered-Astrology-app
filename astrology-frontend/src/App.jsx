import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './styles/theme.css';

// Pages
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import ChatPage from './pages/ChatPage';
import SavedChartsPage from './pages/SavedChartsPage';
import ProfilePage from './pages/ProfilePage';
import { useAuth } from './context/AuthContext';
import LanguageWelcomeModal, { useFirstVisit } from './components/LanguageWelcomeModal';
import { ConnectionBanner } from './components/StatusBanners';
import i18n, { backendLangToI18n } from './i18n';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBF6EA] flex items-center justify-center">
        <span className="material-symbols-outlined text-[#D9A63C] text-[48px] animate-spin">
          hourglass_empty
        </span>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/" replace />;
}

export default function App() {
  const { isAuthenticated } = useAuth();
  const [showLangModal, hideLangModal] = useFirstVisit();

  React.useEffect(() => {
    const savedTheme = localStorage.getItem('app-theme') || 'theme-vedic-gold';
    document.body.className = savedTheme;

    // Restore language preference on app load (if user already chose one)
    const savedLang = localStorage.getItem('trikal_lang_chosen');
    if (savedLang) {
      i18n.changeLanguage(backendLangToI18n(savedLang));
    }
  }, []);

  function handleLanguageSelected(langValue) {
    // Language is already applied inside the modal itself
    // Just close the modal
    hideLangModal();
  }

  return (
    <>
      {/* First-visit language picker — renders on top of everything */}
      {showLangModal && (
        <LanguageWelcomeModal onSelect={handleLanguageSelected} />
      )}

      <Router>
        {/* Honest connection-lost banner with one-click retry */}
        <ConnectionBanner />

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/charts" element={<SavedChartsPage />} />
          <Route path="/saved-charts" element={<SavedChartsPage />} />
          <Route path="/account" element={<SavedChartsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/:chartId" element={<ChatPage />} />
          {/* No mock ID here: real users land on their vault; unauthenticated
              users are bounced home. The old redirect injected a mock chart ID
              that the backend rejects with 422. */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Navigate to="/charts" replace />
              </ProtectedRoute>
            }
          />
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
    </>
  );
}
