// Comprehensive Mock Dataset for Offline/Demo Mode in Trikal Darshi
// Allows full interactive browsing of all 11 tabs, Kundali charts, chat synthesizer, remedies, and profile drawers.

export const MOCK_USER = {
  id: 'usr_mock_arjun_963',
  email: 'arjun.sharma@vedicastrology.demo',
  name: 'Arjun Sharma',
  preferred_language: 'english',
  created_at: '2026-01-15T08:30:00Z',
  avatar_url: null,
};

export const MOCK_CHART = {
  chart_id: 'mock-arjun-chart-108',
  user_id: 'usr_mock_arjun_963',
  full_name: 'Arjun Sharma',
  date_of_birth: '1995-10-24',
  time_of_birth: '06:45:00',
  city_of_birth: 'Varanasi, Uttar Pradesh, India',
  current_city: 'Bengaluru, Karnataka, India',
  birth_time_confidence: 'exact',
  language: 'english',
  latitude: 25.3176,
  longitude: 82.9739,
  timezone: 5.5,
  ayanamsha_value: 23.82,
  julian_day: 2450014.53125,
  created_at: '2026-01-15T08:30:00Z',
  
  ascendant: {
    sign: 'Libra',
    sign_num: 7,
    degree: 14.32,
    full_degree: 194.32,
    nakshatra: 'Swati',
    nakshatra_lord: 'Rahu',
    nakshatra_pada: 3,
  },
  
  atmakaraka: 'Sun',
  
  numerology: {
    moolank: 6,
    bhagyank: 4,
    bhagyank_lord: 'Rahu',
    destiny_ruler: 'Rahu',
    favorable_numbers: [6, 4, 1, 5],
    favorable_days: ['Friday', 'Saturday', 'Wednesday'],
    favorable_gemstone: 'Diamond / Blue Sapphire',
  },
  
  planets: [
    {
      name: 'Sun',
      sign: 'Libra',
      sign_num: 7,
      house: 1,
      degree: 6.85,
      fullDegree: 186.85,
      isRetrograde: false,
      nakshatra: 'Chitra',
      nakshatra_lord: 'Mars',
      nakshatra_pada: 3,
      dignity: 'Debilitated (Neecha)',
      status: 'debilitated',
      karaka: 'Atmakaraka (Soul)',
      speed: 0.985,
    },
    {
      name: 'Moon',
      sign: 'Libra',
      sign_num: 7,
      house: 1,
      degree: 28.12,
      fullDegree: 208.12,
      isRetrograde: false,
      nakshatra: 'Vishakha',
      nakshatra_lord: 'Jupiter',
      nakshatra_pada: 3,
      dignity: 'Neutral',
      status: 'neutral',
      karaka: 'Amatyakaraka (Career)',
      speed: 13.42,
    },
    {
      name: 'Mars',
      sign: 'Scorpio',
      sign_num: 8,
      house: 2,
      degree: 12.45,
      fullDegree: 222.45,
      isRetrograde: false,
      nakshatra: 'Anuradha',
      nakshatra_lord: 'Saturn',
      nakshatra_pada: 3,
      dignity: 'Own Sign (Swakshetra - Ruchaka Yoga)',
      status: 'own',
      karaka: 'Bhatrikaraka',
      speed: 0.62,
    },
    {
      name: 'Mercury',
      sign: 'Virgo',
      sign_num: 6,
      house: 12,
      degree: 24.18,
      fullDegree: 174.18,
      isRetrograde: false,
      nakshatra: 'Chitra',
      nakshatra_lord: 'Mars',
      nakshatra_pada: 1,
      dignity: 'Exalted (Uccha - Bhadra Yoga)',
      status: 'exalted',
      karaka: 'Matrikaraka',
      speed: 1.15,
    },
    {
      name: 'Jupiter',
      sign: 'Scorpio',
      sign_num: 8,
      house: 2,
      degree: 18.30,
      fullDegree: 228.30,
      isRetrograde: false,
      nakshatra: 'Jyeshtha',
      nakshatra_lord: 'Mercury',
      nakshatra_pada: 1,
      dignity: 'Friendly (Mitra)',
      status: 'friendly',
      karaka: 'Putrakaraka',
      speed: 0.12,
    },
    {
      name: 'Venus',
      sign: 'Libra',
      sign_num: 7,
      house: 1,
      degree: 15.60,
      fullDegree: 195.60,
      isRetrograde: false,
      nakshatra: 'Swati',
      nakshatra_lord: 'Rahu',
      nakshatra_pada: 3,
      dignity: 'Own Sign (Malavya Mahapurusha Yoga)',
      status: 'own',
      karaka: 'Gnatikaraka',
      speed: 1.21,
    },
    {
      name: 'Saturn',
      sign: 'Aquarius',
      sign_num: 11,
      house: 5,
      degree: 25.10,
      fullDegree: 325.10,
      isRetrograde: true,
      nakshatra: 'Purva Bhadrapada',
      nakshatra_lord: 'Jupiter',
      nakshatra_pada: 2,
      dignity: 'Moolatrikona (Sasa Mahapurusha Yoga)',
      status: 'moolatrikona',
      karaka: 'Darakaraka',
      speed: -0.04,
    },
    {
      name: 'Rahu',
      sign: 'Libra',
      sign_num: 7,
      house: 1,
      degree: 2.15,
      fullDegree: 182.15,
      isRetrograde: true,
      nakshatra: 'Chitra',
      nakshatra_lord: 'Mars',
      nakshatra_pada: 3,
      dignity: 'Friendly',
      status: 'friendly',
      karaka: 'Shadow Node',
      speed: -0.05,
    },
    {
      name: 'Ketu',
      sign: 'Aries',
      sign_num: 1,
      house: 7,
      degree: 2.15,
      fullDegree: 2.15,
      isRetrograde: true,
      nakshatra: 'Ashwini',
      nakshatra_lord: 'Ketu',
      nakshatra_pada: 1,
      dignity: 'Friendly',
      status: 'friendly',
      karaka: 'Shadow Node',
      speed: -0.05,
    },
  ],
  
  houses: [
    { house_num: 1, sign: 'Libra', sign_num: 7, degree: 14.32, lord: 'Venus', occupants: ['Sun', 'Moon', 'Venus', 'Rahu'] },
    { house_num: 2, sign: 'Scorpio', sign_num: 8, degree: 14.32, lord: 'Mars', occupants: ['Mars', 'Jupiter'] },
    { house_num: 3, sign: 'Sagittarius', sign_num: 9, degree: 14.32, lord: 'Jupiter', occupants: [] },
    { house_num: 4, sign: 'Capricorn', sign_num: 10, degree: 14.32, lord: 'Saturn', occupants: [] },
    { house_num: 5, sign: 'Aquarius', sign_num: 11, degree: 14.32, lord: 'Saturn', occupants: ['Saturn'] },
    { house_num: 6, sign: 'Pisces', sign_num: 12, degree: 14.32, lord: 'Jupiter', occupants: [] },
    { house_num: 7, sign: 'Aries', sign_num: 1, degree: 14.32, lord: 'Mars', occupants: ['Ketu'] },
    { house_num: 8, sign: 'Taurus', sign_num: 2, degree: 14.32, lord: 'Venus', occupants: [] },
    { house_num: 9, sign: 'Gemini', sign_num: 3, degree: 14.32, lord: 'Mercury', occupants: [] },
    { house_num: 10, sign: 'Cancer', sign_num: 4, degree: 14.32, lord: 'Moon', occupants: [] },
    { house_num: 11, sign: 'Leo', sign_num: 5, degree: 14.32, lord: 'Sun', occupants: [] },
    { house_num: 12, sign: 'Virgo', sign_num: 6, degree: 14.32, lord: 'Mercury', occupants: ['Mercury'] },
  ],
  
  dasha: {
    mahadasha: 'Jupiter',
    antardasha: 'Saturn',
    pratyantardasha: 'Mercury',
    current_mahadasha: 'Jupiter',
    current_antardasha: 'Saturn',
    start_date: '2023-04-12',
    end_date: '2025-10-24',
    balance_at_birth: 'Jupiter 11 Years 4 Months',
    timeline: [
      { lord: 'Jupiter', start: '2016-10-24', end: '2032-10-24', sub_dashas: [
        { lord: 'Jupiter', start: '2016-10', end: '2018-12' },
        { lord: 'Saturn', start: '2018-12', end: '2021-07' },
        { lord: 'Mercury', start: '2021-07', end: '2023-10' },
        { lord: 'Ketu', start: '2023-10', end: '2024-09' },
        { lord: 'Venus', start: '2024-09', end: '2027-05', is_current: true },
        { lord: 'Sun', start: '2027-05', end: '2028-03' },
        { lord: 'Moon', start: '2028-03', end: '2029-07' },
        { lord: 'Mars', start: '2029-07', end: '2030-06' },
        { lord: 'Rahu', start: '2030-06', end: '2032-10' },
      ]},
      { lord: 'Saturn', start: '2032-10-24', end: '2051-10-24' },
      { lord: 'Mercury', start: '2051-10-24', end: '2068-10-24' },
    ],
  },
  
  divisional_charts: {
    d1: {
      chart_type: 'D1 - Rashi Chart (Natal Blueprint)',
      ascendant: { sign: 'Libra', degree: 14.32 },
      planets: [
        { name: 'Sun', sign: 'Libra', house: 1, degree: 6.85, isRetrograde: false },
        { name: 'Moon', sign: 'Libra', house: 1, degree: 28.12, isRetrograde: false },
        { name: 'Mars', sign: 'Scorpio', house: 2, degree: 12.45, isRetrograde: false },
        { name: 'Mercury', sign: 'Virgo', house: 12, degree: 24.18, isRetrograde: false },
        { name: 'Jupiter', sign: 'Scorpio', house: 2, degree: 18.30, isRetrograde: false },
        { name: 'Venus', sign: 'Libra', house: 1, degree: 15.60, isRetrograde: false },
        { name: 'Saturn', sign: 'Aquarius', house: 5, degree: 25.10, isRetrograde: true },
        { name: 'Rahu', sign: 'Libra', house: 1, degree: 2.15, isRetrograde: true },
        { name: 'Ketu', sign: 'Aries', house: 7, degree: 2.15, isRetrograde: true },
      ]
    },
    d9: {
      chart_type: 'D9 - Navamsha (Dharma & Relationships)',
      ascendant: { sign: 'Gemini', degree: 8.40 },
      planets: [
        { name: 'Sun', sign: 'Gemini', house: 1, degree: 1.10, isRetrograde: false },
        { name: 'Moon', sign: 'Gemini', house: 1, degree: 12.30, isRetrograde: false },
        { name: 'Mars', sign: 'Cancer', house: 2, degree: 22.10, isRetrograde: false },
        { name: 'Mercury', sign: 'Taurus', house: 12, degree: 14.50, isRetrograde: false },
        { name: 'Jupiter', sign: 'Pisces', house: 10, degree: 15.00, isRetrograde: false },
        { name: 'Venus', sign: 'Aquarius', house: 9, degree: 19.40, isRetrograde: false },
        { name: 'Saturn', sign: 'Libra', house: 5, degree: 16.20, isRetrograde: true },
        { name: 'Rahu', sign: 'Gemini', house: 1, degree: 9.00, isRetrograde: true },
        { name: 'Ketu', sign: 'Sagittarius', house: 7, degree: 9.00, isRetrograde: true },
      ]
    },
    d10: {
      chart_type: 'D10 - Dashamsha (Career & Public Power)',
      ascendant: { sign: 'Leo', degree: 19.50 },
      planets: [
        { name: 'Sun', sign: 'Aries', house: 9, degree: 8.50, isRetrograde: false },
        { name: 'Moon', sign: 'Cancer', house: 12, degree: 11.20, isRetrograde: false },
        { name: 'Mars', sign: 'Capricorn', house: 6, degree: 4.10, isRetrograde: false },
        { name: 'Mercury', sign: 'Gemini', house: 11, degree: 21.00, isRetrograde: false },
        { name: 'Jupiter', sign: 'Sagittarius', house: 5, degree: 18.00, isRetrograde: false },
        { name: 'Venus', sign: 'Pisces', house: 8, degree: 16.30, isRetrograde: false },
        { name: 'Saturn', sign: 'Taurus', house: 10, degree: 22.40, isRetrograde: true },
        { name: 'Rahu', sign: 'Virgo', house: 2, degree: 14.10, isRetrograde: true },
        { name: 'Ketu', sign: 'Pisces', house: 8, degree: 14.10, isRetrograde: true },
      ]
    }
  },
  
  yogas: [
    {
      name: 'Malavya Mahapurusha Yoga',
      category: 'Pancha Mahapurusha',
      benefic: true,
      description: 'Venus resides in its own sign (Libra) in Kendra (1st House). Grants charisma, artistic refinement, luxury, and magnetic public appeal.',
      strength: '95%'
    },
    {
      name: 'Dhana Yoga (Wealth Nexus)',
      category: 'Prosperity',
      benefic: true,
      description: 'Mars (2nd Lord) and Jupiter (3rd/6th Lord) conjunct in the 2nd House of accumulated wealth and lineage speech.',
      strength: '88%'
    },
    {
      name: 'Neechabhanga Raja Yoga',
      category: 'Raja Yoga',
      benefic: true,
      description: 'Debilitated Sun in 1st house is cancelled and elevated by the presence of exalted Venus and dispositor strength in Lagna.',
      strength: '82%'
    },
    {
      name: 'Budhaditya Yoga (Partial)',
      category: 'Intellectual',
      benefic: true,
      description: 'Sun and Mercury mutually aspecting, producing razor-sharp strategic analytical acumen.',
      strength: '76%'
    },
  ],
  
  doshas: [
    {
      name: 'Mangal Dosha (Mild)',
      category: 'Mars Affliction',
      present: false,
      severity: 'Low / Cancelled',
      description: 'Mars in 2nd house from Lagna in own sign of Scorpio. Due to Swakshetra placement, the malefic influence is pacified.',
    },
    {
      name: 'Kaal Sarp Dosha',
      category: 'Nodal Enclosure',
      present: false,
      severity: 'None',
      description: 'Planets are distributed on both sides of the Rahu-Ketu axis, freeing the chart from Kaal Sarp bondage.',
    },
    {
      name: 'Pitri Dosha',
      category: 'Ancestral Karma',
      present: true,
      severity: 'Moderate',
      description: 'Sun conjunct Rahu in 1st house indicates subtle ancestral debts regarding paternal lineage; remedied by Surya Arghya.',
    }
  ],
  
  remedies: [
    {
      category: 'Gemstones (Ratna Shastra)',
      title: 'White Zircon or Natural Diamond',
      deity: 'Shukra Dev',
      day: 'Friday morning during Shukla Paksha',
      description: 'Wear 4-6 carats in silver or white gold on the middle or ring finger to amplify Venusian Lagna vitality.',
    },
    {
      category: 'Vedic Mantras (Japa Yoga)',
      title: 'Shukra Beej Mantra & Gayatri',
      deity: 'Goddess Mahalakshmi',
      count: '108 repetitions daily at sunrise',
      description: 'Om Dram Dreem Droum Sah Shukraya Namaha — stabilizes emotional turbulence and harmonizes marital destiny.',
    },
    {
      category: 'Dana & Seva (Charity)',
      title: 'Feed Cows & Donate White Grains',
      day: 'Every Friday',
      description: 'Offering cooked rice, milk, or green fodder to cows alleviates Rahu-Venus friction in the first house.',
    },
    {
      category: 'Yantra & Rituals',
      title: 'Shree Yantra Worship',
      day: 'Daily morning meditation',
      description: 'Meditate upon a consecrated brass Shree Yantra to harmonize 1st House stellium energies.',
    }
  ],
  
  gochar: {
    calculated_at: new Date().toISOString(),
    ascendant: { sign: 'Aries', degree: 21.4 },
    planets: [
      { name: 'Sun', sign: 'Aquarius', degree: 18.2, house: 11, isRetrograde: false },
      { name: 'Moon', sign: 'Gemini', degree: 4.8, house: 3, isRetrograde: false },
      { name: 'Mars', sign: 'Gemini', degree: 28.1, house: 3, isRetrograde: false },
      { name: 'Mercury', sign: 'Aquarius', degree: 29.4, house: 11, isRetrograde: false },
      { name: 'Jupiter', sign: 'Taurus', degree: 16.5, house: 2, isRetrograde: false },
      { name: 'Venus', sign: 'Pisces', degree: 12.0, house: 12, isRetrograde: false },
      { name: 'Saturn', sign: 'Aquarius', degree: 14.3, house: 11, isRetrograde: false },
      { name: 'Rahu', sign: 'Pisces', degree: 8.4, house: 12, isRetrograde: true },
      { name: 'Ketu', sign: 'Virgo', degree: 8.4, house: 6, isRetrograde: true },
    ]
  }
};

