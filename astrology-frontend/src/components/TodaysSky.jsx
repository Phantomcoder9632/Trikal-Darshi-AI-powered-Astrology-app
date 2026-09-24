import React, { useEffect, useState } from "react";
import { getGochar } from "../services/api";

const ZODIAC = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

const TITHIS = [
  "Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi",
  "Saptami", "Ashtami", "Navami", "Dashami", "Ekadashi", "Dwadashi",
  "Trayodashi", "Chaturdashi", "Purnima", "Pratipada", "Dwitiya", "Tritiya",
  "Chaturthi", "Panchami", "Shashthi", "Saptami", "Ashtami", "Navami",
  "Dashami", "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi", "Amavasya",
];

const NAKSHATRAS = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
  "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
  "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
  "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha",
  "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
];

const YOGAS = [
  "Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda",
  "Sukarman", "Dhriti", "Shula", "Ganda", "Vriddhi", "Dhruva",
  "Vyaghata", "Harshana", "Vajra", "Siddhi", "Vyatipata", "Variyana",
  "Parigha", "Shiva", "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma", "Indra", "Vaidhriti",
];

const KARANAS = ["Bava", "Balava", "Kaulava", "Taitila", "Gara", "Vanija", "Vishti"];
const WEEK_LORDS = ["Surya", "Chandra", "Mangal", "Budha", "Guru", "Shukra", "Shani"];
const MOON_PHASE_ICONS = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"];
const GRAHA_EMOJI = {
  Sun: "☀️", Moon: "🌙", Mars: "🔥", Mercury: "💬", Jupiter: "🪐",
  Venus: "💠", Saturn: "⏳", Rahu: "☊", Ketu: "☋",
};

export function computePanchanga(planets) {
  const sun = planets?.find((p) => p.name === "Sun");
  const moon = planets?.find((p) => p.name === "Moon");
  if (!sun || !moon) return null;

  const sunLon =
    typeof sun.fullDegree === "number"
      ? sun.fullDegree
      : ZODIAC.indexOf(sun.sign ?? "") * 30 + (sun.normDegree ?? 0);
  const moonLon =
    typeof moon.fullDegree === "number"
      ? moon.fullDegree
      : ZODIAC.indexOf(moon.sign ?? "") * 30 + (moon.normDegree ?? 0);
  if (Number.isNaN(sunLon) || Number.isNaN(moonLon)) return null;

  const diff = (moonLon - sunLon + 360) % 360;
  const tithiIdx = Math.floor(diff / 12);
  const paksha = tithiIdx < 15 ? "Shukla" : "Krishna";
  const nakIdx = Math.floor(moonLon / (360 / 27));
  const nakFrac = (moonLon % (360 / 27)) / (360 / 27);
  const pada = Math.floor(nakFrac * 4) + 1;
  const yogaIdx = Math.floor(((moonLon + sunLon) % 360) / (360 / 27));
  const karanaIdx = Math.floor(diff / 6);
  const karanaName =
    karanaIdx === 0
      ? "Kimstughna"
      : karanaIdx >= 57
      ? ["Shakuni", "Chatushpada", "Naga"][karanaIdx - 57]
      : KARANAS[(karanaIdx - 1) % 7];
  const phaseIcon = MOON_PHASE_ICONS[Math.min(7, Math.floor((diff / 360) * 8))];

  return {
    tithi: TITHIS[tithiIdx] ?? "—",
    paksha,
    nakshatra: NAKSHATRAS[nakIdx] ?? "—",
    pada,
    yoga: YOGAS[yogaIdx] ?? "—",
    karana: karanaName ?? "—",
    phaseIcon,
    moonSign: moon.sign ?? "—",
    sunSign: sun.sign ?? "—",
  };
}

export default function TodaysSky() {
  const [gochar, setGochar] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getGochar()
      .then((g) => {
        if (!cancelled) setGochar(g);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const panchanga = gochar?.planets ? computePanchanga(gochar.planets) : null;
  const now = new Date();

  if (error) {
    // Silent degradation: the card simply doesn't render if the sky is unreachable
    return null;
  }

  return (
    <section
      className="animate-up w-full mb-4 overflow-hidden rounded-2xl border border-[#D9A63C]/30 bg-gradient-to-r from-[#FFFDF6] via-[#FAF3E3] to-[#FFFDF6] shadow-sm"
      aria-label="Today's Panchanga and live planetary positions"
    >
      <div className="px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[18px] leading-none">{panchanga?.phaseIcon ?? "🌙"}</span>
            <div className="flex flex-col">
              <span className="font-headline-md text-[13px] font-bold text-[#022454] tracking-wider uppercase leading-tight">
                Today's Sky
              </span>
              <span className="font-accent-italic italic text-[#7b5800] text-[11px] leading-tight mt-0.5">
                {now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })} — day of {WEEK_LORDS[now.getDay()]}
              </span>
            </div>
            <span className="ml-1 flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D9A63C] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#D9A63C]" />
            </span>
          </div>

          {panchanga && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] font-semibold text-[#1F3A6B]">
              <span>
                <b className="text-[#7b5800]">{panchanga.paksha} {panchanga.tithi}</b>
              </span>
              <span className="hidden sm:inline text-[#E8D5A7]">✦</span>
              <span>Moon in <b className="text-[#022454]">{panchanga.moonSign}</b></span>
              <span className="hidden sm:inline text-[#E8D5A7]">✦</span>
              <span>{panchanga.nakshatra} <span className="text-[#7b5800]/60">pada {panchanga.pada}</span></span>
            </div>
          )}
        </div>

        {/* Graha strip */}
        {gochar?.planets && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {gochar.planets.map((p) => {
              const retro = p.isRetrograde === true || p.isRetrograde === "true";
              return (
                <span
                  key={p.name}
                  className="inline-flex items-center gap-1 bg-[#FBF6EA]/80 border border-[#E8D5A7]/70 rounded-full px-2.5 py-1 text-[10.5px] font-semibold text-[#1F3A6B]"
                  title={`${p.name} in ${p.sign}${retro ? " (retrograde)" : ""}`}
                >
                  <span>{GRAHA_EMOJI[p.name] ?? "✦"}</span>
                  {p.sign ?? "—"}
                  {retro && <span className="text-[#5d5c73] font-bold">℞</span>}
                </span>
              );
            })}
            <span className="inline-flex items-center text-[9px] text-[#7b5800]/50 font-semibold uppercase tracking-wider ml-1">
              Live · Lahiri
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
