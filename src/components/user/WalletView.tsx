import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Coins, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Plus, 
  Upload, 
  Copy, 
  Check,
  ShieldCheck,
  Building,
  Smartphone,
  Wallet as WalletIcon
} from 'lucide-react';

interface WalletViewProps {
  initialModal?: 'deposit' | 'withdraw' | null;
  onClearInitialModal?: () => void;
}

export const WalletView: React.FC<WalletViewProps> = ({ initialModal, onClearInitialModal }) => {
  const { currentUser, transactions, deposits, withdrawals, requestDeposit, requestWithdrawal, getEffectivePaymentGateway } = useApp();

  const [activeTab, setActiveTab] = useState<'transactions' | 'deposits' | 'withdrawals'>('transactions');
  const [showDepositModal, setShowDepositModal] = useState<boolean>(initialModal === 'deposit');
  const [showWithdrawModal, setShowWithdrawModal] = useState<boolean>(initialModal === 'withdraw');

  // Deposit Form State
  const [depAmount, setDepAmount] = useState<number>(500);
  const [depMethod, setDepMethod] = useState<string>('UPI Transfer / PhonePe');
  const [depRef, setDepRef] = useState<string>('');
  const [depNotes, setDepNotes] = useState<string>('');
  const [depSuccessMsg, setDepSuccessMsg] = useState<string>('');
  const [depError, setDepError] = useState<string>('');

  // Withdrawal Form State
  const [wdrAmount, setWdrAmount] = useState<number>(200);
  const [wdrMethod, setWdrMethod] = useState<string>('UPI ID');
  const [wdrDetails, setWdrDetails] = useState<string>('');
  const [wdrSuccessMsg, setWdrSuccessMsg] = useState<string>('');
  const [wdrError, setWdrError] = useState<string>('');

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!currentUser) return null;

  const userTransactions = transactions.filter(t => t.userId === currentUser.id);
  const userDeposits = deposits.filter(d => d.userId === currentUser.id);
  const userWithdrawals = withdrawals.filter(w => w.userId === currentUser.id);
  const effectiveGateway = getEffectivePaymentGateway(currentUser.id);
  const enabledGatewayChannels = effectiveGateway.channels.filter(c => c.enabled);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDepError('');
    if (depAmount <= 0) {
      setDepError('Please enter a valid coin deposit amount');
      return;
    }
    if (!depRef.trim()) {
      setDepError('Payment Reference ID or Transaction Number is required');
      return;
    }

    const res = await requestDeposit(depAmount, depMethod, depRef, depNotes);
    if (res.success) {
      setDepSuccessMsg(`Deposit request for ${depAmount} coins submitted! Awaiting admin verification.`);
      setDepRef('');
      setDepNotes('');
      setTimeout(() => {
        setShowDepositModal(false);
        setDepSuccessMsg('');
        setActiveTab('deposits');
        onClearInitialModal?.();
      }, 2000);
    } else {
      setDepError(res.error || 'Failed to submit deposit');
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWdrError('');
    if (wdrAmount <= 0) {
      setWdrError('Please enter a valid withdrawal amount');
      return;
    }
    if (wdrAmount > currentUser.coins) {
      setWdrError(`Insufficient coins. You only have ${currentUser.coins} available.`);
      return;
    }
    if (!wdrDetails.trim()) {
      setWdrError('Please enter your payout details (UPI ID, Bank Account, or Crypto address)');
      return;
    }

    const res = await requestWithdrawal(wdrAmount, wdrMethod, wdrDetails);
    if (res.success) {
      setWdrSuccessMsg(`Withdrawal request for ${wdrAmount} coins submitted! Reserved from your wallet.`);
      setWdrDetails('');
      setTimeout(() => {
        setShowWithdrawModal(false);
        setWdrSuccessMsg('');
        setActiveTab('withdrawals');
        onClearInitialModal?.();
      }, 2000);
    } else {
      setWdrError(res.error || 'Failed to submit withdrawal');
    }
  };

  return (
    <div className="space-y-6">
      {/* Wallet Balance Hero Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 rounded-2xl border border-slate-800 p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.15),transparent_70%)] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
                Primary Coin Wallet
              </span>
              <span className="text-xs text-slate-500 font-mono">ID: {currentUser.id}</span>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="font-mono-numbers text-4xl sm:text-5xl font-black text-emerald-400 tracking-tight">
                {currentUser.coins.toLocaleString()}
              </span>
              <span className="text-xl sm:text-2xl font-bold text-slate-400">🪙 COINS</span>
            </div>
          </div>

          {/* Quick Buttons */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => {
                setShowDepositModal(true);
                setShowWithdrawModal(false);
              }}
              className="flex-1 md:flex-none px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition"
            >
              <Plus className="w-4 h-4" />
              Deposit Coins
            </button>

            <button
              onClick={() => {
                setShowWithdrawModal(true);
                setShowDepositModal(false);
              }}
              disabled={currentUser.coins <= 0}
              className="flex-1 md:flex-none px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition"
            >
              <ArrowUpRight className="w-4 h-4 text-slate-400" />
              Withdraw Coins
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${
              activeTab === 'transactions'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            All Ledger ({userTransactions.length})
          </button>
          <button
            onClick={() => setActiveTab('deposits')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${
              activeTab === 'deposits'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            Deposit Requests ({userDeposits.length})
          </button>
          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${
              activeTab === 'withdrawals'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            Withdrawal Requests ({userWithdrawals.length})
          </button>
        </div>
      </div>

      {/* Tab 1: All Ledger Transactions */}
      {activeTab === 'transactions' && (
        <div className="space-y-3">
          {userTransactions.length === 0 ? (
            <div className="bg-slate-900/60 p-10 rounded-2xl border border-slate-800 text-center text-slate-500 text-xs">
              No transactions on record yet.
            </div>
          ) : (
            <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Balance After</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-300">
                    {userTransactions.map(tx => {
                      const isPositive = tx.amount > 0;
                      return (
                        <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                          <td className="px-4 py-3 font-semibold">
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                              tx.type === 'deposit' ? 'bg-emerald-500/20 text-emerald-400' :
                              tx.type === 'bet_won' ? 'bg-amber-500/20 text-amber-400' :
                              tx.type === 'admin_credit' ? 'bg-teal-500/20 text-teal-300' :
                              tx.type === 'withdrawal' ? 'bg-purple-500/20 text-purple-300' :
                              tx.type === 'bet_placed' ? 'bg-slate-700 text-slate-300' : 'bg-rose-500/20 text-rose-400'
                            }`}>
                              {tx.type.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 max-w-xs truncate text-slate-200">
                            {tx.description}
                          </td>
                          <td className={`px-4 py-3 font-mono font-bold ${isPositive ? 'text-emerald-400' : 'text-slate-300'}`}>
                            {isPositive ? '+' : ''}{tx.amount.toLocaleString()} 🪙
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-400">
                            {tx.balanceAfter.toLocaleString()} 🪙
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              tx.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                              tx.status === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                              'bg-rose-500/10 text-rose-400'
                            }`}>
                              {tx.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                            {new Date(tx.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Deposit Requests */}
      {activeTab === 'deposits' && (
        <div className="space-y-3">
          {userDeposits.length === 0 ? (
            <div className="bg-slate-900/60 p-10 rounded-2xl border border-slate-800 text-center space-y-2">
              <Clock className="w-8 h-8 text-slate-600 mx-auto" />
              <h4 className="font-bold text-slate-300 text-sm">No Deposit Requests Yet</h4>
              <p className="text-xs text-slate-500">
                Submit a deposit request to add coins to your wallet.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {userDeposits.map(dep => {
                const isApproved = dep.status === 'approved';
                const isRejected = dep.status === 'rejected';
                const isPending = dep.status === 'pending';

                return (
                  <div
                    key={dep.id}
                    className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">
                          🪙 {dep.amount.toLocaleString()} Coins Requested
                        </span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          ({dep.paymentMethod})
                        </span>
                      </div>
                      <div className="text-slate-400">
                        Reference Number: <strong className="text-slate-200 font-mono">{dep.referenceNumber}</strong>
                      </div>
                      {dep.notes && <div className="text-slate-500">Note: {dep.notes}</div>}
                      {dep.adminRemark && (
                        <div className="text-amber-400 text-[11px] font-medium">
                          Admin Remark: {dep.adminRemark}
                        </div>
                      )}
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                      <div>
                        {isPending && (
                          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 animate-pulse" />
                            Pending Admin Review
                          </span>
                        )}
                        {isApproved && (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Approved & Credited
                          </span>
                        )}
                        {isRejected && (
                          <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-bold flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" />
                            Rejected
                          </span>
                        )}
                      </div>
                      <span className="text-slate-500 text-[10px]">
                        {new Date(dep.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Withdrawal Requests */}
      {activeTab === 'withdrawals' && (
        <div className="space-y-3">
          {userWithdrawals.length === 0 ? (
            <div className="bg-slate-900/60 p-10 rounded-2xl border border-slate-800 text-center space-y-2">
              <Clock className="w-8 h-8 text-slate-600 mx-auto" />
              <h4 className="font-bold text-slate-300 text-sm">No Withdrawal Requests Yet</h4>
              <p className="text-xs text-slate-500">
                You can withdraw your winnings to your preferred payout destination.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {userWithdrawals.map(wdr => {
                const isApproved = wdr.status === 'approved';
                const isRejected = wdr.status === 'rejected';
                const isPending = wdr.status === 'pending';
                const isProcessing = wdr.status === 'processing';

                return (
                  <div
                    key={wdr.id}
                    className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">
                          🪙 {wdr.amount.toLocaleString()} Coins
                        </span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          via {wdr.payoutMethod}
                        </span>
                      </div>
                      <div className="text-slate-400">
                        Payout Target: <strong className="text-slate-200 font-mono">{wdr.payoutDetails}</strong>
                      </div>
                      {wdr.adminRemark && (
                        <div className="text-amber-400 text-[11px] font-medium">
                          Admin Remark: {wdr.adminRemark}
                        </div>
                      )}
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                      <div>
                        {isPending && (
                          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 animate-pulse" />
                            Pending Review
                          </span>
                        )}
                        {isProcessing && (
                          <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            Processing Transfer
                          </span>
                        )}
                        {isApproved && (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Approved & Transferred
                          </span>
                        )}
                        {isRejected && (
                          <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-bold flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" />
                            Rejected (Coins Refunded)
                          </span>
                        )}
                      </div>
                      <span className="text-slate-500 text-[10px]">
                        {new Date(wdr.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* DEPOSIT MODAL */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-pop-in">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                Deposit Coins
              </h3>
              <button
                onClick={() => {
                  setShowDepositModal(false);
                  onClearInitialModal?.();
                }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {depSuccessMsg ? (
              <div className="p-6 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h4 className="font-bold text-white text-base">Request Submitted</h4>
                <p className="text-xs text-slate-400">{depSuccessMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleDepositSubmit} className="p-5 space-y-4 text-xs overflow-y-auto">
                {/* Dynamic Official Admin Payment Gateway */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                      {effectiveGateway.title || 'Official Admin Payment Gateway'}
                    </div>
                    {currentUser.customPaymentGateway && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[9px] font-bold uppercase">
                        Assigned Gateway
                      </span>
                    )}
                  </div>

                  {effectiveGateway.instructions && (
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {effectiveGateway.instructions}
                    </p>
                  )}

                  {enabledGatewayChannels.length === 0 ? (
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 text-[11px]">
                      No active payment gateway channels configured. Please contact the administrator.
                    </div>
                  ) : (
                    enabledGatewayChannels.map((ch, idx) => (
                      <div key={ch.id} className="flex items-center justify-between gap-2 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                        <div className="min-w-0">
                          <span className="text-slate-400 block text-[10px]">{ch.label}:</span>
                          <span className={`font-mono font-bold text-xs break-all ${idx % 2 === 0 ? 'text-emerald-400' : 'text-cyan-400'}`}>
                            {ch.value}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            handleCopy(ch.value, ch.id);
                            setDepMethod(ch.label);
                          }}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          {copiedKey === ch.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          {copiedKey === ch.id ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Amount */}
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">
                    Coins Amount to Request:
                  </label>
                  <input
                    type="number"
                    min="50"
                    step="50"
                    value={depAmount}
                    onChange={e => setDepAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-base font-bold font-mono text-white outline-none"
                  />
                  <div className="flex gap-2 pt-1">
                    {[500, 1000, 2500, 5000].map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setDepAmount(v)}
                        className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-mono"
                      >
                        +{v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Method selector */}
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">
                    Payment Method Used:
                  </label>
                  <select
                    value={depMethod}
                    onChange={e => setDepMethod(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none"
                  >
                    {enabledGatewayChannels.map(ch => (
                      <option key={ch.id} value={ch.label}>
                        {ch.label} ({ch.value})
                      </option>
                    ))}
                    <option value="UPI Transfer / PhonePe">UPI Transfer (PhonePe / GPay / Paytm)</option>
                    <option value="IMPS / Direct Bank Wire">IMPS / Direct Bank Wire</option>
                    <option value="USDT (TRC-20)">USDT (TRC-20) Crypto</option>
                    <option value="Cash / Local Agent">Cash / Local Agent Deposit</option>
                  </select>
                </div>

                {/* Reference ID */}
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">
                    Payment Transaction Reference / UTR Number:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. UPI-TXN-982140 or IMPS99201"
                    value={depRef}
                    onChange={e => setDepRef(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-white font-mono outline-none"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <label className="text-slate-400 block">
                    Remarks / Sender Name (Optional):
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sent from PhonePe account of Alex"
                    value={depNotes}
                    onChange={e => setDepNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>

                {depError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{depError}</span>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDepositModal(false);
                      onClearInitialModal?.();
                    }}
                    className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-wider shadow-lg shadow-emerald-950/40"
                  >
                    Submit Deposit Request
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* WITHDRAWAL MODAL */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-pop-in">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-purple-400" />
                Withdraw Coins
              </h3>
              <button
                onClick={() => {
                  setShowWithdrawModal(false);
                  onClearInitialModal?.();
                }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {wdrSuccessMsg ? (
              <div className="p-6 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h4 className="font-bold text-white text-base">Request Submitted</h4>
                <p className="text-xs text-slate-400">{wdrSuccessMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleWithdrawSubmit} className="p-5 space-y-4 text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Available Wallet Balance:</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    🪙 {currentUser.coins.toLocaleString()} Coins
                  </span>
                </div>

                {/* Amount */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-slate-300 font-semibold block">
                      Coins to Withdraw:
                    </label>
                    <button
                      type="button"
                      onClick={() => setWdrAmount(currentUser.coins)}
                      className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold"
                    >
                      Max ({currentUser.coins})
                    </button>
                  </div>
                  <input
                    type="number"
                    min="50"
                    max={currentUser.coins}
                    value={wdrAmount}
                    onChange={e => setWdrAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-base font-bold font-mono text-white outline-none"
                  />
                </div>

                {/* Payout method */}
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">
                    Payout Destination:
                  </label>
                  <select
                    value={wdrMethod}
                    onChange={e => setWdrMethod(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none"
                  >
                    <option value="UPI ID">UPI ID (e.g. user@okhdfcbank)</option>
                    <option value="Bank Account">Bank Wire (Account Number + IFSC Code)</option>
                    <option value="USDT TRC-20">Crypto USDT (TRC-20 Wallet Address)</option>
                  </select>
                </div>

                {/* Payout details */}
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">
                    Account / Payout Details:
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder={
                      wdrMethod === 'UPI ID'
                        ? 'Enter your verified UPI ID, e.g. alex@oksbi'
                        : wdrMethod === 'Bank Account'
                        ? 'Account Number, Bank Name, IFSC code, Account Holder Name'
                        : 'Your TRC-20 USDT Wallet Address'
                    }
                    value={wdrDetails}
                    onChange={e => setWdrDetails(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-purple-500 rounded-xl px-3 py-2 text-white font-mono outline-none"
                  />
                  <span className="text-[10px] text-slate-500 block">
                    Ensure details are accurate. Admin will process the transfer upon verification.
                  </span>
                </div>

                {wdrError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{wdrError}</span>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowWithdrawModal(false);
                      onClearInitialModal?.();
                    }}
                    className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={currentUser.coins <= 0}
                    className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold uppercase tracking-wider shadow-lg shadow-purple-950/40"
                  >
                    Submit Withdrawal Request
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
