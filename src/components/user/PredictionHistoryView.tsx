import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Bet, BetResult } from '../../types';
import { 
  Trophy, 
  XCircle, 
  Clock, 
  RotateCcw, 
  Search, 
  ArrowUpRight, 
  CheckCircle2,
  Calendar,
  Layers,
  Coins
} from 'lucide-react';

export const PredictionHistoryView: React.FC = () => {
  const { bets, currentUser } = useApp();

  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'won' | 'lost' | 'voided'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  if (!currentUser) return null;

  const userBets = bets.filter(b => b.userId === currentUser.id);

  const filteredBets = userBets.filter(b => {
    if (activeTab !== 'all' && b.result !== activeTab) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = b.predictionTitle.toLowerCase().includes(q);
      const matchCat = b.predictionCategory.toLowerCase().includes(q);
      const matchTx = b.transactionId.toLowerCase().includes(q);
      if (!matchTitle && !matchCat && !matchTx) return false;
    }
    return true;
  });

  const wonTotal = userBets.filter(b => b.result === 'won').reduce((sum, b) => sum + b.actualWinnings, 0);
  const investedTotal = userBets.reduce((sum, b) => sum + b.amount, 0);
  const pendingCount = userBets.filter(b => b.result === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header and Summary Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Prediction History</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold">
              {userBets.length} Total Bets
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Full ledger of all your placed YES/NO market predictions, odds, and payouts.
          </p>
        </div>

        {/* Quick summary chips */}
        <div className="flex items-center gap-2 text-xs">
          <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
            <span className="text-slate-400">Total Staked: </span>
            <span className="font-mono font-bold text-white">{investedTotal.toLocaleString()} 🪙</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
            <span className="text-slate-400">Total Won: </span>
            <span className="font-mono font-bold text-emerald-400">+{wonTotal.toLocaleString()} 🪙</span>
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {(['all', 'pending', 'won', 'lost', 'voided'] as const).map(tab => {
            const count = tab === 'all' ? userBets.length : userBets.filter(b => b.result === tab).length;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition flex items-center gap-1.5 ${
                  activeTab === tab
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <span>{tab}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === tab ? 'bg-emerald-800 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search prediction or ID..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Bets Table / Cards */}
      {filteredBets.length === 0 ? (
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-12 text-center space-y-2">
          <Clock className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="font-bold text-slate-300 text-sm">No Predictions Found</h3>
          <p className="text-xs text-slate-500">
            No bets found under the "{activeTab}" filter.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBets.map(bet => {
            const date = new Date(bet.createdAt);
            const isWon = bet.result === 'won';
            const isLost = bet.result === 'lost';
            const isPending = bet.result === 'pending';
            const isVoided = bet.result === 'voided';

            return (
              <div
                key={bet.id}
                className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 sm:p-5 hover:border-slate-700 transition shadow-sm space-y-3"
              >
                {/* Top Row: Category, Date, Status */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 font-semibold text-[11px] border border-slate-700">
                      {bet.predictionCategory}
                    </span>
                    <span className="text-slate-500 flex items-center gap-1 text-[11px]">
                      <Calendar className="w-3 h-3" />
                      {date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isPending && (
                      <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 animate-pulse" />
                        Pending Match Result
                      </span>
                    )}
                    {isWon && (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1">
                        <Trophy className="w-3.5 h-3.5" />
                        Won (+{bet.actualWinnings} Coins)
                      </span>
                    )}
                    {isLost && (
                      <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-bold flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" />
                        Lost
                      </span>
                    )}
                    {isVoided && (
                      <span className="px-2.5 py-1 rounded-full bg-slate-700/50 text-slate-300 border border-slate-600/30 text-xs font-bold flex items-center gap-1">
                        <RotateCcw className="w-3.5 h-3.5" />
                        Voided / Stake Refunded
                      </span>
                    )}
                  </div>
                </div>

                {/* Question */}
                <div className="font-bold text-slate-100 text-base leading-snug">
                  {bet.predictionTitle}
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Pick</span>
                    <span className={`font-black text-xs px-2 py-0.5 rounded inline-block mt-0.5 ${
                      bet.choice === 'YES' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {bet.choice}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Odds Locked</span>
                    <span className="font-mono font-bold text-white text-xs mt-0.5 block">
                      {bet.odds.toFixed(2)}x
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Amount Staked</span>
                    <span className="font-mono font-bold text-slate-200 text-xs mt-0.5 block">
                      🪙 {bet.amount.toLocaleString()}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Potential Win</span>
                    <span className="font-mono font-bold text-slate-300 text-xs mt-0.5 block">
                      🪙 {bet.potentialWinnings.toLocaleString()}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Actual Payout</span>
                    <span className={`font-mono font-black text-xs mt-0.5 block ${
                      isWon ? 'text-emerald-400' : isLost ? 'text-slate-500' : 'text-slate-400'
                    }`}>
                      {isWon ? `🪙 ${bet.actualWinnings.toLocaleString()}` : isLost ? '0' : 'Pending'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Ref Tx ID</span>
                    <span className="font-mono text-slate-400 text-[10px] mt-0.5 block truncate" title={bet.transactionId}>
                      {bet.transactionId}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
