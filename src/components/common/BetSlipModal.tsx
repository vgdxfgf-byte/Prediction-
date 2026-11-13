import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Prediction } from '../../types';
import { useApp } from '../../context/AppContext';
import { X, CheckCircle2, AlertTriangle, TrendingUp, Sparkles, Coins, ArrowRight } from 'lucide-react';
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
  const [successData, setSuccessData] = useState<{ betId: string; payout: number; amount: number } | null>(null);

  useEffect(() => {
    setChoice(initialChoice);
    if (prediction) {
      setAmount(Math.max(prediction.minBet, 100));
    }
    setErrorMsg('');
    setSuccessData(null);
  }, [prediction, initialChoice]);

  if (!prediction) return null;

  const odds = choice === 'YES' ? prediction.yesOdds : prediction.noOdds;
  const potentialWinnings = Math.round(amount * odds);
  const potentialProfit = Math.round(potentialWinnings - amount);
  const userCoins = currentUser ? currentUser.coins : 0;
  const isInsufficient = userCoins < amount;

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

    // Trigger celebration
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h3 className="font-bold text-base text-white">Prediction Slip</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
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
              className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center"
            >
              <CheckCircle2 className="w-9 h-9" />
            </motion.div>

            <div>
              <h4 className="text-xl font-bold text-white">Prediction Confirmed!</h4>
              <p className="text-xs text-slate-400 mt-1">
                Your prediction has been registered on the exchange ledger.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-left space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Market:</span>
                <span className="font-semibold text-slate-200 truncate max-w-[200px]">{prediction.title}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Your Pick:</span>
                <span className={`font-bold px-2 py-0.5 rounded text-xs ${choice === 'YES' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                  {choice} @ {odds}x
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Staked Coins:</span>
                <span className="font-mono font-bold text-white">🪙 {successData.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-400 pt-2 border-t border-slate-800/80">
                <span className="font-semibold text-emerald-400">Possible Return:</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  🪙 {successData.payout.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition cursor-pointer"
              >
                Done
              </button>
              <button
                onClick={() => {
                  onClose();
                  onSuccessViewHistory();
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1 transition shadow-lg shadow-emerald-950/40 cursor-pointer"
              >
                View History
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ) : (
          /* Bet Form */
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Market Context */}
            <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                  {prediction.category}
                </span>
                <span>Limits: {prediction.minBet} - {prediction.maxBet} 🪙</span>
              </div>
              <h4 className="font-bold text-sm text-slate-100 pt-1 leading-snug">
                {prediction.title}
              </h4>
              <p className="text-xs text-slate-400">{prediction.subtitle}</p>
            </div>

            {/* YES / NO Selector */}
            <div className="grid grid-cols-2 gap-2.5">
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => setChoice('YES')}
                className={`py-3 px-4 rounded-xl border-2 font-bold text-sm flex flex-col items-center justify-center transition cursor-pointer ${
                  choice === 'YES'
                    ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300 shadow-lg shadow-emerald-950/30 ring-2 ring-emerald-500/20'
                    : 'border-slate-800 bg-slate-800/50 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>YES</span>
                </div>
                <span className="font-mono text-xs mt-0.5 font-bold">
                  {prediction.yesOdds.toFixed(2)}x
                </span>
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => setChoice('NO')}
                className={`py-3 px-4 rounded-xl border-2 font-bold text-sm flex flex-col items-center justify-center transition cursor-pointer ${
                  choice === 'NO'
                    ? 'border-rose-500 bg-rose-950/40 text-rose-300 shadow-lg shadow-rose-950/30 ring-2 ring-rose-500/20'
                    : 'border-slate-800 bg-slate-800/50 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1">
                  <X className="w-4 h-4" />
                  <span>NO</span>
                </div>
                <span className="font-mono text-xs mt-0.5 font-bold">
                  {prediction.noOdds.toFixed(2)}x
                </span>
              </motion.button>
            </div>

            {/* Stake Input Area */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="text-slate-300 font-medium flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  Enter Coin Amount:
                </label>
                <span className="text-slate-400">
                  Available: <span className="font-mono font-semibold text-emerald-400">🪙 {userCoins.toLocaleString()}</span>
                </span>
              </div>

              <div className="relative">
                <input
                  type="number"
                  min={prediction.minBet}
                  max={prediction.maxBet}
                  value={amount || ''}
                  onChange={e => {
                    setAmount(Number(e.target.value));
                    setErrorMsg('');
                  }}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-3 font-mono text-lg font-bold text-white tracking-wider outline-none transition"
                  placeholder="0"
                />
                <span className="absolute right-3.5 top-3.5 text-slate-500 font-bold text-xs uppercase">
                  Coins
                </span>
              </div>

              {/* Quick Chip Buttons */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[50, 100, 250, 500, 1000].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleQuickAdd(val)}
                    className="flex-1 min-w-[50px] py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-semibold border border-slate-700 transition"
                  >
                    +{val}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleSetMax}
                  className="py-1 px-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold border border-amber-500/40 transition"
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Insufficient Balance Banner */}
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
                  className="px-2.5 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg hover:bg-amber-400 transition"
                >
                  Deposit Now
                </button>
              </div>
            )}

            {/* Calculations Breakdown */}
            <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Effective Multiplier:</span>
                <span className="font-mono font-semibold text-slate-200">{odds.toFixed(2)}x</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Potential Net Profit:</span>
                <span className="font-mono font-semibold text-emerald-400">
                  +{potentialProfit > 0 ? potentialProfit.toLocaleString() : 0} coins
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                <span className="font-bold text-slate-200 text-sm">Total Potential Return:</span>
                <span className="font-mono font-bold text-emerald-400 text-base">
                  🪙 {potentialWinnings.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isInsufficient || amount < prediction.minBet}
                className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition shadow-lg ${
                  choice === 'YES'
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50 disabled:opacity-50'
                    : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/50 disabled:opacity-50'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Confirm {choice} ({amount} Coins)
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
};
