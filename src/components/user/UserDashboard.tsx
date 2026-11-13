import React from 'react';
import { motion } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { Prediction } from '../../types';
import { 
  Coins, 
  Trophy, 
  TrendingDown, 
  Activity, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle,
  Flame,
  Plus
} from 'lucide-react';
import { WhatsAppSupportButton } from '../common/WhatsAppSupportButton';

interface UserDashboardProps {
  onSelectPrediction: (pred: Prediction, choice: 'YES' | 'NO') => void;
  onNavigateTab: (tab: string) => void;
  onOpenDeposit: () => void;
  onOpenWithdraw: () => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  onSelectPrediction,
  onNavigateTab,
  onOpenDeposit,
  onOpenWithdraw
}) => {
  const { currentUser, bets, transactions, predictions, withdrawals } = useApp();

  if (!currentUser) return null;

  // Compute metrics for current user
  const userBets = bets.filter(b => b.userId === currentUser.id);
  const activeBets = userBets.filter(b => b.result === 'pending');
  const wonBets = userBets.filter(b => b.result === 'won');
  const lostBets = userBets.filter(b => b.result === 'lost');

  const totalWinningCoins = wonBets.reduce((sum, b) => sum + b.actualWinnings, 0);
  const totalLosingCoins = lostBets.reduce((sum, b) => sum + b.amount, 0);

  const userWithdrawals = withdrawals.filter(w => w.userId === currentUser.id);
  const pendingWithdrawals = userWithdrawals.filter(w => w.status === 'pending' || w.status === 'processing');
  const pendingWithdrawalsAmount = pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0);

  const userTransactions = transactions.filter(t => t.userId === currentUser.id).slice(0, 5);
  const openMarkets = predictions.filter(p => p.status === 'open').slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 border border-slate-800 shadow-xl">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.15),transparent_70%)] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Live Sports & Events Exchange
              </span>
              <span className="text-xs text-slate-400">Account #{currentUser.id.replace('usr_', '')}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">{currentUser.fullName}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
              Predict outcomes on live Cricket, Football, Tennis, Basketball, and Crypto markets with guaranteed coin settlement.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto">
            <button
              onClick={onOpenDeposit}
              className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Deposit Coins
            </button>
            <button
              onClick={onOpenWithdraw}
              className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4 text-slate-400" />
              Withdraw
            </button>
            <WhatsAppSupportButton username={currentUser.username} variant="dashboard" />
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Available Coins */}
        <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-sm relative overflow-hidden group hover:border-emerald-500/40 transition">
          <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold flex items-center justify-between">
            <span>Available Coins</span>
            <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              🪙
            </div>
          </div>
          <div className="mt-2 font-mono-numbers text-2xl font-black text-emerald-400">
            {currentUser.coins.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Ready to predict</div>
        </div>

        {/* Total Winning Coins */}
        <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-sm group hover:border-emerald-500/40 transition">
          <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold flex items-center justify-between">
            <span>Total Winnings</span>
            <Trophy className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 font-mono-numbers text-2xl font-black text-emerald-300">
            {totalWinningCoins.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-500/80 mt-0.5 font-medium">
            From {wonBets.length} winning picks
          </div>
        </div>

        {/* Total Losing Coins */}
        <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-sm group hover:border-rose-500/40 transition">
          <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold flex items-center justify-between">
            <span>Total Losses</span>
            <TrendingDown className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 font-mono-numbers text-2xl font-black text-rose-400">
            {totalLosingCoins.toLocaleString()}
          </div>
          <div className="text-[10px] text-rose-400/80 mt-0.5 font-medium">
            Across {lostBets.length} settled bets
          </div>
        </div>

        {/* Active Predictions */}
        <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-sm group hover:border-blue-500/40 transition">
          <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold flex items-center justify-between">
            <span>Active Bets</span>
            <Activity className="w-4 h-4 text-blue-400 animate-pulse" />
          </div>
          <div className="mt-2 font-mono-numbers text-2xl font-black text-blue-400">
            {activeBets.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Awaiting match results</div>
        </div>

        {/* Total Predictions */}
        <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-sm group hover:border-slate-700 transition">
          <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold flex items-center justify-between">
            <span>Total Predictions</span>
            <ShieldCheck className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 font-mono-numbers text-2xl font-black text-slate-200">
            {userBets.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Lifetime activity</div>
        </div>

        {/* Pending Withdrawals */}
        <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-sm group hover:border-amber-500/40 transition">
          <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold flex items-center justify-between">
            <span>Pending Payout</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 font-mono-numbers text-2xl font-black text-amber-400">
            {pendingWithdrawalsAmount.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {pendingWithdrawals.length} request(s) under review
          </div>
        </div>
      </div>

      {/* Main Content Split: Featured Markets + Recent Bets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Featured Predictions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-white">Trending Predictions</h2>
            </div>
            <button
              onClick={() => onNavigateTab('predictions')}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition"
            >
              View All ({predictions.filter(p => p.status === 'open').length})
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {openMarkets.map((pred, idx) => {
              const closeDate = new Date(pred.closingTime);
              const isClosingSoon = closeDate.getTime() - Date.now() < 12 * 3600 * 1000;

              return (
                <motion.div
                  key={pred.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(idx * 0.04, 0.2), ease: 'easeOut' }}
                  whileHover={{ y: -2 }}
                  className="bg-slate-900/80 rounded-2xl border border-slate-800 hover:border-slate-700 p-4 flex flex-col justify-between transition-colors shadow-md group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                        {pred.category}
                      </span>
                      <span className={`flex items-center gap-1 font-mono text-[10px] ${isClosingSoon ? 'text-amber-400 font-bold' : 'text-slate-400'}`}>
                        <Clock className="w-3 h-3" />
                        {isClosingSoon ? 'Closing soon' : closeDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-slate-100 group-hover:text-emerald-300 transition leading-snug">
                      {pred.title}
                    </h3>
                    <p className="text-xs text-slate-400 truncate">{pred.subtitle}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
                    <div className="flex justify-between items-center text-[11px] text-slate-400">
                      <span>Volume: {(pred.totalYesVolume + pred.totalNoVolume).toLocaleString()} 🪙</span>
                      <span>Min: {pred.minBet} 🪙</span>
                    </div>

                    {/* Instant YES / NO prediction buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={() => onSelectPrediction(pred, 'YES')}
                        className="py-2 px-3 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 hover:border-emerald-500 text-emerald-300 font-bold text-xs flex items-center justify-between transition cursor-pointer"
                      >
                        <span>YES</span>
                        <span className="font-mono bg-emerald-500/20 px-1.5 py-0.5 rounded text-[11px]">
                          {pred.yesOdds.toFixed(2)}x
                        </span>
                      </motion.button>

                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={() => onSelectPrediction(pred, 'NO')}
                        className="py-2 px-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 hover:border-rose-500 text-rose-300 font-bold text-xs flex items-center justify-between transition cursor-pointer"
                      >
                        <span>NO</span>
                        <span className="font-mono bg-rose-500/20 px-1.5 py-0.5 rounded text-[11px]">
                          {pred.noOdds.toFixed(2)}x
                        </span>
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Right Col: Active Bets & Recent Activity */}
        <div className="space-y-5">
          {/* Active Bets Card */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-400" />
                Active Slips ({activeBets.length})
              </h3>
              <button
                onClick={() => onNavigateTab('history')}
                className="text-[11px] text-slate-400 hover:text-slate-200 transition"
              >
                Full History →
              </button>
            </div>

            {activeBets.length === 0 ? (
              <div className="py-6 text-center text-slate-500 text-xs">
                No active predictions. Pick a market to start!
              </div>
            ) : (
              <div className="space-y-2">
                {activeBets.slice(0, 3).map(b => (
                  <div 
                    key={b.id}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-medium text-slate-200 line-clamp-1 text-[11px]">
                        {b.predictionTitle}
                      </span>
                      <span className={`font-bold px-1.5 py-0.2 rounded text-[10px] shrink-0 ${
                        b.choice === 'YES' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {b.choice} @ {b.odds}x
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span>Stake: <strong className="text-white font-mono">{b.amount} 🪙</strong></span>
                      <span className="text-emerald-400 font-semibold font-mono">
                        Win: {b.potentialWinnings} 🪙
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Transactions Card */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-400" />
                Recent Ledger
              </h3>
              <button
                onClick={() => onNavigateTab('wallet')}
                className="text-[11px] text-slate-400 hover:text-slate-200 transition"
              >
                Wallet →
              </button>
            </div>

            {userTransactions.length === 0 ? (
              <div className="py-6 text-center text-slate-500 text-xs">
                No transactions recorded yet
              </div>
            ) : (
              <div className="space-y-2">
                {userTransactions.map(tx => {
                  const isPositive = tx.amount > 0;
                  return (
                    <div
                      key={tx.id}
                      className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {isPositive ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                        </div>
                        <div className="truncate">
                          <div className="text-[11px] font-medium text-slate-300 truncate">
                            {tx.description}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {new Date(tx.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>

                      <div className={`font-mono font-bold text-xs shrink-0 pl-2 ${isPositive ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {isPositive ? '+' : ''}{tx.amount} 🪙
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
