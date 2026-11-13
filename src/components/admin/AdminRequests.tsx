import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { DepositRequest, WithdrawalRequest } from '../../types';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  AlertCircle, 
  Coins, 
  ShieldCheck,
  Check,
  RotateCcw,
  Landmark,
  Users
} from 'lucide-react';
import { PaymentGatewayEditor } from './PaymentGatewayEditor';

interface AdminRequestsProps {
  initialTab?: 'deposits' | 'withdrawals' | 'gateway';
  onClearInitialTab?: () => void;
}

export const AdminRequests: React.FC<AdminRequestsProps> = ({
  initialTab,
  onClearInitialTab
}) => {
  const {
    deposits,
    withdrawals,
    reviewDeposit,
    reviewWithdrawal,
    users,
    paymentGateway,
    updateGlobalPaymentGateway,
    updateUserPaymentGateway,
    getEffectivePaymentGateway
  } = useApp();

  const [activeTab, setActiveTab] = useState<'deposits' | 'withdrawals' | 'gateway'>(initialTab || 'deposits');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'all' | 'approved' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
      onClearInitialTab?.();
    }
  }, [initialTab, onClearInitialTab]);

  const regularUsers = users.filter(u => u.id !== 'usr_admin');
  const [gatewayTarget, setGatewayTarget] = useState<string>('global');

  // Remark Modal
  const [rejectItem, setRejectItem] = useState<{ type: 'deposit' | 'withdrawal'; id: string; user: string; amount: number } | null>(null);
  const [remarkText, setRemarkText] = useState('');

  const pendingDepositsCount = deposits.filter(d => d.status === 'pending').length;
  const pendingWithdrawalsCount = withdrawals.filter(w => w.status === 'pending' || w.status === 'processing').length;

  const filteredDeposits = deposits.filter(d => {
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        d.username.toLowerCase().includes(q) ||
        d.referenceNumber.toLowerCase().includes(q) ||
        d.paymentMethod.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredWithdrawals = withdrawals.filter(w => {
    if (statusFilter === 'pending' && !(w.status === 'pending' || w.status === 'processing')) return false;
    if (statusFilter !== 'pending' && statusFilter !== 'all' && w.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        w.username.toLowerCase().includes(q) ||
        w.payoutDetails.toLowerCase().includes(q) ||
        w.payoutMethod.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleApproveDeposit = async (depId: string) => {
    await reviewDeposit(depId, 'approve');
  };

  const handleApproveWithdrawal = async (wdrId: string) => {
    await reviewWithdrawal(wdrId, 'approve', 'Payout processed and confirmed by admin');
  };

  const handleSetProcessingWithdrawal = async (wdrId: string) => {
    await reviewWithdrawal(wdrId, 'processing', 'Marked for bank batch transfer');
  };

  const handleConfirmReject = async () => {
    if (!rejectItem) return;
    if (rejectItem.type === 'deposit') {
      await reviewDeposit(rejectItem.id, 'reject', remarkText || 'Invalid payment reference');
    } else {
      await reviewWithdrawal(rejectItem.id, 'reject', remarkText || 'Rejected by admin; coins refunded');
    }
    setRejectItem(null);
    setRemarkText('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span>Financial Requests & Approvals</span>
          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
            Cashier Desk
          </span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Review player deposit proof, credit approved coins, and process or refund withdrawal requests.
        </p>
      </div>

      {/* Main Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveTab('deposits');
              setStatusFilter('pending');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition ${
              activeTab === 'deposits'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Deposit Requests</span>
            {pendingDepositsCount > 0 && (
              <span className="bg-emerald-800 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {pendingDepositsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('withdrawals');
              setStatusFilter('pending');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition ${
              activeTab === 'withdrawals'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Withdrawal Requests</span>
            {pendingWithdrawalsCount > 0 && (
              <span className="bg-purple-800 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {pendingWithdrawalsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('gateway')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'gateway'
                ? 'bg-amber-600 text-slate-950 shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Landmark className="w-4 h-4" />
            <span>Payment Gateway & UPI</span>
          </button>
        </div>

        {/* Status filter (only for deposits/withdrawals) */}
        {activeTab !== 'gateway' && (
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search user or ref..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs shrink-0">
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-2.5 py-1 rounded-lg capitalize transition ${
                  statusFilter === 'pending' ? 'bg-slate-800 text-amber-400 font-bold' : 'text-slate-400'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg capitalize transition ${
                  statusFilter === 'all' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400'
                }`}
              >
                All
              </button>
            </div>
          </div>
        )}
      </div>

      {/* TAB 1: DEPOSIT REQUESTS */}
      {activeTab === 'deposits' && (
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">User</th>
                  <th className="px-4 py-3.5">Requested Coins</th>
                  <th className="px-4 py-3.5">Payment Method & Ref</th>
                  <th className="px-4 py-3.5">Notes</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {filteredDeposits.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      No deposit requests found under "{statusFilter}".
                    </td>
                  </tr>
                ) : (
                  filteredDeposits.map(dep => {
                    const isPending = dep.status === 'pending';
                    const targetUser = users.find(u => u.id === dep.userId);

                    return (
                      <tr key={dep.id} className="hover:bg-slate-800/30 transition">
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="font-bold text-white">@{dep.username}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            Bal: {targetUser ? targetUser.coins : 0} 🪙
                          </div>
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="font-mono font-bold text-emerald-400 text-sm">
                            +{dep.amount.toLocaleString()} 🪙
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-white">{dep.paymentMethod}</div>
                          <div className="font-mono text-[11px] text-slate-400">
                            Ref: {dep.referenceNumber}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 max-w-xs text-slate-400 truncate">
                          {dep.notes || dep.adminRemark || '—'}
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            dep.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            dep.status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                            'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {dep.status.toUpperCase()}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">
                          {new Date(dep.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>

                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          {isPending ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleApproveDeposit(dep.id)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Approve (+{dep.amount} 🪙)
                              </button>
                              <button
                                onClick={() => setRejectItem({ type: 'deposit', id: dep.id, user: dep.username, amount: dep.amount })}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 text-xs font-semibold transition"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500">
                              {dep.status === 'approved' ? 'Credited ✓' : 'Rejected ✕'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: WITHDRAWAL REQUESTS */}
      {activeTab === 'withdrawals' && (
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">User</th>
                  <th className="px-4 py-3.5">Withdrawal Amount</th>
                  <th className="px-4 py-3.5">Payout Method & Details</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {filteredWithdrawals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      No withdrawal requests found.
                    </td>
                  </tr>
                ) : (
                  filteredWithdrawals.map(wdr => {
                    const isPending = wdr.status === 'pending';
                    const isProcessing = wdr.status === 'processing';
                    const targetUser = users.find(u => u.id === wdr.userId);

                    return (
                      <tr key={wdr.id} className="hover:bg-slate-800/30 transition">
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="font-bold text-white">@{wdr.username}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            Bal: {targetUser ? targetUser.coins : 0} 🪙
                          </div>
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="font-mono font-bold text-purple-400 text-sm">
                            {wdr.amount.toLocaleString()} 🪙
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-white">{wdr.payoutMethod}</div>
                          <div className="font-mono text-[11px] text-slate-400 max-w-xs break-all">
                            {wdr.payoutDetails}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            wdr.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            wdr.status === 'processing' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                            wdr.status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                            'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {wdr.status.toUpperCase()}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">
                          {new Date(wdr.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>

                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          {isPending || isProcessing ? (
                            <div className="flex items-center justify-end gap-1.5">
                              {isPending && (
                                <button
                                  onClick={() => handleSetProcessingWithdrawal(wdr.id)}
                                  className="px-2.5 py-1 rounded-lg bg-blue-600/30 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/30 text-xs font-semibold transition"
                                >
                                  Mark Processing
                                </button>
                              )}
                              <button
                                onClick={() => handleApproveWithdrawal(wdr.id)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Approve Payout
                              </button>
                              <button
                                onClick={() => setRejectItem({ type: 'withdrawal', id: wdr.id, user: wdr.username, amount: wdr.amount })}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 text-xs font-semibold transition"
                              >
                                Reject & Refund
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500">
                              {wdr.status === 'approved' ? 'Paid ✓' : 'Rejected & Refunded ✕'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: OFFICIAL ADMIN PAYMENT GATEWAY MANAGEMENT */}
      {activeTab === 'gateway' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Scope Selector (Global vs Specific User) */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                Select Gateway Scope
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Update the global gateway for all users or assign a custom payment gateway to an individual user.
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <button
                type="button"
                onClick={() => setGatewayTarget('global')}
                className={`w-full text-left p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                  gatewayTarget === 'global'
                    ? 'bg-amber-500/10 border-amber-500/50 text-amber-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="text-xs font-bold">All Users (Global Default)</div>
                  <div className="text-[10px] text-slate-400">Default Official Admin Payment Gateway</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">
                  Global
                </span>
              </button>

              <div className="pt-2 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Per-User Custom Gateways
              </div>

              <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                {regularUsers.map(u => {
                  const hasCustom = Boolean(u.customPaymentGateway && u.customPaymentGateway.channels.length > 0);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setGatewayTarget(u.id)}
                      className={`w-full text-left p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                        gatewayTarget === u.id
                          ? 'bg-amber-500/10 border-amber-500/50 text-amber-300'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="truncate">
                        <div className="font-bold text-xs text-white">@{u.username}</div>
                        <div className="text-[10px] text-slate-400 truncate">{u.fullName}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0 ${
                        hasCustom
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-500'
                      }`}>
                        {hasCustom ? 'Custom' : 'Global'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right 2 Columns: Gateway Editor */}
          <div className="lg:col-span-2 bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl">
            {gatewayTarget === 'global' ? (
              <PaymentGatewayEditor
                initialConfig={paymentGateway}
                targetLabel="All Users (Global Default)"
                onSave={updateGlobalPaymentGateway}
              />
            ) : (() => {
              const targetUser = regularUsers.find(u => u.id === gatewayTarget);
              if (!targetUser) return null;
              const effective = getEffectivePaymentGateway(targetUser.id);
              const hasCustom = Boolean(targetUser.customPaymentGateway && targetUser.customPaymentGateway.channels.length > 0);

              return (
                <PaymentGatewayEditor
                  initialConfig={effective}
                  targetLabel={`@${targetUser.username} (${targetUser.fullName})`}
                  hasCustomOverride={hasCustom}
                  onSave={(cfg) => updateUserPaymentGateway(targetUser.id, cfg)}
                  onResetToGlobal={() => updateUserPaymentGateway(targetUser.id, null)}
                />
              );
            })()}
          </div>
        </div>
      )}

      {/* REJECTION REMARK MODAL */}
      {rejectItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-white flex items-center gap-1.5 text-rose-400">
                <XCircle className="w-4 h-4" />
                Reject {rejectItem.type === 'deposit' ? 'Deposit' : 'Withdrawal'} Request
              </h3>
              <button onClick={() => setRejectItem(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <p className="text-slate-400">
              Rejecting request of <strong>{rejectItem.amount} coins</strong> for @{rejectItem.user}.
              {rejectItem.type === 'withdrawal' && ' Reserved coins will be refunded back to the user.'}
            </p>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold block">Rejection Reason / Admin Remark:</label>
              <input
                type="text"
                required
                placeholder="e.g. Invalid transaction ID / UTR not found on bank statement"
                value={remarkText}
                onChange={e => setRemarkText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setRejectItem(null)}
                className="w-1/3 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold uppercase tracking-wider"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
