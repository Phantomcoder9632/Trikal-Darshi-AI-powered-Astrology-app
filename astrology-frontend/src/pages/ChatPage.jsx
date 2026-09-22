import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import {
  getChart,
  streamChatResponse,
  getChatHistory,
} from '../services/api';
import { formatInterpretationText } from '../components/formatters';
import { i18nLangToBackend } from '../i18n';
import { useTranslation } from 'react-i18next';
import { ShimmerSkeleton } from '../components/StatusBanners';

export default function ChatPage() {
  const { chartId } = useParams();
  const navigate = useNavigate();
  const { i18n } = useTranslation();

  const [chartData, setChartData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chartError, setChartError] = useState('');

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
    if (chartId) {
      setChartError('');
      getChart(chartId)
        .then((data) => {
          setChartData(data);
          return getChatHistory(chartId).then((history) => ({ data, history }));
        })
        .then(({ data, history }) => {
          if (history && history.length > 0) {
            setMessages(history);
          } else {
            setMessages([
              {
                id: 'welcome-msg',
                sender: 'ai',
                text: `✦ **Hari Om.** I am your **Trikal Darshi Astrological Synthesizer**.\n\nI have calculated your complete birth matrix (**${data?.ascendant?.sign || '—'} Ascendant**, **${data?.dasha?.mahadasha || '—'} Mahadasha**). Ask me any question regarding your career, relationship dynamics, financial yogas, or remedial protocols.`,
                timestamp: new Date().toISOString(),
              },
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
        });
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

  // Chart-first access: /chat without a chartId has no astrological context.
  // The route already redirects, but this guards direct renders too.
  if (!chartId) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="w-full min-h-screen bg-[#FBF6EA] text-[#0E1A37] flex flex-col font-['Inter',sans-serif]">
      {/* Top Header */}
      <header className="sticky top-0 z-50 w-full bg-[#FFFDF6]/95 backdrop-blur-md border-b border-[#E8D5A7]/70 shadow-xs">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
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

          </div>
        </div>
      </header>

      {/* Main Chat Workspace — locked to the chart in the URL (no switcher sidebar) */}
      <div className="max-w-[1440px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex-1 flex flex-col items-stretch gap-6">
        {/* CENTRAL CHAT CONTAINER */}
        <main className="w-full bg-[#FFFDF6] border border-[#1F3A6B]/15 rounded-xl shadow-xs flex flex-col h-[calc(100vh-140px)] min-h-[500px]">
          {/* Chat Messages Log */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {chartError && (
              <div className="max-w-md mx-auto bg-[#FFF4F2] border border-[#BA1A1A]/30 text-[#93000A] rounded-xl p-4 text-center">
                <span className="material-symbols-outlined text-[24px]">cloud_off</span>
                <p className="text-xs font-semibold mt-1.5">Chart Unavailable</p>
                <p className="text-xs mt-1 leading-relaxed">{chartError}</p>
                <button
                  type="button"
                  onClick={() => navigate(`/dashboard/${chartId}`)}
                  className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#BA1A1A] hover:bg-[#93000A] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">arrow_back</span>
                  <span>Back to Dashboard</span>
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
            {messages.length <= 1 && (
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {PROMPT_CATEGORIES.flatMap((c) => c.prompts).slice(0, 3).map((prompt, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    disabled={isTyping}
                    onClick={() => handleSend(prompt)}
                    className="text-[11px] px-2.5 py-1 bg-[#FFFDF6] hover:bg-[#F5EEDD] border border-[#1F3A6B]/15 hover:border-[#D9A63C] text-[#022454] rounded-full transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    ✦ {prompt}
                  </button>
                ))}
              </div>
            )}
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
