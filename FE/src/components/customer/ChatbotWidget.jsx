import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  ChatBubbleLeftRightIcon, 
  XMarkIcon, 
  PaperAirplaneIcon,
  SparklesIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import customerService from '../../services/customerService.js';
import { toast } from 'react-hot-toast';
import { clsx } from 'clsx';

const ChatbotWidget = ({ restaurantId, tableId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'bot', content: 'Xin chào! Tôi là trợ lý ảo của nhà hàng. Tôi có thể giúp gì cho bạn hôm nay?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const hasContext = useMemo(() => Boolean(restaurantId), [restaurantId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Sử dụng service hiện có của bạn
      const response = await customerService.chatbotQuery({ 
        message: userMessage,
        restaurantId,
        tableId 
      });
      
      // response ở đây đã là response.data do interceptor của httpClient
      if (response.success) {
        setMessages(prev => [...prev, { 
          role: 'bot', 
          content: response.data.response,
          context: response.data.context 
        }]);
      } else {
        toast.error('AI gặp sự cố khi phản hồi');
      }
    } catch (error) {
      console.error('Chatbot error:', error);
      setMessages(prev => [...prev, { 
        role: 'bot', 
        content: 'Xin lỗi, tôi không thể kết nối tới dịch vụ AI lúc này. Vui lòng thử lại sau!' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
      {/* Chat Window */}
      {isOpen && (
        <div className={clsx(
          "mb-4 w-[350px] sm:w-[420px] h-[550px] bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-white/40 flex flex-col overflow-hidden transition-all duration-500 transform origin-bottom-right animate-in fade-in zoom-in slide-in-from-bottom-10"
        )}>
          {/* Header */}
          <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 p-5 flex justify-between items-center text-white relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            
            <div className="flex items-center gap-3 relative z-10">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md shadow-inner">
                <SparklesIcon className="w-6 h-6 text-yellow-300 animate-pulse" />
              </div>
              <div>
                <h3 className="font-black text-base tracking-tight">AI Food Assistant</h3>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-green-400 rounded-full shadow-[0_0_8px_rgba(74,222,128,0.8)]"></div>
                  <span className="text-[10px] font-bold opacity-90 uppercase tracking-[0.1em]">AI Thông minh trực tuyến</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white/20 rounded-full transition-all active:scale-90"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-gradient-to-b from-gray-50/50 to-white">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={clsx(
                  "flex flex-col max-w-[85%] group",
                  msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                )}
              >
                <div className={clsx(
                  "px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm transition-all group-hover:shadow-md",
                  msg.role === 'user' 
                    ? "bg-indigo-600 text-white rounded-tr-none" 
                    : "bg-white text-gray-800 border border-gray-100 rounded-tl-none"
                )}>
                  {msg.content}
                </div>
                <div className="flex items-center gap-1 mt-1.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {msg.role === 'bot' && <SparklesIcon className="w-3 h-3 text-indigo-400" />}
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                    {msg.role === 'user' ? 'Bạn' : 'AI Trợ Lý'}
                  </span>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex flex-col items-start mr-auto max-w-[85%] animate-pulse">
                <div className="bg-white text-gray-800 border border-gray-100 px-5 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-gray-100">
            <form onSubmit={handleSend} className="relative flex items-center gap-2 bg-gray-100/80 p-1.5 rounded-[1.25rem] ring-1 ring-gray-200/50 focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Hỏi về món ăn, giá cả..."
                className="flex-1 bg-transparent border-none px-3 py-2 text-sm focus:ring-0 placeholder:text-gray-400 font-medium"
              />
              <button 
                type="submit"
                disabled={isLoading || !input.trim()}
                className="flex h-10 w-10 items-center justify-center bg-indigo-600 text-white rounded-xl hover:bg-black disabled:opacity-30 disabled:hover:bg-indigo-600 shadow-lg shadow-indigo-100 transition-all active:scale-90"
              >
                <PaperAirplaneIcon className="w-5 h-5 -rotate-45 -translate-y-0.5 translate-x-0.5" />
              </button>
            </form>
            <p className="text-[9px] text-center text-gray-400 mt-2 font-medium uppercase tracking-[0.1em]">AI có thể trả lời sai, hãy kiểm tra kỹ thông tin.</p>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "relative flex items-center justify-center w-16 h-16 rounded-full shadow-[0_15px_35px_rgba(79,70,229,0.4)] transition-all duration-500 hover:scale-110 active:scale-95 group overflow-hidden",
          isOpen 
            ? "bg-white text-gray-800 rotate-90" 
            : "bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 text-white"
        )}
      >
        {isOpen ? (
          <XMarkIcon className="w-8 h-8" />
        ) : (
          <>
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <ChatBubbleLeftRightIcon className="w-8 h-8 relative z-10" />
            <div className="absolute top-4 right-4 w-3 h-3 bg-red-500 border-2 border-white rounded-full animate-pulse shadow-lg"></div>
          </>
        )}
      </button>
    </div>
  );
};

export default ChatbotWidget;
