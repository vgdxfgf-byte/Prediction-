import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../../context/AppContext';
import {
  User as UserIcon,
  Lock,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  ArrowRight,
  Info
} from 'lucide-react';
import { WhatsAppSupportButton } from '../common/WhatsAppSupportButton';

interface UserLoginProps {
  onGoToAdmin: () => void;
}

export const UserLogin: React.FC<UserLoginProps> = ({ onGoToAdmin }) => {
  const { loginUser, loginUserWithGoogle } = useApp();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    setIsLoading(true);
    const res = await loginUserWithGoogle();
    setIsLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Google sign-in failed');
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
            className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20"
          >
            <Sparkles className="w-6 h-6 text-slate-950 font-black" />
          </motion.div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            ApexPredict Exchange
          </h1>
          <p className="text-xs text-slate-400">
            Professional YES/NO sports and event prediction platform
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-2xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="font-bold text-sm text-white flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-emerald-400" />
              User Account Login
            </h2>
            <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-0.5 rounded bg-slate-800">
              Credentials
            </span>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Username */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">
                Username
              </label>
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
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-xs text-white placeholder-slate-500 outline-none transition"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">
                Password
              </label>
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
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-xs text-white placeholder-slate-500 outline-none transition"
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
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-60 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <span>{isLoading ? 'Verifying...' : 'Sign In To Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </form>

          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-slate-800" />
            <span className="shrink mx-3 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
              Or
            </span>
            <div className="flex-grow border-t border-slate-800" />
          </div>

          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            disabled={isLoading}
            onClick={handleGoogleLogin}
            className="w-full py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"/>
              <path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"/>
            </svg>
            <span>Continue with Google</span>
          </motion.button>

          {/* Admin-Managed Registration Notice */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <Info className="w-3.5 h-3.5 text-emerald-400" />
              <span>Admin-Managed Cloud Accounts</span>
            </div>
            <p className="text-slate-500 text-[10px]">
              Enter the username & password provided by the administrator (you will verify once with Google to link your account across devices), or sign in directly with Google.
            </p>
          </div>

          {/* Admin-Managed WhatsApp Support Button */}
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
    </div>
  );
};
