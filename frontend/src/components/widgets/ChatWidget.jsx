import React, { useState, useRef, useEffect } from 'react';

const ChatWidget = ({ theme }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            id: 1,
            type: 'bot',
            content: "👋 Hello! I'm AngiBot, your AI assistant. How can I help you today?",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [chatMode, setChatMode] = useState('bot'); // 'bot' or 'human'
    const messagesEndRef = useRef(null);

    const quickReplies = [
        "Tell me about your services",
        "I need a quote",
        "Talk to a human",
        "View your projects"
    ];

    // AI response simulation
    const getBotResponse = (userMessage) => {
        const lowerMessage = userMessage.toLowerCase();
        
        if (lowerMessage.includes('service') || lowerMessage.includes('what do you do')) {
            return "We offer a range of services including:\n\n🌐 **Web Development** - Custom websites & web apps\n📱 **Mobile Apps** - iOS & Android solutions\n☁️ **Cloud Solutions** - AWS, Azure, GCP\n🔧 **API Development** - RESTful & GraphQL\n🎨 **UI/UX Design** - User-centered design\n\nWould you like details on any specific service?";
        }
        if (lowerMessage.includes('quote') || lowerMessage.includes('price') || lowerMessage.includes('cost')) {
            return "I'd be happy to help you get a quote! 💰\n\nFor an accurate estimate, please tell me:\n1. What type of project you need\n2. Your timeline\n3. Any specific features required\n\nOr you can [book a free consultation](/book) with our team!";
        }
        if (lowerMessage.includes('human') || lowerMessage.includes('person') || lowerMessage.includes('agent') || lowerMessage.includes('support')) {
            return "I'll connect you with a team member! 👤\n\nOur support team is available:\n📅 Mon-Fri: 8AM - 6PM (EAT)\n\nIn the meantime, you can:\n📧 Email: info@angisoft.tech\n📞 Call: +254 700 000 000\n\nWould you like me to request a callback?";
        }
        if (lowerMessage.includes('project') || lowerMessage.includes('portfolio') || lowerMessage.includes('work')) {
            return "Check out our amazing work! 🚀\n\nWe've built solutions for various industries including:\n• E-commerce platforms\n• Healthcare systems\n• FinTech applications\n• Educational tools\n\nVisit our [Projects page](/projects) to see case studies!";
        }
        if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
            return "Hello there! 👋 Great to meet you!\n\nI'm here to help you with:\n• Information about our services\n• Getting a project quote\n• Connecting you with our team\n• Answering general questions\n\nWhat would you like to know?";
        }
        if (lowerMessage.includes('thank')) {
            return "You're very welcome! 😊\n\nIs there anything else I can help you with today?";
        }
        
        return "Thanks for your message! 🤔\n\nI'm still learning, but I can help you with:\n• Service information\n• Project quotes\n• Connecting to our team\n\nWould you like me to connect you with a human representative?";
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
