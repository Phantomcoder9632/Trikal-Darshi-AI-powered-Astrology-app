import React, { useEffect, useState } from 'react';
import {
  subscribeConnection,
  describeConnectionError,
} from '../services/connection';

/**
 * StatusBanners — honest, explicit state surfaces (no fake data, ever).
 *
 * 1. ConnectionBanner: shown when a backend call has failed. Offers one-click
 *    Retry that reloads the app (all data functions re-run against the server).
 * 2. CalculationMilestones: Vedic-themed progressive loading cards shown while
 *    the birth chart computes, plus instant math-first rendering notes.
 */

export function ConnectionBanner() {
  const [state, setState] = useState({ connected: true, error: null });
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeConnection((next) => setState(next));
    return unsubscribe;
  }, []);

  if (state.connected) return null;

  const message = describeConnectionError(state.error);

  const handleRetry = () => {
    setRetrying(true);
    // A full reload re-runs every fetch against the backend; simpler and more
    // reliable than tracking every caller's retry callbacks.
    window.location.reload();
  };

  return (
    <div className="fixed top-16 left-0 right-0 z-[90] px-4">
      <div className="max-w-3xl mx-auto bg-[#FFF4F2] border border-[#BA1A1A]/30 text-[#93000A] rounded-xl shadow-lg p-3.5 flex flex-col sm:flex-row sm:items-center gap-3 animate-fade-in">
        <span className="material-symbols-outlined text-[22px] flex-shrink-0">cloud_off</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider">Connection Issue</p>
          <p className="text-xs mt-0.5 leading-relaxed break-words">{message}</p>
        </div>
        <button
          type="button"
          onClick={handleRetry}
          disabled={retrying}
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#BA1A1A] hover:bg-[#93000A] disabled:opacity-60 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
        >
          <span className={`material-symbols-outlined text-[15px] ${retrying ? 'animate-spin' : ''}`}>
            {retrying ? 'progress_activity' : 'refresh'}
          </span>
          <span>{retrying ? 'Retrying…' : 'Retry Connection'}</span>
        </button>
      </div>
    </div>
  );
}

const MILESTONES = [
  { icon: 'calculate', text: 'Calculating natal planetary degrees via Swiss Ephemeris…', note: 'Ephemeris math · completes in milliseconds' },
  { icon: 'brightness_7', text: 'Synthesizing D9 Navamsha & D10 Dashamsha harmonics…', note: 'Divisional varga resolution' },
  { icon: 'menu_book', text: 'Retrieving relevant passages from Bṛhat Parāśara Horā Śāstra…', note: 'RAG over classical Jyotish texts' },
  { icon: 'history_edu', text: 'Composing detailed chapter interpretation…', note: 'AI narrative synthesis (streams per chapter)' },
];

/**
 * Progressive milestone loader for chart generation. Rotates every ~2.5s and
 * doubles as an honest explanation of WHY the first reading takes a while:
 * the math is instant; the AI narrative is the slow part.
 */
export function CalculationMilestones({ compact = false }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIdx((prev) => (prev + 1) % MILESTONES.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  const step = MILESTONES[idx];

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-[11px] text-[#7b5800] font-semibold animate-pulse">
        <span className="material-symbols-outlined text-[15px] text-[#D9A63C]">{step.icon}</span>
        <span>{step.text}</span>
      </div>
    );
  }

  return (
    <div className="bg-[#FBF6EA] border border-[#D9A63C]/30 rounded-xl p-4 flex items-start gap-3">
      <span className="w-8 h-8 rounded-lg bg-[#1F3A6B] text-[#F0DFAF] flex items-center justify-center flex-shrink-0 shadow-xs border border-[#D9A63C]/40">
        <span className="material-symbols-outlined text-[18px]">{step.icon}</span>
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-[#16223F] leading-snug">{step.text}</p>
        <p className="text-[10px] text-[#7b5800] mt-0.5">{step.note}</p>
      </div>
    </div>
  );
}

/**
 * Shimmer skeleton for interpretation prose — signals that real content is
 * actively arriving instead of showing blank space or fake text.
 */
export function ShimmerSkeleton({ lines = 6 }) {
  return (
    <div className="space-y-3 py-2" aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3.5 rounded bg-gradient-to-r from-[#F0E9D8] via-[#FAF5E8] to-[#F0E9D8] bg-[length:200%_100%] animate-[shimmer_1.6s_infinite]"
          style={{ width: `${[100, 92, 96, 78, 88, 64][i % 6]}%` }}
        />
      ))}
    </div>
  );
}
