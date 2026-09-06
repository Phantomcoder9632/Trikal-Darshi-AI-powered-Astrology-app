import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }) {
  const { user, isAuthenticated, loginWithEmail, registerWithEmail, logout, switchToMockUser } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState(initialMode); // 'login' | 'register' | 'profile'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [language, setLanguage] = useState('english');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'login') {
        if (!email || !password) {
          throw new Error('Please enter both email and password.');
        }
        await loginWithEmail(email, password);
        setSuccessMsg('Successfully authenticated with Trikal Darshi.');
        setTimeout(() => {
          onClose();
        }, 600);
      } else if (mode === 'register') {
        if (!email || !password) {
          throw new Error('Please fill in all required fields.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long.');
        }
        await registerWithEmail(email, password, name, language);
        setSuccessMsg('Account and Vedic Profile created successfully.');
        setTimeout(() => {
          onClose();
        }, 600);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || err.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#12244A]/65 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-md bg-[#FFFDF6] border-2 border-[#D9A63C]/50 rounded-3xl shadow-2xl p-6 sm:p-8 text-[#16223F] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative Golden Corner Accents */}
        <div aria-hidden="true" className="absolute top-3 left-3 w-3 h-3 border-t-2 border-l-2 border-[#D9A63C]" />
        <div aria-hidden="true" className="absolute top-3 right-3 w-3 h-3 border-t-2 border-r-2 border-[#D9A63C]" />
        <div aria-hidden="true" className="absolute bottom-3 left-3 w-3 h-3 border-b-2 border-l-2 border-[#D9A63C]" />
        <div aria-hidden="true" className="absolute bottom-3 right-3 w-3 h-3 border-b-2 border-r-2 border-[#D9A63C]" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-[#5D6B88] hover:text-[#16223F] p-1.5 rounded-full hover:bg-[#F4EEDA] transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#1F3A6B] text-[#F0DFAF] border border-[#D9A63C]/40 shadow-md mb-2">
            <span className="material-symbols-outlined text-[24px]">account_circle</span>
          </div>
          <h2 className="font-['Fraunces',serif] text-2xl font-bold text-[#022454] tracking-tight">
            {isAuthenticated
              ? 'Vedic Astrologer Profile'
              : mode === 'register'
              ? 'Create Scholar Profile'
              : 'Sign In to Vault'}
          </h2>
          <p className="text-xs text-[#5D6B88] mt-1 font-mono">
            {isAuthenticated
              ? 'Secure Ephemeris Account • Micro-arc Parity'
              : mode === 'register'
              ? 'Register to save D1–D60 vargas, planetary notes & chat transcripts'
              : 'Access your saved natal charts & celestial timelines'}
          </p>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] flex-shrink-0">error</span>
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] flex-shrink-0">check_circle</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* Authenticated User Profile View */}
        {isAuthenticated ? (
          <div className="space-y-4">
            <div className="p-4 bg-[#FBF6EA] border border-[#D9A63C]/30 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#8C6718]">Active Scholar</span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                  Authenticated
                </span>
              </div>
              <div className="font-['Fraunces',serif] text-lg font-bold text-[#16223F]">
                {user?.name || 'Vedic Native'}
              </div>
              <div className="text-xs text-[#5D6B88] font-mono">{user?.email || 'native@trikaldarshi.com'}</div>
              <div className="pt-2 border-t border-[#D9A63C]/20 flex items-center justify-between text-xs text-[#5D6B88]">
                <span>Language: <strong className="text-[#16223F] capitalize">{user?.preferred_language || 'English'}</strong></span>
                <span className="text-[#8C6718] font-mono">Lahiri Ayanamsa</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/charts');
                }}
                className="flex items-center justify-center gap-2 py-2.5 px-4 bg-[#1F3A6B] hover:bg-[#152A50] text-[#F0DFAF] text-xs font-semibold rounded-xl border border-[#D9A63C]/40 shadow-xs transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">folder_special</span>
                <span>Saved Vault</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/dashboard/mock-arjun-chart-108');
                }}
                className="flex items-center justify-center gap-2 py-2.5 px-4 bg-[#F4EEDA] hover:bg-[#EAE2C8] text-[#16223F] text-xs font-semibold rounded-xl border border-[#D9A63C]/40 shadow-xs transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px] text-[#8C6718]">dashboard</span>
                <span>Dashboard</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                logout();
                setErrorMsg('');
                setSuccessMsg('Logged out successfully.');
                setMode('login');
              }}
              className="w-full py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-xl border border-red-200 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          /* Login / Register Forms */
          <div>
            {/* Mode Switcher Tabs */}
            <div className="flex bg-[#FBF6EA] p-1 rounded-xl border border-[#D9A63C]/30 mb-5">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg('');
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  mode === 'login'
                    ? 'bg-[#1F3A6B] text-[#F0DFAF] shadow-xs'
                    : 'text-[#5D6B88] hover:text-[#16223F]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMsg('');
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  mode === 'register'
                    ? 'bg-[#1F3A6B] text-[#F0DFAF] shadow-xs'
                    : 'text-[#5D6B88] hover:text-[#16223F]'
                }`}
              >
                Create Profile
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-[#5D6B88] mb-1 font-medium">
                    Full Native Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Aaryavart Sharma"
                    className="w-full px-3.5 py-2 bg-[#FBF6EA] border border-[#D9A63C]/30 rounded-xl text-xs sm:text-sm text-[#16223F] placeholder-[#8E9BB5] focus:ring-1 focus:ring-[#D9A63C] focus:border-[#D9A63C] outline-hidden"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[#5D6B88] mb-1 font-medium">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="scholar@astrology.com"
                  className="w-full px-3.5 py-2 bg-[#FBF6EA] border border-[#D9A63C]/30 rounded-xl text-xs sm:text-sm text-[#16223F] placeholder-[#8E9BB5] focus:ring-1 focus:ring-[#D9A63C] focus:border-[#D9A63C] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[#5D6B88] mb-1 font-medium">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 bg-[#FBF6EA] border border-[#D9A63C]/30 rounded-xl text-xs sm:text-sm text-[#16223F] placeholder-[#8E9BB5] focus:ring-1 focus:ring-[#D9A63C] focus:border-[#D9A63C] outline-hidden"
                />
              </div>

              {mode === 'register' && (
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-[#5D6B88] mb-1 font-medium">
                    Preferred Script / Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FBF6EA] border border-[#D9A63C]/30 rounded-xl text-xs text-[#16223F] focus:ring-1 focus:ring-[#D9A63C] focus:border-[#D9A63C] outline-hidden"
                  >
                    <option value="english">English (Standard Ephemeris)</option>
                    <option value="hindi">हिन्दी (Hindi Script)</option>
                    <option value="bengali">বাংলা (Bengali Script)</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 bg-[#1F3A6B] hover:bg-[#022454] text-[#F0DFAF] text-xs font-semibold rounded-xl border border-[#D9A63C] shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">hourglass_top</span>
                    <span>Synchronizing Vault...</span>
                  </>
                ) : (
                  <>
                    <span>{mode === 'register' ? 'Complete Profile Registration' : 'Authenticate & Unlock Vault'}</span>
                    <span className="material-symbols-outlined text-[16px] text-[#D9A63C]">arrow_forward</span>
                  </>
                )}
              </button>
            </form>

            {/* Offline Mock / Demo Account Shortcut */}
            <div className="mt-5 pt-4 border-t border-[#D9A63C]/20 text-center">
              <p className="text-[11px] text-[#5D6B88] mb-2 font-mono">Exploring without credentials?</p>
              <button
                type="button"
                onClick={() => {
                  switchToMockUser();
                  setSuccessMsg('Active as Scholar Arjun Sharma (Mock Offline Mode)');
                  setTimeout(() => {
                    onClose();
                  }, 500);
                }}
                className="w-full py-2 px-3 bg-[#F4EEDA] hover:bg-[#EAE2C8] text-[#16223F] text-xs font-semibold rounded-xl border border-[#D9A63C]/40 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px] text-[#8C6718]">badge</span>
                <span>Enter as Verified Scholar (One-Click Demo)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
