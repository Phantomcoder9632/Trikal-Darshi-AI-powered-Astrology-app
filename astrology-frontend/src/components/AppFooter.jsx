import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * AppFooter — shared deep-navy scholarly footer (4 columns on desktop).
 * Used by the Observatory (landing) and Profile pages. Dashboard keeps its
 * own compact footer; Chat has none.
 */
export default function AppFooter() {
  const navigate = useNavigate();
  const year = new Date().getFullYear();

  const go = (path) => navigate(path);

  return (
    <footer className="w-full bg-[#0E1A37] text-[#F0DFAF] border-t border-[#D9A63C]/30">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Col 1 — Brand */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-[#1F3A6B] border border-[#D9A63C]/40 flex items-center justify-center text-[#D9A63C] text-lg leading-none">
                ✦
              </span>
              <span className="font-['Fraunces',serif] text-lg font-bold text-[#FFFDF6] tracking-tight">
                TRIKAL DARSHI
              </span>
            </div>
            <div className="text-xs text-[#F0DFAF]/85 uppercase tracking-widest font-semibold">त्रिकाल दर्शी</div>
            <p className="text-xs text-[#F0DFAF]/70 leading-relaxed max-w-xs">
              Ancient wisdom, precision computation. Sidereal Jyotish rendered through modern
              ephemeris mechanics.
            </p>
          </div>

          {/* Col 2 — Navigate */}
          <div className="flex flex-col gap-2.5">
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-[#D9A63C] mb-1">Navigate</h4>
            <button type="button" onClick={() => go('/')} className="text-left text-xs text-[#F0DFAF]/85 hover:text-[#D9A63C] transition-colors cursor-pointer bg-transparent border-none p-0">
              Observatory
            </button>
            <button type="button" onClick={() => go('/profile')} className="text-left text-xs text-[#F0DFAF]/85 hover:text-[#D9A63C] transition-colors cursor-pointer bg-transparent border-none p-0">
              My Profile
            </button>
            <button type="button" onClick={() => go('/profile')} className="text-left text-xs text-[#F0DFAF]/85 hover:text-[#D9A63C] transition-colors cursor-pointer bg-transparent border-none p-0">
              My Dashboard
            </button>
            <button type="button" onClick={() => go('/#matrix-showcase')} className="text-left text-xs text-[#F0DFAF]/85 hover:text-[#D9A63C] transition-colors cursor-pointer bg-transparent border-none p-0">
              About Trikal Darshi
            </button>
          </div>

          {/* Col 3 — Legal */}
          <div className="flex flex-col gap-2.5">
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-[#D9A63C] mb-1">Legal</h4>
            <a href="#" className="text-xs text-[#F0DFAF]/85 hover:text-[#D9A63C] transition-colors">Privacy Policy</a>
            <a href="#" className="text-xs text-[#F0DFAF]/85 hover:text-[#D9A63C] transition-colors">Terms of Service</a>
            <a href="#" className="text-xs text-[#F0DFAF]/85 hover:text-[#D9A63C] transition-colors">Disclaimer</a>
            <a href="#" className="text-xs text-[#F0DFAF]/85 hover:text-[#D9A63C] transition-colors">Contact / Support</a>
          </div>

          {/* Col 4 — Ephemeris credits */}
          <div className="flex flex-col gap-2.5">
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-[#D9A63C] mb-1">Ephemeris</h4>
            <div className="text-xs text-[#F0DFAF]/85">Swiss Ephemeris Engine</div>
            <div className="text-xs text-[#F0DFAF]/85">Lahiri (Chitrapaksha) Ayanamsa</div>
            <div className="text-xs text-[#F0DFAF]/85">Vimshottari Dasha · D1–D60 Vargas</div>
            <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-[#F0DFAF]/60">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Sidereal coordinates verified</span>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-5 border-t border-[#D9A63C]/20 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-[#F0DFAF]/60 text-center md:text-left">
            © {year} Trikal Darshi · Swiss Ephemeris · Lahiri Ayanamsa · All planetary coordinates verified.
          </div>
          <div className="text-[11px] text-[#F0DFAF]/60">
            Built with <span className="text-[#D9A63C]">✦</span> for Jyotish seekers.
          </div>
        </div>
      </div>
    </footer>
  );
}
