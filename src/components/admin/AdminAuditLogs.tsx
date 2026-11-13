import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { History, Search, Filter, ShieldCheck, Coins, Trophy, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

export const AdminAuditLogs: React.FC = () => {
  const { coinLogs, transactions, predictions, bets } = useApp();

  const [filterType, setFilterType] = useState<'all' | 'coin_adjust' | 'settlement' | 'deposit_withdraw'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Combined audit events
  const auditItems = [
    ...coinLogs.map(c => ({
      id: c.id,
      category: 'coin_adjust' as const,
      title: `Admin Coin ${c.type.toUpperCase()}: ${c.amount} 🪙 to @${c.username}`,
      details: `Reason: ${c.reason} (Previous: ${c.previousBalance} → New: ${c.newBalance})`,
      actor: c.adminUsername,
      timestamp: c.createdAt,
      typeBadge: 'COIN OVERRIDE',
      badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    })),
    ...predictions.filter(p => p.status === 'settled').map(p => ({
      id: `stl_${p.id}`,
      category: 'settlement' as const,
      title: `Market Settled: "${p.title}"`,
      details: `Official Outcome: ${p.outcome} WON | Category: ${p.category}`,
      actor: p.settledBy || 'admin',
      timestamp: p.settledAt || p.createdAt,
      typeBadge: 'SETTLEMENT',
      badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    })),
    ...transactions.filter(t => t.type === 'deposit' || t.type === 'withdrawal').map(t => ({
      id: t.id,
      category: 'deposit_withdraw' as const,
      title: `${t.type === 'deposit' ? 'Deposit Approved' : 'Withdrawal Request'}: ${Math.abs(t.amount)} 🪙 for @${t.username}`,
      details: t.description,
      actor: t.username,
      timestamp: t.createdAt,
      typeBadge: t.type.toUpperCase(),
      badgeColor: t.type === 'deposit' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-purple-400 bg-purple-500/10 border-purple-500/20'
    }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const filteredItems = auditItems.filter(item => {
    if (filterType !== 'all' && item.category !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.details.toLowerCase().includes(q) ||
        item.actor.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span>System Audit Log & Traceability</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold">
            {auditItems.length} Events Logged
          </span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Immutable chronologically sequenced ledger of administrative interventions, settlements, and funds routing.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search audit trail..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
          {(['all', 'coin_adjust', 'settlement', 'deposit_withdraw'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterType(f)}
              className={`px-3 py-1 rounded-lg capitalize transition ${
                filterType === f ? 'bg-slate-800 text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="divide-y divide-slate-800/80">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No audit records matching query.
            </div>
          ) : (
            filteredItems.map(item => (
              <div key={item.id} className="p-4 hover:bg-slate-800/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${item.badgeColor}`}>
                      {item.typeBadge}
                    </span>
                    <span className="font-bold text-white text-sm">{item.title}</span>
                  </div>
                  <div className="text-slate-400 text-xs">{item.details}</div>
                  <div className="text-slate-500 text-[10px] flex items-center gap-2">
                    <span>Authorized By: <strong className="text-slate-400">{item.actor}</strong></span>
                    <span>•</span>
                    <span className="font-mono">{item.id}</span>
                  </div>
                </div>

                <div className="text-slate-500 text-[11px] font-mono sm:text-right shrink-0">
                  {new Date(item.timestamp).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
