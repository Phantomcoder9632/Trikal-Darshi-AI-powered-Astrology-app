import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getChart, streamChatResponse, getChatHistory } from '../services/api';


export default function AskAI() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chartData, setChartData] = useState(null);

  const QUICK_PROMPTS = [
    { text: `🌟 ${t('dashboard_components.chatbot.quick_prompts.career')}`, tag: 'career' },
    { text: `❤️ ${t('dashboard_components.chatbot.quick_prompts.relationship')}`, tag: 'relationship' },
    { text: `💰 ${t('dashboard_components.chatbot.quick_prompts.money')}`, tag: 'money' },
    { text: `🌿 ${t('dashboard_components.chatbot.quick_prompts.remedies')}`, tag: 'remedies' },
  ];

  const messagesEndRef = useRef(null);
  const location = useLocation();

  // Extract chartId if the user is on the dashboard
  const match = location.pathname.match(/^\/dashboard\/([^/]+)/);
  const chartId = match ? match[1] : null;

  // Fetch chart details if chartId changes, to customize responses
  useEffect(() => {
    if (chartId) {
      setChartData(null); // Clear stale chart data immediately on ID change
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
      const initChat = async () => {
        let welcomeMsg;

        if (chartId) {
          if (chartData && chartData.chart_id === chartId) {
            const city = chartData.city_of_birth || t('dashboard_components.chatbot.welcome_named_hometown');
            const dob  = chartData.date_of_birth
              ? new Date(chartData.date_of_birth).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
              : null;
            const seekerName = chartData.full_name ? chartData.full_name.split(' ')[0] : null;

            welcomeMsg = seekerName
              ? t('dashboard_components.chatbot.welcome_named', {
                  name: seekerName,
                  dob: dob ? t('dashboard_components.chatbot.welcome_named_born', { dob }) : '',
                  city,
                })
              : t('dashboard_components.chatbot.welcome_loaded');
          } else {
            welcomeMsg = t('dashboard_components.chatbot.welcome_loading');
          }
        } else {
          welcomeMsg = t('dashboard_components.chatbot.welcome_guest');
        }

        const welcomeObj = {
          id: 'welcome',
          sender: 'ai',
          text: welcomeMsg,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        if (chartId) {
          if (chartData && chartData.chart_id === chartId) {
            const currentParamsKey = `askai-params-${chartId}`;
            const savedParams = sessionStorage.getItem(currentParamsKey);
            const currentParamsVal = `${chartData.full_name || ''}|${chartData.date_of_birth || ''}|${chartData.time_of_birth || ''}|${chartData.city_of_birth || ''}`;

            if (savedParams && savedParams !== currentParamsVal) {
              sessionStorage.removeItem(currentParamsKey);
              sessionStorage.setItem(currentParamsKey, currentParamsVal);
              setMessages([welcomeObj]);
              return;
            } else {
              sessionStorage.setItem(currentParamsKey, currentParamsVal);
            }
          }

          const history = await getChatHistory(chartId);
          if (history && history.length > 0) {
             setMessages([welcomeObj, ...history]);
             return;
          }
        } else {
          const saved = sessionStorage.getItem('askai-msgs-guest');
          if (saved) {
            setMessages(JSON.parse(saved));
            return;
          }
        }

        setMessages([welcomeObj]);
      };

      initChat();
    }
  }, [isOpen, chartData, chartId]);

  // Save to sessionStorage only for guests
  useEffect(() => {
    if (messages.length > 0 && !chartId) {
      sessionStorage.setItem(`askai-msgs-guest`, JSON.stringify(messages));
    }
  }, [messages, chartId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = async (text) => {
    if (!text.trim()) return;

    // Add user message
    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    // Prepare history for API (excluding the welcome message)
    const history = messages
      .filter(m => m.id !== 'welcome')
      .map(m => ({ sender: m.sender, text: m.text }));

    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');
    setIsTyping(true);

    const userMsgId = userMsg.id;
    const aiMsgId = `ai-${Date.now()}`;
    const aiMsg = {
      id: aiMsgId,
      sender: 'ai',
      text: '',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    // Add placeholder AI message
    setMessages((prev) => [...prev, aiMsg]);

    try {
      const chartLang = chartData?.language || 'english';
      await streamChatResponse(text, chartId, history, userMsgId, aiMsgId, (chunk) => {
        setIsTyping(false);
        setMessages((prev) => 
          prev.map(msg => 
            msg.id === aiMsgId 
              ? { ...msg, text: msg.text + chunk }
              : msg
          )
        );
      }, chartLang);
    } catch (err) {
      setIsTyping(false);
      setMessages((prev) => 
        prev.map(msg => 
          msg.id === aiMsgId 
            ? { ...msg, text: msg.text || t('dashboard_components.chatbot.connection_interrupted') }
            : msg
        )
      );
    }
  };

  // generateMockResponse is no longer used since we fetch real responses

  return (
    <div className="ask-ai-widget no-print">
      {/* ── Chat Toggle Button ── */}
      <div className="relative">
        {showPrompt && !isOpen && (
          <div className="ask-ai-tooltip">
            <div className="ask-ai-tooltip-content">
              <span>{t('dashboard_components.chatbot.query_tooltip')}</span>
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
              <span className="font-headline-md tracking-wider text-[11px] uppercase font-bold hidden sm:inline">{t('dashboard_components.chatbot.ask_ai')}</span>
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
              <h3 className="ask-ai-title">{t('dashboard_components.chatbot.ask_ai_guide')}</h3>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[9px] uppercase font-bold text-outline tracking-wider">{t('dashboard_components.chatbot.alignment_active')}</span>
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
                    <span className="text-[10px] text-outline font-semibold ml-2 italic">{t('dashboard_components.chatbot.typing_indicator')}</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Quick Prompts */}
        <div className="ask-ai-quick-prompts">
          <p className="text-[9px] uppercase tracking-wider font-bold text-outline mb-1.5 px-1">{t('dashboard_components.chatbot.suggested_inquiries')}</p>
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
            placeholder={t('dashboard_components.chatbot.input_placeholder')}
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
