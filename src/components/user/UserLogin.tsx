import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import type { ConfirmationResult } from 'firebase/auth';
import { useApp } from '../../context/AppContext';
import {
  User as UserIcon,
  Lock,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  MessageSquarePlus,
  Smartphone,
  UserPlus,
  RotateCcw,
  Eye,
  EyeOff
} from 'lucide-react';
import { WhatsAppSupportButton } from '../common/WhatsAppSupportButton';
import { NewIdChatModal, loadStoredChatSession } from './NewIdChatModal';
import { subscribeIdChatThread } from '../../services/firestoreService';
import type { IdChatThread } from '../../types';

interface UserLoginProps {
  onGoToAdmin: () => void;
}

type AuthMode = 'signin' | 'register';

const COUNTRY_CODES = [
  { code: '+91', label: '🇮🇳 +91 (IN)' },
  { code: '+971', label: '🇦🇪 +971 (AE)' },
  { code: '+1', label: '🇺🇸 +1 (US/CA)' },
  { code: '+44', label: '🇬🇧 +44 (UK)' },
  { code: '+61', label: '🇦🇺 +61 (AU)' },
  { code: '+92', label: '🇵🇰 +92 (PK)' },
  { code: '+880', label: '🇧🇩 +880 (BD)' },
  { code: '+977', label: '🇳🇵 +977 (NP)' },
  { code: '+94', label: '🇱🇰 +94 (LK)' },
  { code: '+65', label: '🇸🇬 +65 (SG)' }
];

