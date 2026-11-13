import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Coins, 
  PlusCircle, 
  MinusCircle, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  History, 
  Search,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface AdminCoinManagementProps {
  preselectedUserId?: string;
  onClearPreselected?: () => void;
}

export const AdminCoinManagement: React.FC<AdminCoinManagementProps> = ({
  preselectedUserId,
  onClearPreselected
}) => {
  const { users, coinLogs, adjustUserCoins } = useApp();

  const regularUsers = users.filter(u => u.id !== 'usr_admin');

  // Form State
  const [selectedUserId, setSelectedUserId] = useState<string>(
    preselectedUserId || (regularUsers[0]?.id || '')
  );

  useEffect(() => {
    if (preselectedUserId) {
      setSelectedUserId(preselectedUserId);
    }
  }, [preselectedUserId]);
  const [adjustType, setAdjustType] = useState<'credit' | 'debit' | 'set'>('credit');
  const [amount, setAmount] = useState<number>(500);
  const [reason, setReason] = useState<string>('Promotional bonus credited by admin');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Table Filter
  const [logSearch, setLogSearch] = useState('');

  const selectedUser = regularUsers.find(u => u.id === selectedUserId);
  const prevBalance = selectedUser ? selectedUser.coins : 0;

  let newBalance = prevBalance;
  if (adjustType === 'credit') {
    newBalance = prevBalance + (amount || 0);
  } else if (adjustType === 'debit') {
    newBalance = Math.max(0, prevBalance - (amount || 0));
  } else if (adjustType === 'set') {
    newBalance = amount || 0;
  }

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedUserId) {
      setErrorMsg('Please select a target user');
      return;
    }
    if (amount <= 0 && adjustType !== 'set') {
      setErrorMsg('Amount must be greater than zero');
      return;
    }
    if (!reason.trim()) {
      setErrorMsg('A specific reason is required for the immutable audit log');
      return;
    }

    const res = await adjustUserCoins(selectedUserId, adjustType, amount, reason);
    if (res.success) {
      setSuccessMsg(
        `Successfully adjusted @${selectedUser?.username}'s wallet! Balance changed from ${prevBalance} to ${newBalance} coins.`
      );
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setErrorMsg(res.error || 'Failed to adjust coins');
    }
  };

  const filteredLogs = coinLogs.filter(log => {
    if (!logSearch.trim()) return true;
    const q = logSearch.toLowerCase();
    return (
      log.username.toLowerCase().includes(q) ||
      log.reason.toLowerCase().includes(q) ||
      log.adminUsername.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span>Coin Management</span>
          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
            Immutable Audit Ledger
          </span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Manually credit, debit, or set player coin balances. Every adjustment requires a recorded justification.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Direct Coin Adjuster Tool */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-400" />
              Adjust Player Balance
            </h3>
            <span className="text-[10px] text-slate-500 uppercase font-bold">Direct Override</span>
          </div>

          <form onSubmit={handleAdjustSubmit} className="space-y-4 text-xs">
            {/* User Select */}
            <div className="space-y-1">
              <label className="text-slate-300 font-semibold block">Select Player:</label>
              <select
                value={selectedUserId}
                onChange={e => {
                  setSelectedUserId(e.target.value);
                  setErrorMsg('');
                }}
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-white outline-none"
              >
                {regularUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    @{u.username} ({u.fullName}) — Current: {u.coins} 🪙
                  </option>
                ))}
              </select>
            </div>

            {/* Action Type */}
            <div className="space-y-1">
              <label className="text-slate-300 font-semibold block">Action Type:</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustType('credit')}
                  className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1 transition ${
                    adjustType === 'credit'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Credit (+)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('debit')}
                  className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1 transition ${
                    adjustType === 'debit'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  <MinusCircle className="w-3.5 h-3.5" />
                  <span>Debit (-)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('set')}
                  className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1 transition ${
                    adjustType === 'set'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Set Fixed</span>
                </button>
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-1">
              <label className="text-slate-300 font-semibold block">Coins Amount:</label>
              <input
                type="number"
                min="1"
                step="50"
                value={amount}
                onChange={e => setAmount(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-base font-bold font-mono text-white outline-none"
              />
              <div className="flex gap-1.5 pt-1">
                {[100, 500, 1000, 5000].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setAmount(v)}
                    className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px]"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Balance Change Preview */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>Previous Balance:</span>
                <span className="font-mono font-semibold text-slate-300">{prevBalance.toLocaleString()} 🪙</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Adjustment:</span>
                <span className={`font-mono font-bold ${
                  adjustType === 'credit' ? 'text-emerald-400' :
                  adjustType === 'debit' ? 'text-rose-400' : 'text-blue-400'
                }`}>
                  {adjustType === 'credit' ? `+${amount}` : adjustType === 'debit' ? `-${amount}` : `= ${amount}`}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1.5 border-t border-slate-800">
                <span className="font-bold text-white">Updated Balance:</span>
                <span className="font-mono font-black text-amber-400 text-sm">
                  {newBalance.toLocaleString()} 🪙
                </span>
              </div>
            </div>

            {/* Mandatory Reason */}
            <div className="space-y-1">
              <label className="text-slate-300 font-semibold block">
                Audit Reason (Mandatory) *
              </label>
              <input
                type="text"
                required
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. VIP promo reward, manual UPI payment match"
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-white outline-none"
              />
              <div className="flex flex-wrap gap-1 pt-1">
                {['VIP Promotional Bonus', 'Manual Deposit Verification', 'Account Settlement Correction', 'Tournament Prize'].map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    className="text-[10px] bg-slate-800/80 hover:bg-slate-800 text-slate-400 px-2 py-0.5 rounded transition"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold uppercase tracking-wider transition shadow-lg shadow-amber-950/40"
            >
              Apply Balance Adjustment
            </button>
          </form>
        </div>

        {/* Right 2 Columns: Immutable Coin Adjustment Audit Ledger */}
        <div className="lg:col-span-2 bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <History className="w-4 h-4 text-cyan-400" />
                Immutable Coin Adjustment Audit Log
              </h3>
              <p className="text-[11px] text-slate-400">
                Permanent records of every balance modification executed by system administrators.
              </p>
            </div>

            {/* Filter */}
            <div className="relative w-full sm:w-56">
              <Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={logSearch}
                onChange={e => setLogSearch(e.target.value)}
                placeholder="Search user or reason..."
                className="w-full pl-7 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-3 py-2.5">User</th>
                  <th className="px-3 py-2.5">Action</th>
                  <th className="px-3 py-2.5">Balance Transition</th>
                  <th className="px-3 py-2.5">Audit Reason</th>
                  <th className="px-3 py-2.5">Admin</th>
                  <th className="px-3 py-2.5">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                      No coin adjustment logs found.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-3 py-2.5 font-bold text-white whitespace-nowrap">
                        @{log.username}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          log.type === 'credit' ? 'bg-emerald-500/20 text-emerald-400' :
                          log.type === 'debit' ? 'bg-rose-500/20 text-rose-400' : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {log.type} ({log.type === 'credit' ? '+' : log.type === 'debit' ? '-' : '='}{log.amount})
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono whitespace-nowrap text-slate-400">
                        {log.previousBalance} → <strong className="text-white">{log.newBalance} 🪙</strong>
                      </td>
                      <td className="px-3 py-2.5 max-w-xs truncate text-slate-300" title={log.reason}>
                        {log.reason}
                      </td>
                      <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">
                        {log.adminUsername}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
