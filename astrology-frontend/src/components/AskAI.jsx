import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { getChart } from '../services/api';

const QUICK_PROMPTS = [
  { text: '✨ Tell me about my current Dasha period', tag: 'dasha' },
  { text: '💼 How is my career path looking?', tag: 'career' },
  { text: '❤️ What does my chart say about relationships?', tag: 'relationship' },
  { text: '🌿 Recommend some personalized remedies', tag: 'remedies' }
];

export default function AskAI() {
  const [isOpen, setIsOpen] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chartData, setChartData] = useState(null);

  const messagesEndRef = useRef(null);
  const location = useLocation();

  // Extract chartId if the user is on the dashboard
  const match = location.pathname.match(/^\/dashboard\/([^/]+)/);
  const chartId = match ? match[1] : null;

  // Fetch chart details if chartId changes, to customize responses
  useEffect(() => {
    if (chartId) {
      getChart(chartId)
        .then((data) => {
          setChartData(data);
        })
        .catch((err) => {
          console.warn('AskAI: Could not load chart details for helper:', err);
        });
    } else {
      setChartData(null);
    }
  }, [chartId]);

  // Set up 30-second reminder animation
  useEffect(() => {
    // Show prompt initially after 10s
    const initialTimeout = setTimeout(() => {
      if (!isOpen) {
        setShowPrompt(true);
        setTimeout(() => setShowPrompt(false), 6000);
      }
    }, 10000);

    // Show prompt every 30s
    const interval = setInterval(() => {
      if (!isOpen) {
        setShowPrompt(true);
        setTimeout(() => setShowPrompt(false), 6000);
      }
    }, 30000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [isOpen]);

  // Initialize greeting message when chat opens or chart changes
  useEffect(() => {
    if (isOpen) {
      const seekerName = chartData?.full_name || 'Seeker';
      const welcomeMsg = chartData
        ? `Greetings, ${seekerName}. I am your Trikal AI Guide. I have aligned with your birth chart details (born in ${chartData.city_of_birth || 'your birth city'} on ${chartData.date_of_birth || 'your birth date'}). Ask me about your planets, career, relationships, current dashas, or Lal Kitab remedies!`
        : `Greetings, Seeker. I am your Trikal AI Guide. Generate your Cosmic Blueprint or log in to ask details about your charts. For now, you can ask general questions about Vedic Astrology, Lal Kitab, or Numerology!`;

      setMessages([
        {
          id: 'welcome',
          sender: 'ai',
          text: welcomeMsg,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, [isOpen, chartData]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = (text) => {
    if (!text.trim()) return;

    // Add user message
    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      setIsTyping(false);
      const aiResponseText = generateMockResponse(text, chartData);
      const aiMsg = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiResponseText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, aiMsg]);
    }, 1800);
  };

  const generateMockResponse = (text, data) => {
    const cleanText = text.toLowerCase();
    const seekerName = data?.full_name || 'Seeker';

    if (cleanText.includes('dasha') || cleanText.includes('period') || cleanText.includes('mahadasha') || cleanText.includes('antardasha')) {
      if (data?.dasha) {
        return `✦ **Planetary Alignment Period** ✦\n\nSeeker ${seekerName}, your matrix shows you are currently traversing the **${data.dasha.mahadasha || 'N/A'} Mahadasha** and **${data.dasha.antardasha || 'N/A'} Antardasha**.\n\n* **Mahadasha Lord Influence:** This planet acts as your prime motivator and governor of life currents right now, steering your focus toward its house placement.\n* **Antardasha Alignment:** The sub-period lord acts as the executor of day-to-day events.\n\n*Cosmic Advice:* Focus on spiritual grounding to align with this energy.`;
      }
      return `✦ **Dasha Cycles** ✦\n\nYour dasha cycle dictates the planetary ruler of your current life era. Generate your birth chart blueprint so I can extract your exact Mahadasha and Antardasha details!`;
    }

    if (cleanText.includes('career') || cleanText.includes('job') || cleanText.includes('work') || cleanText.includes('profession') || cleanText.includes('d10')) {
      const ascSign = data?.ascendant?.sign || 'your ascendant sign';
      return `✦ **Professional Blueprint (D10 / Dashamsha)** ✦\n\nLooking into your vocational matrix:\n\n* **Primary Driver:** Your career is governed by the 10th house. With a ${ascSign} baseline, your professional drive is anchored in self-expression and discipline.\n* **Divisional D10 Alignment:** Your D10 Dashamsha indicates that your Saturn placement plays a critical role in structuring your professional growth.\n\n*Recommendation:* Avoid impulsive career shifts during retrograde transits. Cultivate patience and structure.`;
    }

    if (cleanText.includes('marriage') || cleanText.includes('spouse') || cleanText.includes('love') || cleanText.includes('relationship') || cleanText.includes('partner') || cleanText.includes('d9')) {
      return `✦ **Relational Alignment (D9 / Navamsha)** ✦\n\nSeeker, relationships in your chart are governed by the 7th house and the D9 Navamsha chart:\n\n* **D9 Navamsha Focus:** The Navamsha represents the inner blueprint of your soul's partnerships and second half of life.\n* **Relational Lord:** Venus controls aesthetic harmony, while Jupiter brings wisdom and commitment.\n\n*Cosmic Advice:* Look to align with a partner who respects your spiritual and emotional independence. Check your D9 Venus positioning to identify compatibility indicators.`;
    }

    if (cleanText.includes('remedy') || cleanText.includes('remedies') || cleanText.includes('lal kitab') || cleanText.includes('mantra') || cleanText.includes('gemstone')) {
      return `✦ **Remedy Tripath System** ✦\n\nTo balance the planetary afflictions in your chart, here are the recommendations:\n\n1. **Vedic Mantra:** Recite the Gayatri Mantra or Mahamrityunjaya Mantra daily to boost solar vitality and ward off negativity.\n2. **Lal Kitab Farmaan:** Serve and feed stray dogs (governed by Rahu/Ketu) or offer water to the Sun in a copper vessel in the morning.\n3. **Practical Action:** Keep a silver square piece in your wallet to stabilize lunar energies and emotional clarity.\n\n*Note:* Remedies work through consistent intent and vibration.`;
    }

    if (cleanText.includes('wealth') || cleanText.includes('money') || cleanText.includes('finance') || cleanText.includes('d2')) {
      return `✦ **Financial Abundance & Assets** ✦\n\nYour wealth indicators are governed by the 2nd house (accumulated wealth) and 11th house (gains/income):\n\n* **2nd House Focus:** Controls your family wealth, speech, and resources.\n* **11th House Gains:** Controls how easily you monetize your efforts.\n\n*Cosmic Tip:* Strengthen your Mercury or Jupiter depending on their dignity in your chart to clear blocks in cash flow.`;
    }

    if (cleanText.includes('hello') || cleanText.includes('hi') || cleanText.includes('hey') || cleanText.includes('greetings')) {
      return `Hello ${seekerName}! I am here to help you decipher your planetary alignments. What specific area of your life or chart shall we investigate?`;
    }

    // Default response
    return `✦ **Trikal AI Insights** ✦\n\nThank you for sharing your query. In Vedic Astrology, every planet represents an aspect of consciousness:\n\n* **Ascendant (Lagna):** Represents your physical self and approach to life.\n* **Moon:** Governs your mental peace, emotions, and receptivity.\n* **Sun:** Controls your soul, authority, and health.\n\nAsk me more specifically about **career**, **relationships**, **remedies**, or **current dashas** for tailored interpretations.`;
  };

  return (
    <div className="ask-ai-widget no-print">
      {/* ── Chat Toggle Button ── */}
      <div className="relative">
        {showPrompt && !isOpen && (
          <div className="ask-ai-tooltip">
            <div className="ask-ai-tooltip-content">
              <span>Ask your query! 🔮</span>
              <div className="ask-ai-tooltip-arrow" />
            </div>
          </div>
        )}
        <button
          onClick={() => {
            setIsOpen(!isOpen);
            setShowPrompt(false);
          }}
          className={`ask-ai-toggle-btn ${isOpen ? 'active' : ''} ${showPrompt ? 'pulse-btn' : ''}`}
          aria-label="Toggle Cosmic AI Assistant"
          title="Ask Trikal AI"
        >
          {isOpen ? (
            <span className="material-symbols-outlined text-[24px]">close</span>
          ) : (
            <div className="flex items-center gap-2 px-1">
              <span className="material-symbols-outlined text-[20px] animate-pulse">auto_awesome</span>
              <span className="font-headline-md tracking-wider text-[11px] uppercase font-bold hidden sm:inline">Ask AI</span>
            </div>
          )}
        </button>
      </div>

      {/* ── Slide-over Chat Drawer ── */}
      <div className={`ask-ai-drawer ${isOpen ? 'open' : ''}`}>
        {/* Drawer Header */}
        <div className="ask-ai-drawer-header">
          <div className="flex items-center gap-2.5">
            <div className="ask-ai-avatar">
              <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
            </div>
            <div>
              <h3 className="ask-ai-title">Trikal AI Guide</h3>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[9px] uppercase font-bold text-outline tracking-wider">Cosmic Alignment Active</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="ask-ai-close-btn"
            aria-label="Close Chat"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Drawer Body (Chat Window) */}
        <div className="ask-ai-drawer-body">
          <div className="ask-ai-messages-container">
            {messages.map((msg) => (
              <div key={msg.id} className={`ask-ai-message-wrapper ${msg.sender}`}>
                <div className="ask-ai-message-bubble">
                  {/* Parse markdown-like bold/list formats */}
                  <div className="ask-ai-message-text whitespace-pre-wrap leading-relaxed">
                    {msg.text.split('\n').map((line, lIdx) => {
                      // Check for header
                      if (line.startsWith('✦') && line.endsWith('✦')) {
                        return <h4 key={lIdx} className="text-primary font-bold text-xs uppercase tracking-wider my-2 text-center">{line}</h4>;
                      }
                      // Check for bullet list
                      if (line.startsWith('* ')) {
                        const boldSplit = line.substring(2).split('**');
                        return (
                          <div key={lIdx} className="pl-4 relative my-1 text-xs">
                            <span className="absolute left-0 text-primary-container">✦</span>
                            {boldSplit.map((part, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx} className="font-bold text-primary">{part}</strong> : part)}
                          </div>
                        );
                      }
                      // Check for numbered list
                      if (/^\d+\./.test(line)) {
                        const boldSplit = line.split('**');
                        return (
                          <div key={lIdx} className="my-1.5 text-xs">
                            {boldSplit.map((part, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx} className="font-bold text-primary">{part}</strong> : part)}
                          </div>
                        );
                      }
                      // Standard lines with bold segments
                      const boldSplit = line.split('**');
                      return (
                        <p key={lIdx} className="my-1 text-xs">
                          {boldSplit.map((part, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx} className="font-bold text-primary">{part}</strong> : part)}
                        </p>
                      );
                    })}
                  </div>
                  <span className="ask-ai-message-time">{msg.time}</span>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="ask-ai-message-wrapper ai">
                <div className="ask-ai-message-bubble typing">
                  <div className="flex items-center gap-1 py-1">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce delay-100" />
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce delay-200" />
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce delay-300" />
                    <span className="text-[10px] text-outline font-semibold ml-2 italic">Channeling celestial matrices...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Quick Prompts */}
        <div className="ask-ai-quick-prompts">
          <p className="text-[9px] uppercase tracking-wider font-bold text-outline mb-1.5 px-1">Suggested Inquiries</p>
          <div className="flex flex-wrap gap-1.5 max-h-[90px] overflow-y-auto pr-1">
            {QUICK_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(p.text.replace(/^[^\w]*/, ''))}
                className="ask-ai-quick-btn"
              >
                {p.text}
              </button>
            ))}
          </div>
        </div>

        {/* Drawer Footer (Input Form) */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputVal);
          }}
          className="ask-ai-drawer-footer"
        >
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Ask AI your cosmic query..."
            className="ask-ai-input"
            maxLength={250}
          />
          <button
            type="submit"
            disabled={!inputVal.trim()}
            className="ask-ai-send-btn"
            aria-label="Send query"
          >
            <span className="material-symbols-outlined text-[18px]">send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
