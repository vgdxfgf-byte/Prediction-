import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import type { ConfirmationResult } from 'firebase/auth';
import { useApp } from '../../context/AppContext';
import {
  KeyRound,
  User as UserIcon,
  CheckCircle2,
  AlertTriangle,
  X,
  Calendar,
  Coins,
  Smartphone,
  RotateCcw
} from 'lucide-react';

interface ProfileViewProps {
  onClose: () => void;
}

const COUNTRY_CODES = [
  { code: '+91', label: '🇮🇳 +91' },
  { code: '+971', label: '🇦🇪 +971' },
  { code: '+1', label: '🇺🇸 +1' },
  { code: '+44', label: '🇬🇧 +44' },
  { code: '+61', label: '🇦🇺 +61' },
  { code: '+92', label: '🇵🇰 +92' },
  { code: '+880', label: '🇧🇩 +880' },
  { code: '+977', label: '🇳🇵 +977' }
];

export const ProfileView: React.FC<ProfileViewProps> = ({ onClose }) => {
  const {
    currentUser,
    changePassword,
    sendOwnPhoneOtp,
    completeOwnPhoneOtp,
    getOwnPrivatePhone,
    clearPhoneRecaptcha
  } = useApp();

  const [tab, setTab] = useState<'password' | 'otp'>('password');

  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const [linkedPhone, setLinkedPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneInput, setPhoneInput] = useState('');
  const [otpStep, setOtpStep] = useState<'phone' | 'verify'>('phone');
  const [otpCode, setOtpCode] = useState('');
  const [otpNewPass, setOtpNewPass] = useState('');
  const [otpConfirmPass, setOtpConfirmPass] = useState('');
  const [otpConfirmResult, setOtpConfirmResult] = useState<ConfirmationResult | null>(null);
  const [otpE164Phone, setOtpE164Phone] = useState('');
  const [resendSeconds, setResendSeconds] = useState(0);

  const [isBusy, setIsBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    void getOwnPrivatePhone().then(phone => {
      if (!active || !phone) return;
      setLinkedPhone(phone);
      setPhoneInput(phone);
    });
    return () => {
      active = false;
    };
  }, [currentUser, getOwnPrivatePhone]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const id = window.setInterval(() => {
      setResendSeconds(s => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resendSeconds]);

  useEffect(() => {
    return () => {
      clearPhoneRecaptcha('profile-recaptcha-container');
    };
  }, [clearPhoneRecaptcha]);

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

    setIsBusy(true);
    const res = await changePassword(currentUser.id, currentPass, newPass);
    setIsBusy(false);

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

  const handleSendOwnOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsBusy(true);

    const res = await sendOwnPhoneOtp({
      phone: phoneInput,
      countryCode,
      recaptchaContainerId: 'profile-recaptcha-container'
    });
    setIsBusy(false);

    if (!res.success || !res.confirmationResult || !res.e164Phone) {
      setErrorMsg(res.error || 'Failed to send OTP');
      return;
    }

    setOtpConfirmResult(res.confirmationResult);
    setOtpE164Phone(res.e164Phone);
    setOtpStep('verify');
    setResendSeconds(30);
    setSuccessMsg(`OTP sent to ${res.e164Phone}`);
  };

  const handleVerifyOwnOtpAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!otpConfirmResult) {
      setErrorMsg('OTP session expired. Please request a new OTP.');
      setOtpStep('phone');
      return;
    }
    if (otpNewPass.trim().length < 4) {
      setErrorMsg('New password must be at least 4 characters long');
      return;
    }
    if (otpNewPass !== otpConfirmPass) {
      setErrorMsg('New password and confirmation do not match');
      return;
    }

    setIsBusy(true);
    const res = await completeOwnPhoneOtp({
      confirmationResult: otpConfirmResult,
      otpCode,
      newPassword: otpNewPass,
      e164Phone: otpE164Phone
    });
    setIsBusy(false);

    if (!res.success) {
      setErrorMsg(res.error || 'Failed to verify OTP');
      return;
    }

    setLinkedPhone(otpE164Phone);
    setOtpCode('');
    setOtpNewPass('');
    setOtpConfirmPass('');
    setOtpStep('phone');
    setSuccessMsg('Mobile verified & password updated successfully!');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md bg-[#0a1116] border border-[#14e071]/30 rounded-2xl shadow-2xl overflow-hidden my-auto"
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
                <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                Mobile Number:
              </span>
              <span className={linkedPhone ? 'text-white font-semibold' : 'text-amber-300'}>
                {linkedPhone || 'Not linked (verify via OTP below)'}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Member Since:
              </span>
              <span>
                {new Date(currentUser.createdAt).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </div>
          </div>

          {/* Security Mode Switcher */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#060b0e] rounded-xl border border-white/[0.08]">
            <button
              type="button"
              onClick={() => {
                setTab('password');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`py-2 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                tab === 'password' ? 'bg-[#14e071] text-[#04130b]' : 'text-slate-400 hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Current Password</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('otp');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`py-2 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                tab === 'otp' ? 'bg-[#14e071] text-[#04130b]' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Via Mobile OTP</span>
            </button>
          </div>

          <div id="profile-recaptcha-container" />

          {tab === 'password' ? (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-slate-400 font-medium block">Current Password</label>
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
                <label className="text-slate-400 font-medium block">New Password</label>
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
                <label className="text-slate-400 font-medium block">Confirm New Password</label>
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
                  disabled={isBusy}
                  className="w-full py-2.5 rounded-xl apex-glow-btn disabled:opacity-60 font-bold uppercase tracking-wider transition cursor-pointer"
                >
                  {isBusy ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          ) : otpStep === 'phone' ? (
            <form onSubmit={handleSendOwnOtp} className="space-y-3">
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Verify your mobile number via SMS OTP to link it to your account and make/update your password anytime via OTP.
              </p>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium block">Mobile Number</label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={e => setCountryCode(e.target.value)}
                    className="w-24 bg-[#060b0e] border border-white/[0.1] focus:border-[#14e071] rounded-xl px-2 py-2 text-white outline-none"
                  >
                    {COUNTRY_CODES.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    required
                    inputMode="tel"
                    value={phoneInput}
                    onChange={e => {
                      setPhoneInput(e.target.value);
                      setErrorMsg('');
                    }}
                    placeholder="10-digit mobile number"
                    className="flex-1 bg-[#060b0e] border border-white/[0.1] focus:border-[#14e071] rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>
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

              <button
                type="submit"
                disabled={isBusy}
                className="w-full py-2.5 rounded-xl apex-glow-btn disabled:opacity-60 font-bold uppercase tracking-wider transition cursor-pointer"
              >
                {isBusy ? 'Sending OTP...' : 'Send Mobile OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOwnOtpAndSave} className="space-y-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-[#14e071]/30 flex items-center justify-between">
                <span className="text-emerald-200">
                  OTP sent to <strong className="text-white">{otpE164Phone}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setOtpStep('phone');
                    setOtpCode('');
                    setErrorMsg('');
                  }}
                  className="text-[#14e071] font-bold hover:underline cursor-pointer"
                >
                  Change
                </button>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-slate-400 font-medium block">6-Digit OTP</label>
                  <button
                    type="button"
                    disabled={resendSeconds > 0 || isBusy}
                    onClick={() => void handleSendOwnOtp()}
                    className="text-[11px] font-semibold text-[#14e071] disabled:text-slate-500 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{resendSeconds > 0 ? `Resend in ${resendSeconds}s` : 'Resend OTP'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit OTP"
                  className="w-full bg-[#060b0e] border border-white/[0.1] focus:border-[#14e071] rounded-xl px-3 py-2 text-center tracking-[0.25em] font-mono-numbers text-white outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium block">New Password</label>
                <input
                  type="password"
                  required
                  minLength={4}
                  value={otpNewPass}
                  onChange={e => setOtpNewPass(e.target.value)}
                  placeholder="Enter new password (min 4 chars)"
                  className="w-full bg-[#060b0e] border border-white/[0.1] focus:border-[#14e071] rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium block">Confirm New Password</label>
                <input
                  type="password"
                  required
                  minLength={4}
                  value={otpConfirmPass}
                  onChange={e => setOtpConfirmPass(e.target.value)}
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

              <button
                type="submit"
                disabled={isBusy}
                className="w-full py-2.5 rounded-xl apex-glow-btn disabled:opacity-60 font-bold uppercase tracking-wider transition cursor-pointer"
              >
                {isBusy ? 'Verifying...' : 'Verify OTP & Save Password'}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
