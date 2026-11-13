import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Prediction } from '../../types';
import { useApp } from '../../context/AppContext';
import cricketHeroImg from '../../assets/images/hero_cricket_stadium_1794598510096.jpg';
import cinemaHeroImg from '../../assets/images/hero_cinema_premiere_1794598510861.jpg';
import {
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Coins,
  ArrowRight,
  Clock,
  Trophy,
  Film,
  ShieldCheck,
  Activity
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface BetSlipModalProps {
  prediction: Prediction | null;
  initialChoice: 'YES' | 'NO';
  onClose: () => void;
  onSuccessViewHistory: () => void;
  onOpenDeposit: () => void;
}

export const BetSlipModal: React.FC<BetSlipModalProps> = ({
  prediction,
  initialChoice,
  onClose,
  onSuccessViewHistory,
  onOpenDeposit
}) => {
  const { currentUser, placeBet } = useApp();
  const [choice, setChoice] = useState<'YES' | 'NO'>(initialChoice);
  const [amount, setAmount] = useState<number>(100);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [imgFailed, setImgFailed] = useState<boolean>(false);
  const [successData, setSuccessData] = useState<{
    betId: string;
    payout: number;
    amount: number;
  } | null>(null);

  useEffect(() => {
    setChoice(initialChoice);
    if (prediction) {
      setAmount(Math.max(prediction.minBet, 100));
    }
    setErrorMsg('');
    setImgFailed(false);
    setSuccessData(null);
  }, [prediction, initialChoice]);

  if (!prediction) return null;

  const odds = choice === 'YES' ? prediction.yesOdds : prediction.noOdds;
  const potentialWinnings = Math.round(amount * odds);
  const potentialProfit = Math.round(potentialWinnings - amount);
  const userCoins = currentUser ? currentUser.coins : 0;
  const isInsufficient = userCoins < amount;
  const totalPool = prediction.totalYesVolume + prediction.totalNoVolume;
  const closeDate = new Date(prediction.closingTime);

  const heroBanner =
    prediction.category === 'Movies'
      ? cinemaHeroImg
      : prediction.category === 'Cricket'
        ? cricketHeroImg
        : null;

  const handleQuickAdd = (added: number) => {
    setAmount(prev => Math.min(prediction.maxBet, prev + added));
    setErrorMsg('');
  };

  const handleSetMax = () => {
    const maxPossible = Math.min(prediction.maxBet, userCoins);
    setAmount(Math.max(prediction.minBet, maxPossible));
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setErrorMsg('Please log in first to place predictions');
      return;
    }
    if (amount < prediction.minBet) {
      setErrorMsg(`Minimum prediction is ${prediction.minBet} coins`);
      return;
    }
    if (amount > prediction.maxBet) {
      setErrorMsg(`Maximum prediction is ${prediction.maxBet} coins`);
      return;
    }
    if (isInsufficient) {
      setErrorMsg(`Insufficient coins! You need ${amount} coins but only have ${userCoins}`);
      return;
    }

    const res = await placeBet(prediction.id, choice, amount);
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to place prediction');
      return;
    }

    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch {
      // Ignore if confetti fails
    }

    setSuccessData({
      betId: res.betId || '',
      payout: potentialWinnings,
      amount
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md bg-[#0a1116] border border-[#14e071]/30 rounded-2xl shadow-[0_24px_60px_-16px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Modal Bar (Screen 2 style) */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.07] bg-[#080e13]">
          <h3 className="font-bold text-sm text-white">Prediction Market</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {successData ? (
          /* Confirmation Success State */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="p-6 text-center space-y-4"
          >
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 360, damping: 20 }}
              className="w-16 h-16 rounded-full bg-emerald-500/15 border-2 border-[#14e071]/50 text-[#14e071] mx-auto flex items-center justify-center"
            >
              <CheckCircle2 className="w-9 h-9" />
            </motion.div>

            <div>
              <h4 className="text-xl font-black text-white">Prediction Confirmed!</h4>
              <p className="text-xs text-slate-400 mt-1">
                Your prediction is locked in on the exchange ledger.
              </p>
            </div>

            <div className="bg-[#060b0e] p-4 rounded-xl border border-white/[0.07] text-left space-y-2 text-xs">
              <div className="flex justify-between text-slate-400 gap-2">
                <span>Market</span>
                <span className="font-semibold text-white truncate max-w-[210px]">
                  {prediction.title}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Your Pick</span>
                <span
                  className={`font-bold font-mono-numbers ${
                    choice === 'YES' ? 'text-[#14e071]' : 'text-rose-400'
                  }`}
                >
                  {choice} @ {odds.toFixed(2)}x
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Staked Coins</span>
                <span className="font-mono-numbers font-bold text-white">
                  {successData.amount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-slate-300 pt-2 border-t border-white/[0.07]">
                <span className="font-semibold text-[#14e071]">Potential Return</span>
                <span className="font-mono-numbers font-black text-[#14e071] text-sm">
                  {successData.payout.toLocaleString()} coins
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 font-semibold text-xs transition cursor-pointer"
              >
                Done
              </button>
              <button
                onClick={() => {
                  onClose();
                  onSuccessViewHistory();
                }}
                className="flex-1 py-2.5 rounded-xl apex-glow-btn font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer"
              >
                View History
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Screen 2 Category Hero Banner */}
            {heroBanner && !imgFailed && (
              <div className="relative h-28 rounded-xl overflow-hidden border border-white/[0.08]">
                <img
                  src={heroBanner}
                  alt={prediction.category}
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a1116] via-black/30 to-transparent" />
                <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-md bg-[#14e071] text-[#04130b] text-[10px] font-black uppercase tracking-wider">
                  Live
                </span>
              </div>
            )}

            {/* Question & Context */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5 font-semibold text-slate-200">
                  {prediction.category === 'Movies' ? (
                    <Film className="w-3.5 h-3.5 text-purple-400" />
                  ) : prediction.category === 'Cricket' ? (
                    <Trophy className="w-3.5 h-3.5 text-[#14e071]" />
                  ) : (
                    <Activity className="w-3.5 h-3.5 text-sky-400" />
                  )}
                  {prediction.subtitle || prediction.category}
                </span>
                <span className="font-mono-numbers">
                  {closeDate.toLocaleDateString([], { month: 'short', day: 'numeric' })},{' '}
                  {closeDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <h4 className="font-black text-base text-white leading-snug">{prediction.title}</h4>
              {prediction.description && (
                <p className="text-xs text-slate-400 leading-relaxed">{prediction.description}</p>
              )}
            </div>

            {/* Screen 2 Big YES / NO Selector Cards */}
            <div className="grid grid-cols-2 gap-3">
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => setChoice('YES')}
                className={`py-3.5 px-4 rounded-xl border font-bold flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                  choice === 'YES'
                    ? 'border-[#14e071] bg-gradient-to-b from-emerald-950/80 to-emerald-950/35 text-white shadow-[0_0_24px_-8px_rgba(20,224,113,0.65)]'
                    : 'border-white/[0.08] bg-[#0e171e] text-slate-400 hover:border-emerald-500/40'
                }`}
              >
                <CheckCircle2
                  className={`w-5 h-5 ${choice === 'YES' ? 'text-[#14e071]' : 'text-slate-500'}`}
                />
                <span className="text-xs tracking-wide uppercase">YES</span>
                <span className="font-mono-numbers text-base font-black text-white">
                  {prediction.yesOdds.toFixed(2)}x
                </span>
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => setChoice('NO')}
                className={`py-3.5 px-4 rounded-xl border font-bold flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                  choice === 'NO'
                    ? 'border-rose-500 bg-gradient-to-b from-rose-950/80 to-rose-950/35 text-white shadow-[0_0_24px_-8px_rgba(244,63,94,0.6)]'
                    : 'border-white/[0.08] bg-[#0e171e] text-slate-400 hover:border-rose-500/40'
                }`}
              >
                <XCircle
                  className={`w-5 h-5 ${choice === 'NO' ? 'text-rose-400' : 'text-slate-500'}`}
                />
                <span className="text-xs tracking-wide uppercase">NO</span>
                <span className="font-mono-numbers text-base font-black text-white">
                  {prediction.noOdds.toFixed(2)}x
                </span>
              </motion.button>
            </div>

            {/* Closes In & Total Pool Info Bar (Screen 2 style) */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[#070c10] border border-white/[0.07] text-xs">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-500">Closes At</div>
                  <div className="font-mono-numbers font-semibold text-slate-200 text-[11px]">
                    {closeDate.toLocaleDateString([], { month: 'short', day: 'numeric' })},{' '}
                    {closeDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 border-l border-white/[0.07] pl-3">
                <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-500">Total Pool</div>
                  <div className="font-mono-numbers font-bold text-amber-400 text-[11px]">
                    {totalPool.toLocaleString()} coins
                  </div>
                </div>
              </div>
            </div>

            {/* Enter Amount & Quick Chips */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label className="text-slate-300 font-semibold">Enter Amount</label>
                <span className="text-slate-400 font-mono-numbers text-[11px]">
                  Balance: <strong className="text-[#14e071]">{userCoins.toLocaleString()}</strong>
                </span>
              </div>

              <div className="relative">
                <Coins className="w-4 h-4 text-amber-400 absolute left-3.5 top-3.5" />
                <input
                  type="number"
                  min={prediction.minBet}
                  max={prediction.maxBet}
                  value={amount || ''}
                  onChange={e => {
                    setAmount(Number(e.target.value));
                    setErrorMsg('');
                  }}
                  className="w-full bg-[#060b0e] border border-white/[0.12] focus:border-[#14e071] rounded-xl pl-10 pr-16 py-3 font-mono-numbers text-base font-bold text-white outline-none transition"
                  placeholder="100"
                />
                <span className="absolute right-3.5 top-3.5 text-slate-500 font-bold text-[11px] uppercase">
                  Coins
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[50, 100, 500].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleQuickAdd(val)}
                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#111b22] hover:bg-[#16242d] text-slate-200 text-xs font-mono-numbers font-semibold border border-white/[0.08] transition cursor-pointer"
                  >
                    +{val}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleSetMax}
                  className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#111b22] hover:bg-emerald-500/15 text-[#14e071] text-xs font-bold border border-emerald-500/30 transition cursor-pointer"
                >
                  Max
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {isInsufficient && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Low balance ({userCoins} coins)</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenDeposit();
                  }}
                  className="px-2.5 py-1 apex-glow-btn font-bold rounded-lg transition cursor-pointer"
                >
                  Deposit
                </button>
              </div>
            )}

            {/* Potential Payout Row */}
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#070c10] border border-white/[0.07] text-xs">
              <span className="text-slate-400">
                Return ({odds.toFixed(2)}x · +{potentialProfit > 0 ? potentialProfit.toLocaleString() : 0})
              </span>
              <span className="font-mono-numbers font-black text-[#14e071] text-sm">
                {potentialWinnings.toLocaleString()} coins
              </span>
            </div>

            {/* Full-Width Primary CTA Button (Screen 2 style) */}
            <motion.button
              type="submit"
              whileTap={{ scale: 0.98 }}
              disabled={isInsufficient || amount < prediction.minBet}
              className="w-full py-3 rounded-xl apex-glow-btn disabled:opacity-50 font-black text-sm tracking-wide transition cursor-pointer"
            >
              Place Prediction ({choice} · {amount} Coins)
            </motion.button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 pt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>100% Secure & Fair Play</span>
            </div>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
};
