import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../../context/AppContext';
import {
  Trophy,
  XCircle,
  Clock,
  RotateCcw,
  Search,
  Calendar,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Film,
  Activity,
  Layers
} from 'lucide-react';

type HistoryFilter = 'all' | 'settled' | 'pending' | 'won' | 'lost' | 'voided';
type SlipKindFilter = 'all' | 'singles' | 'parlays';

interface PredictionHistoryViewProps {
  onGoToMarkets?: () => void;
}

export const PredictionHistoryView: React.FC<PredictionHistoryViewProps> = ({ onGoToMarkets }) => {
  const { bets, parlayBets, predictions, currentUser } = useApp();

  const [activeTab, setActiveTab] = useState<HistoryFilter>('all');
  const [slipKindFilter, setSlipKindFilter] = useState<SlipKindFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const predictionById = useMemo(
    () => new Map(predictions.map(p => [p.id, p])),
    [predictions]
  );

  if (!currentUser) return null;

  const userBets = bets.filter(
    b => b.userId === currentUser.id || (b.ownerUid && currentUser.ownerUid && b.ownerUid === currentUser.ownerUid)
  );
  const userParlays = parlayBets.filter(
    p => p.userId === currentUser.id || (p.ownerUid && currentUser.ownerUid && p.ownerUid === currentUser.ownerUid)
  );

  const settledBets = userBets.filter(b => b.result !== 'pending');
  const wonBets = userBets.filter(b => b.result === 'won');
  const lostBets = userBets.filter(b => b.result === 'lost');
  const voidedBets = userBets.filter(b => b.result === 'voided');
  const pendingBets = userBets.filter(b => b.result === 'pending');

  const settledParlays = userParlays.filter(p => p.result !== 'pending');
  const wonParlays = userParlays.filter(p => p.result === 'won');
  const lostParlays = userParlays.filter(p => p.result === 'lost');
  const voidedParlays = userParlays.filter(p => p.result === 'voided');
  const pendingParlays = userParlays.filter(p => p.result === 'pending');

  const filteredBets =
    slipKindFilter === 'parlays'
      ? []
      : userBets.filter(b => {
          if (activeTab === 'settled' && b.result === 'pending') return false;
          if (activeTab !== 'all' && activeTab !== 'settled' && b.result !== activeTab) return false;
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const matchTitle = b.predictionTitle.toLowerCase().includes(q);
            const matchCat = b.predictionCategory.toLowerCase().includes(q);
            const matchTx = b.transactionId.toLowerCase().includes(q);
            const matchPick = b.choice.toLowerCase().includes(q);
            if (!matchTitle && !matchCat && !matchTx && !matchPick) return false;
          }
          return true;
        });

  const filteredParlays =
    slipKindFilter === 'singles'
      ? []
      : userParlays.filter(p => {
          if (activeTab === 'settled' && p.result === 'pending') return false;
          if (activeTab !== 'all' && activeTab !== 'settled' && p.result !== activeTab) return false;
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const matchLeg = p.legs.some(
              l =>
                l.predictionTitle.toLowerCase().includes(q) ||
                l.predictionCategory.toLowerCase().includes(q)
            );
            const matchTx = p.transactionId.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
            if (!matchLeg && !matchTx) return false;
          }
          return true;
        });

  const wonTotal =
    wonBets.reduce((sum, b) => sum + b.actualWinnings, 0) +
    wonParlays.reduce((sum, p) => sum + p.actualWinnings, 0);
  const investedTotal =
    userBets.reduce((sum, b) => sum + b.amount, 0) +
    userParlays.reduce((sum, p) => sum + p.amount, 0);
  const settledStakedTotal =
    wonBets.reduce((sum, b) => sum + b.amount, 0) +
    lostBets.reduce((sum, b) => sum + b.amount, 0) +
    wonParlays.reduce((sum, p) => sum + p.amount, 0) +
    lostParlays.reduce((sum, p) => sum + p.amount, 0);
  const netProfit = wonTotal - settledStakedTotal;
  const totalWonCount = wonBets.length + wonParlays.length;
  const totalLostCount = lostBets.length + lostParlays.length;
  const decidedCount = totalWonCount + totalLostCount;
  const winRate = decidedCount > 0 ? Math.round((totalWonCount / decidedCount) * 100) : 0;

  const filterTabs: { id: HistoryFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All Bets', count: userBets.length + userParlays.length },
    { id: 'settled', label: 'Results', count: settledBets.length + settledParlays.length },
    { id: 'pending', label: 'Pending', count: pendingBets.length + pendingParlays.length },
    { id: 'won', label: 'Won', count: totalWonCount },
    { id: 'lost', label: 'Lost', count: totalLostCount },
    { id: 'voided', label: 'Voided', count: voidedBets.length + voidedParlays.length }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2 tracking-tight">
            <Trophy className="w-5 h-5 text-[#14e071]" />
            <span>Bet Results &amp; History</span>
            <span className="px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-slate-300 text-xs font-semibold font-mono-numbers">
              {userBets.length + userParlays.length} Total
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Track settled market outcomes, Bet Builder combos, winning payouts, and active picks in real time.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-[#0b1318] p-1 rounded-xl border border-white/[0.08] text-xs">
          {(
            [
              { id: 'all', label: 'All Slips' },
              { id: 'singles', label: `Singles (${userBets.length})` },
              { id: 'parlays', label: `Bet Builder (${userParlays.length})` }
            ] as { id: SlipKindFilter; label: string }[]
          ).map(k => (
            <button
              key={k.id}
              type="button"
              onClick={() => setSlipKindFilter(k.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition cursor-pointer ${
                slipKindFilter === k.id
                  ? 'bg-[#14e071] text-[#04130b] font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="apex-card rounded-xl p-3.5">
          <div className="text-[11px] text-slate-400 font-medium">Total Staked</div>
          <div className="mt-1 font-mono-numbers text-lg font-black text-white">
            {investedTotal.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {pendingBets.length + pendingParlays.length} active pending
          </div>
        </div>

        <div className="apex-card rounded-xl p-3.5">
          <div className="text-[11px] text-slate-400 font-medium">Total Won Payout</div>
          <div className="mt-1 font-mono-numbers text-lg font-black text-[#14e071]">
            +{wonTotal.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">{totalWonCount} winning slips</div>
        </div>

        <div className="apex-card rounded-xl p-3.5">
          <div className="text-[11px] text-slate-400 font-medium">Settled Net P&amp;L</div>
          <div
            className={`mt-1 font-mono-numbers text-lg font-black flex items-center gap-1 ${
              netProfit >= 0 ? 'text-[#14e071]' : 'text-rose-400'
            }`}
          >
            {netProfit >= 0 ? (
              <TrendingUp className="w-4 h-4 shrink-0" />
            ) : (
              <TrendingDown className="w-4 h-4 shrink-0" />
            )}
            <span>
              {netProfit >= 0 ? '+' : ''}
              {netProfit.toLocaleString()}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {totalLostCount} lost · {voidedBets.length + voidedParlays.length} voided
          </div>
        </div>

        <div className="apex-card rounded-xl p-3.5">
          <div className="text-[11px] text-slate-400 font-medium">Win Rate</div>
          <div className="mt-1 font-mono-numbers text-lg font-black text-sky-400">
            {decidedCount > 0 ? `${winRate}%` : '—'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {totalWonCount}W / {totalLostCount}L decided
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-white/[0.07] pb-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {filterTabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-[#14e071] text-[#04130b] font-bold shadow-[0_6px_18px_-6px_rgba(20,224,113,0.65)]'
                    : 'bg-[#0d151b] text-slate-400 hover:text-white border border-white/[0.07]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono-numbers ${
                    isActive ? 'bg-[#04130b]/20 text-[#04130b]' : 'bg-white/[0.06] text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search prediction or Tx ID..."
            className="w-full pl-9 pr-3 py-2 bg-[#0d151b] border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#14e071]"
          />
        </div>
      </div>

      {/* Bets List (Bet Builder Combos + Singles) */}
      {filteredBets.length === 0 && filteredParlays.length === 0 ? (
        <div className="apex-card rounded-2xl p-12 text-center space-y-3">
          <Clock className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="font-bold text-slate-200 text-sm">No Bet Records Found</h3>
          <p className="text-xs text-slate-400">
            {userBets.length === 0 && userParlays.length === 0
              ? 'You have not placed any predictions yet. Place a YES/NO pick or Bet Builder combo to see your slips here.'
              : `No predictions found under the “${activeTab}” filter.`}
          </p>
          {userBets.length === 0 && userParlays.length === 0 && onGoToMarkets && (
            <button
              type="button"
              onClick={onGoToMarkets}
              className="px-4 py-2 rounded-xl apex-glow-btn text-xs font-bold transition cursor-pointer"
            >
              Browse Live Markets →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Bet Builder Combo Slips */}
          {filteredParlays.map((pb, idx) => {
            const placedDate = new Date(pb.createdAt);
            const settledDate = pb.settledAt ? new Date(pb.settledAt) : null;
            const isWon = pb.result === 'won';
            const isLost = pb.result === 'lost';
            const isPending = pb.result === 'pending';
            const isVoided = pb.result === 'voided';
            const netDelta = isWon ? pb.actualWinnings - pb.amount : isLost ? -pb.amount : 0;

            return (
              <motion.div
                key={pb.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.16, delay: Math.min(idx * 0.03, 0.2) }}
                className={`apex-card rounded-2xl p-4 sm:p-5 space-y-3 transition ${
                  isWon
                    ? 'border-[#14e071]/40'
                    : isLost
                      ? 'border-rose-500/25'
                      : 'border-[#14e071]/20'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-[#14e071] flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      Bet Builder ({pb.legCount} Legs)
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      · Placed {placedDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at{' '}
                      {placedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {settledDate && (
                      <span className="text-slate-500 text-[11px]">
                        · Settled {settledDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>

                  <div>
                    {isPending && (
                      <span className="text-sky-400 text-xs font-bold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Pending Result
                      </span>
                    )}
                    {isWon && (
                      <span className="text-[#14e071] text-xs font-bold flex items-center gap-1">
                        <Trophy className="w-3.5 h-3.5" />
                        Won +{pb.actualWinnings.toLocaleString()} Coins
                      </span>
                    )}
                    {isLost && (
                      <span className="text-rose-400 text-xs font-bold flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" />
                        Lost (-{pb.amount.toLocaleString()})
                      </span>
                    )}
                    {isVoided && (
                      <span className="text-slate-300 text-xs font-bold flex items-center gap-1">
                        <RotateCcw className="w-3.5 h-3.5" />
                        Voided · Refunded +{pb.actualWinnings.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Legs Breakdown */}
                <div className="space-y-1.5 bg-[#070c10] p-3 rounded-xl border border-white/[0.06]">
                  {pb.legs.map((leg, legIdx) => (
                    <div
                      key={`${pb.id}-${leg.predictionId}-${legIdx}`}
                      className="flex items-center justify-between gap-3 text-xs py-1 border-b border-white/[0.04] last:border-b-0"
                    >
                      <div className="min-w-0">
                        <div className="text-slate-200 font-semibold truncate">
                          {legIdx + 1}. {leg.predictionTitle}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {leg.predictionCategory} · Pick{' '}
                          <span className={leg.choice === 'YES' ? 'text-[#14e071] font-bold' : 'text-rose-400 font-bold'}>
                            {leg.choice}
                          </span>{' '}
                          @ <span className="font-mono-numbers text-slate-300">{leg.odds.toFixed(2)}x</span>
                        </div>
                      </div>
                      <span
                        className={`text-[11px] font-bold uppercase shrink-0 ${
                          leg.status === 'won'
                            ? 'text-[#14e071]'
                            : leg.status === 'lost'
                              ? 'text-rose-400'
                              : leg.status === 'voided'
                                ? 'text-slate-400'
                                : 'text-sky-400'
                        }`}
                      >
                        {leg.status}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Combo Totals Row */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 bg-[#070c10] p-3 rounded-xl border border-white/[0.06] text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Multiplied Odds</span>
                    <span className="font-mono-numbers font-black text-[#14e071]">
                      {pb.effectiveOdds.toFixed(2)}x
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Staked</span>
                    <span className="font-mono-numbers font-bold text-white">
                      {pb.amount.toLocaleString()} coins
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Payout</span>
                    <span className={`font-mono-numbers font-black ${isWon ? 'text-[#14e071]' : isLost ? 'text-slate-500' : 'text-sky-400'}`}>
                      {isWon
                        ? `+${pb.actualWinnings.toLocaleString()}`
                        : isVoided
                          ? `+${pb.actualWinnings.toLocaleString()}`
                          : isLost
                            ? '0'
                            : `Est. ${pb.potentialWinnings.toLocaleString()}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Net P&amp;L</span>
                    <span className={`font-mono-numbers font-bold ${isWon ? 'text-[#14e071]' : isLost ? 'text-rose-400' : 'text-slate-400'}`}>
                      {isWon ? `+${netDelta.toLocaleString()}` : isLost ? `${netDelta.toLocaleString()}` : isVoided ? '0' : 'Pending'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Slip ID</span>
                    <span className="font-mono-numbers text-slate-400 text-[10px] truncate block" title={pb.id}>
                      {pb.id}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {filteredBets.map((bet, idx) => {
            const date = new Date(bet.createdAt);
            const settledDate = bet.settledAt ? new Date(bet.settledAt) : null;
            const linkedPred = predictionById.get(bet.predictionId);
            const marketOutcome = linkedPred?.outcome ?? null;

            const isWon = bet.result === 'won';
            const isLost = bet.result === 'lost';
            const isPending = bet.result === 'pending';
            const isVoided = bet.result === 'voided';
            const netDelta = isWon
              ? bet.actualWinnings - bet.amount
              : isLost
                ? -bet.amount
                : 0;

            return (
              <motion.div
                key={bet.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.16, delay: Math.min(idx * 0.03, 0.2) }}
                className={`apex-card rounded-2xl p-4 sm:p-5 space-y-3 transition ${
                  isWon
                    ? 'border-[#14e071]/35'
                    : isLost
                      ? 'border-rose-500/20'
                      : 'hover:border-white/[0.15]'
                }`}
              >
                {/* Top Row: Category, Date, Result Badge */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-white/[0.06] text-slate-200 font-semibold text-[11px] border border-white/[0.08] flex items-center gap-1.5">
                      {bet.predictionCategory === 'Cricket' ? (
                        <Trophy className="w-3 h-3 text-[#14e071]" />
                      ) : bet.predictionCategory === 'Movies' ? (
                        <Film className="w-3 h-3 text-purple-400" />
                      ) : (
                        <Activity className="w-3 h-3 text-sky-400" />
                      )}
                      {bet.predictionCategory}
                    </span>
                    <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      Placed {date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at{' '}
                      {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {settledDate && (
                      <span className="text-slate-500 text-[11px]">
                        · Settled {settledDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                        {settledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  {/* Result Badge */}
                  <div>
                    {isPending && (
                      <span className="px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/25 text-xs font-bold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 animate-pulse" />
                        Pending Result
                      </span>
                    )}
                    {isWon && (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-[#14e071] border border-[#14e071]/35 text-xs font-bold flex items-center gap-1">
                        <Trophy className="w-3.5 h-3.5" />
                        Won +{bet.actualWinnings.toLocaleString()} Coins
                      </span>
                    )}
                    {isLost && (
                      <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/25 text-xs font-bold flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" />
                        Lost (-{bet.amount.toLocaleString()})
                      </span>
                    )}
                    {isVoided && (
                      <span className="px-2.5 py-1 rounded-full bg-slate-700/50 text-slate-300 border border-slate-600/40 text-xs font-bold flex items-center gap-1">
                        <RotateCcw className="w-3.5 h-3.5" />
                        Voided · Refunded +{bet.actualWinnings.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Question */}
                <div className="font-bold text-white text-sm sm:text-base leading-snug">
                  {bet.predictionTitle}
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 bg-[#070c10] p-3 rounded-xl border border-white/[0.06] text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Your Pick</span>
                    <span
                      className={`font-black text-xs px-2 py-0.5 rounded inline-block mt-0.5 ${
                        bet.choice === 'YES'
                          ? 'bg-emerald-500/20 text-[#14e071]'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {bet.choice}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Market Result</span>
                    {marketOutcome ? (
                      <span
                        className={`font-black text-xs px-2 py-0.5 rounded inline-flex items-center gap-1 mt-0.5 ${
                          marketOutcome === 'YES'
                            ? 'bg-emerald-500/15 text-[#14e071]'
                            : marketOutcome === 'NO'
                              ? 'bg-rose-500/15 text-rose-400'
                              : 'bg-slate-700/60 text-slate-300'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        {marketOutcome}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs mt-0.5 block font-semibold">
                        {isVoided ? 'VOID' : isPending ? 'Awaiting' : 'Settled'}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Odds Locked</span>
                    <span className="font-mono-numbers font-bold text-white text-xs mt-0.5 block">
                      {bet.odds.toFixed(2)}x
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Staked</span>
                    <span className="font-mono-numbers font-bold text-slate-200 text-xs mt-0.5 block">
                      {bet.amount.toLocaleString()} coins
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Payout</span>
                    <span
                      className={`font-mono-numbers font-black text-xs mt-0.5 block ${
                        isWon
                          ? 'text-[#14e071]'
                          : isVoided
                            ? 'text-slate-200'
                            : isLost
                              ? 'text-slate-500'
                              : 'text-sky-400'
                      }`}
                    >
                      {isWon
                        ? `+${bet.actualWinnings.toLocaleString()}`
                        : isVoided
                          ? `+${bet.actualWinnings.toLocaleString()} (Refund)`
                          : isLost
                            ? '0'
                            : `Est. ${bet.potentialWinnings.toLocaleString()}`}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Net Profit / Loss</span>
                    <span
                      className={`font-mono-numbers font-bold text-xs mt-0.5 block ${
                        isWon
                          ? 'text-[#14e071]'
                          : isLost
                            ? 'text-rose-400'
                            : 'text-slate-400'
                      }`}
                    >
                      {isWon
                        ? `+${netDelta.toLocaleString()}`
                        : isLost
                          ? `${netDelta.toLocaleString()}`
                          : isVoided
                            ? '0 (Refunded)'
                            : 'Pending'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Ref Tx ID</span>
                    <span
                      className="font-mono-numbers text-slate-400 text-[10px] mt-0.5 block truncate"
                      title={bet.transactionId}
                    >
                      {bet.transactionId}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
