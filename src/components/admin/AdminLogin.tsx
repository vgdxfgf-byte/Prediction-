import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../../context/AppContext';
import {
  ShieldCheck,
  AlertCircle,
  KeyRound,
  Crown
} from 'lucide-react';

interface AdminLoginProps {
  onGoToUserApp: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onGoToUserApp }) => {
  const { loginAdminWithGoogle } = useApp();

  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleAdminLogin = async () => {
    setErrorMsg('');
    setIsLoading(true);
    const res = await loginAdminWithGoogle();
    setIsLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Invalid administrator credentials');
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
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-amber-400/40 mx-auto flex items-center justify-center shadow-[0_10px_28px_-6px_rgba(245,158,11,0.45)]"
          >
            <Crown className="w-7 h-7 text-amber-400" />
          </motion.div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            APEX <span className="text-amber-400">ADMIN</span>
          </h1>
          <p className="text-xs text-slate-400">Control · Manage · Grow</p>
        </div>

        {/* Login Box */}
        <div className="apex-card rounded-2xl p-6 sm:p-7 space-y-5 border-amber-500/25">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <h2 className="font-bold text-sm text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#14e071]" />
              Administrator Sign In
            </h2>
            <span className="text-[11px] font-semibold text-amber-400">Verified Admin</span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Sign in with your authorized Administrator Google account to manage users, coin balances, UPI payment gateways, markets, and withdrawals across all devices in real time.
          </p>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            disabled={isLoading}
            onClick={handleGoogleAdminLogin}
            className="w-full py-3 rounded-xl apex-glow-btn disabled:opacity-60 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isLoading ? 'Authenticating...' : 'Sign In as Admin with Google'}</span>
          </motion.button>
        </div>

        {/* Back link */}
        <div className="text-center">
          <button
            onClick={onGoToUserApp}
            className="text-xs text-slate-400 hover:text-[#14e071] transition inline-flex items-center gap-1 cursor-pointer"
          >
            ← Return to User Prediction App
          </button>
        </div>
      </motion.div>
    </div>
  );
};
