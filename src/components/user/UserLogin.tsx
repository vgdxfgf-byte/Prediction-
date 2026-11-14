import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../../context/AppContext';
import {
  User as UserIcon,
  Lock,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  Info,
  MessageSquarePlus
} from 'lucide-react';
import { WhatsAppSupportButton } from '../common/WhatsAppSupportButton';
import { NewIdChatModal, loadStoredChatSession } from './NewIdChatModal';
import { subscribeIdChatThread } from '../../services/firestoreService';
import type { IdChatThread } from '../../types';

interface UserLoginProps {
  onGoToAdmin: () => void;
}

export const UserLogin: React.FC<UserLoginProps> = ({ onGoToAdmin }) => {
  const { loginUser } = useApp();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showIdChat, setShowIdChat] = useState(false);
  const [savedThread, setSavedThread] = useState<IdChatThread | null>(null);

  useEffect(() => {
    const existing = loadStoredChatSession();
    if (!existing) return;
    const unsub = subscribeIdChatThread(existing.chatId, thread => {
      setSavedThread(thread);
    });
    return () => unsub();
  }, [showIdChat]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    const res = await loginUser(username, password);
    setIsLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Invalid credentials');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md space-y-6"
      >
        {/* Branding header */}
        <div className="text-center space-y-2">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.24, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#16f27b] to-[#0bb55a] mx-auto flex items-center justify-center shadow-[0_12px_28px_-6px_rgba(20,224,113,0.6)]"
          >
            <TrendingUp className="w-7 h-7 text-[#04130b] stroke-[2.5]" />
          </motion.div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            APEX <span className="text-[#14e071]">PREDICT</span>
          </h1>
          <p className="text-xs text-slate-400">Predict · Play · Win</p>
        </div>

        {/* Login Box */}
        <div className="apex-card-emerald rounded-2xl p-6 sm:p-7 space-y-5">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <h2 className="font-bold text-sm text-white flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-[#14e071]" />
              Player Sign In
            </h2>
            <span className="text-[11px] font-semibold text-[#14e071]">Username & Password</span>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">Username</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={e => {
                    setUsername(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="Enter your username"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#060b0e] border border-white/[0.1] focus:border-[#14e071] rounded-xl text-xs text-white placeholder-slate-500 outline-none transition"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#060b0e] border border-white/[0.1] focus:border-[#14e071] rounded-xl text-xs text-white placeholder-slate-500 outline-none transition"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <motion.button
              type="submit"
              whileTap={{ scale: 0.98 }}
              disabled={isLoading}
              className="w-full py-3 rounded-xl apex-glow-btn disabled:opacity-60 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <span>{isLoading ? 'Verifying...' : 'Sign In To Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </form>

          {/* Live Chat with Admin for New ID */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowIdChat(true)}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-[#14e071]/40 text-xs font-bold text-[#14e071] flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <MessageSquarePlus className="w-4 h-4 shrink-0" />
            <span>Don&apos;t have an ID? Chat with Admin</span>
            {savedThread?.unreadByUser && (
              <span className="px-2 py-0.5 rounded-full bg-[#14e071] text-[#04130b] text-[10px] font-black">
                {savedThread.status === 'issued' ? 'ID Ready' : 'New Reply'}
              </span>
            )}
          </motion.button>

          {/* Admin-Managed Registration Notice */}
          <div className="p-3 bg-[#060b0e] rounded-xl border border-white/[0.07] text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-200 font-semibold">
              <Info className="w-3.5 h-3.5 text-[#14e071]" />
              <span>Admin-Managed Accounts</span>
            </div>
            <p className="text-slate-400 text-[10px] leading-relaxed">
              User accounts are issued by the platform administrator. Chat directly above to get your new Username & Password, or sign in if you already have one.
            </p>
          </div>

          <WhatsAppSupportButton variant="login" />
        </div>

        {/* Portal Switch Link */}
        <div className="text-center">
          <button
            onClick={onGoToAdmin}
            className="text-xs text-amber-400 hover:text-amber-300 font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Switch to Administrator Portal →
          </button>
        </div>
      </motion.div>

      <NewIdChatModal
        isOpen={showIdChat}
        onClose={() => setShowIdChat(false)}
        onApplyCredentials={(u, p) => {
          setUsername(u);
          setPassword(p);
          setErrorMsg('');
        }}
      />
    </div>
  );
};
