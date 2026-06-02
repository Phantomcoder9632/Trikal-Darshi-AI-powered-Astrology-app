import React, { useState, useEffect } from 'react';

const TARGET_DATE = new Date('2027-06-26T23:59:59+05:30');

function calcCountdown() {
  const diff = TARGET_DATE.getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days:    Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours:   Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  };
}

function pad(n) { return String(n).padStart(2, '0'); }

export default function TransitBanner() {
  const [timeLeft, setTimeLeft] = useState(calcCountdown);

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(calcCountdown()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section
      className="animate-up w-full mb-4 overflow-hidden rounded-2xl border border-primary-container/30 bg-gradient-to-r from-primary-container/6 via-primary/3 to-primary-container/6 shimmer-gold shadow-sm"
      aria-label="Jupiter Exaltation Window countdown"
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5">
        {/* Left: label */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-primary-container text-[18px] leading-none">⚡</span>
          <div className="flex flex-col">
            <span className="font-headline-md text-[13px] font-bold text-primary tracking-wider uppercase leading-tight">
              Jupiter Exaltation Window
            </span>
            <span className="font-accent-italic italic text-on-surface-variant text-[11px] leading-tight mt-0.5">
              Strategic wealth allocation window ends in:
            </span>
          </div>
        </div>

        {/* Right: countdown */}
        <div className="flex items-center gap-1.5 bg-primary text-on-primary rounded-full px-5 py-2 font-label-sm text-[11px] font-bold tracking-widest shrink-0">
          <span className="relative flex h-2 w-2 mr-1.5">
            <span className="dot-pulse absolute inline-flex h-full w-full rounded-full bg-on-primary opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-on-primary" />
          </span>
          <span>{pad(timeLeft.days)}<span className="opacity-50 mx-0.5">D</span></span>
          <span className="opacity-40">:</span>
          <span>{pad(timeLeft.hours)}<span className="opacity-50 mx-0.5">H</span></span>
          <span className="opacity-40">:</span>
          <span>{pad(timeLeft.minutes)}<span className="opacity-50 mx-0.5">M</span></span>
          <span className="opacity-40">:</span>
          <span>{pad(timeLeft.seconds)}<span className="opacity-50 mx-0.5">S</span></span>
        </div>
      </div>
    </section>
  );
}
