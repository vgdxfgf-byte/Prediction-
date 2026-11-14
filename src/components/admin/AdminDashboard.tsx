import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  Layers,
  Trophy,
  TrendingDown,
  Clock,
  Plus,
  Activity,
  History,
  MessageCircle,
  Save,
  CheckCircle2,
  AlertTriangle,
  Landmark,
  Crown,
  UserPlus,
  ChevronRight,
  MessageSquareText
} from 'lucide-react';
import { PaymentGatewayEditor } from './PaymentGatewayEditor';

interface AdminDashboardProps {
  onNavigateTab: (tab: string) => void;
  onOpenCreateUser: () => void;
  onOpenCreatePrediction: () => void;
  onOpenPaymentGateway?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigateTab,
  onOpenCreateUser,
  onOpenCreatePrediction,
  onOpenPaymentGateway
}) => {
  const {
    stats,
    users,
    bets,
    deposits,
    withdrawals,
    coinLogs,
    paymentGateway,
    updateGlobalPaymentGateway,
    whatsappSupport,
    updateWhatsAppSupport,
    idChats
  } = useApp();

  const [chartWindow, setChartWindow] = useState<7 | 14>(7);
  const [hoveredDayIdx, setHoveredDayIdx] = useState<number | null>(null);

  const [waEnabled, setWaEnabled] = useState(whatsappSupport.enabled);
  const [waPhone, setWaPhone] = useState(whatsappSupport.phoneNumber);
  const [waLabel, setWaLabel] = useState(whatsappSupport.buttonLabel);
  const [waMessage, setWaMessage] = useState(whatsappSupport.defaultMessage);
  const [waSaving, setWaSaving] = useState(false);
  const [waError, setWaError] = useState('');
  const [waSuccess, setWaSuccess] = useState('');
  const waDirtyRef = useRef(false);

  useEffect(() => {
    if (waDirtyRef.current) return;
    setWaEnabled(whatsappSupport.enabled);
    setWaPhone(whatsappSupport.phoneNumber);
    setWaLabel(whatsappSupport.buttonLabel);
    setWaMessage(whatsappSupport.defaultMessage);
  }, [whatsappSupport]);

  const handleSaveWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setWaError('');
    setWaSuccess('');
    setWaSaving(true);

    const res = await updateWhatsAppSupport({
      enabled: waEnabled,
      phoneNumber: waPhone,
      buttonLabel: waLabel,
      defaultMessage: waMessage
    });

    setWaSaving(false);
    if (res.success) {
      waDirtyRef.current = false;
      setWaSuccess('WhatsApp Support settings updated for User Login & Dashboard.');
      setTimeout(() => setWaSuccess(''), 4000);
    } else {
      setWaError(res.error || 'Failed to update WhatsApp Support settings');
    }
  };

  const regularUsers = users.filter(u => u.id !== 'usr_admin');
  const wonBetsCount = bets.filter(b => b.result === 'won').length;
  const lostBetsCount = bets.filter(b => b.result === 'lost').length;
  const pendingBetsCount = bets.filter(b => b.result === 'pending').length;

  const totalDepositsVolume = deposits.reduce((sum, d) => sum + d.amount, 0);
  const totalWithdrawalsVolume = withdrawals.reduce((sum, w) => sum + w.amount, 0);
  const openIdChats = idChats.filter(c => c.status === 'open');
  const unreadIdChatsCount = idChats.filter(c => c.unreadByAdmin).length;

  // Build real Platform Overview time-series from exchange events
  const chartData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const buckets: { label: string; fullDate: string; volume: number; count: number }[] = [];
    for (let i = chartWindow - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      buckets.push({
        label: d.toLocaleDateString([], { weekday: 'short' }),
        fullDate: d.toLocaleDateString([], { month: 'short', day: 'numeric' }),
        volume: 0,
        count: 0
      });
    }

    const addEvent = (iso: string | undefined, amount: number) => {
      if (!iso) return;
      const t = new Date(iso);
      if (Number.isNaN(t.getTime())) return;
      t.setHours(0, 0, 0, 0);
      const diffDays = Math.round((today.getTime() - t.getTime()) / 86400000);
      const idx = chartWindow - 1 - diffDays;
      if (idx >= 0 && idx < buckets.length) {
        buckets[idx].volume += Math.abs(amount);
        buckets[idx].count += 1;
      }
    };

    bets.forEach(b => addEvent(b.createdAt, b.amount));
    deposits.forEach(d => addEvent(d.createdAt, d.amount));
    withdrawals.forEach(w => addEvent(w.createdAt, w.amount));
    coinLogs.forEach(l => addEvent(l.createdAt, l.amount));

    return buckets;
  }, [bets, deposits, withdrawals, coinLogs, chartWindow]);

  // SVG chart coordinate math
  const svgW = 540;
  const svgH = 175;
  const padX = 24;
  const padY = 20;
  const maxVol = Math.max(100, ...chartData.map(d => d.volume));

  const points = chartData.map((d, i) => {
    const x =
      chartData.length > 1
        ? padX + (i / (chartData.length - 1)) * (svgW - padX * 2)
        : svgW / 2;
    const y = svgH - padY - (d.volume / maxVol) * (svgH - padY * 2);
    return { x, y, ...d };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(svgH - padY).toFixed(1)} L ${points[0].x.toFixed(1)} ${(svgH - padY).toFixed(1)} Z`
      : '';

  // Unified Recent Activities feed (Screen 3 style)
  const recentActivities = useMemo(() => {
    const items: {
      id: string;
      kind: 'deposit' | 'withdrawal' | 'user' | 'adjustment';
      title: string;
      time: string;
      ts: number;
      amountLabel?: string;
      positive?: boolean;
    }[] = [];

    deposits.slice(0, 4).forEach(d => {
      items.push({
        id: `dep-${d.id}`,
        kind: 'deposit',
        title: `Deposit by @${d.username}`,
        time: new Date(d.createdAt).toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        ts: new Date(d.createdAt).getTime(),
        amountLabel: `+${d.amount.toLocaleString()}`,
        positive: true
      });
    });

    withdrawals.slice(0, 4).forEach(w => {
      items.push({
        id: `wdr-${w.id}`,
        kind: 'withdrawal',
        title: `Withdrawal by @${w.username}`,
        time: new Date(w.createdAt).toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        ts: new Date(w.createdAt).getTime(),
        amountLabel: `-${w.amount.toLocaleString()}`,
        positive: false
      });
    });

    regularUsers.slice(0, 3).forEach(u => {
      items.push({
        id: `usr-${u.id}`,
        kind: 'user',
        title: `Player @${u.username} active`,
        time: new Date(u.createdAt).toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        ts: new Date(u.createdAt).getTime()
      });
    });

    return items.sort((a, b) => b.ts - a.ts).slice(0, 5);
  }, [deposits, withdrawals, regularUsers]);

  const activePoint = hoveredDayIdx !== null ? points[hoveredDayIdx] : null;

  return (
    <div className="space-y-6">
      {/* Top Header Banner (Screen 3 aesthetic) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        className="apex-card rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden"
      >
        <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(20,224,113,0.12),transparent_70%)] pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold mb-1">
            <Crown className="w-4 h-4" />
            <span>Master Control Panel</span>
            <span className="text-slate-500">·</span>
            <span className="text-[#14e071]">Live Exchange</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Exchange Administration
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
            Monitor platform volume, manage user wallets, publish Cricket & Movie markets, and process requests in real time.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2.5">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onOpenCreateUser}
            className="px-4 py-2.5 rounded-xl apex-glow-btn font-bold text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0 transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Create User
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onOpenCreatePrediction}
            className="px-4 py-2.5 rounded-xl bg-[#111c24] hover:bg-[#172631] text-white font-bold text-xs border border-white/[0.1] flex items-center gap-1.5 whitespace-nowrap shrink-0 transition cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#14e071]" />
            New Prediction
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => onNavigateTab('id_chats')}
            className="px-4 py-2.5 rounded-xl bg-[#111c24] hover:bg-[#172631] text-white font-bold text-xs border border-[#14e071]/35 flex items-center gap-1.5 whitespace-nowrap shrink-0 transition cursor-pointer"
          >
            <MessageSquareText className="w-4 h-4 text-[#14e071]" />
            <span>ID Chats</span>
            {unreadIdChatsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#14e071] text-[#04130b] text-[10px] font-black font-mono-numbers">
                {unreadIdChatsCount}
              </span>
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* Screen 3 Signature 4 Colored-Glass KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Total Users (Sky Blue tint) */}
        <motion.button
          type="button"
          whileHover={{ y: -2 }}
          onClick={() => onNavigateTab('users')}
          className="text-left rounded-2xl p-5 bg-gradient-to-br from-sky-950/60 via-[#0d1822] to-[#0b1217] border border-sky-500/25 hover:border-sky-400/50 transition cursor-pointer shadow-lg"
        >
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center mb-3">
            <Users className="w-5 h-5 text-sky-400" />
          </div>
          <div className="text-xs text-slate-300 font-medium">Total Users</div>
          <div className="font-mono-numbers text-2xl sm:text-3xl font-black text-white mt-1">
            {stats.totalUsers.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-2">
            <span className="text-[#14e071] font-semibold">{stats.activeUsers} Active</span>
            <span>·</span>
            <span className="text-rose-400 font-semibold">{stats.suspendedUsers} Suspended</span>
          </div>
        </motion.button>

        {/* Total Coins (Emerald/Gold tint) */}
        <motion.button
          type="button"
          whileHover={{ y: -2 }}
          onClick={() => onNavigateTab('coins')}
          className="text-left rounded-2xl p-5 bg-gradient-to-br from-emerald-950/60 via-[#0d1b18] to-[#0b1217] border border-[#14e071]/30 hover:border-[#14e071]/60 transition cursor-pointer shadow-lg"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/35 flex items-center justify-center mb-3">
            <Coins className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-xs text-slate-300 font-medium">Total Coins</div>
          <div className="font-mono-numbers text-2xl sm:text-3xl font-black text-white mt-1">
            {stats.totalCoinsInCirculation.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1.5">
            Across {regularUsers.length} player wallets
          </div>
        </motion.button>

        {/* Total Deposits (Violet tint) */}
        <motion.button
          type="button"
          whileHover={{ y: -2 }}
          onClick={() => onNavigateTab('requests')}
          className="text-left rounded-2xl p-5 bg-gradient-to-br from-violet-950/60 via-[#141322] to-[#0b1217] border border-violet-500/25 hover:border-violet-400/50 transition cursor-pointer shadow-lg"
        >
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-400/35 flex items-center justify-center mb-3">
            <ArrowDownLeft className="w-5 h-5 text-violet-400" />
          </div>
          <div className="text-xs text-slate-300 font-medium">Total Deposits</div>
          <div className="font-mono-numbers text-2xl sm:text-3xl font-black text-white mt-1">
            {totalDepositsVolume.toLocaleString()}
          </div>
          <div className="text-[11px] text-violet-300 font-semibold mt-1.5">
            {stats.pendingDepositsCount} pending ({stats.pendingDepositsAmount.toLocaleString()} coins)
          </div>
        </motion.button>

        {/* Total Withdrawals (Amber tint) */}
        <motion.button
          type="button"
          whileHover={{ y: -2 }}
          onClick={() => onNavigateTab('requests')}
          className="text-left rounded-2xl p-5 bg-gradient-to-br from-amber-950/55 via-[#1b1610] to-[#0b1217] border border-amber-500/25 hover:border-amber-400/50 transition cursor-pointer shadow-lg"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/35 flex items-center justify-center mb-3">
            <ArrowUpRight className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-xs text-slate-300 font-medium">Total Withdrawals</div>
          <div className="font-mono-numbers text-2xl sm:text-3xl font-black text-white mt-1">
            {totalWithdrawalsVolume.toLocaleString()}
          </div>
          <div className="text-[11px] text-amber-300 font-semibold mt-1.5">
            {stats.pendingWithdrawalsCount} pending ({stats.pendingWithdrawalsAmount.toLocaleString()} coins)
          </div>
        </motion.button>
      </div>

      {/* Screen 3 Middle Row: Platform Overview Chart + Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Platform Overview Line/Area Chart (7 cols) */}
        <div className="lg:col-span-7 apex-card rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-white">Platform Overview</h3>
              <p className="text-[11px] text-slate-400">
                Daily coin volume across predictions, deposits & withdrawals
              </p>
            </div>

            <div className="flex items-center gap-1 bg-[#070c10] p-1 rounded-xl border border-white/[0.08] text-[11px]">
              <button
                type="button"
                onClick={() => setChartWindow(7)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  chartWindow === 7
                    ? 'bg-emerald-500/20 text-[#14e071]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                7 Days
              </button>
              <button
                type="button"
                onClick={() => setChartWindow(14)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  chartWindow === 14
                    ? 'bg-emerald-500/20 text-[#14e071]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                14 Days
              </button>
            </div>
          </div>

          <div className="relative">
            {activePoint && (
              <div className="mb-2 flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#070c10] border border-[#14e071]/30 text-xs">
                <span className="text-slate-300 font-medium">{activePoint.fullDate}</span>
                <span className="font-mono-numbers font-bold text-[#14e071]">
                  {activePoint.volume.toLocaleString()} coins ({activePoint.count} events)
                </span>
              </div>
            )}

            <svg
              viewBox={`0 0 ${svgW} ${svgH}`}
              className="w-full h-44 overflow-visible"
              role="img"
              aria-label="Platform activity overview chart"
            >
              <defs>
                <linearGradient id="apexChartFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#14e071" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="#14e071" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Subtle horizontal grid lines */}
              {[0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                const y = padY + ratio * (svgH - padY * 2);
                return (
                  <line
                    key={idx}
                    x1={padX}
                    y1={y}
                    x2={svgW - padX}
                    y2={y}
                    stroke="rgba(255,255,255,0.06)"
                    strokeDasharray="4 4"
                  />
                );
              })}

              {areaPath && <path d={areaPath} fill="url(#apexChartFill)" />}

              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="#14e071"
                  strokeWidth="2.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {points.map((p, idx) => (
                <g
                  key={idx}
                  onMouseEnter={() => setHoveredDayIdx(idx)}
                  onMouseLeave={() => setHoveredDayIdx(null)}
                  className="cursor-pointer"
                >
                  <circle cx={p.x} cy={p.y} r="10" fill="transparent" />
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={hoveredDayIdx === idx ? 5.5 : 3.5}
                    fill="#14e071"
                    stroke="#060b0e"
                    strokeWidth="2"
                  />
                  {(chartWindow === 7 || idx % 2 === 0) && (
                    <text
                      x={p.x}
                      y={svgH - 2}
                      textAnchor="middle"
                      className="fill-slate-400 text-[10px]"
                    >
                      {p.label}
                    </text>
                  )}
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Recent Activities Feed (5 cols, Screen 3 style) */}
        <div className="lg:col-span-5 apex-card rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white">Recent Activities</h3>
            <button
              onClick={() => onNavigateTab('audit')}
              className="text-xs font-semibold text-[#14e071] hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
            >
              View All
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentActivities.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs">
              No recent activity recorded yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentActivities.map(item => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-[#070c10] border border-white/[0.06] flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        item.kind === 'deposit'
                          ? 'bg-emerald-500/15 text-[#14e071]'
                          : item.kind === 'withdrawal'
                            ? 'bg-rose-500/15 text-rose-400'
                            : 'bg-sky-500/15 text-sky-400'
                      }`}
                    >
                      {item.kind === 'deposit' ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : item.kind === 'withdrawal' ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <UserPlus className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{item.title}</div>
                      <div className="text-[10px] text-slate-500 font-mono-numbers">{item.time}</div>
                    </div>
                  </div>

                  {item.amountLabel && (
                    <span
                      className={`font-mono-numbers font-bold text-xs shrink-0 ${
                        item.positive ? 'text-[#14e071]' : 'text-rose-400'
                      }`}
                    >
                      {item.amountLabel}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Market Operations Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <button
          type="button"
          onClick={() => onNavigateTab('predictions')}
          className="text-left apex-card p-4 rounded-xl hover:border-[#14e071]/40 cursor-pointer transition space-y-1"
        >
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span className="font-semibold text-[11px]">Open Markets</span>
            <Layers className="w-4 h-4 text-[#14e071]" />
          </div>
          <div className="font-mono-numbers text-2xl font-black text-white">
            {stats.totalPredictions}
          </div>
          <div className="text-[11px] text-[#14e071] font-semibold">
            {stats.openPredictions} active right now
          </div>
        </button>

        <div className="apex-card p-4 rounded-xl space-y-1">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span className="font-semibold text-[11px]">Winning Picks</span>
            <Trophy className="w-4 h-4 text-[#14e071]" />
          </div>
          <div className="font-mono-numbers text-2xl font-black text-[#14e071]">
            {wonBetsCount}
          </div>
          <div className="text-[11px] text-slate-400 font-mono-numbers">
            Payouts: {stats.totalWonPayouts.toLocaleString()}
          </div>
        </div>

        <div className="apex-card p-4 rounded-xl space-y-1">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span className="font-semibold text-[11px]">Losing Picks</span>
            <TrendingDown className="w-4 h-4 text-rose-400" />
          </div>
          <div className="font-mono-numbers text-2xl font-black text-rose-400">
            {lostBetsCount}
          </div>
          <div className="text-[11px] text-slate-400">Settled to exchange</div>
        </div>

        <div className="apex-card p-4 rounded-xl space-y-1">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span className="font-semibold text-[11px]">Pending Outcome</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="font-mono-numbers text-2xl font-black text-amber-400">
            {pendingBetsCount}
          </div>
          <div className="text-[11px] text-slate-400 font-mono-numbers">
            Volume: {stats.totalBetVolume.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Pending Action Queue & Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="apex-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Action Queue (Pending Review)
            </h3>
            <button
              onClick={() => onNavigateTab('requests')}
              className="text-xs text-[#14e071] hover:text-emerald-300 font-semibold cursor-pointer"
            >
              Review All →
            </button>
          </div>

          <div className="space-y-2.5">
            {deposits
              .filter(d => d.status === 'pending')
              .slice(0, 3)
              .map(dep => (
                <div
                  key={dep.id}
                  className="p-3 rounded-xl bg-[#070c10] border border-white/[0.06] flex items-center justify-between text-xs gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white font-mono-numbers">
                        Deposit: {dep.amount.toLocaleString()}
                      </span>
                      <span className="text-slate-400 truncate">@{dep.username}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono-numbers truncate">
                      Ref: {dep.referenceNumber} ({dep.paymentMethod})
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigateTab('requests')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-[#14e071] hover:bg-[#14e071] hover:text-[#04130b] border border-[#14e071]/35 text-xs font-bold whitespace-nowrap shrink-0 transition cursor-pointer"
                  >
                    Review
                  </button>
                </div>
              ))}

            {withdrawals
              .filter(w => w.status === 'pending')
              .slice(0, 2)
              .map(wdr => (
                <div
                  key={wdr.id}
                  className="p-3 rounded-xl bg-[#070c10] border border-white/[0.06] flex items-center justify-between text-xs gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-amber-300 font-mono-numbers">
                        Withdrawal: {wdr.amount.toLocaleString()}
                      </span>
                      <span className="text-slate-400 truncate">@{wdr.username}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono-numbers truncate">
                      {wdr.payoutMethod}: {wdr.payoutDetails}
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigateTab('requests')}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 hover:bg-amber-500 hover:text-slate-950 border border-amber-500/35 text-xs font-bold whitespace-nowrap shrink-0 transition cursor-pointer"
                  >
                    Process
                  </button>
                </div>
              ))}

            {openIdChats.slice(0, 2).map(chat => (
              <div
                key={chat.id}
                className="p-3 rounded-xl bg-[#070c10] border border-[#14e071]/25 flex items-center justify-between text-xs gap-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#14e071]">
                      New ID Chat: {chat.visitorName}
                    </span>
                    {chat.unreadByAdmin && (
                      <span className="text-[10px] font-black text-amber-300">Unread</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">{chat.lastMessage}</div>
                </div>
                <button
                  onClick={() => onNavigateTab('id_chats')}
                  className="px-3 py-1.5 rounded-lg bg-[#14e071]/15 text-[#14e071] hover:bg-[#14e071] hover:text-[#04130b] border border-[#14e071]/35 text-xs font-bold whitespace-nowrap shrink-0 transition cursor-pointer"
                >
                  Reply / Issue ID
                </button>
              </div>
            ))}

            {deposits.filter(d => d.status === 'pending').length === 0 &&
              withdrawals.filter(w => w.status === 'pending').length === 0 &&
              openIdChats.length === 0 && (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Action queue is clear. No pending financial requests or open ID chats.
                </div>
              )}
          </div>
        </div>

        {/* Recent Admin Audit Trail */}
        <div className="apex-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <History className="w-4 h-4 text-sky-400" />
              Recent Coin Adjustments
            </h3>
            <button
              onClick={() => onNavigateTab('audit')}
              className="text-xs text-[#14e071] hover:text-emerald-300 font-semibold cursor-pointer"
            >
              Full Audit Log →
            </button>
          </div>

          <div className="space-y-2.5">
            {coinLogs.slice(0, 4).map(log => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-[#070c10] border border-white/[0.06] text-xs space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] uppercase font-bold ${
                        log.type === 'credit'
                          ? 'text-[#14e071]'
                          : log.type === 'debit'
                            ? 'text-rose-400'
                            : 'text-sky-400'
                      }`}
                    >
                      {log.type}
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="font-bold text-white">@{log.username}</span>
                  </div>

                  <span className="font-mono-numbers text-slate-400 text-[11px]">
                    {log.previousBalance} → <strong className="text-white">{log.newBalance}</strong>
                  </span>
                </div>

                <div className="text-slate-400 text-[11px] truncate">{log.reason}</div>

                <div className="text-[10px] text-slate-500 flex justify-between pt-0.5 font-mono-numbers">
                  <span>By: {log.adminUsername}</span>
                  <span>
                    {new Date(log.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* WhatsApp Support Manager */}
      <div className="apex-card rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.07] pb-3">
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-[#14e071]" />
              User WhatsApp Support Button Settings
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Configure the WhatsApp support number and button shown on the User Login page and User Dashboard.
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer bg-[#070c10] px-3 py-1.5 rounded-xl border border-white/[0.08]">
            <input
              type="checkbox"
              checked={waEnabled}
              onChange={e => {
                waDirtyRef.current = true;
                setWaEnabled(e.target.checked);
              }}
              className="accent-[#14e071] w-4 h-4 cursor-pointer"
            />
            <span className={waEnabled ? 'text-[#14e071]' : 'text-slate-400'}>
              {waEnabled ? 'Enabled for Users' : 'Hidden from Users'}
            </span>
          </label>
        </div>

        <form onSubmit={handleSaveWhatsApp} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1">
            <label className="text-slate-300 font-semibold block">
              Admin WhatsApp Number (with country code)
            </label>
            <input
              type="text"
              value={waPhone}
              onChange={e => {
                waDirtyRef.current = true;
                setWaPhone(e.target.value);
                setWaError('');
              }}
              placeholder="e.g. +91 9876543210"
              className="w-full bg-[#070c10] border border-white/[0.1] focus:border-[#14e071] rounded-xl px-3 py-2 text-white font-mono-numbers outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-300 font-semibold block">Button Label</label>
            <input
              type="text"
              value={waLabel}
              onChange={e => {
                waDirtyRef.current = true;
                setWaLabel(e.target.value);
              }}
              placeholder="WhatsApp Support"
              className="w-full bg-[#070c10] border border-white/[0.1] focus:border-[#14e071] rounded-xl px-3 py-2 text-white outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-300 font-semibold block">
              Default Pre-filled User Message
            </label>
            <input
              type="text"
              value={waMessage}
              onChange={e => {
                waDirtyRef.current = true;
                setWaMessage(e.target.value);
              }}
              placeholder="Hello Admin, I need help with my account."
              className="w-full bg-[#070c10] border border-white/[0.1] focus:border-[#14e071] rounded-xl px-3 py-2 text-white outline-none"
            />
          </div>

          <div className="md:col-span-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <div className="flex-1">
              {waError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{waError}</span>
                </div>
              )}
              {waSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[#14e071] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{waSuccess}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={waSaving}
              className="px-5 py-2.5 rounded-xl apex-glow-btn disabled:opacity-60 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{waSaving ? 'Saving...' : 'Save WhatsApp Support'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Official Admin Payment Gateway & UPI IDs */}
      <div className="apex-card rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.07] pb-3">
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Landmark className="w-4 h-4 text-amber-400" />
              Official Admin Payment Gateway & UPI IDs
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Edit any UPI ID or payment channel displayed to users on their Deposit Coins screen.
            </p>
          </div>
          {onOpenPaymentGateway && (
            <button
              type="button"
              onClick={onOpenPaymentGateway}
              className="text-xs text-[#14e071] hover:text-emerald-300 font-semibold self-start sm:self-auto cursor-pointer"
            >
              Manage Per-User Gateways →
            </button>
          )}
        </div>

        <PaymentGatewayEditor
          initialConfig={paymentGateway}
          targetLabel="All Users (Global Default)"
          onSave={updateGlobalPaymentGateway}
        />
      </div>
    </div>
  );
};
