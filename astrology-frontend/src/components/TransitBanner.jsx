import React, { useState, useEffect } from 'react';

export default function TransitBanner() {
  const targetDate = new Date('2027-06-26T23:59:59+05:30');
  
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const calculateCountdown = () => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    calculateCountdown();
    const timer = setInterval(calculateCountdown, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatNumber = (num) => String(num).padStart(2, '0');

  return (
    <section className="animate-up relative w-full mb-5 overflow-hidden rounded-xl border border-primary-container/30 bg-primary-container/5 py-4 px-5 flex flex-col md:flex-row justify-between items-center gap-3 shimmer-gold shadow-sm">
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-primary text-xl">⚡</span>
        <span className="font-headline-md text-sm md:text-base font-bold text-primary tracking-wider uppercase">
          Jupiter Exaltation Window
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <span className="font-body-md text-xs text-on-surface-variant font-accent-italic italic text-center sm:text-right">
          Strategic wealth allocation window ends in:
        </span>
        <div className="flex items-center gap-2 bg-on-surface text-surface px-4 py-1.5 rounded-full font-label-sm text-[11px] font-bold text-white bg-neutral-900 tracking-wider">
          <span className="relative flex h-2 w-2">
            <span className="dot-pulse absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          {formatNumber(timeLeft.days)}D : {formatNumber(timeLeft.hours)}H : {formatNumber(timeLeft.minutes)}M : {formatNumber(timeLeft.seconds)}S
        </div>
      </div>
    </section>
  );
}
