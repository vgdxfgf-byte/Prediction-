import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { 
  KeyRound, 
  User as UserIcon, 
  CheckCircle2, 
  AlertTriangle, 
  X,
  Calendar,
  Coins
} from 'lucide-react';

interface ProfileViewProps {
  onClose: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onClose }) => {
  const { currentUser, changePassword } = useApp();

  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!currentUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (newPass !== confirmPass) {
      setErrorMsg('New password and confirmation do not match');
      return;
    }

    if (newPass.length < 4) {
      setErrorMsg('New password must be at least 4 characters long');
      return;
    }

    const res = await changePassword(currentUser.id, currentPass, newPass);
    if (res.success) {
      setSuccessMsg('Password updated successfully!');
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      setTimeout(() => {
        setSuccessMsg('');
      }, 3000);
    } else {
      setErrorMsg(res.error || 'Failed to update password');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md bg-[#0a1116] border border-[#14e071]/30 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/[0.08] bg-[#070c10]">
          <div className="flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-[#14e071]" />
            <h3 className="font-bold text-base text-white">Account & Security</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.06] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 text-xs">
          {/* User info card */}
          <div className="bg-[#060b0e] p-4 rounded-xl border border-white/[0.08] space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-sm text-white">{currentUser.fullName}</div>
                <div className="text-slate-400">@{currentUser.username}</div>
              </div>
              <span className="text-[#14e071] text-[11px] font-bold">
                {currentUser.status.toUpperCase()}
              </span>
            </div>

            <div className="pt-2 border-t border-white/[0.07] flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                Balance:
              </span>
              <span className="font-mono-numbers font-bold text-[#14e071] text-xs">
                {currentUser.coins.toLocaleString()} Coins
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Member Since:
              </span>
              <span>{new Date(currentUser.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>

          {/* Change Password Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5 pt-1">
              <KeyRound className="w-3.5 h-3.5 text-[#14e071]" />
              Change Account Password
            </h4>

            <div className="space-y-1">
              <label className="text-slate-400 font-medium block">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPass}
                onChange={e => setCurrentPass(e.target.value)}
                placeholder="Enter current password"
                className="w-full bg-[#060b0e] border border-white/[0.1] focus:border-[#14e071] rounded-xl px-3 py-2 text-white outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-medium block">
                New Password
              </label>
              <input
                type="password"
                required
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                placeholder="Enter new password (min 4 chars)"
                className="w-full bg-[#060b0e] border border-white/[0.1] focus:border-[#14e071] rounded-xl px-3 py-2 text-white outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-medium block">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirmPass}
                onChange={e => setConfirmPass(e.target.value)}
                placeholder="Confirm new password"
                className="w-full bg-[#060b0e] border border-white/[0.1] focus:border-[#14e071] rounded-xl px-3 py-2 text-white outline-none"
              />
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[#14e071] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl apex-glow-btn font-bold uppercase tracking-wider transition cursor-pointer"
              >
                Update Password
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
};
