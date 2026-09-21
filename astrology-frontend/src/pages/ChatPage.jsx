import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  getChart,
  streamChatResponse,
  getChatHistory,
  getUserCharts,
} from '../services/api';
import { formatInterpretationText } from '../components/formatters';
import { backendLangToI18n, i18nLangToBackend } from '../i18n';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { ShimmerSkeleton } from '../components/StatusBanners';

export default function ChatPage() {
  const { chartId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { t, i18n } = useTranslation();

  const [chartData, setChartData] = useState(null);
  const [userCharts, setUserCharts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loadingChart, setLoadingChart] = useState(false);
  const [chartError, setChartError] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Categorized Quick Prompts
  const PROMPT_CATEGORIES = [
    {
      category: 'Career & D10',
      icon: 'work',
      prompts: [
        'When is a favorable time for a career change or promotion?',
        'What career path best aligns with my 10th house and Dashamsha?',
        'How does my current Mahadasha affect my profession right now?',
      ],
    },
    {
      category: 'Love & Marriage',
      icon: 'favorite',
      prompts: [
        'What does my D9 Navamsha say about my future spouse and union timing?',
        'Are there any marital doshas (like Mangal Dosha) in my chart?',
        'How can I improve harmony in my current relationship?',
      ],
    },
    {
      category: 'Wealth & Assets',
      icon: 'account_balance',
      prompts: [
        'What are the strongest Dhana Yogas in my Kundali?',
        'Is the current period favorable for property or business investments?',
        'What is the primary wealth-building planetary placement in my chart?',
      ],
    },
    {
      category: 'Remedies & Mantras',
      icon: 'self_improvement',
      prompts: [
        'What are the top 3 practical Lal Kitab remedies I should practice?',
        'Which gemstone or mantra is most beneficial for my Lagna lord?',
        'What daily spiritual sadhana will stabilize my active dasha period?',
      ],
    },
  ];

  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (isAuthenticated) {
      getUserCharts()
        .then((charts) => setUserCharts(charts || []))
        .catch((err) => console.warn('ChatPage: Could not load user charts:', err));
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (chartId) {
      setLoadingChart(true);
      setChartError('');
      getChart(chartId)
        .then((data) => {
          setChartData(data);
          return getChatHistory(chartId);
        })
        .then((history) => {
          if (history && history.length > 0) {
            setMessages(history);
          } else {
            setMessages([
              {
                id: 'welcome-msg',
                sender: 'ai',
                text: `✦ **Hari Om.** I am your **Trikal Darshi Astrological Synthesizer**.\n\nI have calculated your complete birth matrix (**${chartData?.ascendant?.sign || '—'} Ascendant**, **${chartData?.dasha?.mahadasha || '—'} Mahadasha**). Ask me any question regarding your career, relationship dynamics, financial yogas, or remedial protocols.`,
                timestamp: new Date().toISOString(),
              }
            ]);
          }
        })
        .catch((err) => {
          console.error('Error initializing chat:', err);
          if (err.response?.status === 401) {
            navigate('/', { replace: true });
            return;
          }
          setChartError(
            err.response?.data?.detail ||
              'Unable to load this chart from the astrological server. Please return to your saved charts and try again.'
          );
        })
        .finally(() => setLoadingChart(false));
    } else {
      // No chart selected: show an HONEST empty state. The old behavior fetched
      // (The old behavior fabricated a sample chart and claimed the user's
      // parameters were synced — removed.)
      // misleading in every mode.
      setChartData(null);
      setMessages([]);
    }
  }, [chartId]);

  const handleSend = async (customPrompt) => {
    const textToSend = (customPrompt || inputVal).trim();
    if (!textToSend || isTyping) return;

    const userMsgId = 'usr-' + Date.now();
    const aiMsgId = 'ai-' + (Date.now() + 1);

    const newMessages = [
      ...messages,
      { id: userMsgId, sender: 'user', text: textToSend, timestamp: new Date().toISOString() },
      { id: aiMsgId, sender: 'ai', text: '', timestamp: new Date().toISOString() },
    ];

    setMessages(newMessages);
    setInputVal('');
    setIsTyping(true);

    try {
      const activeLanguage = chartData?.language || i18nLangToBackend(i18n.language) || 'english';
      await streamChatResponse(
        textToSend,
        chartId || null, // no fake IDs cross the API boundary; backend accepts null
        messages,
        userMsgId,
        aiMsgId,
        (chunk) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMsgId ? { ...msg, text: msg.text + chunk } : msg
            )
          );
        },
        activeLanguage
      );
    } catch (err) {
      console.error('Chat streaming failed:', err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId
            ? { ...msg, text: msg.text || 'Unable to connect to the astrological synthesizer. Please try again.' }
            : msg
        )
      );
    } finally {
      setIsTyping(false);
      if (textareaRef.current) textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#FBF6EA] text-[#0E1A37] flex flex-col font-['Inter',sans-serif]">
      {/* Top Header */}
      <header className="sticky top-0 z-50 w-full bg-[#FFFDF6]/95 backdrop-blur-md border-b border-[#E8D5A7]/70 shadow-xs">
        <div className="max-w-[1580px] mx-auto px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-9 h-9 rounded-lg bg-[#1F3A6B] text-[#FFFDF6] flex items-center justify-center font-['Fraunces',serif] text-lg font-bold shadow-xs cursor-pointer hover:bg-[#022454] transition-colors border border-[#D9A63C]/40"
            >
              ✦
            </button>
            <div>
              <span className="font-['Fraunces',serif] text-base sm:text-lg font-bold text-[#022454] tracking-tight block">
                AskAI Astrological Synthesizer
              </span>
              <span className="text-[10px] text-[#7b5800] uppercase tracking-wider font-semibold">
                Tri-Focal Ephemeris Engine
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {chartId && (
              <button
                type="button"
                onClick={() => navigate(`/dashboard/${chartId}`)}
                className="px-3.5 py-1.5 bg-[#FFFDF6] hover:bg-[#F5EEDD] border border-[#E8D5A7] text-[#1F3A6B] text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-all"
              >
                <span className="material-symbols-outlined text-[16px] text-[#D9A63C]">dashboard</span>
                <span className="hidden sm:inline">Return to Dashboard</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="hidden sm:inline-flex px-3.5 py-1.5 bg-[#FFFDF6] hover:bg-[#F5EEDD] border border-[#E8D5A7] text-[#1F3A6B] text-xs font-semibold rounded-lg shadow-xs items-center gap-1.5 transition-all"
              title="Your Profile"
            >
              <span className="material-symbols-outlined text-[16px] text-[#D9A63C]">person</span>
              <span>Profile</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 rounded text-[#4A567A] hover:text-[#0E1A37] border border-[#E8D5A7] hover:bg-[#FFFDF6] lg:hidden"
              title="Toggle Sidebar"
            >
              <span className="material-symbols-outlined text-[20px]">
                {isSidebarOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Chat Workspace */}
      <div className="max-w-[1580px] mx-auto w-full px-4 sm:px-6 lg:px-10 py-6 flex-1 flex flex-col lg:flex-row items-start gap-6">
        {/* LEFT SIDEBAR */}
        <aside
          className={`w-full lg:w-80 flex-shrink-0 flex flex-col gap-4 ${
            isSidebarOpen ? 'block' : 'hidden lg:flex'
          }`}
        >
          {/* Active Profile Card */}
          <div className="bg-[#FFFDF6] border border-[#1F3A6B]/15 rounded-xl p-4 shadow-xs">
            <div className="flex items-start justify-between pb-3 border-b border-[#1F3A6B]/10">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-[#1F3A6B] text-[#FFFDF6] font-['Fraunces',serif] font-bold text-sm flex items-center justify-center">
                  {chartData?.full_name ? chartData.full_name.slice(0, 2).toUpperCase() : 'AS'}
                </div>
                <div>
                  <h3 className="font-bold text-xs text-[#022454] leading-tight">
                    {chartData?.full_name || 'Arjun Sharma'}
                  </h3>
                  <p className="text-[10px] text-[#4A567A] mt-0.5">
                    {chartData?.city_of_birth || 'Varanasi, UP, India'}
                  </p>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                  chartId
                    ? 'bg-[#FBF5E5] text-[#7b5800] border-[#D9A63C]/40'
                    : 'bg-[#F4EEDA] text-[#8C6718] border-[#D9A63C]/40'
                }`}
              >
                {chartId ? 'Natal Sync' : 'No Chart Selected'}
              </span>
            </div>

            {/* Core Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 pt-3">
              <div className="bg-[#FBF6EA] rounded p-2 border border-[#1F3A6B]/10">
                <span className="text-[9px] uppercase font-bold text-[#4A567A] block">Lagna Sign</span>
                <span className="font-bold text-xs text-[#022454]">
                  {chartData?.ascendant?.sign || 'Libra'} {chartData?.ascendant?.degree ? `${Math.floor(chartData.ascendant.degree)}°` : ''}
                </span>
                <span className="text-[9px] text-[#7b5800] block">{chartData?.ascendant?.nakshatra || 'Swati'}</span>
              </div>

              <div className="bg-[#FBF6EA] rounded p-2 border border-[#1F3A6B]/10">
                <span className="text-[9px] uppercase font-bold text-[#4A567A] block">Active Dasha</span>
                <span className="font-bold text-xs text-[#022454]">
                  {chartData?.dasha?.mahadasha || 'Jupiter'} · {chartData?.dasha?.antardasha || 'Venus'}
                </span>
                <span className="text-[9px] text-[#7b5800] block">Vimshottari Era</span>
              </div>
            </div>
          </div>

          {/* Quick Guidance Questions */}
          <div className="bg-[#FFFDF6] border border-[#1F3A6B]/15 rounded-xl p-4 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#022454] flex items-center gap-1.5 mb-3">
              <span className="material-symbols-outlined text-[16px] text-[#D9A63C]">psychology</span>
              <span>Guidance Catalog</span>
            </span>

            <div className="flex flex-col gap-3 max-h-[380px] overflow-y-auto pr-1">
              {PROMPT_CATEGORIES.map((cat, idx) => (
                <div key={idx} className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-[#7b5800] uppercase tracking-wide flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">{cat.icon}</span>
                    <span>{cat.category}</span>
                  </span>
                  {cat.prompts.map((prompt, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      disabled={isTyping}
                      onClick={() => handleSend(prompt)}
                      className="text-left text-[11px] p-2 bg-[#FBF6EA] hover:bg-[#F5EEDD] border border-[#1F3A6B]/10 hover:border-[#D9A63C] text-[#0E1A37] rounded transition-all leading-snug cursor-pointer disabled:opacity-50"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* CENTRAL CHAT CONTAINER */}
        <main className="flex-1 w-full bg-[#FFFDF6] border border-[#1F3A6B]/15 rounded-xl shadow-xs flex flex-col h-[calc(100vh-140px)] min-h-[500px]">
          {/* Chat Messages Log */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {!chartId && messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center gap-4 py-12">
                <span className="w-14 h-14 rounded-2xl bg-[#FBF5E5] border border-[#D9A63C]/40 text-[#D9A63C] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[28px]">auto_awesome</span>
                </span>
                <div className="max-w-sm">
                  <h3 className="font-['Fraunces',serif] text-lg font-bold text-[#022454]">
                    Select a birth chart to begin your inquiry
                  </h3>
                  <p className="text-xs text-[#4A567A] mt-2 leading-relaxed">
                    The AI astrologer reads your planetary alignments, dasha cycles, and divisional charts —
                    so it needs an active chart first. Create one, or pick an existing profile.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 mt-1">
                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1F3A6B] hover:bg-[#022454] text-[#F0DFAF] text-xs font-bold rounded-lg border border-[#D9A63C]/40 shadow-xs transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px] text-[#D9A63C]">add_circle</span>
                    <span>Create New Chart</span>
                  </button>
                  {userCharts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => navigate(`/chat/${userCharts[0].chart_id || userCharts[0].id}`)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#F4EEDA] hover:bg-[#EAE2C8] text-[#16223F] text-xs font-semibold rounded-lg border border-[#D9A63C]/40 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[15px] text-[#8C6718]">folder_special</span>
                      <span>Use “{userCharts[0].full_name}”</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {chartError && (
              <div className="max-w-md mx-auto bg-[#FFF4F2] border border-[#BA1A1A]/30 text-[#93000A] rounded-xl p-4 text-center">
                <span className="material-symbols-outlined text-[24px]">cloud_off</span>
                <p className="text-xs font-semibold mt-1.5">Chart Unavailable</p>
                <p className="text-xs mt-1 leading-relaxed">{chartError}</p>
                <button
                  type="button"
                  onClick={() => navigate('/charts')}
                  className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#BA1A1A] hover:bg-[#93000A] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">arrow_back</span>
                  <span>Back to Saved Charts</span>
                </button>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && (
                  <div className="w-8 h-8 rounded bg-[#1F3A6B] text-[#FFFDF6] text-xs font-bold flex items-center justify-center shrink-0 mt-1 shadow-xs">
                    ✦
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-lg p-4 text-xs sm:text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-[#1F3A6B] text-[#FFFDF6] shadow-xs'
                      : 'bg-[#FBF6EA] text-[#0E1A37] border border-[#1F3A6B]/10 shadow-xs'
                  }`}
                >
                  {msg.sender === 'user' ? (
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  ) : (
                    <div className="prose-interpretation">
                      {formatInterpretationText(msg.text)}
                    </div>
                  )}
                  <span
                    className={`block text-[9px] mt-1.5 font-mono ${
                      msg.sender === 'user' ? 'text-white/60 text-right' : 'text-[#4A567A]'
                    }`}
                  >
                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-8 h-8 rounded bg-[#F5EEDD] border border-[#1F3A6B]/20 text-[#022454] text-xs font-bold flex items-center justify-center shrink-0 mt-1">
                    {chartData?.full_name ? chartData.full_name.slice(0, 1).toUpperCase() : 'U'}
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3 justify-start items-start">
                <div className="w-8 h-8 rounded bg-[#1F3A6B] text-[#FFFDF6] text-xs font-bold flex items-center justify-center shrink-0 mt-1">
                  ✦
                </div>
                <div className="flex-1 max-w-[85%]">
                  {/* Shimmer signals the AI reply is actively streaming in */}
                  <div className="bg-[#FBF6EA] border border-[#1F3A6B]/10 rounded-lg p-3">
                    <ShimmerSkeleton lines={4} />
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#7b5800] mt-1 font-semibold">
                    <span className="material-symbols-outlined text-[13px] animate-spin">progress_activity</span>
                    <span>Synthesizing Shastric positions…</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Box */}
          <div className="p-3 sm:p-4 border-t border-[#1F3A6B]/12 bg-[#FBF6EA]/60 rounded-b-xl">
            <div className="relative flex items-end gap-2 bg-[#FFFDF6] border border-[#1F3A6B]/20 rounded-lg p-2 focus-within:border-[#1F3A6B] shadow-inner transition-colors">
              <textarea
                ref={textareaRef}
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={!chartId}
                placeholder={
                  chartId
                    ? 'Ask about your Dasha timing, relationship harmony, career vargas, or remedies…'
                    : 'Select a birth chart above to activate the astrological synthesizer…'
                }
                rows={2}
                className="flex-1 bg-transparent text-xs sm:text-sm text-[#0E1A37] placeholder-[#4A567A]/60 resize-none focus:outline-none max-h-32 disabled:opacity-60"
              />

              <button
                type="button"
                disabled={!inputVal.trim() || isTyping || !chartId}
                onClick={() => handleSend()}
                className="px-4 py-2 bg-[#1F3A6B] hover:bg-[#12244A] text-[#FFFDF6] border border-[#D9A63C] rounded font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-40 cursor-pointer"
              >
                <span>Synthesize</span>
                <span className="material-symbols-outlined text-[14px] text-[#D9A63C]">send</span>
              </button>
            </div>
            <div className="flex items-center justify-between text-[10px] text-[#4A567A] px-1 pt-1.5">
              <span>Press <strong>Enter</strong> to send, <strong>Shift + Enter</strong> for line break</span>
              <span>Vedic Lahiri Coordinate Parity</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
