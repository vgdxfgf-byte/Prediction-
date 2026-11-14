import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { Prediction } from '../../types';
import cricketHeroImg from '../../assets/images/hero_cricket_stadium_1794598510096.jpg';
import cinemaHeroImg from '../../assets/images/hero_cinema_premiere_1794598510861.jpg';
import {
  Coins,
  Trophy,
  TrendingDown,
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  ArrowRight,
  ShieldCheck,
  Flame,
  Plus,
  User as UserIcon,
  KeyRound,
  Wallet,
  History,
  Film,
  BarChart3,
  CheckCircle2,
  XCircle,
  ChevronRight,
  MessageSquarePlus
} from 'lucide-react';
import { WhatsAppSupportButton } from '../common/WhatsAppSupportButton';

interface UserDashboardProps {
  onSelectPrediction: (pred: Prediction, choice: 'YES' | 'NO') => void;
  onNavigateTab: (tab: string) => void;
  onOpenDeposit: () => void;
  onOpenWithdraw: () => void;
  onOpenProfile: () => void;
  onOpenIdChat?: () => void;
}

type SpotlightFilter = 'All' | 'Cricket' | 'Movies';

export const UserDashboard: React.FC<UserDashboardProps> = ({
  onSelectPrediction,
  onNavigateTab,
  onOpenDeposit,
  onOpenWithdraw,
  onOpenProfile,
  onOpenIdChat
}) => {
  const { currentUser, bets, transactions, predictions, withdrawals } = useApp();
  const [marketFilter, setMarketFilter] = useState<SpotlightFilter>('All');
  const [heroSlide, setHeroSlide] = useState<'cricket' | 'movies'>('cricket');
  const [heroImgError, setHeroImgError] = useState<Record<string, boolean>>({});

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
      label: 'Total Winnings',
      value: totalWinningCoins.toLocaleString(),
      sub: `${wonBets.length} won picks`,
      valueClass: 'text-[#14e071]',
      icon: <Trophy className="w-4 h-4 text-[#14e071]" />
    },
    {
      label: 'Total Losses',
      value: totalLosingCoins.toLocaleString(),
      sub: `${lostBets.length} settled`,
      valueClass: 'text-rose-400',
      icon: <TrendingDown className="w-4 h-4 text-rose-400" />
    },
    {
      label: 'Active Slips',
      value: activeBets.length.toLocaleString(),
      sub: 'Awaiting result',
      valueClass: 'text-sky-400',
      icon: <Activity className="w-4 h-4 text-sky-400" />
    },
    {
      label: 'Total Predictions',
      value: userBets.length.toLocaleString(),
      sub: 'Lifetime activity',
      valueClass: 'text-white',
      icon: <ShieldCheck className="w-4 h-4 text-slate-300" />
    },
    {
      label: 'Pending Payout',
      value: pendingWithdrawalsAmount.toLocaleString(),
      sub: `${pendingWithdrawals.length} under review`,
      valueClass: 'text-amber-400',
      icon: <Clock className="w-4 h-4 text-amber-400" />
    }
  ];

  const quickTiles = [
    {
      id: 'markets',
      label: 'Markets',
      sub: `${allOpenMarkets.length} open`,
      icon: BarChart3,
      featured: true,
      onClick: () => onNavigateTab('predictions')
    },
    {
      id: 'predictions',
      label: 'My Predictions',
      sub: `${userBets.length} slips`,
      icon: Trophy,
      featured: false,
      onClick: () => onNavigateTab('history')
    },
    {
      id: 'wallet',
      label: 'Wallet',
      sub: 'Coins & UPI',
      icon: Wallet,
      featured: false,
      onClick: () => onNavigateTab('wallet')
    },
    {
      id: 'profile',
      label: 'Profile & Security',
      sub: `@${currentUser.username}`,
      icon: KeyRound,
      featured: false,
      onClick: onOpenProfile
    }
  ];

  const activeSlide =
    heroSlide === 'cricket'
      ? {
          id: 'cricket',
          kicker: 'Cricket Live Markets',
          title: 'Predict & Win Big Rewards',
          desc: 'T20 battles, match winners & over totals with instant coin payout.',
          cta: 'Play Cricket',
          img: cricketHeroImg,
          filter: 'Cricket' as SpotlightFilter
        }
      : {
          id: 'movies',
          kicker: 'Cinema Box Office',
          title: 'Movie Premiere Predictions',
          desc: 'Opening weekend box office & audience ratings settled fast.',
          cta: 'Play Movies',
          img: cinemaHeroImg,
          filter: 'Movies' as SpotlightFilter
        };

  return (
    <div className="space-y-6">
      {/* Top Split: Screen 1 Balance Hero Card + Featured Stadium/Cinema Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left 7 Cols: Signature Emerald Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-7 apex-card-emerald rounded-2xl p-5 sm:p-6 relative overflow-hidden flex flex-col justify-between gap-5"
        >
          <div className="animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-[#14e071]/[0.05] to-transparent pointer-events-none" />

          {/* User Identity Row */}
          <div className="relative z-10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <motion.button
                type="button"
                onClick={onOpenProfile}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-[#14e071]/40 flex items-center justify-center font-black text-sm text-[#14e071] shrink-0 cursor-pointer"
                title="Open Profile & Password"
              >
                {initials}
              </motion.button>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs text-slate-300">
                  <span className="font-semibold text-white truncate">{currentUser.fullName}</span>
                  <span className="text-slate-500">·</span>
                  <span className="text-[#14e071] font-medium truncate">@{currentUser.username}</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Account #{currentUser.id.replace('usr_', '')}
                </div>
              </div>
            </div>

            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={onOpenProfile}
              className="px-3 py-1.5 rounded-xl bg-[#091217]/90 hover:bg-[#0f1d24] border border-white/[0.1] text-slate-200 hover:text-[#14e071] text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition cursor-pointer"
            >
              <UserIcon className="w-3.5 h-3.5 text-[#14e071]" />
              Profile
            </motion.button>
          </div>

          {/* Screen 1 Balance Display + + Deposit Button */}
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-[0_6px_20px_-4px_rgba(245,158,11,0.55)] shrink-0">
                <Coins className="w-6 h-6 text-[#1a1102] stroke-[2.25]" />
              </div>
              <div>
                <div className="text-xs text-slate-300 font-medium">Your Balance</div>
                <div className="font-mono-numbers text-3xl sm:text-4xl font-black text-white tracking-tight leading-none mt-1">
                  {currentUser.coins.toLocaleString()}.00
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.96 }}
                onClick={onOpenDeposit}
                className="px-4 py-2.5 rounded-xl apex-glow-btn font-bold text-xs flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                Deposit
              </motion.button>

              <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.96 }}
                onClick={onOpenWithdraw}
                className="px-3.5 py-2.5 rounded-xl bg-[#0a141a]/90 hover:bg-[#112029] text-slate-200 border border-white/[0.1] font-semibold text-xs flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition cursor-pointer"
              >
                <ArrowUpRight className="w-4 h-4 text-[#14e071]" />
                Withdraw
              </motion.button>

              <WhatsAppSupportButton username={currentUser.username} variant="dashboard" />

              {onOpenIdChat && (
                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={onOpenIdChat}
                  className="px-3.5 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-[#14e071] border border-[#14e071]/35 font-semibold text-xs flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition cursor-pointer"
                >
                  <MessageSquarePlus className="w-4 h-4" />
                  Chat Admin / New ID
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Right 5 Cols: Promotional Cricket & Cinema Hero Banner (Screen 1 inspired) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-5 relative rounded-2xl overflow-hidden border border-white/[0.1] bg-[#0b1318] min-h-[195px] flex flex-col justify-between p-5 shadow-xl"
        >
          {/* Background Image with Styled Fallback */}
          {!heroImgError[activeSlide.id] ? (
            <img
              src={activeSlide.img}
              alt={activeSlide.title}
              referrerPolicy="no-referrer"
              onError={() => setHeroImgError(prev => ({ ...prev, [activeSlide.id]: true }))}
              className="absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-300"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-[#0a1419] to-black" />
          )}

          {/* Measured contrast scrim */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-[#060b0e]/80 to-[#060b0e]/95" />

          <div className="relative z-10 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#14e071]">
              {activeSlide.kicker}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Cricket banner"
                onClick={() => setHeroSlide('cricket')}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  heroSlide === 'cricket' ? 'w-5 bg-[#14e071]' : 'w-2 bg-white/30 hover:bg-white/50'
                }`}
              />
              <button
                type="button"
                aria-label="Movies banner"
                onClick={() => setHeroSlide('movies')}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  heroSlide === 'movies' ? 'w-5 bg-[#14e071]' : 'w-2 bg-white/30 hover:bg-white/50'
                }`}
              />
            </div>
          </div>

          <div className="relative z-10 flex items-end justify-between gap-4 mt-auto pt-6">
            <div className="max-w-[230px]">
              <h2 className="text-lg sm:text-xl font-black text-white leading-tight">
                {activeSlide.title}
              </h2>
              <p className="text-[11px] text-slate-300 mt-1 line-clamp-2">
                {activeSlide.desc}
              </p>
            </div>

            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                setMarketFilter(activeSlide.filter);
                onNavigateTab('predictions');
              }}
              className="px-4 py-2 rounded-xl apex-glow-btn font-bold text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {activeSlide.cta}
              <ArrowRight className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* Screen 1 Signature 4 Quick Action Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quickTiles.map((tile, idx) => {
          const Icon = tile.icon;
          return (
            <motion.button
              key={tile.id}
              type="button"
              onClick={tile.onClick}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.04 * idx, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              className={`rounded-2xl p-4 flex items-center justify-between gap-3 text-left transition cursor-pointer ${
                tile.featured
                  ? 'bg-gradient-to-br from-[#16f27b] to-[#0cb65a] text-[#04130b] shadow-[0_12px_28px_-10px_rgba(20,224,113,0.6)]'
                  : 'apex-card hover:border-emerald-500/35 text-slate-100'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    tile.featured
                      ? 'bg-[#04130b]/15 text-[#04130b]'
                      : 'bg-white/[0.06] text-[#14e071] border border-white/[0.06]'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold whitespace-nowrap truncate">{tile.label}</div>
                  <div
                    className={`text-[11px] font-mono-numbers truncate ${
                      tile.featured ? 'text-[#04130b]/80 font-semibold' : 'text-slate-400'
                    }`}
                  >
                    {tile.sub}
                  </div>
                </div>
              </div>
              <ChevronRight
                className={`w-4 h-4 shrink-0 ${
                  tile.featured ? 'text-[#04130b]/80' : 'text-slate-500'
                }`}
              />
            </motion.button>
          );
        })}
      </div>

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpiCards.map((card, idx) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: Math.min(idx * 0.04, 0.2), ease: [0.16, 1, 0.3, 1] }}
            className="apex-card rounded-xl p-4"
          >
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span className="truncate">{card.label}</span>
              <span className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                {card.icon}
              </span>
            </div>
            <div className={`mt-2 font-mono-numbers text-xl sm:text-2xl font-black ${card.valueClass}`}>
              {card.value}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">{card.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Main Content Split: Live Markets (Cricket & Movies) + Active Slips & Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Markets */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-[#14e071]" />
              <h2 className="text-lg font-bold text-white">Live Markets</h2>
              <span className="text-xs text-[#14e071] font-semibold">· Cricket & Movies</span>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3">
              {/* Spotlight Filter Tabs */}
              <div className="flex items-center gap-1 bg-[#0b1318] p-1 rounded-xl border border-white/[0.08]">
                {(['All', 'Cricket', 'Movies'] as SpotlightFilter[]).map(tab => {
                  const isActive = marketFilter === tab;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setMarketFilter(tab)}
                      className={`relative px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                        isActive ? 'text-[#04130b]' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="dashboardMarketTab"
                          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                          className="absolute inset-0 rounded-lg bg-[#14e071]"
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
                className="text-xs font-semibold text-[#14e071] hover:text-emerald-300 flex items-center gap-1 whitespace-nowrap shrink-0 transition cursor-pointer"
              >
                View All
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
                className="apex-card rounded-2xl p-10 text-center space-y-3"
              >
                <div className="w-11 h-11 rounded-xl bg-white/[0.05] text-[#14e071] mx-auto flex items-center justify-center">
                  {marketFilter === 'Movies' ? (
                    <Film className="w-5 h-5 text-purple-400" />
                  ) : (
                    <Trophy className="w-5 h-5 text-[#14e071]" />
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
                  className="px-4 py-2 rounded-xl apex-glow-btn text-xs font-bold transition cursor-pointer"
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
                      className="apex-card hover:border-emerald-500/40 rounded-2xl p-4 flex flex-col justify-between transition-colors group"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="flex items-center gap-1.5 font-semibold text-slate-300 min-w-0">
                            {isMovie ? (
                              <Film className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                            ) : isCricket ? (
                              <Trophy className="w-3.5 h-3.5 text-[#14e071] shrink-0" />
                            ) : (
                              <Activity className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                            )}
                            <span className="truncate">{pred.subtitle || pred.category}</span>
                          </span>

                          <span className="font-mono-numbers text-[10px] text-slate-400 shrink-0">
                            {closeDate.toLocaleDateString([], { month: 'short', day: 'numeric' })},{' '}
                            {closeDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <h3 className="font-bold text-sm text-white group-hover:text-[#14e071] transition leading-snug">
                          {pred.title}
                        </h3>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/[0.06] space-y-2.5">
                        <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono-numbers">
                          <span>
                            Pool: {(pred.totalYesVolume + pred.totalNoVolume).toLocaleString()} coins
                          </span>
                          <span>Min: {pred.minBet}</span>
                        </div>

                        {/* Screen 1 & 2 YES / NO Split Action Buttons */}
                        <div className="grid grid-cols-2 gap-2.5">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => onSelectPrediction(pred, 'YES')}
                            className="py-2.5 px-3 rounded-xl bg-emerald-950/55 hover:bg-emerald-900/70 border border-[#14e071]/40 hover:border-[#14e071] text-white font-bold text-xs flex items-center justify-between transition cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5 text-[#14e071]">
                              <CheckCircle2 className="w-4 h-4 shrink-0" />
                              YES
                            </span>
                            <span className="font-mono-numbers font-extrabold text-white">
                              {pred.yesOdds.toFixed(2)}x
                            </span>
                          </motion.button>

                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => onSelectPrediction(pred, 'NO')}
                            className="py-2.5 px-3 rounded-xl bg-rose-950/45 hover:bg-rose-900/65 border border-rose-500/35 hover:border-rose-400 text-white font-bold text-xs flex items-center justify-between transition cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5 text-rose-400">
                              <XCircle className="w-4 h-4 shrink-0" />
                              NO
                            </span>
                            <span className="font-mono-numbers font-extrabold text-white">
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

        {/* Right Col: Active Slips & Recent Activity */}
        <div className="space-y-5">
          {/* Active Slips */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: 0.08 }}
            className="apex-card rounded-2xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <History className="w-4 h-4 text-[#14e071]" />
                Active Slips ({activeBets.length})
              </h3>
              <button
                onClick={() => onNavigateTab('history')}
                className="text-[11px] font-semibold text-[#14e071] hover:text-emerald-300 transition cursor-pointer"
              >
                View All →
              </button>
            </div>

            {activeBets.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
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
                    className="p-3 rounded-xl bg-[#070c10] border border-white/[0.06] text-xs space-y-1"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-medium text-slate-200 line-clamp-1 text-[11px]">
                        {b.predictionTitle}
                      </span>
                      <span
                        className={`font-bold font-mono-numbers text-[11px] shrink-0 ${
                          b.choice === 'YES' ? 'text-[#14e071]' : 'text-rose-400'
                        }`}
                      >
                        {b.choice} · {b.odds}x
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono-numbers">
                      <span>Stake: {b.amount}</span>
                      <span className="text-[#14e071] font-semibold">
                        Win: {b.potentialWinnings}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Recent Ledger */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: 0.14 }}
            className="apex-card rounded-2xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400" />
                Recent Activities
              </h3>
              <button
                onClick={() => onNavigateTab('wallet')}
                className="text-[11px] font-semibold text-[#14e071] hover:text-emerald-300 transition cursor-pointer"
              >
                Wallet →
              </button>
            </div>

            {userTransactions.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
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
                      className="p-2.5 rounded-xl bg-[#070c10] border border-white/[0.06] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            isPositive
                              ? 'bg-emerald-500/15 text-[#14e071]'
                              : 'bg-rose-500/15 text-rose-400'
                          }`}
                        >
                          {isPositive ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>
                        <div className="truncate">
                          <div className="text-[11px] font-semibold text-slate-200 truncate">
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
                          isPositive ? 'text-[#14e071]' : 'text-rose-400'
                        }`}
                      >
                        {isPositive ? '+' : ''}
                        {tx.amount.toLocaleString()}
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
