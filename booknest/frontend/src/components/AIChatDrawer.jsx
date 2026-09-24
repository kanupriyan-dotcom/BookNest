import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  Sparkles,
  Send,
  X,
  BookOpen,
  Copy,
  Check,
  RefreshCw,
  MapPin,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import api from '../api/axios';

export default function AIChatDrawer({ isOpen, onClose }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        "Hello! I'm your BookNest Library AI Assistant. I can help find similar books, search our catalog by themes, or recommend titles for customers. What are you looking for today?",
      matchedBooks: [],
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const messagesEndRef = useRef(null);

  const quickPrompts = [
    'Books similar to Dune',
    'Recommend clean code & software design books',
    'What dystopian books do you have like 1984?',
    'Find classic literature books available now',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (messageText = input) => {
    const textToSend = messageText.trim();
    if (!textToSend || loading) return;

    const newMessages = [...messages, { role: 'user', content: textToSend }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const history = newMessages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const { data } = await api.post('/ai/chat', {
        message: textToSend,
        history,
      });

      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: data.reply,
          matchedBooks: data.matchedBooks || [],
          model: data.model,
        },
      ]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: 'I apologize, I encountered an issue accessing the book catalog. Please try again.',
          matchedBooks: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <span>Book Advisor AI</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded">
                Catalog Assistant
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">Find similar books & recommendations</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={index}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-2`}
            >
              <div
                className={`max-w-[88%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                  isUser
                    ? 'bg-sky-600 text-white rounded-br-xs'
                    : 'bg-slate-100 text-slate-800 rounded-bl-xs'
                }`}
              >
                <p className="whitespace-pre-line">{msg.content}</p>

                {/* Copy recommendation button for librarian */}
                {!isUser && (
                  <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{msg.model ? `Powered by ${msg.model}` : 'BookNest Engine'}</span>
                    <button
                      onClick={() => copyToClipboard(msg.content, index)}
                      className="hover:text-slate-800 flex items-center gap-1 font-medium transition-colors"
                      title="Copy recommendation text"
                    >
                      {copiedIndex === index ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Matched Books Cards */}
              {!isUser && msg.matchedBooks && msg.matchedBooks.length > 0 && (
                <div className="w-full space-y-2 pl-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Catalog Titles Mentioned:
                  </span>
                  <div className="space-y-1.5">
                    {msg.matchedBooks.map((b) => (
                      <div
                        key={b._id}
                        className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs flex items-center justify-between gap-2 hover:border-sky-300 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/books/${b._id}`}
                            onClick={onClose}
                            className="font-bold text-slate-900 hover:text-sky-600 text-xs truncate block"
                          >
                            {b.title}
                          </Link>
                          <p className="text-[11px] text-slate-500 truncate">
                            {Array.isArray(b.authors) ? b.authors.join(', ') : b.authors}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                            <span className="flex items-center gap-0.5">
                              <MapPin className="w-3 h-3" />
                              {b.shelfLocation || 'Main Hall'}
                            </span>
                            <span
                              className={`font-semibold ${
                                b.availableCopies > 0 ? 'text-emerald-600' : 'text-amber-600'
                              }`}
                            >
                              {b.availableCopies > 0
                                ? `${b.availableCopies} available`
                                : 'All reserved'}
                            </span>
                          </div>
                        </div>
                        <Link
                          to={`/books/${b._id}`}
                          onClick={onClose}
                          className="px-2.5 py-1 text-[11px] font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors shrink-0"
                        >
                          View
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 p-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-500" />
            <span>Consulting library collection & AI advisor...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested quick chips */}
      {messages.length <= 2 && (
        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50 flex flex-wrap gap-1.5">
          {quickPrompts.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSend(prompt)}
              className="text-[11px] bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-full transition-colors truncate max-w-full text-left"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 border-t border-slate-100 bg-white flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask for similar books, authors, or genres..."
          className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-sky-500 focus:bg-white transition-colors"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="p-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white rounded-xl transition-colors shadow-xs"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