export const MOCK_INTERPRETATIONS = {
  1: `### Core Astrological Archetype: The Diplomatic Luminary (Libra Ascendant)

#### I. Foundational Ascendant Architecture
Your physical vessel and mental matrix are anchored in **Libra (*Tula Rashi*)** at **14°32'** under the aerodynamic mastery of **Swati Nakshatra**, ruled by the shadow node Rahu. 

* **The Cardinal Air Element:** Endows you with an innate judicial equilibrium, aesthetic discernment, and high diplomatic intelligence. You view the cosmos as an interconnected web of social and cosmic relationships.
* **Lagna Lord Venus in 1st House (*Malavya Mahapurusha Yoga*):** Bestows exceptional personal magnetism, cultural eloquence, and an unwavering affinity for harmonic environments.

---

#### II. The 1st House Stellium Dynamics
The convergence of **Sun, Moon, Venus, and Rahu** in your ascendant house creates a profoundly dynamic identity synthesis:
1. **The Sun-Venus Polarity:** While the Sun is technically in its debilitation zone (*Neecha*), Venus provides immediate *Neechabhanga* elevation, transmuting ego fragility into radiant social statesmanship.
2. **The Moon-Rahu Amalgamation:** Accelerates your intuitive sensitivity and visionary instincts, demanding grounding practices to prevent emotional over-analysis.`,

  2: `### Emotional Architecture & Mental Matrix (Chitta & Manas)

#### I. Moon in Vishakha Nakshatra
Your Moon is positioned at **28°12' Libra** in the transformative fourth quarter of **Vishakha Nakshatra**, ruled by Indragni (the combined deities of lightning and fire).

* **Goal-Oriented Resolve:** You possess an inextinguishable determination to accomplish self-chosen objectives. Once your mind commits to a vision, you summon monumental focus.
* **Emotional Dualities:** A constant internal dialogue between contemplative monastic peace and vigorous worldly creation.

---

#### II. Lunar Relationships & Planetary Aspects
* **Jupiter's 2nd House Aspect:** Radiates benevolent wisdom directly upon the emotional mind, ensuring ethical boundaries and mental buoyancy during trials.
* **Retrograde Saturn's Trine from 5th House:** Infuses sober philosophical maturity into your creative self-expression.`,

  3: `### Vocation, Sovereign Power & Public Dharma (Dashamsha / D10 Synthesis)

#### I. The 10th House of Governance & Authority
Your 10th house is presided over by **Cancer (*Karka*)**, indicating that your highest career achievements occur when you lead with empathy, strategic institutional care, and visionary mentorship.

* **D10 Dashamsha Exaltation:** In your career harmonic chart, the **Sun is exalted in Aries (9th House)**, confirming exceptional destiny in advisory, public intellectual, or executive leadership roles.
* **Saturn's Dignity in 10th House of D10:** Signals that enduring professional empire-building solidifies firmly after age 32-34.

---

#### II. Ideal Vocational Arenas
1. **Strategic Consultancy & Global Advisory:** Directing large-scale architecture, legal frameworks, or multilateral negotiations.
2. **Aesthetic & Cultural Leadership:** Curating media, high technology, and refined design platforms.
3. **Intellectual & Spiritual Synthesis:** Publishing, research institutes, and executive mentorship.`,

  4: `### Marriage, Union & Sacred Partnerships (Navamsha / D9 Synthesis)

#### I. The 7th House Axis (Aries-Libra)
The relationship axis is charged by **Ketu in the 7th house (Aries)** directly opposing the **4-planet stellium in the 1st house (Libra)**.

* **Karmic Partnership Dynamics:** You seek a partner who embodies martial independence, spiritual depth, and sovereign self-sufficiency rather than conventional social conformity.
* **Navamsha 7th House (Sagittarius):** Indicates a spouse of philosophical caliber, ethical distinction, and global perspective.

---

#### II. Harmonic Marriage Timing
The ongoing **Jupiter-Venus** and upcoming **Jupiter-Sun** cycles illuminate prime astrological gates for deepening marital fidelity and co-creating shared visionary enterprises.`,

  5: `### Prosperity, Lineage Assets & Dhana Yogas (2nd & 11th House Matrix)

#### I. The Dhana Yoga Powerhouse in 2nd House
Your 2nd house (Scorpio) harbors a formidable conjunction of **Mars (2nd Lord in Swakshetra)** and **Jupiter (Guru of Wealth & Speech)**.

* **Multi-Generational Capital Formation:** This planetary alignment is among the most auspicious *Dhana Yogas* in classical Parashari shastras.
* **Speech as Wealth:** Your words possess persuasive gravitas, directly converting negotiations and communications into sustained tangible equity.

---

#### II. 11th House Gains (*Labha Bhava*)
Ruled by the Sun, your gains house confirms that capital accumulates steadily through institutional credibility and intellectual patents rather than erratic speculative ventures.`,

  6: `### Vitality, Bio-Energetics & Ayur-Astrology

#### I. Elemental Constitution (*Tridosha Analysis*)
* **Primary Dosha:** *Vata-Pitta* predominant. The airy Libra ascendant coupled with fiery Mars in Scorpio necessitates balancing nervous system agitation with grounding rituals.
* **Key Vulnerable Zones:** Renal filtration (Libra/Venus), lower lumbar vitality, and ocular clarity (Sun-Rahu conjunction).

---

#### II. Preventive Regimens
1. **Daily Abhyanga:** Warm sesame oil massage to soothe Vata hyperactivity.
2. **Copper Water Purification:** Drinking water stored in copper vessels at dawn to stabilize Solar vitality.
3. **Nocturnal Screen Discipline:** Pacifying Rahu's over-stimulation of the ocular nerves before sleep.`,

  7: `### Dasha Timeline & Karmic Chronology

#### I. Current Maha-Era: Jupiter Mahadasha (2016 – 2032)
You are traversing the golden expanse of the **16-year Jupiter Mahadasha**, a period governed by expansion, moral authority, wisdom integration, and domestic consolidation.

* **Current Antardasha: Venus Sub-Cycle (2024 – 2027):** 
  * *Theme:* The synthesis of Wisdom (Guru) and Refinement (Shukra).
  * *Forecast:* Peak period for creative masterpieces, public honors, and material prosperity.

---

#### II. Upcoming Era: Saturn Mahadasha (2032 – 2051)
A 19-year epoch centered on institutional legacy, structural perfection, and deep philosophical mentorship.`,

  8: `### Astrological Yogas & Classical Shastric Formations

#### I. Pancha Mahapurusha: Malavya Yoga (95% Purity)
Venus occupies its own moolatrikona domain in the 1st Kendra house, forming the legendary Malavya Yoga.
* *Shastric Promise:* Endows long life, serene poise, peerless aesthetic mastery, and universal goodwill.

#### II. Ruchaka & Dhana Nexus (88% Purity)
Mars strong in the 2nd house grants commanding authority and unshakeable financial resilience.

#### III. Neechabhanga Raja Yoga (82% Purity)
The Sun’s fall in Libra is fully restored by Venus's presence, turning early identity struggles into monumental adult triumph.`,

  9: `### Planetary Dignity & Graha Balas (Shadbala Matrix)

| Graha (Planet) | Sign | House | Dignity Level | Shadbala Ratio | Key Manifestation |
|---|---|---|---|---|---|
| **Surya (Sun)** | Libra | 1st | Debilitated / Elevated | 1.15 | Executive Clarity |
| **Chandra (Moon)** | Libra | 1st | Neutral | 1.35 | High Emotional IQ |
| **Mangala (Mars)** | Scorpio | 2nd | Own Sign (Swakshetra) | 1.48 | Decisive Action |
| **Budha (Mercury)** | Virgo | 12th | Exalted (Uccha) | 1.62 | Abstract Intellect |
| **Guru (Jupiter)** | Scorpio | 2nd | Friendly (Mitra) | 1.42 | Ethical Governance |
| **Shukra (Venus)** | Libra | 1st | Own Sign (Malavya) | 1.74 | Peak Charisma |
| **Shani (Saturn)** | Aquarius | 5th | Moolatrikona | 1.55 | Structural Wisdom |
| **Rahu** | Libra | 1st | Friendly | 1.20 | Global Ambition |
| **Ketu** | Aries | 7th | Friendly | 1.10 | Spiritual Detachment |`,

  10: `### Vedic Remedial Protocols (Upayas & Ratna Shastra)

#### I. Ratna Recommendation (Primary Gemstone)
* **Prescribed Gem:** Natural White Diamond (0.75-1.0 ct) or High-Grade White Zircon (4-6 carats).
* **Metal & Setting:** Cast in pure Sterling Silver or Platinum.
* **Consecration Day:** Friday during sunrise in Shukla Paksha, chanted with *Om Shum Shukraya Namaha* (108x).

---

#### II. Mantra Sadhana
* **Daily Gayatri Mantra:** 27 recitations facing East at sunrise.
* **Maha Mrityunjaya Mantra:** For grounding and longevity during Rahu transits.

---

#### III. Dana (Sacred Charity)
* Sponsor grain offerings (unpolished white rice and sugar) to shelters on Friday mornings.`,

  11: `### Soul Evolution, Ishta Devata & Higher Sadhana

#### I. Jaimini Atmakaraka: Surya (The Sun)
Because the Sun holds the highest degree in your chart, your primary soul lesson revolves around **sovereignty without ego**, learning to wield leadership as pure selfless service.

* **Ishta Devata Indicator:** Lord Shiva and Gayatri Mata, illuminating the crown of pure awareness.
* **Dharmic Horizon:** Transcending superficial societal acclaim to build enduring institutions that illuminate collective human consciousness.`
};

