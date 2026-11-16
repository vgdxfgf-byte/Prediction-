import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { DepositRequest, WithdrawalRequest } from '../../types';
import { compressChatImage } from '../../utils/imageCompression';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  AlertCircle,
  Check,
  Landmark,
  Users,
  ImagePlus,
  ZoomIn,
  X,
  XCircle,
  Upload,
  History,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { PaymentGatewayEditor } from './PaymentGatewayEditor';

export type AdminRequestsSubTab = 'history' | 'deposits' | 'withdrawals' | 'gateway';
export type AdminRequestsStatusFilter = 'pending' | 'all' | 'approved' | 'rejected';

interface AdminRequestsProps {
  initialTab?: AdminRequestsSubTab;
  initialStatusFilter?: AdminRequestsStatusFilter;
  onClearInitialTab?: () => void;
}

export const AdminRequests: React.FC<AdminRequestsProps> = ({
  initialTab,
  initialStatusFilter,
  onClearInitialTab
}) => {
  const {
    deposits,
    withdrawals,
    reviewDeposit,
    reviewWithdrawal,
    uploadWithdrawalProof,
    users,
    paymentGateway,
    updateGlobalPaymentGateway,
    updateUserPaymentGateway,
    getEffectivePaymentGateway
  } = useApp();

  const [activeTab, setActiveTab] = useState<AdminRequestsSubTab>(initialTab || 'history');
  const [statusFilter, setStatusFilter] = useState<AdminRequestsStatusFilter>(
    initialStatusFilter || (initialTab === 'deposits' || initialTab === 'withdrawals' ? 'pending' : 'all')
  );
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'all' | 'deposit' | 'withdrawal'>('all');
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
      if (initialStatusFilter) {
        setStatusFilter(initialStatusFilter);
      } else if (initialTab === 'history') {
        setStatusFilter('all');
      } else if (initialTab === 'deposits' || initialTab === 'withdrawals') {
        setStatusFilter('pending');
      }
      onClearInitialTab?.();
    } else if (initialStatusFilter) {
      setStatusFilter(initialStatusFilter);
      onClearInitialTab?.();
    }
  }, [initialTab, initialStatusFilter, onClearInitialTab]);

  const regularUsers = users.filter(u => u.id !== 'usr_admin');
  const [gatewayTarget, setGatewayTarget] = useState<string>('global');

  // Remark Modal
  const [rejectItem, setRejectItem] = useState<{ type: 'deposit' | 'withdrawal'; id: string; user: string; amount: number } | null>(null);
  const [remarkText, setRemarkText] = useState('');

  // Withdrawal Screenshot Proof Modal & Lightbox
  const [proofModal, setProofModal] = useState<{
    withdrawal: WithdrawalRequest;
    mode: 'complete_with_proof' | 'upload_after';
  } | null>(null);
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [proofRemark, setProofRemark] = useState('');
  const [proofProcessing, setProofProcessing] = useState(false);
  const [proofSaving, setProofSaving] = useState(false);
  const [proofError, setProofError] = useState('');
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);
  const proofFileInputRef = useRef<HTMLInputElement | null>(null);

  // Global metrics across all users
  const pendingDepositsCount = deposits.filter(d => d.status === 'pending').length;
  const approvedDeposits = deposits.filter(d => d.status === 'approved');
  const approvedDepositsVolume = approvedDeposits.reduce((sum, d) => sum + d.amount, 0);

  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending' || w.status === 'processing');
  const pendingWithdrawalsCount = pendingWithdrawals.length;
  const pendingWithdrawalsVolume = pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0);
  const completedWithdrawals = withdrawals.filter(w => w.status === 'approved');
  const completedWithdrawalsVolume = completedWithdrawals.reduce((sum, w) => sum + w.amount, 0);
  const withdrawalsWithProofCount = completedWithdrawals.filter(w => Boolean(w.proofImageUrl)).length;

  const matchesSearchAndUser = (
    userId: string,
    username: string,
    fields: Array<string | undefined>
  ): boolean => {
    if (selectedUserId !== 'all' && userId !== selectedUserId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const hay = [username, ...fields].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  };

  const userFilteredDeposits = deposits.filter(d =>
    matchesSearchAndUser(d.userId, d.username, [d.referenceNumber, d.paymentMethod, d.notes, d.adminRemark])
  );
  const userFilteredWithdrawals = withdrawals.filter(w =>
    matchesSearchAndUser(w.userId, w.username, [w.payoutDetails, w.payoutMethod, w.adminRemark])
  );

  const filteredDeposits = userFilteredDeposits.filter(d => {
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    return true;
  });

  const filteredWithdrawals = userFilteredWithdrawals.filter(w => {
    if (statusFilter === 'pending' && !(w.status === 'pending' || w.status === 'processing')) return false;
    if (statusFilter !== 'pending' && statusFilter !== 'all' && w.status !== statusFilter) return false;
    return true;
  });

  type UnifiedHistoryItem =
    | { kind: 'deposit'; createdAt: string; item: DepositRequest }
    | { kind: 'withdrawal'; createdAt: string; item: WithdrawalRequest };

  const unifiedHistory: UnifiedHistoryItem[] = [
    ...(historyTypeFilter === 'withdrawal'
      ? []
      : filteredDeposits.map(item => ({ kind: 'deposit' as const, createdAt: item.createdAt, item }))),
    ...(historyTypeFilter === 'deposit'
      ? []
      : filteredWithdrawals.map(item => ({ kind: 'withdrawal' as const, createdAt: item.createdAt, item })))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Tab-aware counts for status filter pills
  const statusCounts = (() => {
    if (activeTab === 'deposits') {
      return {
        all: userFilteredDeposits.length,
        pending: userFilteredDeposits.filter(d => d.status === 'pending').length,
        approved: userFilteredDeposits.filter(d => d.status === 'approved').length,
        rejected: userFilteredDeposits.filter(d => d.status === 'rejected').length
      };
    }
    if (activeTab === 'withdrawals') {
      return {
        all: userFilteredWithdrawals.length,
        pending: userFilteredWithdrawals.filter(w => w.status === 'pending' || w.status === 'processing').length,
        approved: userFilteredWithdrawals.filter(w => w.status === 'approved').length,
        rejected: userFilteredWithdrawals.filter(w => w.status === 'rejected').length
      };
    }
    const deps = historyTypeFilter === 'withdrawal' ? [] : userFilteredDeposits;
    const wdrs = historyTypeFilter === 'deposit' ? [] : userFilteredWithdrawals;
    return {
      all: deps.length + wdrs.length,
      pending:
        deps.filter(d => d.status === 'pending').length +
        wdrs.filter(w => w.status === 'pending' || w.status === 'processing').length,
      approved:
        deps.filter(d => d.status === 'approved').length +
        wdrs.filter(w => w.status === 'approved').length,
      rejected:
        deps.filter(d => d.status === 'rejected').length +
        wdrs.filter(w => w.status === 'rejected').length
    };
  })();

  const handleApproveDeposit = async (depId: string) => {
    await reviewDeposit(depId, 'approve');
  };

  const handleOpenWithdrawalProofModal = (
    withdrawal: WithdrawalRequest,
    mode: 'complete_with_proof' | 'upload_after'
  ) => {
    setProofModal({ withdrawal, mode });
    setProofImage(withdrawal.proofImageUrl || null);
    setProofRemark(withdrawal.adminRemark || 'Payout processed and confirmed by admin');
    setProofError('');
    setProofProcessing(false);
    setProofSaving(false);
  };

  const handleProofFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setProofError('');
    setProofProcessing(true);
    try {
      const compressed = await compressChatImage(file);
      setProofImage(compressed);
    } catch (err) {
      setProofError(err instanceof Error ? err.message : 'Failed to process image');
    } finally {
      setProofProcessing(false);
    }
  };

  const handleSaveWithdrawalProofModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofModal) return;
    setProofError('');

    if (proofModal.mode === 'upload_after' && !proofImage) {
      setProofError('Please select a payout confirmation screenshot to upload.');
      return;
    }

    setProofSaving(true);
    const res =
      proofModal.mode === 'complete_with_proof'
        ? await reviewWithdrawal(
            proofModal.withdrawal.id,
            'approve',
            proofRemark.trim() || 'Payout processed and confirmed by admin',
            proofImage || undefined
          )
        : await uploadWithdrawalProof(
            proofModal.withdrawal.id,
            proofImage as string,
            proofRemark.trim() || undefined
          );

    setProofSaving(false);
    if (!res.success) {
      setProofError(res.error || 'Failed to save withdrawal update');
      return;
    }
    setProofModal(null);
    setProofImage(null);
    setProofRemark('');
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
          <span>All Users Deposit & Withdrawal Desk</span>
          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
            Cashier Desk
          </span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          View all users&apos; deposit &amp; withdrawal history, complete pending withdrawals, and upload payout screenshots.
        </p>
      </div>

      {/* Global Deposit & Withdrawal Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        <button
          type="button"
          onClick={() => {
            setActiveTab('deposits');
            setStatusFilter('all');
          }}
          className="text-left p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 transition cursor-pointer space-y-1"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold">All Users Deposits</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-black font-mono text-white">
            {approvedDepositsVolume.toLocaleString()} <span className="text-xs font-semibold text-emerald-400">🪙 approved</span>
          </div>
          <div className="text-[11px] text-slate-400">
            {deposits.length} total ·{' '}
            <span className={pendingDepositsCount > 0 ? 'text-amber-400 font-bold' : 'text-slate-400'}>
              {pendingDepositsCount} pending review
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('withdrawals');
            setStatusFilter('all');
          }}
          className="text-left p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/40 transition cursor-pointer space-y-1"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold">All Users Withdrawals</span>
            <ArrowUpRight className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-black font-mono text-white">
            {completedWithdrawalsVolume.toLocaleString()} <span className="text-xs font-semibold text-purple-400">🪙 paid</span>
          </div>
          <div className="text-[11px] text-slate-400">
            {withdrawals.length} total · {completedWithdrawals.length} completed
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('withdrawals');
            setStatusFilter('pending');
          }}
          className="text-left p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 hover:border-amber-400/60 transition cursor-pointer space-y-1"
        >
          <div className="flex items-center justify-between text-xs text-amber-300">
            <span className="font-semibold">Pending Withdrawals</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-black font-mono text-amber-400">
            {pendingWithdrawalsCount}{' '}
            <span className="text-xs font-semibold text-slate-300">
              ({pendingWithdrawalsVolume.toLocaleString()} 🪙)
            </span>
          </div>
          <div className="text-[11px] text-slate-400">
            Click to complete &amp; upload payout screenshot →
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('withdrawals');
            setStatusFilter('approved');
          }}
          className="text-left p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 transition cursor-pointer space-y-1"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold">Payout Screenshots</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-black font-mono text-white">
            {withdrawalsWithProofCount} / {completedWithdrawals.length}{' '}
            <span className="text-xs font-semibold text-slate-400">attached</span>
          </div>
          <div className="text-[11px] text-slate-400">
            {completedWithdrawals.length - withdrawalsWithProofCount > 0
              ? `${completedWithdrawals.length - withdrawalsWithProofCount} completed payout(s) need proof`
              : 'All completed payouts have screenshot proof'}
          </div>
        </button>
      </div>

      {/* Main Tabs + Filters */}
      <div className="space-y-3 border-b border-slate-800 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setActiveTab('history');
              setStatusFilter('all');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'history'
                ? 'bg-sky-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>All History</span>
            <span className="bg-slate-950/60 text-slate-200 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {deposits.length + withdrawals.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('deposits');
              setStatusFilter(pendingDepositsCount > 0 ? 'pending' : 'all');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'deposits'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Deposits</span>
            {pendingDepositsCount > 0 && (
              <span className="bg-emerald-800 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {pendingDepositsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('withdrawals');
              setStatusFilter(pendingWithdrawalsCount > 0 ? 'pending' : 'all');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'withdrawals'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Withdrawals</span>
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

        {/* Search, User Filter & Status Filters (for history/deposits/withdrawals) */}
        {activeTab !== 'gateway' && (
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search user, UTR, UPI..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <select
                value={selectedUserId}
                onChange={e => setSelectedUserId(e.target.value)}
                aria-label="Filter by user"
                className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="all">All Users ({regularUsers.length})</option>
                {regularUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    @{u.username} ({u.fullName})
                  </option>
                ))}
              </select>

              {activeTab === 'history' && (
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                  {(['all', 'deposit', 'withdrawal'] as const).map(kind => (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => setHistoryTypeFilter(kind)}
                      className={`px-2.5 py-1 rounded-lg capitalize transition cursor-pointer ${
                        historyTypeFilter === kind
                          ? 'bg-slate-800 text-sky-400 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {kind === 'all' ? 'All Types' : kind === 'deposit' ? 'Deposits' : 'Withdrawals'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs shrink-0 self-start lg:self-auto">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  statusFilter === 'all' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({statusCounts.all})
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  statusFilter === 'pending' ? 'bg-slate-800 text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Pending ({statusCounts.pending})
              </button>
              <button
                onClick={() => setStatusFilter('approved')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  statusFilter === 'approved' ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Completed ({statusCounts.approved})
              </button>
              <button
                onClick={() => setStatusFilter('rejected')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  statusFilter === 'rejected' ? 'bg-slate-800 text-rose-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Rejected ({statusCounts.rejected})
              </button>
            </div>
          </div>
        )}
      </div>

      {/* TAB 0: UNIFIED ALL USERS DEPOSIT & WITHDRAWAL HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">Type</th>
                  <th className="px-4 py-3.5">User</th>
                  <th className="px-4 py-3.5">Amount</th>
                  <th className="px-4 py-3.5">Method &amp; Ref / Payout Details</th>
                  <th className="px-4 py-3.5">Status &amp; Note</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5 text-right">Action / Screenshot</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {unifiedHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      No deposit or withdrawal records match your current filters.
                    </td>
                  </tr>
                ) : (
                  unifiedHistory.map(entry => {
                    if (entry.kind === 'deposit') {
                      const dep = entry.item;
                      const isPending = dep.status === 'pending';
                      const targetUser = users.find(u => u.id === dep.userId);
                      return (
                        <tr key={`dep-${dep.id}`} className="hover:bg-slate-800/30 transition">
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-bold text-[10px] uppercase">
                              <ArrowDownLeft className="w-3 h-3" />
                              Deposit
                            </span>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="font-bold text-white">@{dep.username}</div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              Bal: {targetUser ? targetUser.coins.toLocaleString() : 0} 🪙
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
                          <td className="px-4 py-3.5 max-w-xs">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              dep.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              dep.status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                              'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {dep.status === 'approved' ? 'COMPLETED' : dep.status.toUpperCase()}
                            </span>
                            {(dep.adminRemark || dep.notes) && (
                              <div className="text-[11px] text-slate-400 truncate mt-1">
                                {dep.adminRemark || dep.notes}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">
                            <div>
                              {new Date(dep.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                            {dep.reviewedAt && (
                              <div className="text-[10px] text-slate-500">
                                Reviewed: {new Date(dep.reviewedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              {dep.proofImageUrl && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setLightboxImage({
                                      url: dep.proofImageUrl!,
                                      title: `Deposit Screenshot · @${dep.username} (${dep.amount.toLocaleString()} coins · Ref ${dep.referenceNumber})`
                                    })
                                  }
                                  className="relative group rounded-lg overflow-hidden border border-emerald-500/40 w-9 h-9 shrink-0 cursor-pointer"
                                  title="View user payment screenshot"
                                >
                                  <img
                                    src={dep.proofImageUrl}
                                    alt="Deposit screenshot"
                                    className="w-full h-full object-cover"
                                  />
                                  <span className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                    <ZoomIn className="w-3.5 h-3.5 text-white" />
                                  </span>
                                </button>
                              )}
                              {isPending ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleApproveDeposit(dep.id)}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    Approve (+{dep.amount} 🪙)
                                  </button>
                                  <button
                                    onClick={() => setRejectItem({ type: 'deposit', id: dep.id, user: dep.username, amount: dep.amount })}
                                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 text-xs font-semibold transition cursor-pointer"
                                  >
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-500">
                                  {dep.status === 'approved' ? 'Credited ✓' : 'Rejected ✕'}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    const wdr = entry.item;
                    const isPending = wdr.status === 'pending';
                    const isProcessing = wdr.status === 'processing';
                    const targetUser = users.find(u => u.id === wdr.userId);
                    return (
                      <tr key={`wdr-${wdr.id}`} className="hover:bg-slate-800/30 transition">
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/25 font-bold text-[10px] uppercase">
                            <ArrowUpRight className="w-3 h-3" />
                            Withdrawal
                          </span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="font-bold text-white">@{wdr.username}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            Bal: {targetUser ? targetUser.coins.toLocaleString() : 0} 🪙
                          </div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="font-mono font-bold text-purple-400 text-sm">
                            -{wdr.amount.toLocaleString()} 🪙
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-white">{wdr.payoutMethod}</div>
                          <div className="font-mono text-[11px] text-slate-400 max-w-xs break-all">
                            {wdr.payoutDetails}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 max-w-xs">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            wdr.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            wdr.status === 'processing' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                            wdr.status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                            'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {wdr.status === 'approved' ? 'COMPLETED' : wdr.status.toUpperCase()}
                          </span>
                          {wdr.adminRemark && (
                            <div className="text-[11px] text-slate-400 truncate mt-1">{wdr.adminRemark}</div>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">
                          <div>
                            {new Date(wdr.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {wdr.reviewedAt && (
                            <div className="text-[10px] text-slate-500">
                              Done: {new Date(wdr.reviewedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          {isPending || isProcessing ? (
                            <div className="flex items-center justify-end gap-1.5">
                              {isPending && (
                                <button
                                  onClick={() => handleSetProcessingWithdrawal(wdr.id)}
                                  className="px-2 py-1 rounded-lg bg-blue-600/30 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/30 text-xs font-semibold transition cursor-pointer"
                                >
                                  Processing
                                </button>
                              )}
                              <button
                                onClick={() => handleOpenWithdrawalProofModal(wdr, 'complete_with_proof')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Complete &amp; Upload Proof
                              </button>
                              <button
                                onClick={() => setRejectItem({ type: 'withdrawal', id: wdr.id, user: wdr.username, amount: wdr.amount })}
                                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 text-xs font-semibold transition cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          ) : wdr.status === 'approved' ? (
                            <div className="flex items-center justify-end gap-2">
                              {wdr.proofImageUrl && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setLightboxImage({
                                      url: wdr.proofImageUrl!,
                                      title: `Payout Proof · @${wdr.username} (${wdr.amount.toLocaleString()} coins)`
                                    })
                                  }
                                  className="relative group rounded-lg overflow-hidden border border-emerald-500/40 w-9 h-9 shrink-0 cursor-pointer"
                                  title="View uploaded payout screenshot"
                                >
                                  <img
                                    src={wdr.proofImageUrl}
                                    alt="Payout screenshot"
                                    className="w-full h-full object-cover"
                                  />
                                  <span className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                    <ZoomIn className="w-3.5 h-3.5 text-white" />
                                  </span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleOpenWithdrawalProofModal(wdr, 'upload_after')}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                                  wdr.proofImageUrl
                                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                                    : 'bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40'
                                }`}
                              >
                                <ImagePlus className="w-3.5 h-3.5" />
                                {wdr.proofImageUrl ? 'Update Screenshot' : 'Upload Screenshot'}
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500">
                              Rejected &amp; Refunded ✕
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
                  <th className="px-4 py-3.5">Notes / Admin Remark</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {filteredDeposits.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      No deposit requests found under &quot;{statusFilter}&quot;.
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
                            Bal: {targetUser ? targetUser.coins.toLocaleString() : 0} 🪙
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
                          {dep.adminRemark || dep.notes || '—'}
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            dep.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            dep.status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                            'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {dep.status === 'approved' ? 'COMPLETED' : dep.status.toUpperCase()}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">
                          <div>
                            {new Date(dep.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {dep.reviewedAt && (
                            <div className="text-[10px] text-slate-500">
                              Done: {new Date(dep.reviewedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {dep.proofImageUrl && (
                              <button
                                type="button"
                                onClick={() =>
                                  setLightboxImage({
                                    url: dep.proofImageUrl!,
                                    title: `Deposit Screenshot · @${dep.username} (${dep.amount.toLocaleString()} coins · Ref ${dep.referenceNumber})`
                                  })
                                }
                                className="relative group rounded-lg overflow-hidden border border-emerald-500/40 w-9 h-9 shrink-0 cursor-pointer"
                                title="View user payment screenshot"
                              >
                                <img
                                  src={dep.proofImageUrl}
                                  alt="Deposit screenshot"
                                  className="w-full h-full object-cover"
                                />
                                <span className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                  <ZoomIn className="w-3.5 h-3.5 text-white" />
                                </span>
                              </button>
                            )}
                            {isPending ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleApproveDeposit(dep.id)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Approve (+{dep.amount} 🪙)
                                </button>
                                <button
                                  onClick={() => setRejectItem({ type: 'deposit', id: dep.id, user: dep.username, amount: dep.amount })}
                                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 text-xs font-semibold transition cursor-pointer"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-500">
                                {dep.status === 'approved' ? 'Credited ✓' : 'Rejected ✕'}
                              </span>
                            )}
                          </div>
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
                  <th className="px-4 py-3.5">Status &amp; Remark</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5 text-right">Action / Screenshot</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {filteredWithdrawals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      No withdrawal requests found under &quot;{statusFilter}&quot;.
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
                            Bal: {targetUser ? targetUser.coins.toLocaleString() : 0} 🪙
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

                        <td className="px-4 py-3.5 max-w-xs">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            wdr.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            wdr.status === 'processing' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                            wdr.status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                            'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {wdr.status === 'approved' ? 'COMPLETED' : wdr.status.toUpperCase()}
                          </span>
                          {wdr.adminRemark && (
                            <div className="text-[11px] text-slate-400 truncate mt-1">{wdr.adminRemark}</div>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">
                          <div>
                            {new Date(wdr.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {wdr.reviewedAt && (
                            <div className="text-[10px] text-slate-500">
                              Done: {new Date(wdr.reviewedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          {isPending || isProcessing ? (
                            <div className="flex items-center justify-end gap-1.5">
                              {isPending && (
                                <button
                                  onClick={() => handleSetProcessingWithdrawal(wdr.id)}
                                  className="px-2.5 py-1 rounded-lg bg-blue-600/30 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/30 text-xs font-semibold transition cursor-pointer"
                                >
                                  Mark Processing
                                </button>
                              )}
                              <button
                                onClick={() => handleOpenWithdrawalProofModal(wdr, 'complete_with_proof')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Complete &amp; Upload Proof
                              </button>
                              <button
                                onClick={() => setRejectItem({ type: 'withdrawal', id: wdr.id, user: wdr.username, amount: wdr.amount })}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 text-xs font-semibold transition cursor-pointer"
                              >
                                Reject & Refund
                              </button>
                            </div>
                          ) : wdr.status === 'approved' ? (
                            <div className="flex items-center justify-end gap-2">
                              {wdr.proofImageUrl && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setLightboxImage({
                                      url: wdr.proofImageUrl!,
                                      title: `Payout Proof · @${wdr.username} (${wdr.amount.toLocaleString()} coins)`
                                    })
                                  }
                                  className="relative group rounded-lg overflow-hidden border border-emerald-500/40 w-9 h-9 shrink-0 cursor-pointer"
                                  title="View uploaded payout screenshot"
                                >
                                  <img
                                    src={wdr.proofImageUrl}
                                    alt="Payout screenshot"
                                    className="w-full h-full object-cover"
                                  />
                                  <span className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                    <ZoomIn className="w-3.5 h-3.5 text-white" />
                                  </span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleOpenWithdrawalProofModal(wdr, 'upload_after')}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                                  wdr.proofImageUrl
                                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                                    : 'bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40'
                                }`}
                              >
                                <ImagePlus className="w-3.5 h-3.5" />
                                {wdr.proofImageUrl ? 'Update Screenshot' : 'Upload Screenshot'}
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500">
                              Rejected & Refunded ✕
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
                  const hasCustom = Boolean(
                    u.customPaymentGateway &&
                    (u.customPaymentGateway.channels.length > 0 || Boolean(u.customPaymentGateway.qrCodeImageUrl))
                  );
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
              const hasCustom = Boolean(
                targetUser.customPaymentGateway &&
                (targetUser.customPaymentGateway.channels.length > 0 || Boolean(targetUser.customPaymentGateway.qrCodeImageUrl))
              );

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

      {/* WITHDRAWAL PAYOUT SCREENSHOT MODAL */}
      {proofModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-xs">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/90">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <ImagePlus className="w-4 h-4 text-emerald-400" />
                {proofModal.mode === 'complete_with_proof'
                  ? 'Complete Withdrawal & Attach Proof'
                  : 'Upload Withdrawal Payout Screenshot'}
              </h3>
              <button
                type="button"
                onClick={() => setProofModal(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveWithdrawalProofModal} className="p-5 space-y-4">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">@{proofModal.withdrawal.username}</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    {proofModal.withdrawal.amount.toLocaleString()} Coins
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  {proofModal.withdrawal.payoutMethod}:{' '}
                  <span className="font-mono text-slate-200">{proofModal.withdrawal.payoutDetails}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold">
                    Payment Screenshot {proofModal.mode === 'complete_with_proof' ? '(Optional — can upload later too)' : '*'}
                  </label>
                  {proofImage && (
                    <button
                      type="button"
                      onClick={() => setProofImage(null)}
                      className="text-[11px] text-rose-400 hover:text-rose-300 cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <input
                  ref={proofFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProofFileChange}
                  className="hidden"
                />

                {proofImage ? (
                  <div className="space-y-2">
                    <div className="relative rounded-xl overflow-hidden border border-emerald-500/35 bg-slate-950 max-h-60 flex items-center justify-center">
                      <img
                        src={proofImage}
                        alt="Withdrawal payout proof preview"
                        className="max-h-60 w-auto object-contain"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={proofProcessing}
                      onClick={() => proofFileInputRef.current?.click()}
                      className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {proofProcessing ? 'Processing image...' : 'Choose Different Screenshot'}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={proofProcessing}
                    onClick={() => proofFileInputRef.current?.click()}
                    className="w-full py-7 px-4 rounded-xl border-2 border-dashed border-slate-700 hover:border-emerald-500/60 bg-slate-950/70 hover:bg-slate-950 text-slate-300 flex flex-col items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <ImagePlus className="w-6 h-6 text-emerald-400" />
                    <span className="font-semibold">
                      {proofProcessing ? 'Compressing screenshot...' : 'Click to upload payment screenshot'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      JPG, PNG, or WebP · User will see this screenshot in their wallet immediately
                    </span>
                  </button>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Payout Note / UTR (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Paid via UPI Ref 41928371"
                  value={proofRemark}
                  onChange={e => setProofRemark(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>

              {proofError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{proofError}</span>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setProofModal(null)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={proofSaving || proofProcessing}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold uppercase tracking-wider cursor-pointer"
                >
                  {proofSaving
                    ? 'Saving...'
                    : proofModal.mode === 'complete_with_proof'
                      ? 'Confirm Complete Payout'
                      : 'Save Screenshot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCREENSHOT LIGHTBOX */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="max-w-2xl w-full bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between text-xs">
              <span className="font-bold text-white truncate">{lightboxImage.title}</span>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-black max-h-[80vh]">
              <img
                src={lightboxImage.url}
                alt={lightboxImage.title}
                className="max-h-[72vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
