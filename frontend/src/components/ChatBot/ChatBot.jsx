import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { FaTimes, FaPaperPlane, FaHeadset } from 'react-icons/fa';

const ChatBot = () => {
  const { colors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [stage, setStage] = useState('contact'); // contact collection first
  const defaultGreeting = {
    id: 1,
    type: 'bot',
    text: 'Hello! 👋 Welcome to AngiSoft Technologies. To help you better, could you please share your name?',
    timestamp: new Date()
  };
  const [messages, setMessages] = useState([defaultGreeting]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Lead collection state
  const [visitorInfo, setVisitorInfo] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [contactStep, setContactStep] = useState('name');
  const [conversationId, setConversationId] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [textareaHeight, setTextareaHeight] = useState('auto');
  const [deviceFingerprint, setDeviceFingerprint] = useState('');
  const [handoffRequested, setHandoffRequested] = useState(false);
  const historyLoadedRef = useRef(false);

  const generateFingerprint = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `fp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  };

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Load or generate device fingerprint + stored visitor info
  useEffect(() => {
    const storedFingerprint = localStorage.getItem('angisoft_fp');
    if (storedFingerprint) {
      setDeviceFingerprint(storedFingerprint);
    } else {
      const newFingerprint = generateFingerprint();
      localStorage.setItem('angisoft_fp', newFingerprint);
      setDeviceFingerprint(newFingerprint);
    }

    const storedVisitorRaw = localStorage.getItem('angisoft_visitor');
    if (storedVisitorRaw) {
      try {
        const storedVisitor = JSON.parse(storedVisitorRaw);
        if (storedVisitor?.name || storedVisitor?.email || storedVisitor?.phone) {
          setVisitorInfo({
            name: storedVisitor.name || '',
            email: storedVisitor.email || '',
            phone: storedVisitor.phone || ''
          });
          if (storedVisitor.name && !storedVisitor.email) {
            setContactStep('email');
          } else if (storedVisitor.email && !storedVisitor.phone) {
            setContactStep('phone');
          }
          if (storedVisitor.name && storedVisitor.email) {
            setStage('chat');
            setMessages([
              {
                id: Date.now(),
                type: 'bot',
                text: `Welcome back, ${storedVisitor.name}! How can I help you today?`,
                timestamp: new Date()
              }
            ]);
          }
        }
      } catch (error) {
        console.warn('Failed to parse stored visitor info', error);
      }
    }

    const storedConversationId = localStorage.getItem('angisoft_conversation');
    if (storedConversationId) {
      setConversationId(storedConversationId);
    }
  }, []);

  useEffect(() => {
    if (visitorInfo.name || visitorInfo.email || visitorInfo.phone) {
      localStorage.setItem('angisoft_visitor', JSON.stringify(visitorInfo));
    }
  }, [visitorInfo]);

  useEffect(() => {
    if (conversationId) {
      localStorage.setItem('angisoft_conversation', conversationId);
    }
  }, [conversationId]);

  const mapHistoryMessages = (conversations) => {
    const allMessages = conversations.flatMap((conversation) =>
      (conversation.messages || []).map((msg) => ({
        id: msg.id,
        type: msg.sender === 'visitor' ? 'user' : 'bot',
        text: msg.message,
        timestamp: new Date(msg.createdAt)
      }))
    );
    return allMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  };

  const loadHistory = async () => {
    if (historyLoadedRef.current) return;
    if (!deviceFingerprint && !conversationId && !visitorInfo.email) return;
    historyLoadedRef.current = true;

    try {
      const response = await fetch('/api/chatbot/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversationId || undefined,
          deviceFingerprint: deviceFingerprint || undefined,
          visitorName: visitorInfo.name || undefined,
          visitorEmail: visitorInfo.email || undefined,
          visitorPhone: visitorInfo.phone || undefined,
          limit: 3
        })
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      if (data.latestConversationId && !conversationId) {
        setConversationId(data.latestConversationId);
      }

      if (Array.isArray(data.conversations) && data.conversations.length > 0) {
        const hasEscalated = data.conversations.some((conversation) => conversation.status === 'escalated');
        if (hasEscalated) {
          setHandoffRequested(true);
        }
        const historyMessages = mapHistoryMessages(data.conversations);
        if (historyMessages.length > 0) {
          setMessages(historyMessages);
          setStage('chat');
        }
      }
    } catch (error) {
      console.warn('Failed to load chat history', error);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    if (historyLoadedRef.current) return;
    loadHistory();
  }, [isOpen, deviceFingerprint, conversationId, visitorInfo.email, visitorInfo.name, visitorInfo.phone]);

  // Auto-resize textarea
  const handleInputChange = (e) => {
    setInput(e.target.value);
    
    // Reset height to auto to get the correct scrollHeight
    e.target.style.height = 'auto';
    
    // Set new height based on scrollHeight, max 150px
    const newHeight = Math.min(e.target.scrollHeight, 150);
    e.target.style.height = `${newHeight}px`;
  };

  // Handle contact information collection
  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    if (contactStep === 'name') {
      setVisitorInfo(prev => ({ ...prev, name: input }));
      setContactStep('email');
      const nextMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: `Nice to meet you, ${input}! 😊 What's your email address?`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, nextMessage]);
    } else if (contactStep === 'email') {
      if (!input.includes('@')) {
        const errorMsg = {
          id: Date.now() + 1,
          type: 'bot',
          text: 'Please enter a valid email address.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMsg]);
        return;
      }
      setVisitorInfo(prev => ({ ...prev, email: input }));
      setContactStep('phone');
      const nextMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: 'Great! And your phone number? (optional, just press enter to skip)',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, nextMessage]);
    } else if (contactStep === 'phone') {
      setVisitorInfo(prev => ({ ...prev, phone: input || '' }));
      setStage('chat');
      const nextMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: `Thanks, ${visitorInfo.name}! How can I help you today?`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, nextMessage]);
    }
  };

  // Handle chat message with AI
  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
    setIsLoading(true);

    try {
      const response = await fetch('/api/chatbot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversationId || undefined,
          visitorName: visitorInfo.name,
          visitorEmail: visitorInfo.email,
          visitorPhone: visitorInfo.phone,
          deviceFingerprint: deviceFingerprint || undefined,
          message: input
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      // Update conversation ID if new
      if (!conversationId) {
        setConversationId(data.conversationId);
      }

      // Save recommendations if provided
      if (data.recommendations?.length > 0) {
        setRecommendations(data.recommendations);
      }

      if (data.handoff) {
        setHandoffRequested(true);
      }

      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: data.message,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: 'Sorry, I encountered an issue. Please try again or contact us directly at support@angisoft.co.ke',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = stage === 'contact' ? handleContactSubmit : handleChatSubmit;

  return (
    <>
      {/* Chat Window */}
      {isOpen && (
        <div
          className="fixed bottom-6 right-6 z-100 w-[420px] sm:w-[460px] lg:w-[520px] max-w-[calc(100vw-32px)] h-[620px] max-h-[calc(100vh-96px)] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          style={{
            background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(10, 15, 28, 0.98) 100%)',
            backdropFilter: 'blur(12px)',
            border: `1px solid rgba(255, 255, 255, 0.08)`,
            boxShadow: '0 25px 80px rgba(8, 12, 24, 0.7)',
            animation: 'slideUp 0.3s ease-out'
          }}
        >
          {/* Header */}
          <div
            className="px-6 py-5 flex items-center justify-between flex-shrink-0"
            style={{
              background: `linear-gradient(135deg, ${colors.primary}45 0%, ${colors.secondary}35 100%)`,
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: `${colors.primary}35`, boxShadow: `0 0 20px ${colors.primary}40` }}
              >
                <FaHeadset style={{ color: colors.primary, fontSize: '1.2rem' }} />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">AngiSoft Bot</h3>
                <div className="text-white/60 text-[11px] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: colors.primary, boxShadow: `0 0 8px ${colors.primary}` }} />
                  Online • AI Assistant
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Close chat"
            >
              <FaTimes className="text-white/70 hover:text-white" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 chat-scroll ">
            {handoffRequested && (
              <div className="rounded-xl border border-yellow-400/30 bg-yellow-500/10 px-4 py-3 text-xs text-yellow-100">
                A human assistant has been notified and will follow up shortly.
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.type === 'user' ? 'justify-end mr-5' : 'justify-start ml-5'} animate-fadeIn`}
              >
                <div
                  className={`max-w-[78%] px-4 py-3 rounded-2xl ${
                    msg.type === 'user'
                      ? 'rounded-br-none text-white'
                      : 'rounded-bl-none text-white/90'
                  }`}
                  style={{
                    background:
                      msg.type === 'user'
                        ? `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`
                        : 'rgba(30, 40, 60, 0.6)',
                    backdropFilter: msg.type === 'bot' ? 'blur(10px)' : 'none',
                    border:
                      msg.type === 'bot'
                        ? '1px solid rgba(255, 255, 255, 0.15)'
                        : 'none',
                    boxShadow:
                      msg.type === 'user'
                        ? `0 8px 24px ${colors.primary}35`
                        : '0 6px 16px rgba(0, 0, 0, 0.25)'
                  }}
                >
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                </div>
              </div>
            ))}

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <div className="mt-4 space-y-3 pt-4 border-t border-white/5">
                <p className="text-xs text-white/60 font-medium px-1">Recommended services:</p>
                {recommendations.map((service) => (
                  <div
                    key={service.id}
                    className="p-4 rounded-xl"
                    style={{
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: `1px solid ${colors.primary}40`,
                      boxShadow: `0 10px 24px ${colors.primary}1a`
                    }}
                  >
                    <p className="text-sm font-semibold text-white">{service.title}</p>
                    <p className="text-xs text-white/60 mt-1">{service.description?.substring(0, 70)}...</p>
                  </div>
                ))}
              </div>
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div
                  className="px-5 py-4 rounded-2xl rounded-bl-none"
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <div className="flex gap-2">
                    <div
                      className="w-2 h-2 rounded-full animate-bounce"
                      style={{ background: colors.primary, animationDelay: '0s' }}
                    />
                    <div
                      className="w-2 h-2 rounded-full animate-bounce"
                      style={{ background: colors.primary, animationDelay: '0.2s' }}
                    />
                    <div
                      className="w-2 h-2 rounded-full animate-bounce"
                      style={{ background: colors.primary, animationDelay: '0.4s' }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="px-6 py-5 border-t border-white/10 flex-shrink-0"
            style={{ background: 'rgba(0, 0, 0, 0.25)' }}
          >
            <div className="flex items-end gap-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder={
                  stage === 'contact'
                    ? contactStep === 'phone'
                      ? 'Your phone (optional)...'
                      : `Your ${contactStep}...`
                    : 'Type your message...'
                }
                disabled={isLoading}
                rows={1}
                className="flex-1 px-4 py-3 rounded-2xl text-sm text-white placeholder-white/30 focus:outline-none transition-all resize-none"
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: `1px solid rgba(255, 255, 255, 0.12)`,
                  boxShadow: 'inset 0 1px 6px rgba(0,0,0,0.35)',
                  minHeight: '52px',
                  maxHeight: '150px',
                  height: 'auto',
                  overflowY: 'auto',
                  lineHeight: '1.5'
                }}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="h-12 w-12 rounded-2xl font-semibold transition-all hover:scale-105 disabled:opacity-50 flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                  color: 'white',
                  boxShadow: `0 10px 24px ${colors.primary}40`
                }}
              >
                <FaPaperPlane />
              </button>
            </div>
          </form>

          {/* Footer */}
          <div
            className="px-6 py-3 text-[11px] text-white/55 flex items-center justify-between border-t border-white/10 flex-shrink-0"
            style={{ background: 'rgba(0, 0, 0, 0.25)' }}
          >
            <span>Powered by AngiSoft AI</span>
            <span className="text-white/40">We respect your privacy</span>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full text-white shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110"
        style={{
          background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
          boxShadow: `0 12px 30px ${colors.primary}40`,
          animation: isOpen ? 'spin 0.3s ease-out' : 'bounce 2s infinite'
        }}
        aria-label="Open chat"
      >
        <span
          className="absolute inset-0 rounded-full"
          style={{
            boxShadow: `0 0 0 6px ${colors.primary}20, 0 0 25px ${colors.primary}35`,
            opacity: isOpen ? 0 : 1,
            transition: 'opacity 0.3s ease'
          }}
        />
        {isOpen ? (
          <FaTimes className="text-2xl" />
        ) : (
          <FaHeadset className="text-2xl" />
        )}
      </button>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spin {
          to {
            transform: rotate(180deg);
          }
        }

        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .chat-scroll::-webkit-scrollbar {
          width: 6px;
        }

        .chat-scroll::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.04);
          border-radius: 999px;
        }

        .chat-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 999px;
        }
      `}</style>
    </>
  );
};

export default ChatBot;
