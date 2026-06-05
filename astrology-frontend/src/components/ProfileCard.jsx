import React from 'react';

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function getInitials(name) {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function ProfileCard({ chartData }) {
  if (!chartData) return null;

  const {
    full_name,
    date_of_birth,
    time_of_birth,
    city_of_birth,
    ascendant,
    dasha,
    numerology,
  } = chartData;

  const ascSign   = ascendant?.sign || 'N/A';
  const ascDeg    = ascendant?.degree !== undefined ? `${Math.floor(ascendant.degree)}°` : '';
  const mahadasha = dasha?.mahadasha || 'N/A';
  const antardasha= dasha?.antardasha || 'N/A';
  const bhagyank  = numerology?.bhagyank;
  const bhagyankLord = numerology?.bhagyank_lord || numerology?.destiny_ruler || '';
  const initials  = getInitials(full_name);

  return (
    <div className="profile-card animate-up delay-2">

      {/* ── Avatar + Name ──────────────────────────────────────── */}
      <div className="profile-card-top">
        <div className="profile-avatar" aria-hidden="true">
          {initials}
        </div>
        <div className="profile-name-block">
          <h2 className="profile-name" title={full_name || 'Seeker'}>
            {full_name || 'Seeker'}
          </h2>
          <span className="profile-subtitle">Cosmic Blueprint Holder</span>
        </div>
      </div>

      {/* ── Divider ────────────────────────────────────────────── */}
      <div className="profile-divider" role="separator" />

      {/* ── Birth Details ──────────────────────────────────────── */}
      <div className="profile-detail-grid">

        <div className="profile-detail-row">
          <span className="material-symbols-outlined profile-detail-icon">cake</span>
          <div>
            <span className="profile-detail-label">Date of Birth</span>
            <span className="profile-detail-value">{formatDate(date_of_birth)}</span>
          </div>
        </div>

        <div className="profile-detail-row">
          <span className="material-symbols-outlined profile-detail-icon">schedule</span>
          <div>
            <span className="profile-detail-label">Birth Time</span>
            <span className="profile-detail-value">{time_of_birth || 'N/A'}</span>
          </div>
        </div>

        <div className="profile-detail-row">
          <span className="material-symbols-outlined profile-detail-icon">location_on</span>
          <div>
            <span className="profile-detail-label">Birth City</span>
            <span className="profile-detail-value" title={city_of_birth || ''}>
              {city_of_birth || 'N/A'}
            </span>
          </div>
        </div>

        <div className="profile-detail-row">
          <span className="material-symbols-outlined profile-detail-icon">wb_sunny</span>
          <div>
            <span className="profile-detail-label">Lagna (Ascendant)</span>
            <span className="profile-detail-value">
              {ascSign} {ascDeg}
            </span>
          </div>
        </div>

      </div>

      {/* ── Divider ────────────────────────────────────────────── */}
      <div className="profile-divider" role="separator" />

      {/* ── Dasha + Bhagyank ───────────────────────────────────── */}
      <div className="profile-pills-row">

        <div className="profile-dasha-pill">
          <span className="profile-pill-label">Current Dasha</span>
          <span className="profile-pill-value">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" />
            {mahadasha} MD · {antardasha} AD
          </span>
        </div>

        {bhagyank && (
          <div className="profile-bhagyank-badge">
            <span className="profile-pill-label">Bhagyank (Destiny Number)</span>
            <span className="profile-pill-value">
              {bhagyank}{bhagyankLord ? ` — ${bhagyankLord}` : ''}
            </span>
          </div>
        )}

      </div>
    </div>
  );
}
