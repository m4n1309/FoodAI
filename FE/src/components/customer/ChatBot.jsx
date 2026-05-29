import React, { useState, useRef, useEffect } from 'react';
import { 
  ChatBubbleLeftRightIcon, 
  XMarkIcon, 
  PaperAirplaneIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import chatbotService from '../../services/chatbotService.js';
import { toast } from 'react-hot-toast';
import { clsx } from 'clsx';

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'bot', content: 'Xin chào! Tôi là trợ lý ảo của nhà hàng. Tôi có thể giúp gì cho bạn hôm nay?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await chatbotService.query(userMessage);
      if (response.success) {
        setMessages(prev => [...prev, { role: 'bot', content: response.data.response }]);
      } else {
        toast.error('Có lỗi xảy ra khi gọi AI');
      }
    } catch (error) {
      console.error('Chatbot error:', error);
      toast.error('Không thể kết nối tới máy chủ AI');
      setMessages(prev => [...prev, { role: 'bot', content: 'Xin lỗi, hiện tại tôi đang gặp chút sự cố kỹ thuật. Vui lòng thử lại sau!' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className={clsx(
          "mb-4 w-[350px] sm:w-[400px] h-[500px] bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 flex flex-col overflow-hidden transition-all duration-300 transform origin-bottom-right animate-in fade-in zoom-in"
        )}>
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex justify-between items-center text-white shadow-lg">
            <div className="flex items-center gap-2">
              <div className="bg-white/20 p-1.5 rounded-lg">
                <SparklesIcon className="w-5 h-5 text-yellow-300" />
              </div>
              <div>
                <h3 className="font-bold text-sm">AI Food Assistant</h3>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-[10px] opacity-80 uppercase tracking-wider">Trực tuyến</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={clsx(
                  "flex flex-col max-w-[85%]",
                  msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                )}
              >
                <div className={clsx(
                  "px-4 py-2.5 rounded-2xl text-sm shadow-sm",
                  msg.role === 'user' 
                    ? "bg-indigo-600 text-white rounded-tr-none" 
                    : "bg-white text-gray-800 border border-gray-100 rounded-tl-none"
                )}>
                  {msg.content}
                </div>
                <span className="text-[10px] text-gray-400 mt-1 px-1">
                  {msg.role === 'user' ? 'Bạn' : 'Assistant'}
                </span>
              </div>
            ))}
            {isLoading && (
              <div className="flex flex-col items-start mr-auto max-w-[85%]">
                <div className="bg-white text-gray-800 border border-gray-100 px-4 py-2.5 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập câu hỏi của bạn..."
              className="flex-1 bg-gray-100 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            <button 
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-all"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </button>
          </form>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "p-4 rounded-full shadow-2xl transition-all duration-500 hover:scale-110 active:scale-95 group",
          isOpen 
            ? "bg-white text-gray-800 rotate-90" 
            : "bg-gradient-to-tr from-indigo-600 to-purple-600 text-white"
        )}
      >
        {isOpen ? (
          <XMarkIcon className="w-8 h-8" />
        ) : (
          <div className="relative">
            <ChatBubbleLeftRightIcon className="w-8 h-8" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-white rounded-full animate-pulse"></div>
          </div>
        )}
      </button>
    </div>
  );
};

export default ChatBot;
