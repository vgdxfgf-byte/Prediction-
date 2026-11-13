import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { Prediction, PredictionCategory } from '../../types';
import { 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Flame, 
  Coins, 
  ShieldAlert,
  ArrowUpDown
} from 'lucide-react';

interface PredictionsViewProps {
  onSelectPrediction: (pred: Prediction, choice: 'YES' | 'NO') => void;
}

const CATEGORIES: ('All' | PredictionCategory)[] = [
  'All',
  'Cricket',
  'Football',
  'Basketball',
  'Tennis',
  'Esports',
  'Crypto & Finance'
];

export const PredictionsView: React.FC<PredictionsViewProps> = ({ onSelectPrediction }) => {
  const { predictions, bets, currentUser } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<'All' | PredictionCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'open' | 'all' | 'settled'>('open');

  // Filter predictions
  const filteredPredictions = predictions.filter(p => {
    // Category match
    if (selectedCategory !== 'All' && p.category !== selectedCategory) return false;

    // Status filter
    if (statusFilter === 'open' && p.status !== 'open') return false;
    if (statusFilter === 'settled' && p.status !== 'settled') return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchSubtitle = p.subtitle.toLowerCase().includes(q);
      const matchCat = p.category.toLowerCase().includes(q);
      if (!matchTitle && !matchSubtitle && !matchCat) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Prediction Markets</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              Live Odds
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Pick YES or NO on verified sports matches and global events.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search teams, matches, or questions..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-xs text-slate-500 hover:text-slate-300"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Category Pills & Status Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        {/* Categories scrollable */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full pb-1 sm:pb-0 scrollbar-none">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-950/50'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0 text-xs self-end sm:self-auto">
          <button
            onClick={() => setStatusFilter('open')}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              statusFilter === 'open' ? 'bg-slate-800 text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Open Markets
          </button>
          <button
            onClick={() => setStatusFilter('settled')}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              statusFilter === 'settled' ? 'bg-slate-800 text-blue-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Settled
          </button>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-medium transition ${
              statusFilter === 'all' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* Markets Grid */}
      {filteredPredictions.length === 0 ? (
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-200 text-base">No Predictions Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            We couldn't find any predictions matching your filter criteria. Try clearing search filters or check back soon.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPredictions.map((pred, idx) => {
            const closeDate = new Date(pred.closingTime);
            const isClosed = pred.status === 'closed' || closeDate.getTime() <= Date.now();
            const isSettled = pred.status === 'settled';
            const isPaused = pred.status === 'paused';
            const isOpen = pred.status === 'open' && !isClosed;

            // Check if current user already placed bets on this
            const userExistingBets = currentUser ? bets.filter(b => b.userId === currentUser.id && b.predictionId === pred.id) : [];

            return (
              <motion.div
                key={pred.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -3 }}
                transition={{
                  duration: 0.2,
                  delay: Math.min(idx * 0.04, 0.24),
                  ease: [0.16, 1, 0.3, 1]
                }}
                className="bg-slate-900/90 rounded-2xl border border-slate-800 hover:border-slate-700 p-5 flex flex-col justify-between transition-colors duration-200 shadow-lg relative group"
              >
                {/* Card Top: Category, Match context, Status */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 font-semibold border border-slate-700/80 text-[11px]">
                      {pred.category}
                    </span>

                    {/* Status Pill */}
                    {isOpen && (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Active
                      </span>
                    )}
                    {isPaused && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-semibold">
                        Paused
                      </span>
                    )}
                    {isClosed && !isSettled && (
                      <span className="px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-300 text-[10px] font-semibold">
                        Closed (Settling)
                      </span>
                    )}
                    {isSettled && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-semibold">
                        Settled: {pred.outcome} Won
                      </span>
                    )}
                  </div>

                  {/* Subtitle / Match title */}
                  <div className="text-[11px] text-slate-400 font-medium mb-1">
                    {pred.subtitle}
                  </div>

                  {/* Question */}
                  <h3 className="font-bold text-base text-slate-100 group-hover:text-emerald-300 transition-colors leading-snug">
                    {pred.title}
                  </h3>

                  {pred.description && (
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                      {pred.description}
                    </p>
                  )}
                </div>

                {/* Card Mid: User Existing Bets if any */}
                {userExistingBets.length > 0 && (
                  <div className="my-3 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs flex items-center justify-between">
                    <span className="text-slate-400">Your Prediction:</span>
                    <div className="flex items-center gap-1.5">
                      {userExistingBets.map(b => (
                        <span
                          key={b.id}
                          className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                            b.choice === 'YES' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {b.choice} ({b.amount} 🪙)
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Card Bottom: Closing time & Odds buttons */}
                <div className="mt-4 pt-3 border-t border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      Closes: {closeDate.toLocaleDateString([], { month: 'short', day: 'numeric' })} at {closeDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span>
                      Limits: <strong className="text-slate-300 font-mono">{pred.minBet}-{pred.maxBet}</strong> 🪙
                    </span>
                  </div>

                  {/* YES / NO Options with Odds */}
                  {isOpen ? (
                    <div className="grid grid-cols-2 gap-2">
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={() => onSelectPrediction(pred, 'YES')}
                        className="py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-emerald-950/50 border border-emerald-500/40 hover:border-emerald-500 text-emerald-300 font-bold text-xs flex items-center justify-between transition cursor-pointer group/btn shadow-sm"
                      >
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>YES</span>
                        </div>
                        <span className="font-mono bg-emerald-500/20 px-2 py-0.5 rounded text-[11px] font-bold text-emerald-300">
                          {pred.yesOdds.toFixed(2)}x
                        </span>
                      </motion.button>

                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={() => onSelectPrediction(pred, 'NO')}
                        className="py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-rose-950/50 border border-rose-500/40 hover:border-rose-500 text-rose-300 font-bold text-xs flex items-center justify-between transition cursor-pointer group/btn shadow-sm"
                      >
                        <div className="flex items-center gap-1.5">
                          <XCircle className="w-3.5 h-3.5 text-rose-400" />
                          <span>NO</span>
                        </div>
                        <span className="font-mono bg-rose-500/20 px-2 py-0.5 rounded text-[11px] font-bold text-rose-300">
                          {pred.noOdds.toFixed(2)}x
                        </span>
                      </motion.button>
                    </div>
                  ) : (
                    /* Settled or Closed State */
                    <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-center">
                      {isSettled ? (
                        <div className="text-xs">
                          <span className="text-slate-400">Winning Outcome: </span>
                          <span className={`font-black uppercase px-2 py-0.5 rounded ${
                            pred.outcome === 'YES' ? 'bg-emerald-500/20 text-emerald-400' :
                            pred.outcome === 'NO' ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-700 text-slate-300'
                          }`}>
                            {pred.outcome} WON
                          </span>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400">
                          {isPaused ? 'Betting is temporarily paused by admin' : 'Market closed for betting. Result pending.'}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Volume bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>YES Vol: {pred.totalYesVolume.toLocaleString()} 🪙</span>
                      <span>NO Vol: {pred.totalNoVolume.toLocaleString()} 🪙</span>
                    </div>
                    {pred.totalYesVolume + pred.totalNoVolume > 0 && (
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
                        <div 
                          className="bg-emerald-500 h-full transition-all"
                          style={{
                            width: `${(pred.totalYesVolume / (pred.totalYesVolume + pred.totalNoVolume)) * 100}%`
                          }}
                        />
                        <div 
                          className="bg-rose-500 h-full transition-all"
                          style={{
                            width: `${(pred.totalNoVolume / (pred.totalYesVolume + pred.totalNoVolume)) * 100}%`
                          }}
                        />
                      </div>
                    )}
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
