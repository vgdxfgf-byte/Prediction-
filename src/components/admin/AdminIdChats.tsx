import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { subscribeIdChatMessages } from '../../services/firestoreService';
import type { IdChatMessage, IdChatStatus } from '../../types';
import {
  MessageSquareText,
  Search,
  Send,
  UserPlus,
  KeyRound,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  Phone,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

type ThreadFilter = 'all' | 'open' | 'issued' | 'closed';

export const AdminIdChats: React.FC = () => {
  const { idChats, createUser, sendAdminIdChatReply, updateIdChatStatus, markIdChatRead } =
    useApp();

  const [filter, setFilter] = useState<ThreadFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<IdChatMessage[]>([]);

  // Reply input
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // Inline Create & Send New ID builder
  const [showIdBuilder, setShowIdBuilder] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newCoins, setNewCoins] = useState('500');
  const [creatingId, setCreatingId] = useState(false);
  const [builderError, setBuilderError] = useState('');
  const [builderSuccess, setBuilderSuccess] = useState('');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const filteredChats = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return idChats.filter(c => {
      if (filter !== 'all' && c.status !== filter) return false;
      if (!q) return true;
      return (
        c.visitorName.toLowerCase().includes(q) ||
        (c.requestedUsername || '').toLowerCase().includes(q) ||
        (c.issuedUsername || '').toLowerCase().includes(q) ||
        (c.contactInfo || '').toLowerCase().includes(q) ||
        c.lastMessage.toLowerCase().includes(q)
      );
    });
  }, [idChats, filter, searchQuery]);

  // Select first thread automatically if none selected
  useEffect(() => {
    if (!selectedChatId && filteredChats.length > 0) {
      setSelectedChatId(filteredChats[0].id);
    } else if (
      selectedChatId &&
      !idChats.some(c => c.id === selectedChatId) &&
      filteredChats.length > 0
    ) {
      setSelectedChatId(filteredChats[0].id);
    }
  }, [filteredChats, idChats, selectedChatId]);

  const selectedChat = useMemo(
    () => idChats.find(c => c.id === selectedChatId) || null,
    [idChats, selectedChatId]
  );

  // Subscribe to selected thread's messages & mark read
  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      return;
    }
    if (selectedChat.unreadByAdmin) {
      void markIdChatRead(selectedChat.id, 'admin');
    }
    const unsub = subscribeIdChatMessages(selectedChat.id, list => {
      setMessages(list);
    });
    return () => unsub();
  }, [selectedChat?.id, selectedChat?.unreadByAdmin, markIdChatRead]);

  // Auto scroll when messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, selectedChat?.id]);

  // Pre-fill ID builder whenever Admin opens it for a thread
  const handleOpenIdBuilder = () => {
    if (!selectedChat) return;
    const baseName = (selectedChat.requestedUsername || selectedChat.visitorName || 'player')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '')
      .slice(0, 14);
    const suggestedUser =
      baseName.length >= 3
        ? baseName
        : `player${Math.floor(100 + Math.random() * 899)}`;
    const randomPass = `apx${Math.floor(1000 + Math.random() * 8999)}`;

    setNewUsername(suggestedUser);
    setNewPassword(randomPass);
    setNewFullName(selectedChat.visitorName || suggestedUser);
    setNewCoins('500');
    setBuilderError('');
    setBuilderSuccess('');
    setShowIdBuilder(prev => !prev);
  };

  const handleGenerateCredentials = () => {
    const cleanPrefix = (selectedChat?.visitorName || 'apex')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 6) || 'apex';
    setNewUsername(`${cleanPrefix}${Math.floor(100 + Math.random() * 899)}`);
    setNewPassword(`win${Math.floor(10000 + Math.random() * 89999)}`);
    setBuilderError('');
  };

  const handleCreateAndSendId = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChat) return;
    setBuilderError('');
    setBuilderSuccess('');
    setCreatingId(true);

    const coinsNum = Math.max(0, Number(newCoins) || 0);
    const createRes = await createUser({
      username: newUsername,
      password: newPassword,
      fullName: newFullName,
      phone: selectedChat.contactInfo || undefined,
      initialCoins: coinsNum,
      notes: `Issued via Live ID Chat (${selectedChat.id})`
    });

    if (!createRes.success || !createRes.user) {
      setCreatingId(false);
      setBuilderError(createRes.error || 'Failed to create user account');
      return;
    }

    const issuedUser = createRes.user.username;
    const issuedPass = newPassword.trim();
    const replyRes = await sendAdminIdChatReply({
      chatId: selectedChat.id,
      text: `Your new ApexPredict account is ready with ${coinsNum.toLocaleString()} coins! Use the credentials below to sign in.`,
      issuedUsername: issuedUser,
      issuedPassword: issuedPass,
      nextStatus: 'issued'
    });

    setCreatingId(false);
    if (!replyRes.success) {
      setBuilderError(
        `User @${issuedUser} created, but failed to post message: ${replyRes.error}`
      );
      return;
    }

    setBuilderSuccess(`Account @${issuedUser} created & sent in chat!`);
    setShowIdBuilder(false);
    setTimeout(() => setBuilderSuccess(''), 4000);
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChat || !replyText.trim() || sendingReply) return;
    setSendingReply(true);
    const msg = replyText.trim();
    setReplyText('');
    const res = await sendAdminIdChatReply({
      chatId: selectedChat.id,
      text: msg
    });
    setSendingReply(false);
    if (!res.success) {
      setReplyText(msg);
      setBuilderError(res.error || 'Failed to send reply');
    }
  };

  const handleStatusChange = async (status: IdChatStatus) => {
    if (!selectedChat) return;
    await updateIdChatStatus(selectedChat.id, status);
  };

  const unreadCount = idChats.filter(c => c.unreadByAdmin).length;
  const openCount = idChats.filter(c => c.status === 'open').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="apex-card rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <MessageSquareText className="w-5 h-5 text-[#14e071]" />
            New ID Request Chats
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Chat live with visitors requesting a new User ID and create & send credentials instantly.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono-numbers">
          <span className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold">
            {unreadCount} Unread
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-[#14e071]/15 border border-[#14e071]/30 text-[#14e071] font-bold">
            {openCount} Open
          </span>
        </div>
      </div>

      {/* Main Split Inbox */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left: Chat List */}
        <div className="lg:col-span-4 apex-card rounded-2xl p-4 flex flex-col gap-3 max-h-[660px]">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search name, username, message..."
              className="w-full pl-9 pr-3 py-2 bg-[#060b0e] border border-white/[0.09] focus:border-[#14e071] rounded-xl text-xs text-white placeholder-slate-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#070c10] p-1 rounded-xl border border-white/[0.06]">
            {(['all', 'open', 'issued', 'closed'] as ThreadFilter[]).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold capitalize transition cursor-pointer ${
                  filter === tab
                    ? 'bg-[#14e071] text-[#04130b] font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
            {filteredChats.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No ID request chats match this filter.
              </div>
            ) : (
              filteredChats.map(chat => {
                const isSelected = chat.id === selectedChat?.id;
                return (
                  <button
                    key={chat.id}
                    type="button"
                    onClick={() => {
                      setSelectedChatId(chat.id);
                      setShowIdBuilder(false);
                      setBuilderError('');
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition cursor-pointer space-y-1.5 ${
                      isSelected
                        ? 'bg-emerald-500/15 border-[#14e071]/50'
                        : 'bg-[#070c10] border-white/[0.06] hover:border-white/[0.15]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-white truncate flex items-center gap-1.5">
                        {chat.unreadByAdmin && (
                          <span className="px-1.5 py-0.2 rounded bg-[#14e071] text-[#04130b] text-[9px] font-black uppercase">
                            New
                          </span>
                        )}
                        {chat.visitorName}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase shrink-0 ${
                          chat.status === 'issued'
                            ? 'text-[#14e071]'
                            : chat.status === 'closed'
                              ? 'text-slate-500'
                              : 'text-amber-400'
                        }`}
                      >
                        {chat.status}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-1">
                      {chat.lastMessage || 'No messages yet'}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono-numbers">
                      <span className="truncate">
                        {chat.issuedUsername
                          ? `Issued: @${chat.issuedUsername}`
                          : chat.requestedUsername
                            ? `Wants: @${chat.requestedUsername}`
                            : 'New ID Inquiry'}
                      </span>
                      <span>
                        {new Date(chat.updatedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Active Conversation & Inline ID Issuer */}
        <div className="lg:col-span-8 apex-card rounded-2xl flex flex-col h-[660px] overflow-hidden">
          {!selectedChat ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-2">
              <MessageSquareText className="w-8 h-8 text-slate-600" />
              <h3 className="text-sm font-bold text-slate-300">Select a Chat Thread</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Choose any user inquiry on the left to reply live or issue a new User ID directly in chat.
              </p>
            </div>
          ) : (
            <>
              {/* Active Chat Header */}
              <div className="p-4 bg-[#070c10] border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm text-white truncate">
                      {selectedChat.visitorName}
                    </h3>
                    {selectedChat.requestedUsername && (
                      <span className="text-[11px] text-slate-400">
                        · Desired: <strong className="text-white">@{selectedChat.requestedUsername}</strong>
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                    {selectedChat.contactInfo && (
                      <span className="flex items-center gap-1 font-mono-numbers">
                        <Phone className="w-3 h-3 text-[#14e071]" />
                        {selectedChat.contactInfo}
                      </span>
                    )}
                    {selectedChat.issuedUsername && (
                      <span className="text-[#14e071] font-semibold">
                        Issued Account: @{selectedChat.issuedUsername}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleOpenIdBuilder}
                    className="px-3.5 py-2 rounded-xl apex-glow-btn font-bold text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{showIdBuilder ? 'Hide ID Form' : 'Create & Send New ID'}</span>
                  </button>

                  {selectedChat.status !== 'closed' ? (
                    <button
                      type="button"
                      onClick={() => handleStatusChange('closed')}
                      className="px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 text-xs font-semibold flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Close
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleStatusChange('open')}
                      className="px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-[#14e071] text-xs font-semibold flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reopen
                    </button>
                  )}
                </div>
              </div>

              {/* Feedback Banners */}
              {builderSuccess && (
                <div className="mx-4 mt-3 p-2.5 rounded-xl bg-emerald-500/15 border border-[#14e071]/40 text-[#14e071] text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{builderSuccess}</span>
                </div>
              )}

              {/* Inline Create & Send ID Drawer */}
              {showIdBuilder && (
                <form
                  onSubmit={handleCreateAndSendId}
                  className="mx-4 mt-3 p-4 rounded-xl bg-[#070d12] border border-[#14e071]/35 space-y-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-[#14e071] flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4" />
                      Create User ID & Send Credentials to Chat
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateCredentials}
                      className="text-[11px] font-semibold text-amber-300 hover:text-amber-200 flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      Auto-Generate
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Username</label>
                      <input
                        type="text"
                        required
                        value={newUsername}
                        onChange={e => setNewUsername(e.target.value)}
                        placeholder="rahul99"
                        className="w-full bg-[#060b0e] border border-white/[0.1] focus:border-[#14e071] rounded-lg px-2.5 py-1.5 text-white font-mono-numbers outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Password</label>
                      <input
                        type="text"
                        required
                        minLength={4}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="min 4 chars"
                        className="w-full bg-[#060b0e] border border-white/[0.1] focus:border-[#14e071] rounded-lg px-2.5 py-1.5 text-white font-mono-numbers outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Full Name</label>
                      <input
                        type="text"
                        required
                        value={newFullName}
                        onChange={e => setNewFullName(e.target.value)}
                        className="w-full bg-[#060b0e] border border-white/[0.1] focus:border-[#14e071] rounded-lg px-2.5 py-1.5 text-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Initial Coins</label>
                      <input
                        type="number"
                        min={0}
                        value={newCoins}
                        onChange={e => setNewCoins(e.target.value)}
                        className="w-full bg-[#060b0e] border border-white/[0.1] focus:border-[#14e071] rounded-lg px-2.5 py-1.5 text-white font-mono-numbers outline-none"
                      />
                    </div>
                  </div>

                  {builderError && (
                    <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{builderError}</span>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowIdBuilder(false)}
                      className="px-3 py-1.5 rounded-lg bg-white/[0.06] text-slate-300 font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creatingId}
                      className="px-4 py-1.5 rounded-lg apex-glow-btn disabled:opacity-60 font-bold cursor-pointer"
                    >
                      {creatingId ? 'Creating & Sending...' : 'Create ID & Send in Chat'}
                    </button>
                  </div>
                </form>
              )}

              {/* Messages List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#060b0e]">
                {messages.map(msg => {
                  const isAdminMsg = msg.senderRole === 'admin';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isAdminMsg ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs space-y-2 ${
                          isAdminMsg
                            ? 'bg-emerald-500/15 border border-[#14e071]/35 text-slate-100 rounded-tr-sm'
                            : 'bg-[#0f1920] border border-white/[0.08] text-slate-200 rounded-tl-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 text-[10px]">
                          <span
                            className={`font-bold flex items-center gap-1 ${
                              isAdminMsg ? 'text-[#14e071]' : 'text-sky-400'
                            }`}
                          >
                            {isAdminMsg && <ShieldCheck className="w-3 h-3" />}
                            {msg.senderName}
                          </span>
                          <span className="text-slate-500 font-mono-numbers">
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>

                        <p className="leading-relaxed whitespace-pre-wrap break-words">
                          {msg.text}
                        </p>

                        {msg.issuedUsername && msg.issuedPassword && (
                          <div className="p-2.5 rounded-xl bg-[#060b0e] border border-[#14e071]/35 font-mono-numbers text-[11px] space-y-1">
                            <div className="text-[#14e071] font-bold">Sent Login Credentials:</div>
                            <div>
                              Username: <strong className="text-white">{msg.issuedUsername}</strong>
                            </div>
                            <div>
                              Password: <strong className="text-white">{msg.issuedPassword}</strong>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Admin Reply Composer */}
              <form
                onSubmit={handleSendReply}
                className="p-3 bg-[#070c10] border-t border-white/[0.08] flex items-center gap-2"
              >
                <input
                  type="text"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Type a live reply to this user..."
                  className="flex-1 bg-[#060b0e] border border-white/[0.1] focus:border-[#14e071] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none"
                />
                <button
                  type="submit"
                  disabled={sendingReply || !replyText.trim()}
                  className="px-4 py-2.5 rounded-xl apex-glow-btn disabled:opacity-50 font-bold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingReply ? 'Sending...' : 'Reply'}</span>
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
