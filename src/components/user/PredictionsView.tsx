import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { Prediction, PredictionCategory } from '../../types';
import {
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  Trophy,
  Film,
  Activity
} from 'lucide-react';

interface PredictionsViewProps {
  onSelectPrediction: (pred: Prediction, choice: 'YES' | 'NO') => void;
}

const CATEGORIES: ('All' | PredictionCategory)[] = [
  'All',
  'Cricket',
  'Movies',
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
    if (selectedCategory !== 'All' && p.category !== selectedCategory) return false;
    if (statusFilter === 'open' && p.status !== 'open') return false;
    if (statusFilter === 'settled' && p.status !== 'settled') return false;

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
          <h2 className="text-xl font-black text-white flex items-center gap-2 tracking-tight">
            <span>Prediction Markets</span>
            <span className="text-xs font-semibold text-[#14e071]">· Live Odds</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Pick YES or NO on Cricket matches, Movie box office & global events.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search cricket, movies, teams, or questions..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#0d151b] border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#14e071] transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs & Status Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/[0.07] pb-4">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full pb-1 sm:pb-0 scrollbar-none">
          {CATEGORIES.map(cat => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`relative px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isSelected
                    ? 'text-[#04130b] font-bold'
                    : 'bg-[#0d151b] text-slate-400 hover:text-white border border-white/[0.07]'
                }`}
              >
                {isSelected && (
                  <motion.span
                    layoutId="predictionsCategoryTab"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute inset-0 rounded-xl bg-[#14e071] shadow-[0_6px_18px_-6px_rgba(20,224,113,0.65)]"
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  {cat === 'Cricket' && <Trophy className="w-3.5 h-3.5" />}
                  {cat === 'Movies' && <Film className="w-3.5 h-3.5" />}
                  {cat}
                </span>
              </button>
            );
          })}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1 bg-[#0b1318] p-1 rounded-xl border border-white/[0.08] shrink-0 text-xs self-end sm:self-auto">
          <button
            onClick={() => setStatusFilter('open')}
            className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition cursor-pointer ${
              statusFilter === 'open'
                ? 'bg-emerald-500/15 text-[#14e071]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Open
          </button>
          <button
            onClick={() => setStatusFilter('settled')}
            className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition cursor-pointer ${
              statusFilter === 'settled'
                ? 'bg-sky-500/15 text-sky-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Settled
          </button>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-white/[0.1] text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* Markets Grid */}
      {filteredPredictions.length === 0 ? (
        <div className="apex-card rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-white/[0.05] text-[#14e071] mx-auto flex items-center justify-center">
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

            const userExistingBets = currentUser
              ? bets.filter(b => b.userId === currentUser.id && b.predictionId === pred.id)
              : [];

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
                className="apex-card hover:border-emerald-500/40 rounded-2xl p-5 flex flex-col justify-between transition-colors duration-200 relative group"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-2.5 gap-2">
                    <span className="flex items-center gap-1.5 font-semibold text-[11px] text-slate-300 min-w-0">
                      {pred.category === 'Cricket' ? (
                        <Trophy className="w-3.5 h-3.5 text-[#14e071] shrink-0" />
                      ) : pred.category === 'Movies' ? (
                        <Film className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      ) : (
                        <Activity className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      )}
                      <span className="truncate">{pred.subtitle || pred.category}</span>
                    </span>

                    {isOpen && <span className="text-[#14e071] text-[10px] font-bold shrink-0">Live</span>}
                    {isPaused && <span className="text-amber-400 text-[10px] font-bold shrink-0">Paused</span>}
                    {isClosed && !isSettled && (
                      <span className="text-slate-400 text-[10px] font-semibold shrink-0">Settling</span>
                    )}
                    {isSettled && (
                      <span className="text-sky-400 text-[10px] font-bold shrink-0">
                        {pred.outcome} Won
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-base text-white group-hover:text-[#14e071] transition-colors leading-snug">
                    {pred.title}
                  </h3>

                  {pred.description && (
                    <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">{pred.description}</p>
                  )}
                </div>

                {userExistingBets.length > 0 && (
                  <div className="my-3 px-3 py-2 rounded-xl bg-[#070c10] border border-white/[0.06] text-xs flex items-center justify-between">
                    <span className="text-slate-400">Your Pick:</span>
                    <div className="flex items-center gap-1.5 font-mono-numbers">
                      {userExistingBets.map(b => (
                        <span
                          key={b.id}
                          className={`font-bold text-[11px] ${
                            b.choice === 'YES' ? 'text-[#14e071]' : 'text-rose-400'
                          }`}
                        >
                          {b.choice} ({b.amount})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-white/[0.06] space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono-numbers">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {closeDate.toLocaleDateString([], { month: 'short', day: 'numeric' })},{' '}
                      {closeDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span>
                      {pred.minBet}–{pred.maxBet} coins
                    </span>
                  </div>

                  {isOpen ? (
                    <div className="grid grid-cols-2 gap-2.5">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => onSelectPrediction(pred, 'YES')}
                        className="py-2.5 px-3 rounded-xl bg-emerald-950/55 hover:bg-emerald-900/70 border border-[#14e071]/40 hover:border-[#14e071] font-bold text-xs flex items-center justify-between transition cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5 text-[#14e071]">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>YES</span>
                        </div>
                        <span className="font-mono-numbers font-extrabold text-white">
                          {pred.yesOdds.toFixed(2)}x
                        </span>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => onSelectPrediction(pred, 'NO')}
                        className="py-2.5 px-3 rounded-xl bg-rose-950/45 hover:bg-rose-900/65 border border-rose-500/35 hover:border-rose-400 font-bold text-xs flex items-center justify-between transition cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5 text-rose-400">
                          <XCircle className="w-4 h-4" />
                          <span>NO</span>
                        </div>
                        <span className="font-mono-numbers font-extrabold text-white">
                          {pred.noOdds.toFixed(2)}x
                        </span>
                      </motion.button>
                    </div>
                  ) : (
                    <div className="bg-[#070c10] p-2.5 rounded-xl border border-white/[0.06] text-center">
                      {isSettled ? (
                        <div className="text-xs">
                          <span className="text-slate-400">Outcome: </span>
                          <span
                            className={`font-black uppercase ${
                              pred.outcome === 'YES'
                                ? 'text-[#14e071]'
                                : pred.outcome === 'NO'
                                  ? 'text-rose-400'
                                  : 'text-slate-300'
                            }`}
                          >
                            {pred.outcome} WON
                          </span>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400">
                          {isPaused ? 'Market paused by admin' : 'Market closed. Result pending.'}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Volume bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono-numbers">
                      <span>YES: {pred.totalYesVolume.toLocaleString()}</span>
                      <span>NO: {pred.totalNoVolume.toLocaleString()}</span>
                    </div>
                    {pred.totalYesVolume + pred.totalNoVolume > 0 && (
                      <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden flex">
                        <div
                          className="bg-[#14e071] h-full transition-all"
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
