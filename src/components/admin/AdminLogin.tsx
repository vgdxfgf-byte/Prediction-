import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../../context/AppContext';
import {
  ShieldCheck,
  AlertCircle,
  KeyRound
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
            className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 mx-auto flex items-center justify-center shadow-lg shadow-amber-500/20"
          >
            <ShieldCheck className="w-8 h-8 text-slate-950 font-black" />
          </motion.div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            ApexPredict Admin Console
          </h1>
          <p className="text-xs text-amber-400 font-semibold tracking-wide uppercase">
            Restricted Management Access
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-2xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="font-bold text-sm text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-400" />
              Administrator Authentication
            </h2>
            <span className="text-[10px] uppercase font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
              Role: Admin
            </span>
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
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-60 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-950/50 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isLoading ? 'Authenticating...' : 'Sign In as Admin with Google'}</span>
          </motion.button>
        </div>

        {/* Back link */}
        <div className="text-center">
          <button
            onClick={onGoToUserApp}
            className="text-xs text-slate-400 hover:text-slate-200 transition inline-flex items-center gap-1 cursor-pointer"
          >
            ← Return to User Prediction App
          </button>
        </div>
      </motion.div>
    </div>
  );
};
