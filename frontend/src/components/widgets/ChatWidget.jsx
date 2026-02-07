import React, { useState, useRef, useEffect } from 'react';
import { apiGet } from '../../js/httpClient';

const ChatWidget = ({ theme }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            id: 1,
            type: 'bot',
            content: "👋 Hello! I'm AngiBot, your AI assistant. How can I help you today?\n\nTry asking about our services, pricing, FAQs, or say 'talk to a human'!",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [chatMode, setChatMode] = useState('bot');
    const [faqs, setFaqs] = useState([]);
    const messagesEndRef = useRef(null);

    const quickReplies = [
        "Tell me about your services",
        "I need a quote",
        "Show me FAQs",
        "Talk to a human"
    ];

    // Fetch FAQs on mount so the bot can answer from them
    useEffect(() => {
        apiGet('/api/faqs')
            .then(data => { if (Array.isArray(data)) setFaqs(data); })
            .catch(() => {});
    }, []);

    // AI response with FAQ awareness
    const getBotResponse = (userMessage) => {
        const lower = userMessage.toLowerCase();

        // Greeting
        if (/^(hi|hello|hey|good\s?(morning|afternoon|evening)|howdy)/i.test(lower)) {
            return "Hello there! 👋 Great to meet you!\n\nI'm here to help you with:\n• Information about our services\n• Getting a project quote\n• Answering FAQs\n• Connecting you with our team\n\nWhat would you like to know?";
        }

        // FAQ listing
        if (lower.includes('faq') || lower.includes('question') || lower.includes('common')) {
            if (faqs.length === 0) return "Our FAQ section is loading. Try again in a moment, or ask me anything directly!";
            const categories = [...new Set(faqs.map(f => f.category))];
            const categoryList = categories.map(c => `• ${c}`).join('\n');
            return `Here are our FAQ categories:\n\n${categoryList}\n\nAsk me about any of these, or type a specific question!`;
        }

        // Try matching against loaded FAQs
        if (faqs.length > 0) {
            const matched = faqs.find(faq => {
                const qWords = faq.question.toLowerCase().split(/\s+/);
                const matchCount = qWords.filter(w => w.length > 3 && lower.includes(w)).length;
                return matchCount >= 3;
            });
            if (matched) return `**${matched.question}**\n\n${matched.answer}`;
        }

        // Services
        if (lower.includes('service') || lower.includes('what do you do') || lower.includes('offer')) {
            return "We offer a wide range of services:\n\n💻 **Custom Software** — Web apps, mobile apps, POS systems\n📊 **Data Analysis** — Python/Excel dashboards & reports\n📝 **Cyber Services** — Document editing, reports, thesis, posters\n🏛️ **Government Services** — KRA, SHA, Good Conduct applications\n📣 **Advertising** — Brand promotion campaigns\n🌐 **Internet Services** — Coming soon!\n\nWould you like details on any specific service?";
        }

        // Quote / pricing
        if (lower.includes('quote') || lower.includes('price') || lower.includes('cost') || lower.includes('how much')) {
            return "I'd be happy to help you get a quote! 💰\n\nFor an accurate estimate, please tell me:\n1. What type of project you need\n2. Your timeline\n3. Any specific features required\n\nOr you can [book a free consultation](/booking) with our team!";
        }

        // Payment
        if (lower.includes('pay') || lower.includes('mpesa') || lower.includes('deposit')) {
            return "We accept multiple payment methods:\n\n📱 **M-Pesa** — Direct mobile money\n💳 **Stripe** — Visa / Mastercard\n🌐 **PayPal** — International payments\n\nA deposit (30-50%) is required before work begins. The balance is due on delivery.";
        }

        // Contact / human / support
        if (lower.includes('human') || lower.includes('person') || lower.includes('agent') || lower.includes('support') || lower.includes('contact') || lower.includes('call') || lower.includes('whatsapp')) {
            return "I'll connect you with our team! 👤\n\n📞 **Call/WhatsApp:** [+254710398690](https://wa.me/254710398690)\n📧 **Support:** support@angisoft.co.ke\n📧 **General:** info@angisoft.co.ke\n\n🕗 **Hours:** Mon-Fri 8AM-6PM, Sat 9AM-1PM (EAT)\n\nYou can also WhatsApp us anytime for a quick response!";
        }

        // Projects / portfolio
        if (lower.includes('project') || lower.includes('portfolio') || lower.includes('work') || lower.includes('example')) {
            return "Check out our amazing work! 🚀\n\nWe've built solutions for various industries:\n• E-commerce & FinTech platforms\n• Healthcare & telemedicine systems\n• Educational tools & LMS\n• Fleet management & logistics\n\nVisit our [Projects page](/projects) to see case studies!";
        }

        // Booking / how to start
        if (lower.includes('book') || lower.includes('start') || lower.includes('begin') || lower.includes('hire')) {
            return "Starting a project is easy! 🎯\n\n1️⃣ Visit our [Booking page](/booking)\n2️⃣ Fill in your details & project requirements\n3️⃣ Upload any reference files (optional)\n4️⃣ We review within 24 hours!\n\nYour booking is tracked through every stage from submission to delivery.";
        }

        // Location
        if (lower.includes('where') || lower.includes('location') || lower.includes('address') || lower.includes('office')) {
            return "📍 We're based in **Nairobi, Kenya** and serve clients across Africa and globally.\n\nReach us:\n📞 +254710398690 (Call/WhatsApp)\n📧 info@angisoft.co.ke";
        }

        // Newsletter / updates
        if (lower.includes('newsletter') || lower.includes('subscribe') || lower.includes('update')) {
            return "Stay in the loop! 📬\n\nSubscribe to our newsletter at the bottom of any page to receive:\n• New service announcements\n• Tech insights & tutorials\n• Special offers\n\nWe send updates from updates@angisoft.co.ke — you can unsubscribe anytime.";
        }

        // Thanks
        if (lower.includes('thank')) {
            return "You're very welcome! 😊\n\nIs there anything else I can help you with today?";
        }

        // Fallback
        return "Thanks for your message! 🤔\n\nI can help you with:\n• Our services & pricing\n• FAQs & common questions\n• Project booking\n• Connecting to our team\n\nTry asking something specific, or type **'FAQs'** to browse common questions!";
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        const userMessage = {
            id: Date.now(),
            type: 'user',
            content: inputValue,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsTyping(true);

        // Simulate AI thinking
        setTimeout(() => {
            const botResponse = {
                id: Date.now() + 1,
                type: 'bot',
                content: getBotResponse(inputValue),
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, botResponse]);
            setIsTyping(false);
        }, 1000 + Math.random() * 1000);
    };

    const handleQuickReply = (reply) => {
        setInputValue(reply);
    };

    return (
        <>
            {/* Chat Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-2xl shadow-sky-500/30 flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-sky-500/50 ${isOpen ? 'rotate-0' : 'animate-pulse'}`}
                aria-label="Open chat"
            >
                {isOpen ? (
                    <i className="fas fa-times text-2xl"></i>
                ) : (
                    <i className="fas fa-comments text-2xl"></i>
                )}
            </button>

            {/* Notification Badge */}
            {!isOpen && (
                <span className="fixed bottom-[72px] right-6 z-50 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-bounce">
                    1
                </span>
            )}

            {/* Chat Window */}
            <div className={`fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] transition-all duration-300 origin-bottom-right ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`}>
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
                    {/* Header */}
                    <div 
                        className="p-4 text-white"
                        style={{
                            background: "linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)"
                        }}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                    <i className="fas fa-robot text-lg"></i>
                                </div>
                                <div>
                                    <h4 className="font-semibold">AngiBot</h4>
                                    <p className="text-xs text-sky-100 flex items-center gap-1">
                                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                        Online • AI Assistant
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center"
                            >
                                <i className="fas fa-minus text-sm"></i>
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="h-80 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50">
                        {messages.map((message) => (
                            <div 
                                key={message.id}
                                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`max-w-[80%] ${message.type === 'user' ? 'order-1' : 'order-2'}`}>
                                    {message.type === 'bot' && (
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 flex items-center justify-center mb-1">
                                            <i className="fas fa-robot text-xs text-white"></i>
                                        </div>
                                    )}
                                    <div 
                                        className={`px-4 py-3 rounded-2xl ${
                                            message.type === 'user' 
                                                ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-br-md' 
                                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-bl-md shadow-sm border border-slate-200 dark:border-slate-700'
                                        }`}
                                    >
                                        <p className="text-sm whitespace-pre-line">{message.content}</p>
                                    </div>
                                    <p className={`text-xs text-slate-400 mt-1 ${message.type === 'user' ? 'text-right' : 'text-left'}`}>
                                        {message.time}
                                    </p>
                                </div>
                            </div>
                        ))}
                        
                        {/* Typing Indicator */}
                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm border border-slate-200 dark:border-slate-700">
                                    <div className="flex gap-1">
                                        <span className="w-2 h-2 bg-sky-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                        <span className="w-2 h-2 bg-sky-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                        <span className="w-2 h-2 bg-sky-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Replies */}
                    <div className="px-4 py-2 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {quickReplies.map((reply, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleQuickReply(reply)}
                                    className="flex-shrink-0 px-3 py-1.5 text-xs font-medium bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-300 rounded-full border border-sky-200 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors"
                                >
                                    {reply}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSendMessage} className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Type your message..."
                                className="flex-1 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-sky-500 transition-all text-sm"
                            />
                            <button
                                type="submit"
                                disabled={!inputValue.trim()}
                                className="w-12 h-12 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white flex items-center justify-center hover:shadow-lg hover:shadow-sky-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <i className="fas fa-paper-plane"></i>
                            </button>
                        </div>
                    </form>

                    {/* Footer */}
                    <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/50 text-center">
                        <p className="text-xs text-slate-400">
                            Powered by <span className="text-sky-500 font-medium">AngiSoft AI</span> • 
                            <button className="text-sky-500 hover:underline ml-1">Talk to Human</button>
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ChatWidget;
