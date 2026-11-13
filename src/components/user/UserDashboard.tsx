import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  Flame,
  Plus,
  User as UserIcon,
  KeyRound,
  Wallet,
  History,
  Film,
  Compass
} from 'lucide-react';
import { WhatsAppSupportButton } from '../common/WhatsAppSupportButton';

interface UserDashboardProps {
  onSelectPrediction: (pred: Prediction, choice: 'YES' | 'NO') => void;
  onNavigateTab: (tab: string) => void;
  onOpenDeposit: () => void;
  onOpenWithdraw: () => void;
  onOpenProfile: () => void;
}

type SpotlightFilter = 'All' | 'Cricket' | 'Movies';

export const UserDashboard: React.FC<UserDashboardProps> = ({
  onSelectPrediction,
  onNavigateTab,
  onOpenDeposit,
  onOpenWithdraw,
  onOpenProfile
}) => {
  const { currentUser, bets, transactions, predictions, withdrawals } = useApp();
  const [marketFilter, setMarketFilter] = useState<SpotlightFilter>('All');

  const allOpenMarkets = predictions.filter(p => p.status === 'open');

  const spotlightMarkets = useMemo(() => {
    if (marketFilter === 'Cricket') {
      return allOpenMarkets.filter(p => p.category === 'Cricket').slice(0, 4);
    }
    if (marketFilter === 'Movies') {
      return allOpenMarkets.filter(p => p.category === 'Movies').slice(0, 4);
    }
    // For 'All', surface a balanced mix starting with Cricket and Movies
    const cricket = allOpenMarkets.filter(p => p.category === 'Cricket');
    const movies = allOpenMarkets.filter(p => p.category === 'Movies');
    const others = allOpenMarkets.filter(
      p => p.category !== 'Cricket' && p.category !== 'Movies'
    );
    const mixed: Prediction[] = [];
    const maxLen = Math.max(cricket.length, movies.length, others.length);
    for (let i = 0; i < maxLen && mixed.length < 4; i++) {
      if (cricket[i] && mixed.length < 4) mixed.push(cricket[i]);
      if (movies[i] && mixed.length < 4) mixed.push(movies[i]);
      if (others[i] && mixed.length < 4) mixed.push(others[i]);
    }
    return mixed;
  }, [allOpenMarkets, marketFilter]);

  if (!currentUser) return null;

  // Compute metrics for current user
  const userBets = bets.filter(b => b.userId === currentUser.id);
  const activeBets = userBets.filter(b => b.result === 'pending');
  const wonBets = userBets.filter(b => b.result === 'won');
  const lostBets = userBets.filter(b => b.result === 'lost');

  const totalWinningCoins = wonBets.reduce((sum, b) => sum + b.actualWinnings, 0);
  const totalLosingCoins = lostBets.reduce((sum, b) => sum + b.amount, 0);

  const userWithdrawals = withdrawals.filter(w => w.userId === currentUser.id);
  const pendingWithdrawals = userWithdrawals.filter(
    w => w.status === 'pending' || w.status === 'processing'
  );
  const pendingWithdrawalsAmount = pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0);

  const userTransactions = transactions.filter(t => t.userId === currentUser.id).slice(0, 5);

  const initials = currentUser.username.substring(0, 2).toUpperCase();

  const kpiCards = [
    {
      label: 'Available Coins',
      value: currentUser.coins.toLocaleString(),
      sub: 'Ready to predict',
      subClass: 'text-slate-400',
      valueClass: 'text-emerald-400',
      hoverClass: 'hover:border-emerald-500/40',
      icon: <Coins className="w-4 h-4 text-amber-400" />
    },
    {
      label: 'Total Winnings',
      value: totalWinningCoins.toLocaleString(),
      sub: `From ${wonBets.length} winning picks`,
      subClass: 'text-emerald-500/80 font-medium',
      valueClass: 'text-emerald-300',
      hoverClass: 'hover:border-emerald-500/40',
      icon: <Trophy className="w-4 h-4 text-emerald-400" />
    },
    {
      label: 'Total Losses',
      value: totalLosingCoins.toLocaleString(),
      sub: `Across ${lostBets.length} settled bets`,
      subClass: 'text-rose-400/80 font-medium',
      valueClass: 'text-rose-400',
      hoverClass: 'hover:border-rose-500/40',
      icon: <TrendingDown className="w-4 h-4 text-rose-400" />
    },
    {
      label: 'Active Bets',
      value: activeBets.length.toLocaleString(),
      sub: 'Awaiting match results',
      subClass: 'text-slate-400',
      valueClass: 'text-blue-400',
      hoverClass: 'hover:border-blue-500/40',
      icon: <Activity className="w-4 h-4 text-blue-400" />
    },
    {
      label: 'Total Predictions',
      value: userBets.length.toLocaleString(),
      sub: 'Lifetime activity',
      subClass: 'text-slate-400',
      valueClass: 'text-slate-200',
      hoverClass: 'hover:border-slate-700',
      icon: <ShieldCheck className="w-4 h-4 text-slate-400" />
    },
    {
      label: 'Pending Payout',
      value: pendingWithdrawalsAmount.toLocaleString(),
      sub: `${pendingWithdrawals.length} request(s) under review`,
      subClass: 'text-slate-400',
      valueClass: 'text-amber-400',
      hoverClass: 'hover:border-amber-500/40',
      icon: <Clock className="w-4 h-4 text-amber-400" />
    }
  ];

  const profileQuickButtons = [
    {
      id: 'profile',
      label: 'Profile & Password',
      sub: `@${currentUser.username}`,
      icon: KeyRound,
      accent: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      hoverBorder: 'hover:border-emerald-500/50',
      onClick: onOpenProfile
    },
    {
      id: 'history',
      label: 'My Slips & History',
      sub: `${userBets.length} total picks`,
      icon: History,
      accent: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      hoverBorder: 'hover:border-blue-500/50',
      onClick: () => onNavigateTab('history')
    },
    {
      id: 'wallet',
      label: 'Wallet & Payouts',
      sub: `${currentUser.coins.toLocaleString()} coins`,
      icon: Wallet,
      accent: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      hoverBorder: 'hover:border-amber-500/50',
      onClick: () => onNavigateTab('wallet')
    },
    {
      id: 'markets',
      label: 'Cricket & Movie Markets',
      sub: `${allOpenMarkets.length} open events`,
      icon: Compass,
      accent: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      hoverBorder: 'hover:border-purple-500/50',
      onClick: () => onNavigateTab('predictions')
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Hero Banner with Profile Identity & Actions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800/95 to-emerald-950 p-6 border border-slate-800 shadow-xl"
      >
        <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.16),transparent_70%)] pointer-events-none" />
        <div className="animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/[0.04] to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            {/* Animated User Profile Avatar */}
            <motion.button
              type="button"
              onClick={onOpenProfile}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
              title="Open Profile & Security"
              className="relative shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/25 to-cyan-500/20 border border-emerald-400/40 flex items-center justify-center shadow-lg shadow-emerald-950/50 cursor-pointer group"
            >
              <span className="font-black text-lg text-emerald-300 tracking-tight group-hover:text-white transition-colors">
                {initials}
              </span>
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-md bg-slate-900 border border-emerald-500/40 flex items-center justify-center">
                <UserIcon className="w-3 h-3 text-emerald-400" />
              </span>
            </motion.button>

            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-1">
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Live Exchange
                </span>
                <span>·</span>
                <span>@{currentUser.username}</span>
                <span>·</span>
                <span>Account #{currentUser.id.replace('usr_', '')}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Welcome back,{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">
                  {currentUser.fullName}
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
                Predict outcomes across live Cricket matches, Box Office Movies, Football, and Crypto markets with instant coin settlement.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-stretch lg:self-auto">
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={onOpenProfile}
              className="px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 font-semibold text-xs flex items-center justify-center gap-1.5 transition whitespace-nowrap shrink-0 cursor-pointer"
            >
              <UserIcon className="w-4 h-4 text-emerald-400" />
              My Profile
            </motion.button>
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={onOpenDeposit}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-1.5 transition whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Deposit Coins
            </motion.button>
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={onOpenWithdraw}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4 text-slate-400" />
              Withdraw
            </motion.button>
            <WhatsAppSupportButton username={currentUser.username} variant="dashboard" />
          </div>
        </div>
      </motion.div>

      {/* Profile & Quick Action Buttons Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {profileQuickButtons.map((btn, idx) => {
          const Icon = btn.icon;
          return (
            <motion.button
              key={btn.id}
              type="button"
              onClick={btn.onClick}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: 0.04 * idx, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={`bg-slate-900/90 border border-slate-800 ${btn.hoverBorder} rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-left transition-colors shadow-sm cursor-pointer group`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${btn.accent}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-100 group-hover:text-white whitespace-nowrap truncate">
                    {btn.label}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono-numbers truncate">
                    {btn.sub}
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-slate-200 group-hover:translate-x-0.5 transition shrink-0" />
            </motion.button>
          );
        })}
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map((card, idx) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: Math.min(idx * 0.04, 0.24), ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -2 }}
            className={`bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-sm relative overflow-hidden group ${card.hoverClass} transition-colors`}
          >
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold flex items-center justify-between gap-2">
              <span className="truncate">{card.label}</span>
              <div className="w-6 h-6 rounded-lg bg-slate-800/80 flex items-center justify-center shrink-0">
                {card.icon}
              </div>
            </div>
            <div className={`mt-2 font-mono-numbers text-2xl font-black ${card.valueClass}`}>
              {card.value}
            </div>
            <div className={`text-[10px] mt-0.5 ${card.subClass}`}>{card.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Main Content Split: Cricket & Movies Spotlight Markets + Recent Bets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Cricket & Movies Spotlight Predictions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-white">Cricket & Movie Spotlight</h2>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3">
              {/* Animated Spotlight Category Tabs */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                {(['All', 'Cricket', 'Movies'] as SpotlightFilter[]).map(tab => {
                  const isActive = marketFilter === tab;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setMarketFilter(tab)}
                      className={`relative px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                        isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="dashboardMarketTab"
                          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                          className="absolute inset-0 rounded-lg bg-emerald-600 shadow-sm shadow-emerald-950/50"
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-1.5">
                        {tab === 'Cricket' && <Trophy className="w-3.5 h-3.5" />}
                        {tab === 'Movies' && <Film className="w-3.5 h-3.5" />}
                        {tab}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => onNavigateTab('predictions')}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 whitespace-nowrap shrink-0 transition cursor-pointer"
              >
                All ({allOpenMarkets.length})
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {spotlightMarkets.length === 0 ? (
              <motion.div
                key={`empty-${marketFilter}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="bg-slate-900/70 rounded-2xl border border-slate-800 p-10 text-center space-y-3"
              >
                <div className="w-11 h-11 rounded-xl bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                  {marketFilter === 'Movies' ? (
                    <Film className="w-5 h-5 text-purple-400" />
                  ) : (
                    <Trophy className="w-5 h-5 text-emerald-400" />
                  )}
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-200">
                    No open {marketFilter} markets right now
                  </h3>
                  <p className="text-xs text-slate-400">
                    Browse all live exchange markets or check back soon for upcoming events.
                  </p>
                </div>
                <button
                  onClick={() => onNavigateTab('predictions')}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer"
                >
                  Open All Markets
                </button>
              </motion.div>
            ) : (
              <motion.div
                key={`grid-${marketFilter}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3.5"
              >
                {spotlightMarkets.map((pred, idx) => {
                  const closeDate = new Date(pred.closingTime);
                  const isClosingSoon = closeDate.getTime() - Date.now() < 12 * 3600 * 1000;
                  const isMovie = pred.category === 'Movies';
                  const isCricket = pred.category === 'Cricket';

                  return (
                    <motion.div
                      key={pred.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.22,
                        delay: Math.min(idx * 0.05, 0.2),
                        ease: [0.16, 1, 0.3, 1]
                      }}
                      whileHover={{ y: -3 }}
                      className="bg-slate-900/85 rounded-2xl border border-slate-800 hover:border-slate-700 p-4 flex flex-col justify-between transition-colors shadow-md group"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span
                            className={`font-semibold flex items-center gap-1.5 ${
                              isMovie
                                ? 'text-purple-300'
                                : isCricket
                                  ? 'text-emerald-300'
                                  : 'text-slate-300'
                            }`}
                          >
                            {isMovie ? (
                              <Film className="w-3.5 h-3.5 text-purple-400" />
                            ) : isCricket ? (
                              <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                            ) : null}
                            <span>{pred.category}</span>
                            <span className="text-slate-600">·</span>
                            <span className="text-slate-400 font-normal truncate max-w-[140px]">
                              {pred.subtitle}
                            </span>
                          </span>

                          <span
                            className={`flex items-center gap-1 font-mono-numbers text-[10px] shrink-0 ${
                              isClosingSoon ? 'text-amber-400 font-bold' : 'text-slate-400'
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            {isClosingSoon
                              ? 'Closing soon'
                              : closeDate.toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                          </span>
                        </div>

                        <h3 className="font-bold text-sm text-slate-100 group-hover:text-emerald-300 transition leading-snug">
                          {pred.title}
                        </h3>
                        {pred.description && (
                          <p className="text-xs text-slate-400 line-clamp-2">{pred.description}</p>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2.5">
                        <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono-numbers">
                          <span>
                            Volume: {(pred.totalYesVolume + pred.totalNoVolume).toLocaleString()} coins
                          </span>
                          <span>Min: {pred.minBet} coins</span>
                        </div>

                        {/* Instant YES / NO prediction buttons */}
                        <div className="grid grid-cols-2 gap-2">
                          <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => onSelectPrediction(pred, 'YES')}
                            className="py-2 px-3 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 hover:border-emerald-500 text-emerald-300 font-bold text-xs flex items-center justify-between transition cursor-pointer"
                          >
                            <span>YES</span>
                            <span className="font-mono-numbers bg-emerald-500/20 px-1.5 py-0.5 rounded text-[11px]">
                              {pred.yesOdds.toFixed(2)}x
                            </span>
                          </motion.button>

                          <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => onSelectPrediction(pred, 'NO')}
                            className="py-2 px-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 hover:border-rose-500 text-rose-300 font-bold text-xs flex items-center justify-between transition cursor-pointer"
                          >
                            <span>NO</span>
                            <span className="font-mono-numbers bg-rose-500/20 px-1.5 py-0.5 rounded text-[11px]">
                              {pred.noOdds.toFixed(2)}x
                            </span>
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Col: Active Bets & Recent Activity */}
        <div className="space-y-5">
          {/* Active Bets Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.08 }}
            className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-md space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-400" />
                Active Slips ({activeBets.length})
              </h3>
              <button
                onClick={() => onNavigateTab('history')}
                className="text-[11px] text-slate-400 hover:text-slate-200 transition cursor-pointer"
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
                {activeBets.slice(0, 3).map((b, idx) => (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.18, delay: idx * 0.04 }}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-medium text-slate-200 line-clamp-1 text-[11px]">
                        {b.predictionTitle}
                      </span>
                      <span
                        className={`font-bold font-mono-numbers px-1.5 py-0.5 rounded text-[10px] shrink-0 ${
                          b.choice === 'YES'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {b.choice} @ {b.odds}x
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono-numbers">
                      <span>
                        Stake: <strong className="text-white">{b.amount} coins</strong>
                      </span>
                      <span className="text-emerald-400 font-semibold">
                        Win: {b.potentialWinnings} coins
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Recent Transactions Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.14 }}
            className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-md space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-400" />
                Recent Ledger
              </h3>
              <button
                onClick={() => onNavigateTab('wallet')}
                className="text-[11px] text-slate-400 hover:text-slate-200 transition cursor-pointer"
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
                {userTransactions.map((tx, idx) => {
                  const isPositive = tx.amount > 0;
                  return (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.18, delay: idx * 0.04 }}
                      className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            isPositive
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {isPositive ? (
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div className="truncate">
                          <div className="text-[11px] font-medium text-slate-300 truncate">
                            {tx.description}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {new Date(tx.createdAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`font-mono-numbers font-bold text-xs shrink-0 pl-2 ${
                          isPositive ? 'text-emerald-400' : 'text-slate-300'
                        }`}
                      >
                        {isPositive ? '+' : ''}
                        {tx.amount}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};
