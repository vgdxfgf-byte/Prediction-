import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Layers,
  X,
  Trash2,
  Coins,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  ShieldCheck,
  Plus
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { isMarketBettingOpen } from '../../utils/marketTiming';

interface BetBuilderBarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onSuccessViewHistory: () => void;
  onOpenDeposit: () => void;
  onGoToMarkets: () => void;
}

export const BetBuilderBar: React.FC<BetBuilderBarProps> = ({
  isOpen,
  setIsOpen,
  onSuccessViewHistory,
  onOpenDeposit,
  onGoToMarkets
}) => {
  const {
    currentUser,
    predictions,
    builderSelections,
    removeBuilderLeg,
    clearBuilder,
    placeParlayBet,
    placeBet,
    nowMs
  } = useApp();

  const [amount, setAmount] = useState<number>(100);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successData, setSuccessData] = useState<{
    parlayId: string;
    legCount: number;
    combinedOdds: number;
    amount: number;
    payout: number;
  } | null>(null);

  // Sync live prediction data for every leg in the builder
  const liveLegs = useMemo(() => {
    return builderSelections.map(sel => {
      const latest = predictions.find(p => p.id === sel.prediction.id) || sel.prediction;
      const odds = sel.choice === 'YES' ? latest.yesOdds : latest.noOdds;
      const isOpen = isMarketBettingOpen(latest, nowMs);
      return {
        prediction: latest,
        choice: sel.choice,
        odds,
        isOpen
      };
    });
  }, [builderSelections, predictions, nowMs]);

  const combinedOdds = useMemo(() => {
    if (liveLegs.length === 0) return 1;
    const raw = liveLegs.reduce((acc, leg) => acc * leg.odds, 1);
    return Number(Math.min(100000, Math.max(1.01, raw)).toFixed(2));
  }, [liveLegs]);

  const requiredMin = useMemo(() => {
    if (liveLegs.length === 0) return 50;
    return Math.max(...liveLegs.map(l => l.prediction.minBet));
  }, [liveLegs]);

  const allowedMax = useMemo(() => {
    if (liveLegs.length === 0) return 5000;
    return Math.min(...liveLegs.map(l => l.prediction.maxBet));
  }, [liveLegs]);

  useEffect(() => {
    if (liveLegs.length > 0 && amount < requiredMin) {
      setAmount(requiredMin);
    }
  }, [requiredMin, liveLegs.length]);

  useEffect(() => {
    setErrorMsg('');
  }, [builderSelections.length]);

  if (!currentUser) return null;
  if (liveLegs.length === 0 && !successData) return null;

  const userCoins = currentUser.coins;
  const potentialReturn = Math.round(amount * combinedOdds);
  const potentialProfit = Math.max(0, potentialReturn - amount);
  const hasClosedLeg = liveLegs.some(l => !l.isOpen);
  const invalidLimits = allowedMax < requiredMin;
  const isInsufficient = userCoins < amount;
  const canSubmitCombo =
    liveLegs.length >= 2 &&
    !hasClosedLeg &&
    !invalidLimits &&
    amount >= requiredMin &&
    amount <= allowedMax &&
    !isInsufficient;

  const handleQuickAdd = (val: number) => {
    const cap = Math.max(requiredMin, allowedMax);
    setAmount(prev => Math.min(cap, Math.max(requiredMin, prev + val)));
    setErrorMsg('');
  };

  const handleSetMax = () => {
    const cap = Math.max(requiredMin, Math.min(allowedMax, userCoins));
    setAmount(cap);
    setErrorMsg('');
  };

  const handleSubmitCombo = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (liveLegs.length < 2) {
      setErrorMsg('Add at least 2 predictions to multiply odds in Bet Builder.');
      return;
    }
    if (hasClosedLeg) {
      setErrorMsg('Remove paused or closed markets before placing your Bet Builder slip.');
      return;
    }
    if (invalidLimits) {
      setErrorMsg('Selected markets have conflicting min/max stake limits.');
      return;
    }
    if (amount < requiredMin || amount > allowedMax) {
      setErrorMsg(`Stake must be between ${requiredMin} and ${allowedMax} coins.`);
      return;
    }
    if (isInsufficient) {
      setErrorMsg(`Insufficient coin balance (${userCoins.toLocaleString()} coins available).`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await placeParlayBet(amount);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to place Bet Builder slip');
        return;
      }

      try {
        confetti({
          particleCount: 95,
          spread: 70,
          origin: { y: 0.7 }
        });
      } catch {
        // Ignore confetti failures
      }

      setSuccessData({
        parlayId: res.parlayId || '',
        legCount: liveLegs.length,
        combinedOdds: res.combinedOdds ?? combinedOdds,
        amount,
        payout: res.potentialWinnings ?? potentialReturn
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePlaceAsSingle = async () => {
    if (liveLegs.length !== 1) return;
    const leg = liveLegs[0];
    setErrorMsg('');
    if (!leg.isOpen) {
      setErrorMsg('This market is currently paused or closed.');
      return;
    }
    if (amount < leg.prediction.minBet || amount > leg.prediction.maxBet) {
      setErrorMsg(`Stake must be between ${leg.prediction.minBet} and ${leg.prediction.maxBet} coins.`);
      return;
    }
    if (userCoins < amount) {
      setErrorMsg(`Insufficient coin balance (${userCoins.toLocaleString()} coins available).`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await placeBet(leg.prediction.id, leg.choice, amount);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to place prediction');
        return;
      }
      clearBuilder();
      setSuccessData({
        parlayId: res.betId || '',
        legCount: 1,
        combinedOdds: res.lockedOdds ?? leg.odds,
        amount,
        payout: res.lockedPayout ?? Math.round(amount * leg.odds)
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Compact Floating Docked Bar (above mobile nav on small screens) */}
      {!isOpen && (
        <div className="fixed bottom-16 lg:bottom-5 right-4 left-4 sm:left-auto sm:w-[400px] z-40">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-[#0b1318]/95 backdrop-blur-xl border border-[#14e071]/45 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.9)] p-3.5 flex items-center justify-between gap-3"
          >
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-[#14e071] text-[#04130b] flex items-center justify-center font-black shrink-0 shadow-[0_0_20px_-4px_rgba(20,224,113,0.7)]">
                <Layers className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
                  <span>Bet Builder</span>
                  <span className="text-[#14e071] font-mono-numbers">
                    {successData ? 'Confirmed' : `${liveLegs.length} ${liveLegs.length === 1 ? 'Leg' : 'Legs'}`}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono-numbers truncate">
                  {successData
                    ? `${successData.combinedOdds.toFixed(2)}x · View Receipt`
                    : liveLegs.length >= 2
                      ? `Multiplied Odds: ${combinedOdds.toFixed(2)}x · Est. ${potentialReturn.toLocaleString()}`
                      : `${liveLegs[0].odds.toFixed(2)}x · Add 1+ leg to multiply`}
                </div>
              </div>
            </button>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="px-3 py-2 rounded-xl apex-glow-btn text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Open</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              {!successData && (
                <button
                  type="button"
                  onClick={clearBuilder}
                  title="Clear Bet Builder"
                  className="p-2 rounded-xl bg-white/[0.05] hover:bg-rose-500/15 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Expanded Bet Builder Drawer / Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (successData) setSuccessData(null);
              setIsOpen(false);
            }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              onClick={e => e.stopPropagation()}
              className="w-full sm:max-w-lg bg-[#0a1116] border border-[#14e071]/35 rounded-t-2xl sm:rounded-2xl shadow-[0_24px_70px_-15px_rgba(0,0,0,0.95)] flex flex-col max-h-[90vh] overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="px-5 py-3.5 border-b border-white/[0.08] bg-[#080e13] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#14e071]/15 border border-[#14e071]/40 text-[#14e071] flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-white leading-tight">
                      Bet Builder Combo
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Multiply odds across 2–10 predictions
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {liveLegs.length > 0 && !successData && (
                    <button
                      type="button"
                      onClick={clearBuilder}
                      className="px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-rose-500/15 text-[11px] font-semibold text-slate-300 hover:text-rose-300 transition cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (successData) setSuccessData(null);
                      setIsOpen(false);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
                  >
                    <ChevronDown className="w-4 h-4 sm:hidden" />
                    <X className="w-4 h-4 hidden sm:block" />
                  </button>
                </div>
              </div>

              {successData ? (
                <div className="p-6 text-center space-y-4 overflow-y-auto">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/15 border-2 border-[#14e071]/50 text-[#14e071] mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>

                  <div>
                    <h4 className="text-xl font-black text-white">
                      {successData.legCount > 1 ? 'Bet Builder Combo Placed!' : 'Prediction Confirmed!'}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      All {successData.legCount} {successData.legCount > 1 ? 'legs are' : 'leg is'} locked on the ledger.
                    </p>
                  </div>

                  <div className="bg-[#060b0e] p-4 rounded-xl border border-white/[0.07] text-left space-y-2 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Selections</span>
                      <span className="font-bold text-white font-mono-numbers">
                        {successData.legCount} {successData.legCount > 1 ? 'Legs' : 'Leg'}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Multiplied Odds</span>
                      <span className="font-bold text-[#14e071] font-mono-numbers">
                        {successData.combinedOdds.toFixed(2)}x
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
                      type="button"
                      onClick={() => {
                        setSuccessData(null);
                        setIsOpen(false);
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 font-semibold text-xs transition cursor-pointer"
                    >
                      Done
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSuccessData(null);
                        setIsOpen(false);
                        onSuccessViewHistory();
                      }}
                      className="flex-1 py-2.5 rounded-xl apex-glow-btn font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer"
                    >
                      View Bet History
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitCombo} className="flex-1 overflow-y-auto p-5 space-y-4">
                  {/* Legs List */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300">
                        Selected Legs ({liveLegs.length}/10)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsOpen(false);
                          onGoToMarkets();
                        }}
                        className="text-[#14e071] hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add More Markets
                      </button>
                    </div>

                    {liveLegs.map((leg, idx) => (
                      <div
                        key={leg.prediction.id}
                        className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-3 ${
                          leg.isOpen
                            ? 'bg-[#070d11] border-white/[0.08]'
                            : 'bg-amber-950/20 border-amber-500/40'
                        }`}
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            <span className="font-mono-numbers text-slate-500">#{idx + 1}</span>
                            <span>{leg.prediction.category}</span>
                            <span aria-hidden="true">·</span>
                            <span className="truncate">{leg.prediction.subtitle || 'Market'}</span>
                          </div>
                          <div className="font-semibold text-white leading-snug">
                            {leg.prediction.title}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] font-mono-numbers">
                            <span
                              className={`font-black ${
                                leg.choice === 'YES' ? 'text-[#14e071]' : 'text-rose-400'
                              }`}
                            >
                              Pick: {leg.choice}
                            </span>
                            <span className="text-slate-500">·</span>
                            <span className="font-bold text-white">{leg.odds.toFixed(2)}x</span>
                            {!leg.isOpen && (
                              <span className="text-amber-400 font-semibold">· Market Paused/Closed</span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeBuilderLeg(leg.prediction.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition shrink-0 cursor-pointer"
                          title="Remove leg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Odds Multiplication Breakdown */}
                  <div className="p-3.5 rounded-xl bg-[#070d11] border border-[#14e071]/30 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-semibold">Combined Odds Multiplier</span>
                      <span className="font-mono-numbers text-lg font-black text-[#14e071]">
                        {combinedOdds.toFixed(2)}x
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono-numbers break-words">
                      {liveLegs.map(l => `${l.odds.toFixed(2)}x`).join(' × ')} ={' '}
                      <strong className="text-white">{combinedOdds.toFixed(2)}x</strong>
                    </div>
                    {liveLegs.length === 1 && (
                      <div className="text-[11px] text-amber-300 pt-1">
                        Add at least 1 more prediction to combine and multiply your odds, or place as a single pick below.
                      </div>
                    )}
                  </div>

                  {/* Stake Input */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <label className="text-slate-300 font-semibold">
                        Combo Stake ({requiredMin}–{Math.max(requiredMin, allowedMax)} coins)
                      </label>
                      <span className="text-slate-400 font-mono-numbers text-[11px]">
                        Balance: <strong className="text-[#14e071]">{userCoins.toLocaleString()}</strong>
                      </span>
                    </div>

                    <div className="relative">
                      <Coins className="w-4 h-4 text-amber-400 absolute left-3.5 top-3.5" />
                      <input
                        type="number"
                        min={requiredMin}
                        max={Math.max(requiredMin, allowedMax)}
                        value={amount || ''}
                        onChange={e => {
                          setAmount(Number(e.target.value));
                          setErrorMsg('');
                        }}
                        className="w-full bg-[#060b0e] border border-white/[0.12] focus:border-[#14e071] rounded-xl pl-10 pr-16 py-3 font-mono-numbers text-base font-bold text-white outline-none transition"
                        placeholder={String(requiredMin)}
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
                        <span>Low balance ({userCoins.toLocaleString()} coins)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsOpen(false);
                          onOpenDeposit();
                        }}
                        className="px-2.5 py-1 apex-glow-btn font-bold rounded-lg transition cursor-pointer"
                      >
                        Deposit
                      </button>
                    </div>
                  )}

                  {/* Potential Return Summary */}
                  <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#070c10] border border-white/[0.07] text-xs">
                    <span className="text-slate-400">
                      Return ({combinedOdds.toFixed(2)}x · +{potentialProfit.toLocaleString()})
                    </span>
                    <span className="font-mono-numbers font-black text-[#14e071] text-sm">
                      {potentialReturn.toLocaleString()} coins
                    </span>
                  </div>

                  {/* Primary Submit CTA */}
                  {liveLegs.length >= 2 ? (
                    <button
                      type="submit"
                      disabled={isSubmitting || !canSubmitCombo}
                      className="w-full py-3 rounded-xl apex-glow-btn disabled:opacity-50 disabled:cursor-not-allowed font-black text-sm tracking-wide transition cursor-pointer"
                    >
                      {isSubmitting
                        ? 'Placing Bet Builder...'
                        : `Place ${liveLegs.length}-Leg Bet Builder (${combinedOdds.toFixed(2)}x)`}
                    </button>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsOpen(false);
                          onGoToMarkets();
                        }}
                        className="py-3 rounded-xl apex-glow-btn font-bold text-xs cursor-pointer"
                      >
                        + Add Another Prediction
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting || hasClosedLeg || isInsufficient}
                        onClick={handlePlaceAsSingle}
                        className="py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-50 text-slate-200 font-semibold text-xs transition cursor-pointer"
                      >
                        {isSubmitting ? 'Placing...' : `Place Single (${liveLegs[0]?.odds.toFixed(2)}x)`}
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>All legs must win for combo payout · Voided legs rescale to 1.00x</span>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
