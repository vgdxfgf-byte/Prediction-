import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Send,
  MessageSquarePlus,
  KeyRound,
  Copy,
  Check,
  ShieldCheck,
  RotateCcw,
  User as UserIcon,
  Phone,
  Sparkles,
  LogIn
} from 'lucide-react';
import {
  generateSecureChatId,
  subscribeIdChatThread,
  subscribeIdChatMessages,
  fsSendVisitorIdChatMessage,
  fsMarkIdChatRead
} from '../../services/firestoreService';
import type { IdChatThread, IdChatMessage } from '../../types';

export const ID_CHAT_STORAGE_KEY = 'apex_id_chat_session_v1';

interface StoredChatSession {
  chatId: string;
  visitorName: string;
}

export function loadStoredChatSession(): StoredChatSession | null {
  try {
    const raw = window.localStorage.getItem(ID_CHAT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredChatSession>;
    if (typeof parsed.chatId === 'string' && parsed.chatId.length >= 20) {
      return {
        chatId: parsed.chatId,
        visitorName: typeof parsed.visitorName === 'string' ? parsed.visitorName : ''
      };
    }
    return null;
  } catch {
    return null;
  }
}

function saveStoredChatSession(session: StoredChatSession) {
  try {
    window.localStorage.setItem(ID_CHAT_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage quota errors
  }
}

interface NewIdChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultVisitorName?: string;
  onApplyCredentials?: (username: string, password: string) => void;
}

export const NewIdChatModal: React.FC<NewIdChatModalProps> = ({
  isOpen,
  onClose,
  defaultVisitorName,
  onApplyCredentials
}) => {
  const [session, setSession] = useState<StoredChatSession>(() => {
    const existing = loadStoredChatSession();
    if (existing) return existing;
    const fresh: StoredChatSession = {
      chatId: generateSecureChatId(),
      visitorName: defaultVisitorName || ''
    };
    saveStoredChatSession(fresh);
    return fresh;
  });

  const [thread, setThread] = useState<IdChatThread | null>(null);
  const [messages, setMessages] = useState<IdChatMessage[]>([]);

  // Initial intake form state
  const [visitorName, setVisitorName] = useState(
    () => session.visitorName || defaultVisitorName || ''
  );
  const [requestedUsername, setRequestedUsername] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [firstMessage, setFirstMessage] = useState(
    'Hi Admin, please create a new User ID for me.'
  );

  // Follow-up message input
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Subscribe to thread metadata whenever modal is open
  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeIdChatThread(session.chatId, nextThread => {
      setThread(nextThread);
      if (nextThread?.unreadByUser) {
        void fsMarkIdChatRead(session.chatId, 'user');
      }
    });
    return () => unsub();
  }, [isOpen, session.chatId]);

  // Subscribe to messages only after thread exists in Firestore
  useEffect(() => {
    if (!isOpen || !thread) {
      setMessages([]);
      return;
    }
    const unsub = subscribeIdChatMessages(session.chatId, list => {
      setMessages(list);
    });
    return () => unsub();
  }, [isOpen, thread?.id, session.chatId]);

  // Auto scroll to newest message
  useEffect(() => {
    if (!isOpen) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isOpen]);

  const handleCopy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // Clipboard fallback ignored
    }
  };

  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const cleanName = visitorName.trim();
    if (cleanName.length < 2) {
      setErrorMsg('Please enter your name (at least 2 characters).');
      return;
    }
    if (!firstMessage.trim()) {
      setErrorMsg('Please write a message for the administrator.');
      return;
    }

    setIsSending(true);
    const updatedSession: StoredChatSession = {
      chatId: session.chatId,
      visitorName: cleanName
    };
    saveStoredChatSession(updatedSession);
    setSession(updatedSession);

    const res = await fsSendVisitorIdChatMessage({
      chatId: session.chatId,
      visitorName: cleanName,
      requestedUsername: requestedUsername.trim(),
      contactInfo: contactInfo.trim(),
      text: firstMessage.trim()
    });
    setIsSending(false);

    if (!res.success) {
      setErrorMsg(res.error || 'Could not start chat. Please try again.');
    }
  };

  const handleSendFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || isSending) return;
    setErrorMsg('');
    setIsSending(true);

    const textToSend = replyText.trim();
    setReplyText('');
    const res = await fsSendVisitorIdChatMessage({
      chatId: session.chatId,
      visitorName: thread?.visitorName || session.visitorName || 'Guest',
      text: textToSend
    });
    setIsSending(false);

    if (!res.success) {
      setReplyText(textToSend);
      setErrorMsg(res.error || 'Failed to send message');
    }
  };

  const handleResetChat = () => {
    const fresh: StoredChatSession = {
      chatId: generateSecureChatId(),
      visitorName: defaultVisitorName || ''
    };
    saveStoredChatSession(fresh);
    setSession(fresh);
    setThread(null);
    setMessages([]);
    setVisitorName(defaultVisitorName || '');
    setRequestedUsername('');
    setContactInfo('');
    setFirstMessage('Hi Admin, please create a new User ID for me.');
    setErrorMsg('');
  };

  const statusMeta =
    thread?.status === 'issued'
      ? {
          label: 'ID Issued',
          cls: 'text-[#14e071] bg-[#14e071]/15 border-[#14e071]/40'
        }
      : thread?.status === 'closed'
        ? {
            label: 'Closed',
            cls: 'text-slate-300 bg-white/[0.06] border-white/[0.12]'
          }
        : {
            label: 'Live Chat Open',
            cls: 'text-amber-300 bg-amber-500/15 border-amber-500/35'
          };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-lg bg-[#0a1116] border border-[#14e071]/30 rounded-2xl shadow-[0_24px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[88vh]"
          >
            {/* Header */}
            <div className="px-4 sm:px-5 py-3.5 bg-[#070c10] border-b border-white/[0.08] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#14e071]/15 border border-[#14e071]/40 flex items-center justify-center shrink-0">
                  <MessageSquarePlus className="w-4 h-4 text-[#14e071]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-white truncate">
                      Chat with Admin for New ID
                    </h3>
                    {thread && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap shrink-0 ${statusMeta.cls}`}
                      >
                        {statusMeta.label}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    Direct live support · Receive your Username & Password right here
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {thread && (
                  <button
                    type="button"
                    onClick={handleResetChat}
                    title="Start a new ID request chat"
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close chat"
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            {!thread ? (
              <form onSubmit={handleStartChat} className="p-5 space-y-4 overflow-y-auto">
                <div className="p-3.5 rounded-xl bg-[#070c10] border border-[#14e071]/25 text-xs text-slate-300 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-[#14e071] shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Tell the administrator your name and preferred username. Once Admin creates your ID, your login credentials will appear live in this chat.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Your Full Name <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
                    <input
                      type="text"
                      required
                      value={visitorName}
                      onChange={e => {
                        setVisitorName(e.target.value);
                        setErrorMsg('');
                      }}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full pl-10 pr-3.5 py-2 bg-[#060b0e] border border-white/[0.1] focus:border-[#14e071] rounded-xl text-xs text-white placeholder-slate-500 outline-none transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 block">
                      Preferred Username (Optional)
                    </label>
                    <input
                      type="text"
                      value={requestedUsername}
                      onChange={e => setRequestedUsername(e.target.value)}
                      placeholder="e.g. rahul99"
                      className="w-full px-3.5 py-2 bg-[#060b0e] border border-white/[0.1] focus:border-[#14e071] rounded-xl text-xs text-white placeholder-slate-500 outline-none transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 block">
                      Phone / Contact (Optional)
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={contactInfo}
                        onChange={e => setContactInfo(e.target.value)}
                        placeholder="+91 98XXXXXXXX"
                        className="w-full pl-9 pr-3.5 py-2 bg-[#060b0e] border border-white/[0.1] focus:border-[#14e071] rounded-xl text-xs text-white placeholder-slate-500 outline-none transition"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Message to Admin <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={firstMessage}
                    onChange={e => setFirstMessage(e.target.value)}
                    placeholder="Write your ID request or starting coin amount..."
                    className="w-full px-3.5 py-2.5 bg-[#060b0e] border border-white/[0.1] focus:border-[#14e071] rounded-xl text-xs text-white placeholder-slate-500 outline-none transition resize-none"
                  />
                </div>

                {errorMsg && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSending}
                  className="w-full py-3 rounded-xl apex-glow-btn disabled:opacity-60 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSending ? 'Connecting to Admin...' : 'Start Live Chat with Admin'}</span>
                </button>
              </form>
            ) : (
              <>
                {/* Thread Metadata Bar */}
                <div className="px-4 py-2 bg-[#080f14] border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                  <span className="truncate">
                    Requester: <strong className="text-white">{thread.visitorName}</strong>
                    {thread.requestedUsername ? ` · Desired: @${thread.requestedUsername}` : ''}
                  </span>
                  {thread.issuedUsername && (
                    <span className="text-[#14e071] font-semibold font-mono-numbers">
                      Issued: @{thread.issuedUsername}
                    </span>
                  )}
                </div>

                {/* Live Messages Stream */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#060b0e]">
                  {messages.length === 0 ? (
                    <div className="py-10 text-center text-xs text-slate-500">
                      Loading conversation...
                    </div>
                  ) : (
                    messages.map(msg => {
                      const isAdminMsg = msg.senderRole === 'admin';
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isAdminMsg ? 'items-start' : 'items-end'}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs space-y-2 ${
                              isAdminMsg
                                ? 'bg-[#0e1921] border border-[#14e071]/30 text-slate-100 rounded-tl-sm'
                                : 'bg-[#14e071] text-[#04130b] font-medium rounded-tr-sm'
                            }`}
                          >
                            <div
                              className={`flex items-center justify-between gap-3 text-[10px] ${
                                isAdminMsg ? 'text-[#14e071] font-bold' : 'text-[#04130b]/75 font-bold'
                              }`}
                            >
                              <span className="flex items-center gap-1">
                                {isAdminMsg && <ShieldCheck className="w-3 h-3" />}
                                {msg.senderName}
                              </span>
                              <span className="font-mono-numbers opacity-75">
                                {new Date(msg.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>

                            <p className="leading-relaxed whitespace-pre-wrap break-words">
                              {msg.text}
                            </p>

                            {/* Admin-Issued Credentials Card */}
                            {msg.issuedUsername && msg.issuedPassword && (
                              <div className="mt-2 p-3 rounded-xl bg-[#060b0e] border border-[#14e071]/45 space-y-2 text-slate-200">
                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#14e071]">
                                  <KeyRound className="w-3.5 h-3.5" />
                                  <span>Your New Login Credentials</span>
                                </div>

                                <div className="grid grid-cols-1 gap-1.5 text-[11px]">
                                  <div className="flex items-center justify-between bg-[#0b1319] px-2.5 py-1.5 rounded-lg border border-white/[0.08]">
                                    <span className="text-slate-400">Username:</span>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono-numbers font-bold text-white">
                                        {msg.issuedUsername}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleCopy(`u-${msg.id}`, msg.issuedUsername!)
                                        }
                                        className="text-[#14e071] hover:text-emerald-300 cursor-pointer"
                                        title="Copy username"
                                      >
                                        {copiedKey === `u-${msg.id}` ? (
                                          <Check className="w-3.5 h-3.5" />
                                        ) : (
                                          <Copy className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between bg-[#0b1319] px-2.5 py-1.5 rounded-lg border border-white/[0.08]">
                                    <span className="text-slate-400">Password:</span>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono-numbers font-bold text-white">
                                        {msg.issuedPassword}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleCopy(`p-${msg.id}`, msg.issuedPassword!)
                                        }
                                        className="text-[#14e071] hover:text-emerald-300 cursor-pointer"
                                        title="Copy password"
                                      >
                                        {copiedKey === `p-${msg.id}` ? (
                                          <Check className="w-3.5 h-3.5" />
                                        ) : (
                                          <Copy className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {onApplyCredentials && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onApplyCredentials(
                                        msg.issuedUsername!,
                                        msg.issuedPassword!
                                      );
                                      onClose();
                                    }}
                                    className="w-full py-2 rounded-lg apex-glow-btn font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
                                  >
                                    <LogIn className="w-3.5 h-3.5" />
                                    Fill Login & Sign In
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply Composer */}
                <form
                  onSubmit={handleSendFollowUp}
                  className="p-3 bg-[#080f14] border-t border-white/[0.08] space-y-2"
                >
                  {errorMsg && (
                    <div className="text-[11px] text-rose-400 px-1">{errorMsg}</div>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder="Write a message to Admin..."
                      className="flex-1 bg-[#060b0e] border border-white/[0.1] focus:border-[#14e071] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition"
                    />
                    <button
                      type="submit"
                      disabled={isSending || !replyText.trim()}
                      className="px-4 py-2.5 rounded-xl apex-glow-btn disabled:opacity-50 font-bold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send</span>
                    </button>
                  </div>
                </form>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
