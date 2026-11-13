import React, { useState, useEffect, useRef } from 'react';
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
  ShieldCheck, 
  Activity,
  History,
  MessageCircle,
  Save,
  CheckCircle2,
  AlertTriangle,
  Landmark
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
    updateWhatsAppSupport
  } = useApp();

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

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/70 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Master Control Panel
            </span>
            <span className="text-xs text-slate-400">Live Exchange Risk Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Exchange Administration
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
            Control prediction markets, set odds, manage player coin balances, approve financial requests, and monitor audit trails.
          </p>
        </div>

        {/* Quick Admin Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenCreateUser}
            className="px-3.5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create User Account
          </button>
          <button
            onClick={onOpenCreatePrediction}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Prediction
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Total Users */}
        <div 
          onClick={() => onNavigateTab('users')}
          className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 hover:border-amber-500/40 cursor-pointer transition shadow-sm space-y-1"
        >
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Total Users</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="font-mono-numbers text-2xl font-black text-white">
            {stats.totalUsers}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-1">
            <span className="text-emerald-400 font-semibold">{stats.activeUsers} Active</span>
            <span>•</span>
            <span className="text-rose-400 font-semibold">{stats.suspendedUsers} Suspended</span>
          </div>
        </div>

        {/* Total Coins in Circulation */}
        <div 
          onClick={() => onNavigateTab('coins')}
          className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 hover:border-amber-500/40 cursor-pointer transition shadow-sm space-y-1"
        >
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Coins In Circulation</span>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <div className="font-mono-numbers text-2xl font-black text-amber-400">
            {stats.totalCoinsInCirculation.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 pt-1">
            Across {regularUsers.length} player wallets
          </div>
        </div>

        {/* Pending Deposits */}
        <div 
          onClick={() => onNavigateTab('requests')}
          className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 hover:border-amber-500/40 cursor-pointer transition shadow-sm space-y-1"
        >
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Pending Deposits</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-mono-numbers text-2xl font-black text-emerald-400">
            {stats.pendingDepositsAmount.toLocaleString()} 🪙
          </div>
          <div className="text-[10px] text-emerald-400/80 font-semibold pt-1">
            {stats.pendingDepositsCount} requests requiring review
          </div>
        </div>

        {/* Pending Withdrawals */}
        <div 
          onClick={() => onNavigateTab('requests')}
          className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 hover:border-amber-500/40 cursor-pointer transition shadow-sm space-y-1"
        >
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Pending Withdrawals</span>
            <ArrowUpRight className="w-4 h-4 text-purple-400" />
          </div>
          <div className="font-mono-numbers text-2xl font-black text-purple-400">
            {stats.pendingWithdrawalsAmount.toLocaleString()} 🪙
          </div>
          <div className="text-[10px] text-purple-400/80 font-semibold pt-1">
            {stats.pendingWithdrawalsCount} requests awaiting payout
          </div>
        </div>
      </div>

      {/* Row 2: Prediction Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div 
          onClick={() => onNavigateTab('predictions')}
          className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 hover:border-amber-500/40 cursor-pointer transition shadow-sm space-y-1"
        >
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Total Predictions</span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="font-mono-numbers text-2xl font-black text-white">
            {stats.totalPredictions}
          </div>
          <div className="text-[10px] text-cyan-400 font-semibold pt-1">
            {stats.openPredictions} Currently Open Markets
          </div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-sm space-y-1">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Winning Predictions</span>
            <Trophy className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-mono-numbers text-2xl font-black text-emerald-400">
            {wonBetsCount}
          </div>
          <div className="text-[10px] text-slate-400 pt-1">
            Payouts: {stats.totalWonPayouts.toLocaleString()} 🪙
          </div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-sm space-y-1">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Losing Predictions</span>
            <TrendingDown className="w-4 h-4 text-rose-400" />
          </div>
          <div className="font-mono-numbers text-2xl font-black text-rose-400">
            {lostBetsCount}
          </div>
          <div className="text-[10px] text-slate-400 pt-1">
            Absorbed into exchange
          </div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-sm space-y-1">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Pending Outcome Bets</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="font-mono-numbers text-2xl font-black text-amber-400">
            {pendingBetsCount}
          </div>
          <div className="text-[10px] text-slate-400 pt-1">
            Volume: {stats.totalBetVolume.toLocaleString()} 🪙
          </div>
        </div>
      </div>

      {/* Main Grid: Pending Action Center & Recent Ledger Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Financial Action Center */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Action Queue (Pending Review)
            </h3>
            <button
              onClick={() => onNavigateTab('requests')}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
            >
              Review All Requests →
            </button>
          </div>

          <div className="space-y-2.5">
            {deposits.filter(d => d.status === 'pending').slice(0, 3).map(dep => (
              <div
                key={dep.id}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">Deposit: {dep.amount} 🪙</span>
                    <span className="text-slate-400">by @{dep.username}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Ref: {dep.referenceNumber} ({dep.paymentMethod})
                  </div>
                </div>
                <button
                  onClick={() => onNavigateTab('requests')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-500/30 text-xs font-semibold transition"
                >
                  Approve / Reject
                </button>
              </div>
            ))}

            {withdrawals.filter(w => w.status === 'pending').slice(0, 2).map(wdr => (
              <div
                key={wdr.id}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-purple-300">Withdrawal: {wdr.amount} 🪙</span>
                    <span className="text-slate-400">by @{wdr.username}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {wdr.payoutMethod}: {wdr.payoutDetails}
                  </div>
                </div>
                <button
                  onClick={() => onNavigateTab('requests')}
                  className="px-2.5 py-1 rounded-lg bg-purple-600/20 text-purple-400 hover:bg-purple-600 hover:text-white border border-purple-500/30 text-xs font-semibold transition"
                >
                  Process
                </button>
              </div>
            ))}

            {deposits.filter(d => d.status === 'pending').length === 0 &&
             withdrawals.filter(w => w.status === 'pending').length === 0 && (
              <div className="py-8 text-center text-slate-500 text-xs">
                ✨ Action queue is completely clear. No pending financial requests!
              </div>
            )}
          </div>
        </div>

        {/* Recent Admin Audit Activity */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <History className="w-4 h-4 text-cyan-400" />
              Recent Coin Adjustments & Audit Trail
            </h3>
            <button
              onClick={() => onNavigateTab('audit')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
            >
              Full Audit Log →
            </button>
          </div>

          <div className="space-y-2.5">
            {coinLogs.slice(0, 5).map(log => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                      log.type === 'credit' ? 'bg-emerald-500/20 text-emerald-400' :
                      log.type === 'debit' ? 'bg-rose-500/20 text-rose-400' : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {log.type}
                    </span>
                    <span className="font-bold text-white">@{log.username}</span>
                  </div>

                  <span className="font-mono text-slate-400 text-[11px]">
                    {log.previousBalance} → <strong className="text-white">{log.newBalance} 🪙</strong>
                  </span>
                </div>

                <div className="text-slate-400 text-[11px]">
                  Reason: <span className="text-slate-300">{log.reason}</span>
                </div>

                <div className="text-[10px] text-slate-500 flex justify-between pt-0.5">
                  <span>By: {log.adminUsername}</span>
                  <span>{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* WhatsApp Support Manager (Admin Controlled) */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              User WhatsApp Support Button Settings
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Configure the WhatsApp support number and button shown on the User Login page and User Dashboard.
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <input
              type="checkbox"
              checked={waEnabled}
              onChange={e => {
                waDirtyRef.current = true;
                setWaEnabled(e.target.checked);
              }}
              className="accent-emerald-500 w-4 h-4 cursor-pointer"
            />
            <span className={waEnabled ? 'text-emerald-400' : 'text-slate-400'}>
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
              placeholder="e.g. +91 9876543210 or +15551234567"
              className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-white font-mono outline-none"
            />
            <span className="text-[10px] text-slate-500 block">
              Include country code (e.g. 91 for India, 1 for US).
            </span>
          </div>

          <div className="space-y-1">
            <label className="text-slate-300 font-semibold block">
              Button Label
            </label>
            <input
              type="text"
              value={waLabel}
              onChange={e => {
                waDirtyRef.current = true;
                setWaLabel(e.target.value);
              }}
              placeholder="WhatsApp Support"
              className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-white outline-none"
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
              className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-white outline-none"
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
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{waSuccess}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={waSaving}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{waSaving ? 'Saving...' : 'Save WhatsApp Support'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Official Admin Payment Gateway & UPI IDs (Quick Edit) */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
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
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold self-start sm:self-auto cursor-pointer"
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
