import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import type { DepositRequest, WithdrawalRequest } from '../../types';
import { compressChatImage } from '../../utils/imageCompression';
import { MIN_DEPOSIT_AMOUNT } from '../../services/firestoreService';
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
  Wallet as WalletIcon,
  Search,
  Image as ImageIcon,
  ImagePlus,
  ZoomIn,
  Download,
  X
} from 'lucide-react';

interface WalletViewProps {
  initialModal?: 'deposit' | 'withdraw' | null;
  onClearInitialModal?: () => void;
  initialTab?: 'transactions' | 'deposits' | 'withdrawals' | null;
  onClearInitialTab?: () => void;
}

export const WalletView: React.FC<WalletViewProps> = ({
  initialModal,
  onClearInitialModal,
  initialTab,
  onClearInitialTab
}) => {
  const {
    currentUser,
    transactions,
    deposits,
    withdrawals,
    requestDeposit,
    uploadDepositProof,
    requestWithdrawal,
    getEffectivePaymentGateway
  } = useApp();

  const [activeTab, setActiveTab] = useState<'transactions' | 'deposits' | 'withdrawals'>(initialTab || 'transactions');
  const [txTypeFilter, setTxTypeFilter] = useState<'all' | 'wins' | 'bets' | 'deposits' | 'withdrawals' | 'admin'>('all');
  const [txSearch, setTxSearch] = useState<string>('');
  const [showDepositModal, setShowDepositModal] = useState<boolean>(initialModal === 'deposit');
  const [showWithdrawModal, setShowWithdrawModal] = useState<boolean>(initialModal === 'withdraw');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
      onClearInitialTab?.();
    }
  }, [initialTab, onClearInitialTab]);

  useEffect(() => {
    if (initialModal === 'deposit') {
      setShowDepositModal(true);
      setShowWithdrawModal(false);
    } else if (initialModal === 'withdraw') {
      setShowWithdrawModal(true);
      setShowDepositModal(false);
    }
  }, [initialModal]);

  // Deposit Form State
  const [depAmount, setDepAmount] = useState<number>(MIN_DEPOSIT_AMOUNT);
  const [depMethod, setDepMethod] = useState<string>('UPI Transfer / PhonePe');
  const [depRef, setDepRef] = useState<string>('');
  const [depNotes, setDepNotes] = useState<string>('');
  const [depProofImage, setDepProofImage] = useState<string | null>(null);
  const [depProofProcessing, setDepProofProcessing] = useState<boolean>(false);
  const [depSuccessMsg, setDepSuccessMsg] = useState<string>('');
  const [depError, setDepError] = useState<string>('');
  const depFileInputRef = useRef<HTMLInputElement>(null);

  // Attach/update screenshot on existing pending deposit
  const [targetUploadDeposit, setTargetUploadDeposit] = useState<DepositRequest | null>(null);
  const [uploadingDepositId, setUploadingDepositId] = useState<string | null>(null);
  const [depositListNotice, setDepositListNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const existingDepFileInputRef = useRef<HTMLInputElement>(null);

  // Withdrawal Form State
  const [wdrAmount, setWdrAmount] = useState<number>(200);
  const [wdrMethod, setWdrMethod] = useState<string>('UPI ID');
  const [wdrDetails, setWdrDetails] = useState<string>('');
  const [wdrSuccessMsg, setWdrSuccessMsg] = useState<string>('');
  const [wdrError, setWdrError] = useState<string>('');

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [viewingProofWithdrawal, setViewingProofWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [viewingProofDeposit, setViewingProofDeposit] = useState<DepositRequest | null>(null);

  if (!currentUser) return null;

  const userTransactions = transactions.filter(t => t.userId === currentUser.id);
  const filteredTransactions = userTransactions.filter(tx => {
    if (txTypeFilter === 'wins' && tx.type !== 'bet_won' && tx.type !== 'bet_refund') return false;
    if (txTypeFilter === 'bets' && tx.type !== 'bet_placed') return false;
    if (txTypeFilter === 'deposits' && tx.type !== 'deposit') return false;
    if (txTypeFilter === 'withdrawals' && tx.type !== 'withdrawal') return false;
    if (txTypeFilter === 'admin' && tx.type !== 'admin_credit' && tx.type !== 'admin_debit') return false;
    if (txSearch.trim()) {
      const q = txSearch.toLowerCase();
      const matchDesc = tx.description.toLowerCase().includes(q);
      const matchType = tx.type.replace('_', ' ').toLowerCase().includes(q);
      const matchRef = (tx.referenceId || tx.id).toLowerCase().includes(q);
      if (!matchDesc && !matchType && !matchRef) return false;
    }
    return true;
  });
  const userDeposits = deposits.filter(
    d => d.userId === currentUser.id || (d.ownerUid && currentUser.ownerUid && d.ownerUid === currentUser.ownerUid)
  );
  const userWithdrawals = withdrawals.filter(
    w => w.userId === currentUser.id || (w.ownerUid && currentUser.ownerUid && w.ownerUid === currentUser.ownerUid)
  );
  const withdrawalById = new Map(userWithdrawals.map(w => [w.id, w]));
  const depositById = new Map(userDeposits.map(d => [d.id, d]));
  const withdrawalsWithProofCount = userWithdrawals.filter(w => Boolean(w.proofImageUrl)).length;
  const effectiveGateway = getEffectivePaymentGateway(currentUser.id);
  const enabledGatewayChannels = effectiveGateway.channels.filter(c => c.enabled);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDepFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setDepError('');
    setDepProofProcessing(true);
    try {
      const compressed = await compressChatImage(file);
      setDepProofImage(compressed);
    } catch (err) {
      setDepError(err instanceof Error ? err.message : 'Unable to process payment screenshot');
    } finally {
      setDepProofProcessing(false);
    }
  };

  const handleExistingDepFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const dep = targetUploadDeposit;
    setTargetUploadDeposit(null);
    if (!file || !dep) return;

    setDepositListNotice(null);
    setUploadingDepositId(dep.id);
    try {
      const compressed = await compressChatImage(file);
      const res = await uploadDepositProof(dep.id, compressed);
      if (res.success) {
        setDepositListNotice({ type: 'ok', text: `Payment screenshot uploaded for Ref ${dep.referenceNumber}.` });
      } else {
        setDepositListNotice({ type: 'err', text: res.error || 'Failed to upload screenshot' });
      }
    } catch (err) {
      setDepositListNotice({
        type: 'err',
        text: err instanceof Error ? err.message : 'Unable to process screenshot'
      });
    } finally {
      setUploadingDepositId(null);
    }
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDepError('');
    if (!Number.isFinite(depAmount) || depAmount < MIN_DEPOSIT_AMOUNT) {
      setDepError(`Minimum deposit amount is ${MIN_DEPOSIT_AMOUNT.toLocaleString()} coins`);
      return;
    }
    if (!depRef.trim()) {
      setDepError('Payment Reference ID or Transaction Number is required');
      return;
    }
    if (depProofProcessing) {
      setDepError('Please wait for the screenshot to finish processing');
      return;
    }

    const res = await requestDeposit(depAmount, depMethod, depRef, depNotes, depProofImage || undefined);
    if (res.success) {
      setDepSuccessMsg(`Deposit request for ${depAmount} coins submitted! Awaiting admin verification.`);
      setDepRef('');
      setDepNotes('');
      setDepProofImage(null);
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
      <div className="border-b border-slate-800 pb-3">
        <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('transactions')}
            className={`px-2.5 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-semibold uppercase tracking-wider transition cursor-pointer text-center ${
              activeTab === 'transactions'
                ? 'bg-[#14e071] text-[#04130b] font-bold shadow-[0_6px_18px_-6px_rgba(20,224,113,0.65)]'
                : 'bg-[#0d151b] text-slate-400 hover:text-white border border-white/[0.08]'
            }`}
          >
            <span className="sm:hidden">Txns ({userTransactions.length})</span>
            <span className="hidden sm:inline">Transaction History ({userTransactions.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('deposits')}
            className={`px-2.5 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-semibold uppercase tracking-wider transition cursor-pointer text-center ${
              activeTab === 'deposits'
                ? 'bg-emerald-600 text-white shadow-md font-bold'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <span className="sm:hidden">Deposits ({userDeposits.length})</span>
            <span className="hidden sm:inline">Deposit Requests ({userDeposits.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('withdrawals')}
            className={`px-2.5 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-semibold uppercase tracking-wider transition cursor-pointer text-center flex items-center justify-center gap-1.5 ${
              activeTab === 'withdrawals'
                ? 'bg-purple-600 text-white shadow-md font-bold'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <span className="sm:hidden">Withdraws ({userWithdrawals.length})</span>
            <span className="hidden sm:inline">Withdrawal History ({userWithdrawals.length})</span>
            {withdrawalsWithProofCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#14e071] text-[#04130b] text-[9px] font-black">
                {withdrawalsWithProofCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab 1: Complete Transaction History */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          {/* Filter Chips & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'wins', label: 'Wins & Refunds' },
                  { id: 'bets', label: 'Bets Placed' },
                  { id: 'deposits', label: 'Deposits' },
                  { id: 'withdrawals', label: 'Withdrawals' },
                  { id: 'admin', label: 'Admin' }
                ] as const
              ).map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setTxTypeFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap shrink-0 transition cursor-pointer ${
                    txTypeFilter === f.id
                      ? 'bg-emerald-500/20 text-[#14e071] border border-[#14e071]/40'
                      : 'bg-[#0d151b] text-slate-400 hover:text-white border border-white/[0.07]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={txSearch}
                onChange={e => setTxSearch(e.target.value)}
                placeholder="Search transactions or ref ID..."
                className="w-full pl-8 pr-3 py-1.5 bg-[#0d151b] border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#14e071]"
              />
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="apex-card p-10 rounded-2xl text-center text-slate-400 text-xs">
              {userTransactions.length === 0
                ? 'No transactions on record yet.'
                : 'No transactions match your current filter.'}
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="space-y-2.5 md:hidden">
                {filteredTransactions.map(tx => {
                  const isPositive = tx.amount > 0;
                  const isNeutral = tx.amount === 0;
                  const linkedWdr =
                    tx.type === 'withdrawal' && tx.referenceId
                      ? withdrawalById.get(tx.referenceId)
                      : undefined;
                  return (
                    <div
                      key={tx.id}
                      className="apex-card rounded-xl p-3.5 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                            tx.type === 'deposit'
                              ? 'bg-emerald-500/20 text-[#14e071]'
                              : tx.type === 'bet_won'
                                ? 'bg-amber-500/20 text-amber-300'
                                : tx.type === 'bet_refund'
                                  ? 'bg-sky-500/20 text-sky-300'
                                  : tx.type === 'admin_credit'
                                    ? 'bg-teal-500/20 text-teal-300'
                                    : tx.type === 'withdrawal'
                                      ? 'bg-purple-500/20 text-purple-300'
                                      : tx.type === 'bet_placed'
                                        ? 'bg-white/[0.08] text-slate-300'
                                        : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {tx.type.replace('_', ' ')}
                        </span>
                        <span
                          className={`font-mono-numbers font-black text-sm ${
                            isPositive
                              ? 'text-[#14e071]'
                              : isNeutral
                                ? 'text-slate-400'
                                : 'text-rose-400'
                          }`}
                        >
                          {isPositive ? '+' : ''}
                          {tx.amount.toLocaleString()} coins
                        </span>
                      </div>

                      <div className="text-slate-100 font-medium">{tx.description}</div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-white/[0.06]">
                        <span className="font-mono-numbers">
                          Bal: {tx.balanceBefore.toLocaleString()} →{' '}
                          <strong className="text-white">{tx.balanceAfter.toLocaleString()}</strong>
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            tx.status === 'completed'
                              ? 'bg-emerald-500/15 text-[#14e071]'
                              : tx.status === 'pending' || tx.status === 'processing'
                                ? 'bg-amber-500/15 text-amber-300'
                                : 'bg-rose-500/15 text-rose-400'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 gap-2">
                        <span className="font-mono-numbers truncate max-w-[55%]">
                          Ref: {tx.referenceId || tx.id}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          {linkedWdr?.proofImageUrl && (
                            <button
                              type="button"
                              onClick={() => setViewingProofWithdrawal(linkedWdr)}
                              className="px-2 py-0.5 rounded bg-emerald-500/15 text-[#14e071] border border-[#14e071]/35 font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <ImageIcon className="w-3 h-3" />
                              Proof
                            </button>
                          )}
                          {(() => {
                            const linkedDep =
                              tx.type === 'deposit' && tx.referenceId ? depositById.get(tx.referenceId) : undefined;
                            return linkedDep?.proofImageUrl ? (
                              <button
                                type="button"
                                onClick={() => setViewingProofDeposit(linkedDep)}
                                className="px-2 py-0.5 rounded bg-emerald-500/15 text-[#14e071] border border-[#14e071]/35 font-semibold flex items-center gap-1 cursor-pointer"
                              >
                                <ImageIcon className="w-3 h-3" />
                                Proof
                              </button>
                            ) : null;
                          })()}
                          <span>
                            {new Date(tx.createdAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block apex-card rounded-2xl overflow-hidden shadow-md">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#070c10] text-slate-400 uppercase font-semibold border-b border-white/[0.08]">
                      <tr>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Description &amp; Ref</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Balance Flow</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06] text-slate-300">
                      {filteredTransactions.map(tx => {
                        const isPositive = tx.amount > 0;
                        const isNeutral = tx.amount === 0;
                        const linkedWdr =
                          tx.type === 'withdrawal' && tx.referenceId
                            ? withdrawalById.get(tx.referenceId)
                            : undefined;
                        return (
                          <tr key={tx.id} className="hover:bg-white/[0.03] transition">
                            <td className="px-4 py-3 font-semibold whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                                  tx.type === 'deposit'
                                    ? 'bg-emerald-500/20 text-[#14e071]'
                                    : tx.type === 'bet_won'
                                      ? 'bg-amber-500/20 text-amber-300'
                                      : tx.type === 'bet_refund'
                                        ? 'bg-sky-500/20 text-sky-300'
                                        : tx.type === 'admin_credit'
                                          ? 'bg-teal-500/20 text-teal-300'
                                          : tx.type === 'withdrawal'
                                            ? 'bg-purple-500/20 text-purple-300'
                                            : tx.type === 'bet_placed'
                                              ? 'bg-white/[0.08] text-slate-300'
                                              : 'bg-rose-500/20 text-rose-400'
                                }`}
                              >
                                {tx.type.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-3 max-w-sm">
                              <div className="text-slate-100 font-medium truncate" title={tx.description}>
                                {tx.description}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-slate-500 font-mono-numbers truncate">
                                  Ref: {tx.referenceId || tx.id}
                                </span>
                                {linkedWdr?.proofImageUrl && (
                                  <button
                                    type="button"
                                    onClick={() => setViewingProofWithdrawal(linkedWdr)}
                                    className="px-2 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-[#14e071] border border-[#14e071]/35 text-[10px] font-semibold flex items-center gap-1 shrink-0 cursor-pointer transition"
                                  >
                                    <ImageIcon className="w-3 h-3" />
                                    View Proof
                                  </button>
                                )}
                                {(() => {
                                  const linkedDep =
                                    tx.type === 'deposit' && tx.referenceId ? depositById.get(tx.referenceId) : undefined;
                                  return linkedDep?.proofImageUrl ? (
                                    <button
                                      type="button"
                                      onClick={() => setViewingProofDeposit(linkedDep)}
                                      className="px-2 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-[#14e071] border border-[#14e071]/35 text-[10px] font-semibold flex items-center gap-1 shrink-0 cursor-pointer transition"
                                    >
                                      <ImageIcon className="w-3 h-3" />
                                      View Proof
                                    </button>
                                  ) : null;
                                })()}
                              </div>
                            </td>
                            <td
                              className={`px-4 py-3 font-mono-numbers font-bold whitespace-nowrap ${
                                isPositive
                                  ? 'text-[#14e071]'
                                  : isNeutral
                                    ? 'text-slate-400'
                                    : 'text-rose-400'
                              }`}
                            >
                              {isPositive ? '+' : ''}
                              {tx.amount.toLocaleString()} coins
                            </td>
                            <td className="px-4 py-3 font-mono-numbers text-slate-400 whitespace-nowrap">
                              {tx.balanceBefore.toLocaleString()} →{' '}
                              <span className="text-slate-200 font-semibold">
                                {tx.balanceAfter.toLocaleString()}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  tx.status === 'completed'
                                    ? 'bg-emerald-500/15 text-[#14e071]'
                                    : tx.status === 'pending' || tx.status === 'processing'
                                      ? 'bg-amber-500/15 text-amber-300'
                                      : 'bg-rose-500/15 text-rose-400'
                                }`}
                              >
                                {tx.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-400 whitespace-nowrap font-mono-numbers text-[11px]">
                              {new Date(tx.createdAt).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab 2: Deposit Requests */}
      {activeTab === 'deposits' && (
        <div className="space-y-3">
          <input
            ref={existingDepFileInputRef}
            type="file"
            accept="image/*"
            onChange={handleExistingDepFileChange}
            className="hidden"
          />

          {depositListNotice && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                depositListNotice.type === 'ok'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              <span>{depositListNotice.text}</span>
              <button
                type="button"
                onClick={() => setDepositListNotice(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

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
                const isUploading = uploadingDepositId === dep.id;

                return (
                  <div
                    key={dep.id}
                    className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 text-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

                    {(dep.proofImageUrl || isPending) && (
                      <div className="pt-2.5 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {dep.proofImageUrl ? (
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setViewingProofDeposit(dep)}
                              className="relative group w-16 h-12 rounded-lg overflow-hidden border border-emerald-500/40 bg-slate-950 shrink-0 cursor-pointer"
                              title="View uploaded payment screenshot"
                            >
                              <img
                                src={dep.proofImageUrl}
                                alt="Deposit payment screenshot"
                                className="w-full h-full object-cover"
                              />
                              <span className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                <ZoomIn className="w-4 h-4 text-white" />
                              </span>
                            </button>
                            <div>
                              <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                                <ImageIcon className="w-3.5 h-3.5" />
                                Payment Screenshot Attached
                              </div>
                              <div className="text-[11px] text-slate-400">
                                Visible to admin for faster verification.
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                            <ImagePlus className="w-3.5 h-3.5 text-slate-500" />
                            <span>No payment screenshot attached yet.</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 shrink-0">
                          {dep.proofImageUrl && (
                            <button
                              type="button"
                              onClick={() => setViewingProofDeposit(dep)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-[#14e071] border border-[#14e071]/40 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition"
                            >
                              <ZoomIn className="w-3.5 h-3.5" />
                              View Screenshot
                            </button>
                          )}
                          {isPending && (
                            <button
                              type="button"
                              disabled={isUploading}
                              onClick={() => {
                                setTargetUploadDeposit(dep);
                                existingDepFileInputRef.current?.click();
                              }}
                              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              {isUploading
                                ? 'Uploading...'
                                : dep.proofImageUrl
                                  ? 'Update Screenshot'
                                  : 'Upload Screenshot'}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
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
                    className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 text-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

                    {wdr.proofImageUrl && (
                      <div className="pt-2.5 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setViewingProofWithdrawal(wdr)}
                            className="relative group w-16 h-12 rounded-lg overflow-hidden border border-emerald-500/40 bg-slate-950 shrink-0 cursor-pointer"
                            title="View payment screenshot uploaded by admin"
                          >
                            <img
                              src={wdr.proofImageUrl}
                              alt="Admin payout confirmation screenshot"
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                              <ZoomIn className="w-4 h-4 text-white" />
                            </span>
                          </button>
                          <div>
                            <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                              <ImageIcon className="w-3.5 h-3.5" />
                              Payment Screenshot Uploaded by Admin
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Click to inspect full payout confirmation receipt.
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setViewingProofWithdrawal(wdr)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-[#14e071] border border-[#14e071]/40 font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                          View Screenshot
                        </button>
                      </div>
                    )}
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
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-semibold block">
                      Coins Amount to Request:
                    </label>
                    <span className="text-[11px] font-semibold text-emerald-400">
                      Min {MIN_DEPOSIT_AMOUNT.toLocaleString()} coins
                    </span>
                  </div>
                  <input
                    type="number"
                    min={MIN_DEPOSIT_AMOUNT}
                    value={depAmount}
                    onChange={e => {
                      setDepAmount(Number(e.target.value));
                      setDepError('');
                    }}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-base font-bold font-mono text-white outline-none"
                  />
                  <div className="flex gap-2 pt-1">
                    {[1000, 2500, 5000, 10000].map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => {
                          setDepAmount(v);
                          setDepError('');
                        }}
                        className={`flex-1 py-1 rounded-lg text-[11px] font-mono transition cursor-pointer ${
                          depAmount === v
                            ? 'bg-emerald-600/30 border border-emerald-500/60 text-emerald-300 font-bold'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        {v.toLocaleString()}
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

                {/* Payment Screenshot Upload (Optional) */}
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold block">
                    Payment Screenshot (Optional):
                  </label>
                  <input
                    ref={depFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleDepFileChange}
                    className="hidden"
                  />
                  {depProofImage ? (
                    <div className="space-y-2">
                      <div className="relative rounded-xl overflow-hidden border border-emerald-500/35 bg-slate-950 max-h-44 flex items-center justify-center">
                        <img
                          src={depProofImage}
                          alt="Deposit payment screenshot preview"
                          className="max-h-44 w-auto object-contain"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={depProofProcessing}
                          onClick={() => depFileInputRef.current?.click()}
                          className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          {depProofProcessing ? 'Processing...' : 'Change Screenshot'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDepProofImage(null)}
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 font-semibold transition cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={depProofProcessing}
                      onClick={() => depFileInputRef.current?.click()}
                      className="w-full py-4 px-4 rounded-xl border-2 border-dashed border-slate-700 hover:border-emerald-500/60 bg-slate-950/70 hover:bg-slate-950 text-slate-300 flex flex-col items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <ImagePlus className="w-5 h-5 text-emerald-400" />
                      <span className="font-semibold">
                        {depProofProcessing ? 'Compressing screenshot...' : 'Click to upload payment screenshot'}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        JPG, PNG, or WebP · Helps admin verify your payment faster
                      </span>
                    </button>
                  )}
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
                      setDepProofImage(null);
                      onClearInitialModal?.();
                    }}
                    className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={depProofProcessing}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold uppercase tracking-wider shadow-lg shadow-emerald-950/40"
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

      {/* PAYOUT SCREENSHOT LIGHTBOX MODAL */}
      {viewingProofWithdrawal && viewingProofWithdrawal.proofImageUrl && (
        <div
          onClick={() => setViewingProofWithdrawal(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-xl bg-[#0a1116] border border-[#14e071]/35 rounded-2xl overflow-hidden shadow-2xl text-xs"
          >
            <div className="px-4 py-3 border-b border-white/[0.08] bg-[#070c10] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-bold text-sm text-white flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-[#14e071] shrink-0" />
                  <span className="truncate">Withdrawal Payout Confirmation</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono-numbers truncate">
                  {viewingProofWithdrawal.amount.toLocaleString()} Coins · {viewingProofWithdrawal.payoutMethod} ({viewingProofWithdrawal.payoutDetails})
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingProofWithdrawal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-black flex items-center justify-center max-h-[68vh]">
              <img
                src={viewingProofWithdrawal.proofImageUrl}
                alt="Admin payout confirmation screenshot"
                className="max-h-[62vh] w-auto object-contain rounded-lg"
              />
            </div>

            <div className="px-4 py-3 border-t border-white/[0.08] bg-[#070c10] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-[11px] text-slate-400">
                {viewingProofWithdrawal.adminRemark && (
                  <div className="text-amber-300 font-medium">
                    Note: {viewingProofWithdrawal.adminRemark}
                  </div>
                )}
                <div>
                  Uploaded:{' '}
                  {new Date(viewingProofWithdrawal.reviewedAt || viewingProofWithdrawal.createdAt).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
              <a
                href={viewingProofWithdrawal.proofImageUrl}
                download={`withdrawal-proof-${viewingProofWithdrawal.id}.jpg`}
                className="px-3.5 py-2 rounded-xl apex-glow-btn font-bold text-xs flex items-center justify-center gap-1.5 shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                Download Receipt
              </a>
            </div>
          </div>
        </div>
      )}

      {/* DEPOSIT SCREENSHOT LIGHTBOX MODAL */}
      {viewingProofDeposit && viewingProofDeposit.proofImageUrl && (
        <div
          onClick={() => setViewingProofDeposit(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-xl bg-[#0a1116] border border-[#14e071]/35 rounded-2xl overflow-hidden shadow-2xl text-xs"
          >
            <div className="px-4 py-3 border-b border-white/[0.08] bg-[#070c10] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-bold text-sm text-white flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-[#14e071] shrink-0" />
                  <span className="truncate">Deposit Payment Screenshot</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono-numbers truncate">
                  {viewingProofDeposit.amount.toLocaleString()} Coins · {viewingProofDeposit.paymentMethod} (Ref: {viewingProofDeposit.referenceNumber})
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingProofDeposit(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-black flex items-center justify-center max-h-[68vh]">
              <img
                src={viewingProofDeposit.proofImageUrl}
                alt="Deposit payment screenshot"
                className="max-h-[62vh] w-auto object-contain rounded-lg"
              />
            </div>

            <div className="px-4 py-3 border-t border-white/[0.08] bg-[#070c10] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-[11px] text-slate-400">
                {viewingProofDeposit.adminRemark && (
                  <div className="text-amber-300 font-medium">
                    Remark: {viewingProofDeposit.adminRemark}
                  </div>
                )}
                <div>
                  Submitted:{' '}
                  {new Date(viewingProofDeposit.createdAt).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
              <a
                href={viewingProofDeposit.proofImageUrl}
                download={`deposit-proof-${viewingProofDeposit.id}.jpg`}
                className="px-3.5 py-2 rounded-xl apex-glow-btn font-bold text-xs flex items-center justify-center gap-1.5 shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                Download Screenshot
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