export const UserLogin: React.FC<UserLoginProps> = ({ onGoToAdmin }) => {
  const {
    loginUser,
    registerFreeWithPhone,
    sendRegistrationOtp,
    completeRegistrationOtp,
    clearPhoneRecaptcha
  } = useApp();

  const [mode, setMode] = useState<AuthMode>('signin');

  // Sign-In state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showSignInPass, setShowSignInPass] = useState(false);

  // Registration state ('free' = 100% free on Spark plan; 'otp' = Firebase SMS OTP)
  const [regMethod, setRegMethod] = useState<'free' | 'otp'>('free');
  const [regStep, setRegStep] = useState<'details' | 'otp'>('details');
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regCountryCode, setRegCountryCode] = useState('+91');
  const [regPhone, setRegPhone] = useState('');
  const [regOtp, setRegOtp] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regConfirmResult, setRegConfirmResult] = useState<ConfirmationResult | null>(null);
  const [regE164Phone, setRegE164Phone] = useState('');
  const [showRegPass, setShowRegPass] = useState(false);

  // Shared UI state
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
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

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const id = window.setInterval(() => {
      setResendSeconds(s => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resendSeconds]);

  useEffect(() => {
    return () => {
      clearPhoneRecaptcha('firebase-recaptcha-container');
    };
  }, [clearPhoneRecaptcha]);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setErrorMsg('');
    setSuccessMsg('');
    clearPhoneRecaptcha('firebase-recaptcha-container');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    const res = await loginUser(identifier, password);
    setIsLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Invalid credentials');
    }
  };

  const handleFreeRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (regPassword.trim().length < 4) {
      setErrorMsg('Password must be at least 4 characters long');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Password and confirmation do not match');
      return;
    }

    setIsLoading(true);
    const res = await registerFreeWithPhone({
      fullName: regFullName,
      username: regUsername,
      phone: regPhone,
      countryCode: regCountryCode,
      password: regPassword
    });
    setIsLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || 'Failed to create account');
      return;
    }
    setSuccessMsg('Account created! Signing you in...');
  };

  const handleSendRegOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    const res = await sendRegistrationOtp({
      fullName: regFullName,
      username: regUsername,
      phone: regPhone,
      countryCode: regCountryCode,
      recaptchaContainerId: 'firebase-recaptcha-container'
    });
    setIsLoading(false);

    if (!res.success || !res.confirmationResult || !res.e164Phone) {
      setErrorMsg(res.error || 'Failed to send OTP');
      return;
    }

    setRegConfirmResult(res.confirmationResult);
    setRegE164Phone(res.e164Phone);
    if (res.normalizedUsername) setRegUsername(res.normalizedUsername);
    setRegStep('otp');
    setResendSeconds(30);
    setSuccessMsg(`6-digit OTP sent to ${res.e164Phone}`);
  };

  const handleVerifyRegOtpAndCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!regConfirmResult) {
      setErrorMsg('OTP session expired. Please request a new OTP.');
      setRegStep('details');
      return;
    }
    if (regPassword.trim().length < 4) {
      setErrorMsg('Password must be at least 4 characters long');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Password and confirmation do not match');
      return;
    }

    setIsLoading(true);
    const res = await completeRegistrationOtp({
      confirmationResult: regConfirmResult,
      otpCode: regOtp,
      fullName: regFullName,
      username: regUsername,
      password: regPassword,
      e164Phone: regE164Phone
    });
    setIsLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || 'OTP verification failed');
      return;
    }
    setSuccessMsg('Account verified and password created!');
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

        {/* Auth Card */}
        <div className="apex-card-emerald rounded-2xl p-6 sm:p-7 space-y-5">
          {/* Mode Tabs */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#060b0e] rounded-xl border border-white/[0.08]">
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                mode === 'signin'
                  ? 'bg-[#14e071] text-[#04130b] shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5 shrink-0" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                mode === 'register'
                  ? 'bg-[#14e071] text-[#04130b] shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 shrink-0" />
              <span>Create ID</span>
            </button>
          </div>

          {/* Persistent Firebase reCAPTCHA container */}
          <div id="firebase-recaptcha-container" className="flex justify-center overflow-x-auto" />

          {/* MODE 1: SIGN IN */}
          {mode === 'signin' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">
                  Username or Mobile Number
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    autoComplete="username"
                    value={identifier}
                    onChange={e => {
                      setIdentifier(e.target.value);
                      setErrorMsg('');
                    }}
                    placeholder="Enter username or +919876543210"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#060b0e] border border-white/[0.1] focus:border-[#14e071] rounded-xl text-xs text-white placeholder-slate-500 outline-none transition"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type={showSignInPass ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={e => {
                      setPassword(e.target.value);
                      setErrorMsg('');
                    }}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-10 py-2.5 bg-[#060b0e] border border-white/[0.1] focus:border-[#14e071] rounded-xl text-xs text-white placeholder-slate-500 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignInPass(v => !v)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                    aria-label="Toggle password visibility"
                  >
                    {showSignInPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
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
          )}

          {/* MODE 2: SELF-REGISTER (FREE INSTANT OR SMS OTP) */}
          {mode === 'register' && (
            <div className="space-y-3.5">
              {/* Method Switcher: Instant Free (Spark) vs SMS OTP */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#060b0e] rounded-xl border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => {
                    setRegMethod('free');
                    setRegStep('details');
                    setErrorMsg('');
                    setSuccessMsg('');
                    clearPhoneRecaptcha('firebase-recaptcha-container');
                  }}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    regMethod === 'free' ? 'bg-emerald-500/20 text-[#14e071] border border-[#14e071]/40' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Instant Free (No SMS Fee)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRegMethod('otp');
                    setRegStep('details');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    regMethod === 'otp' ? 'bg-emerald-500/20 text-[#14e071] border border-[#14e071]/40' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Mobile SMS OTP
                </button>
              </div>

              {regMethod === 'free' ? (
                <form onSubmit={handleFreeRegister} className="space-y-3.5">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-[#14e071]/25 text-[11px] text-emerald-200 flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-[#14e071] shrink-0" />
                    <span>Create your own account free with Mobile Number &amp; Password — works on Spark free plan.</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300 block">Full Name</label>
                      <input
                        type="text"
                        required
                        value={regFullName}
                        onChange={e => {
                          setRegFullName(e.target.value);
                          setErrorMsg('');
                        }}
                        placeholder="e.g. Rahul Sharma"
                        className="w-full px-3.5 py-2.5 bg-[#060b0e] border border-white/[0.1] focus:border-[#14e071] rounded-xl text-xs text-white placeholder-slate-500 outline-none transition"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300 block">Username</label>
                      <input
                        type="text"
                        required
                        value={regUsername}
                        onChange={e => {
                          setRegUsername(e.target.value);
                          setErrorMsg('');
                        }}
                        placeholder="e.g. rahul_99"
                        className="w-full px-3.5 py-2.5 bg-[#060b0e] border border-white/[0.1] focus:border-[#14e071] rounded-xl text-xs text-white placeholder-slate-500 outline-none transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 block">Mobile Number</label>
                    <div className="flex gap-2">
                      <select
                        value={regCountryCode}
                        onChange={e => setRegCountryCode(e.target.value)}
                        className="w-28 px-2 py-2.5 bg-[#060b0e] border border-white/[0.1] focus:border-[#14e071] rounded-xl text-xs text-white outline-none"
                      >
                        {COUNTRY_CODES.map(c => (
                          <option key={c.code} value={c.code}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      <div className="relative flex-1">
                        <Smartphone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                        <input
                          type="tel"
                          required
                          inputMode="tel"
                          value={regPhone}
                          onChange={e => {
                            setRegPhone(e.target.value);
                            setErrorMsg('');
                          }}
                          placeholder="10-digit mobile number"
                          className="w-full pl-9 pr-3 py-2.5 bg-[#060b0e] border border-white/[0.1] focus:border-[#14e071] rounded-xl text-xs text-white placeholder-slate-500 outline-none transition"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300 block">Create Password</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                        <input
                          type={showRegPass ? 'text' : 'password'}
                          required
                          minLength={4}
                          value={regPassword}
                          onChange={e => {
                            setRegPassword(e.target.value);
                            setErrorMsg('');
                          }}
                          placeholder="Min 4 chars"
                          className="w-full pl-9 pr-9 py-2.5 bg-[#060b0e] border border-white/[0.1] focus:border-[#14e071] rounded-xl text-xs text-white placeholder-slate-500 outline-none transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPass(v => !v)}
                          className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                        >
                          {showRegPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300 block">Confirm Password</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                        <input
                          type={showRegPass ? 'text' : 'password'}
                          required
                          minLength={4}
                          value={regConfirmPassword}
                          onChange={e => {
                            setRegConfirmPassword(e.target.value);
                            setErrorMsg('');
                          }}
                          placeholder="Re-enter"
                          className="w-full pl-9 pr-3 py-2.5 bg-[#060b0e] border border-white/[0.1] focus:border-[#14e071] rounded-xl text-xs text-white placeholder-slate-500 outline-none transition"
                        />
                      </div>
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {successMsg && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[#14e071] text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{successMsg}</span>
                    </div>
                  )}

                  <motion.button
                    type="submit"
                    whileTap={{ scale: 0.98 }}
                    disabled={isLoading}
                    className="w-full py-3 rounded-xl apex-glow-btn disabled:opacity-60 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <span>{isLoading ? 'Creating Account...' : 'Create Account Free'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </form>
              ) : regStep === 'details' ? (
                <form onSubmit={handleSendRegOtp} className="space-y-3.5">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-[#14e071]/25 text-[11px] text-emerald-200 flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-[#14e071] shrink-0" />
                    <span>Verify your mobile number via SMS OTP (requires Blaze or Firebase Test Number), then set your password.</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300 block">Full Name</label>
                      <input
                        type="text"
                        required
                        value={regFullName}
                        onChange={e => {
                          setRegFullName(e.target.value);
                          setErrorMsg('');
                        }}
                        placeholder="e.g. Rahul Sharma"
                        className="w-full px-3.5 py-2.5 bg-[#060b0e] border border-white/[0.1] focus:border-[#14e071] rounded-xl text-xs text-white placeholder-slate-500 outline-none transition"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300 block">Username</label>
                      <input
                        type="text"
                        required
                        value={regUsername}
                        onChange={e => {
                          setRegUsername(e.target.value);
                          setErrorMsg('');
                        }}
                        placeholder="e.g. rahul_99"
                        className="w-full px-3.5 py-2.5 bg-[#060b0e] border border-white/[0.1] focus:border-[#14e071] rounded-xl text-xs text-white placeholder-slate-500 outline-none transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 block">Mobile Number</label>
                    <div className="flex gap-2">
                      <select
                        value={regCountryCode}
                        onChange={e => setRegCountryCode(e.target.value)}
                        className="w-28 px-2 py-2.5 bg-[#060b0e] border border-white/[0.1] focus:border-[#14e071] rounded-xl text-xs text-white outline-none"
                      >
                        {COUNTRY_CODES.map(c => (
                          <option key={c.code} value={c.code}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      <div className="relative flex-1">
                        <Smartphone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                        <input
                          type="tel"
                          required
                          inputMode="tel"
                          value={regPhone}
                          onChange={e => {
                            setRegPhone(e.target.value);
                            setErrorMsg('');
                          }}
                          placeholder="10-digit mobile number"
                          className="w-full pl-9 pr-3 py-2.5 bg-[#060b0e] border border-white/[0.1] focus:border-[#14e071] rounded-xl text-xs text-white placeholder-slate-500 outline-none transition"
                        />
                      </div>
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <motion.button
                    type="submit"
                    whileTap={{ scale: 0.98 }}
                    disabled={isLoading}
                    className="w-full py-3 rounded-xl apex-glow-btn disabled:opacity-60 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <span>{isLoading ? 'Sending OTP...' : 'Send Mobile OTP'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </form>
              ) : (
                <form onSubmit={handleVerifyRegOtpAndCreate} className="space-y-3.5">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-[#14e071]/30 flex items-center justify-between text-xs">
                    <div className="text-emerald-200">
                      OTP sent to <span className="font-bold text-white">{regE164Phone}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setRegStep('details');
                        setRegOtp('');
                        setErrorMsg('');
                        setSuccessMsg('');
                      }}
                      className="text-[11px] font-bold text-[#14e071] hover:underline cursor-pointer"
                    >
                      Change
                    </button>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-300 block">6-Digit OTP</label>
                      <button
                        type="button"
                        disabled={resendSeconds > 0 || isLoading}
                        onClick={() => void handleSendRegOtp()}
                        className="text-[11px] font-semibold text-[#14e071] disabled:text-slate-500 flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
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
                      value={regOtp}
                      onChange={e => {
                        setRegOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                        setErrorMsg('');
                      }}
                      placeholder="Enter 6-digit SMS OTP"
                      className="w-full px-4 py-2.5 bg-[#060b0e] border border-white/[0.1] focus:border-[#14e071] rounded-xl text-sm tracking-[0.3em] font-mono-numbers text-center text-white placeholder-slate-500 placeholder:tracking-normal outline-none transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 block">
                      Create Your Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                      <input
                        type={showRegPass ? 'text' : 'password'}
                        required
                        minLength={4}
                        value={regPassword}
                        onChange={e => {
                          setRegPassword(e.target.value);
                          setErrorMsg('');
                        }}
                        placeholder="Min 4 characters"
                        className="w-full pl-10 pr-10 py-2.5 bg-[#060b0e] border border-white/[0.1] focus:border-[#14e071] rounded-xl text-xs text-white placeholder-slate-500 outline-none transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPass(v => !v)}
                        className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                      >
                        {showRegPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 block">Confirm Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                      <input
                        type={showRegPass ? 'text' : 'password'}
                        required
                        minLength={4}
                        value={regConfirmPassword}
                        onChange={e => {
                          setRegConfirmPassword(e.target.value);
                          setErrorMsg('');
                        }}
                        placeholder="Re-enter password"
                        className="w-full pl-10 pr-4 py-2.5 bg-[#060b0e] border border-white/[0.1] focus:border-[#14e071] rounded-xl text-xs text-white placeholder-slate-500 outline-none transition"
                      />
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {successMsg && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[#14e071] text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{successMsg}</span>
                    </div>
                  )}

                  <motion.button
                    type="submit"
                    whileTap={{ scale: 0.98 }}
                    disabled={isLoading}
                    className="w-full py-3 rounded-xl apex-glow-btn disabled:opacity-60 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <span>{isLoading ? 'Creating Account...' : 'Verify OTP & Create Account'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </form>
              )}
            </div>
          )}

          {/* Live Chat with Admin for New ID */}
          <div className="pt-1 border-t border-white/[0.07] space-y-3">
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowIdChat(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-[#14e071]/40 text-xs font-bold text-[#14e071] flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <MessageSquarePlus className="w-4 h-4 shrink-0" />
              <span>Need help or Admin-issued ID? Chat with Admin</span>
              {savedThread?.unreadByUser && (
                <span className="px-2 py-0.5 rounded-full bg-[#14e071] text-[#04130b] text-[10px] font-black">
                  {savedThread.status === 'issued' ? 'ID Ready' : 'New Reply'}
                </span>
              )}
            </motion.button>

            <WhatsAppSupportButton variant="login" />
          </div>
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
          setIdentifier(u);
          setPassword(p);
          setMode('signin');
          setErrorMsg('');
        }}
      />
    </div>
  );
};