export const MOCK_CHARTS_LIST = [
  {
    chart_id: 'mock-arjun-chart-108',
    full_name: 'Arjun Sharma',
    date_of_birth: '1995-10-24',
    time_of_birth: '06:45:00',
    city_of_birth: 'Varanasi, UP, India',
    ascendant_sign: 'Libra',
    moon_sign: 'Libra',
    nakshatra: 'Vishakha',
    language: 'english',
    created_at: '2026-01-15T08:30:00Z',
  },
  {
    chart_id: 'mock-priya-chart-204',
    full_name: 'Priya Mukherjee',
    date_of_birth: '1998-04-14',
    time_of_birth: '14:20:00',
    city_of_birth: 'Kolkata, WB, India',
    ascendant_sign: 'Leo',
    moon_sign: 'Scorpio',
    nakshatra: 'Anuradha',
    language: 'bengali',
    created_at: '2026-02-10T11:15:00Z',
  },
  {
    chart_id: 'mock-rohit-chart-309',
    full_name: 'Rohit Verma',
    date_of_birth: '1991-12-08',
    time_of_birth: '22:10:00',
    city_of_birth: 'Jaipur, Rajasthan, India',
    ascendant_sign: 'Cancer',
    moon_sign: 'Sagittarius',
    nakshatra: 'Moola',
    language: 'hindi',
    created_at: '2026-02-28T16:40:00Z',
  }
];

export const MOCK_CHAT_HISTORY = [
  {
    id: 'msg-1',
    sender: 'user',
    text: 'What does my 1st House stellium in Libra say about my life purpose and career?',
    timestamp: '2026-09-06T12:00:00Z',
  },
  {
    id: 'msg-2',
    sender: 'ai',
    text: `Your 1st house stellium in Libra (Sun, Moon, Venus, Rahu) is the central astrological axis of your existence. 

1. **Malavya Yoga with Venus:** Because Venus is in its own sign in the 1st house, you naturally exude harmony, creative diplomacy, and high social intelligence.
2. **Atmakaraka Sun Elevation:** While the Sun is initially in Libra, Venus provides *Neechabhanga* cancellation, giving you the rare ability to lead with humility while commanding institutional respect.
3. **Career Synthesis:** In your D10 Dashamsha, the Sun is exalted in Aries. You are destined to act as a bridge-builder—harmonizing complex teams, executive consulting, or steering high-impact cultural and technical ventures.`,
    timestamp: '2026-09-06T12:00:05Z',
  }
];
