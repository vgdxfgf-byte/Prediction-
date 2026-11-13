import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { User, Bet, Transaction } from '../../types';
import { 
  Users, 
  UserPlus, 
  Search, 
  KeyRound, 
  UserCheck, 
  UserX, 
  Trash2, 
  Edit3, 
  Eye, 
  Coins, 
  Check, 
  Copy, 
  AlertTriangle, 
  Sparkles,
  X,
  History,
  Trophy,
  RotateCcw,
  Plus,
  Landmark
} from 'lucide-react';
import { PaymentGatewayEditor } from './PaymentGatewayEditor';

interface AdminUserManagementProps {
  initialCreateOpen?: boolean;
  onClearInitialCreate?: () => void;
  onAdjustCoinsForUser?: (userId: string) => void;
}

export const AdminUserManagement: React.FC<AdminUserManagementProps> = ({
  initialCreateOpen,
  onClearInitialCreate,
  onAdjustCoinsForUser
}) => {
  const { 
    users, 
    createUser, 
    updateUser, 
    toggleUserStatus, 
    resetUserPassword, 
    deleteUser,
    adjustUserCoins,
    bets,
    transactions,
    updateUserPaymentGateway,
    getEffectivePaymentGateway
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState<boolean>(!!initialCreateOpen);
  const [inspectUser, setInspectUser] = useState<User | null>(null);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [resetPassUser, setResetPassUser] = useState<User | null>(null);
  const [deleteTargetUser, setDeleteTargetUser] = useState<User | null>(null);
  const [coinManageUser, setCoinManageUser] = useState<User | null>(null);
  const [gatewayManageUser, setGatewayManageUser] = useState<User | null>(null);
  const [userNotice, setUserNotice] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{ username: string; pass: string; name: string } | null>(null);

  // In-modal Coin Management State
  const [modalCoinType, setModalCoinType] = useState<'credit' | 'debit' | 'set'>('credit');
  const [modalCoinAmount, setModalCoinAmount] = useState<number>(500);
  const [modalCoinReason, setModalCoinReason] = useState<string>('Administrative manual adjustment');
  const [modalCoinError, setModalCoinError] = useState<string>('');

  // Create Form State
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newInitialCoins, setNewInitialCoins] = useState<number>(0);
  const [newNotes, setNewNotes] = useState('');
  const [createError, setCreateError] = useState('');

  // Password reset state
  const [newResetPassword, setNewResetPassword] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const regularUsers = users.filter(u => u.id !== 'usr_admin');

  // Filter users
  const filteredUsers = regularUsers.filter(u => {
    if (statusFilter !== 'all' && u.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchU = u.username.toLowerCase().includes(q);
      const matchN = u.fullName.toLowerCase().includes(q);
      const matchId = u.id.toLowerCase().includes(q);
      if (!matchU && !matchN && !matchId) return false;
    }
    return true;
  });

  const generatePassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let suffix = '';
    for (let i = 0; i < 6; i++) {
      suffix += chars[Math.floor(Math.random() * chars.length)];
    }
    return `pass_${suffix}`;
  };

  const generateRandomCredentials = () => {
    const randomAdjectives = ['rapid', 'alpha', 'apex', 'prime', 'golden', 'hyper', 'crypto', 'sports'];
    const randomNouns = ['trader', 'sniper', 'bettor', 'pro', 'hawk', 'eagle', 'king', 'player'];
    const randAdj = randomAdjectives[Math.floor(Math.random() * randomAdjectives.length)];
    const randNoun = randomNouns[Math.floor(Math.random() * randomNouns.length)];
    const randNum = Math.floor(100 + Math.random() * 900);
    const genUser = `${randAdj}_${randNoun}${randNum}`;
    const genPass = generatePassword();

    setNewUsername(genUser);
    setNewPassword(genPass);
    if (!newFullName) {
      setNewFullName(`${randAdj.toUpperCase()} ${randNoun.toUpperCase()}`);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    const trimmedPassword = newPassword.trim();
    const res = await createUser({
      username: newUsername,
      password: trimmedPassword,
      fullName: newFullName,
      email: newEmail,
      phone: newPhone,
      initialCoins: newInitialCoins,
      notes: newNotes
    });

    if (res.success && res.user) {
      setCreatedCredentials({
        username: res.user.username,
        pass: trimmedPassword,
        name: res.user.fullName
      });

      // Reset form
      setNewUsername('');
      setNewPassword('');
      setNewFullName('');
      setNewEmail('');
      setNewPhone('');
      setNewInitialCoins(0);
      setNewNotes('');
      setShowCreateModal(false);
      onClearInitialCreate?.();
    } else {
      setCreateError(res.error || 'Failed to create user account');
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header and Create Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>User Account Management</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold">
              {regularUsers.length} Users
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manually provision player credentials, manage permissions, and audit user histories.
          </p>
        </div>

        <button
          onClick={() => {
            setShowCreateModal(true);
            generateRandomCredentials();
          }}
          className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 transition cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          Create New User Account
        </button>
      </div>

      {/* User Action Notice Banner */}
      {userNotice && (
        <div className="p-3.5 bg-emerald-950/70 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{userNotice}</span>
          </div>
          <button
            onClick={() => setUserNotice(null)}
            className="text-slate-400 hover:text-white p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Share Newly Created Credentials Banner if present */}
      {createdCredentials && (
        <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 text-xs space-y-3 shadow-xl animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Account Created Successfully! Share Credentials With Player:</span>
            </div>
            <button
              onClick={() => setCreatedCredentials(null)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-slate-300 font-medium">Player: <strong className="text-white">{createdCredentials.name}</strong></div>
              <div className="font-mono text-emerald-300">
                Username: <strong className="text-white">{createdCredentials.username}</strong> | Password: <strong className="text-amber-300">{createdCredentials.pass}</strong>
              </div>
            </div>

            <button
              onClick={() => handleCopy(`ApexPredict Login Credentials:\nUsername: ${createdCredentials.username}\nPassword: ${createdCredentials.pass}\nURL: ${window.location.origin}`, 'created_creds')}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-1.5 shadow"
            >
              {copiedKey === 'created_creds' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedKey === 'created_creds' ? 'Copied to Clipboard' : 'Copy Credentials Message'}
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search username, name, or ID..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Status filters */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
          {(['all', 'active', 'suspended'] as const).map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg capitalize transition ${
                statusFilter === st
                  ? 'bg-slate-800 text-amber-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3.5">User</th>
                <th className="px-4 py-3.5">Wallet Balance</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Registered</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => {
                  const isActive = u.status === 'active';
                  const userBetsCount = bets.filter(b => b.userId === u.id).length;

                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-amber-400 border border-slate-700">
                            {u.username.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-white text-xs flex items-center gap-1.5">
                              <span>{u.fullName}</span>
                              {u.customPaymentGateway && u.customPaymentGateway.channels.length > 0 && (
                                <span className="px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-[9px] font-bold">
                                  Custom Gateway
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400">@{u.username} • <span className="font-mono text-slate-500">{u.id}</span></div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setCoinManageUser(u);
                              setModalCoinAmount(500);
                              setModalCoinReason('Administrative manual adjustment');
                              setModalCoinError('');
                            }}
                            title="Click to manage coins for this user"
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 transition cursor-pointer group"
                          >
                            <Coins className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition" />
                            <span className="font-mono font-bold text-emerald-400 text-sm">
                              {u.coins.toLocaleString()} 🪙
                            </span>
                            <span className="text-[10px] text-amber-400 font-semibold bg-amber-500/10 px-1 rounded">
                              Manage
                            </span>
                          </button>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {u.status.toUpperCase()}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-slate-400 whitespace-nowrap">
                        {new Date(u.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Manage Coins Directly */}
                          <button
                            onClick={() => {
                              setCoinManageUser(u);
                              setModalCoinAmount(500);
                              setModalCoinReason('Administrative manual adjustment');
                              setModalCoinError('');
                            }}
                            title="Manage Player Coins"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-950/60 text-amber-400 hover:text-amber-300 border border-transparent hover:border-amber-500/40 transition cursor-pointer"
                          >
                            <Coins className="w-3.5 h-3.5" />
                          </button>

                          {/* Update Payment Gateway for User */}
                          <button
                            onClick={() => setGatewayManageUser(u)}
                            title="Update Official Admin Payment Gateway"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-950/60 text-cyan-400 hover:text-cyan-300 border border-transparent hover:border-cyan-500/40 transition cursor-pointer"
                          >
                            <Landmark className="w-3.5 h-3.5" />
                          </button>

                          {/* Inspect Full Profile */}
                          <button
                            onClick={() => setInspectUser(u)}
                            title="View Full Profile, Predictions, & Ledger"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Reset Password */}
                          <button
                            onClick={() => {
                              setResetPassUser(u);
                              setNewResetPassword(generatePassword());
                            }}
                            title="Reset Password"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 transition"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Active / Suspended */}
                          <button
                            onClick={() => toggleUserStatus(u.id)}
                            title={isActive ? 'Suspend User Account' : 'Activate User Account'}
                            className={`p-1.5 rounded-lg transition ${
                              isActive
                                ? 'bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-400'
                                : 'bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/50'
                            }`}
                          >
                            {isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          </button>

                          {/* Delete Account (Safety Confirmation Modal) */}
                          <button
                            onClick={() => setDeleteTargetUser(u)}
                            title="Delete User Account"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 border border-transparent hover:border-rose-500/40 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-400" />
                Create New User Account
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  onClearInitialCreate?.();
                }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 text-xs">
              <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400">Need inspiration?</span>
                <button
                  type="button"
                  onClick={generateRandomCredentials}
                  className="px-2.5 py-1 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 font-semibold rounded-lg flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Generate Unique Username & Password
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">Username *</label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                    placeholder="e.g. jordan_pro"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-white font-mono outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">Password *</label>
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="e.g. secure123"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-white font-mono outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Full Name</label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={e => setNewFullName(e.target.value)}
                  placeholder="e.g. Jordan Smith"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 block">Email Address (Optional)</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="player@example.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 block">Phone (Optional)</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    placeholder="+1 555-0100"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-slate-300 font-semibold block">Initial Coins Allocation</label>
                  <span className="text-[10px] text-slate-500">Starts with 0 by default</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={newInitialCoins}
                  onChange={e => setNewInitialCoins(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-white font-mono outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block">Admin Notes / Remarks</label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  placeholder="e.g. VIP player onboarded via WhatsApp agent"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>

              {createError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    onClearInitialCreate?.();
                  }}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold uppercase tracking-wider shadow-lg shadow-amber-950/40"
                >
                  Save & Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* USER PROFILE & COMPLETE HISTORY INSPECTOR MODAL */}
      {inspectUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400">
                  {inspectUser.username.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">{inspectUser.fullName}</h3>
                  <div className="text-xs text-slate-400">@{inspectUser.username} • {inspectUser.id}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setCoinManageUser(inspectUser);
                    setModalCoinAmount(500);
                    setModalCoinReason('Administrative manual adjustment');
                    setModalCoinError('');
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1 text-[11px] transition cursor-pointer"
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>Manage Coins</span>
                </button>

                <button
                  onClick={() => setGatewayManageUser(inspectUser)}
                  className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold flex items-center gap-1 text-[11px] transition cursor-pointer"
                >
                  <Landmark className="w-3.5 h-3.5" />
                  <span>Payment Gateway</span>
                </button>

                <button
                  onClick={() => setDeleteTargetUser(inspectUser)}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold flex items-center gap-1 text-[11px] transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete User</span>
                </button>

                <button
                  onClick={() => setInspectUser(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg ml-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-6 text-xs">
              {/* Profile Details & Wallet Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Wallet Coins</span>
                  <span className="font-mono text-base font-bold text-emerald-400 mt-0.5 block">
                    🪙 {inspectUser.coins.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Status</span>
                  <span className={`inline-block mt-1 font-bold text-[10px] px-2 py-0.5 rounded-full ${
                    inspectUser.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                  }`}>
                    {inspectUser.status.toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Contact</span>
                  <span className="text-slate-300 mt-0.5 block truncate">
                    {inspectUser.email || inspectUser.phone || 'None registered'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Created</span>
                  <span className="text-slate-400 mt-0.5 block">
                    {new Date(inspectUser.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Complete Prediction History for this User */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-200 text-sm flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-emerald-400" />
                  User's Complete Prediction History
                </h4>

                {bets.filter(b => b.userId === inspectUser.id).length === 0 ? (
                  <div className="py-4 text-center text-slate-500 bg-slate-950 rounded-xl border border-slate-800">
                    No predictions placed yet by this user.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {bets.filter(b => b.userId === inspectUser.id).map(bet => (
                      <div
                        key={bet.id}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="font-medium text-slate-200 truncate max-w-sm">
                            {bet.predictionTitle}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2">
                            <span className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                              bet.choice === 'YES' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                            }`}>
                              {bet.choice} @ {bet.odds}x
                            </span>
                            <span>Stake: {bet.amount} 🪙</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            bet.result === 'won' ? 'bg-emerald-500/10 text-emerald-400' :
                            bet.result === 'lost' ? 'bg-rose-500/10 text-rose-400' : 'bg-blue-500/10 text-blue-400'
                          }`}>
                            {bet.result.toUpperCase()}
                          </span>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {bet.result === 'won' ? `+${bet.actualWinnings} 🪙` : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Complete Transaction History for this User */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-200 text-sm flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-amber-400" />
                  User's Coin Transaction Ledger
                </h4>

                {transactions.filter(t => t.userId === inspectUser.id).length === 0 ? (
                  <div className="py-4 text-center text-slate-500 bg-slate-950 rounded-xl border border-slate-800">
                    No transactions on ledger for this user.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {transactions.filter(t => t.userId === inspectUser.id).map(tx => (
                      <div
                        key={tx.id}
                        className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="truncate max-w-md">
                          <span className="font-medium text-slate-200">{tx.description}</span>
                          <div className="text-[10px] text-slate-500">
                            {new Date(tx.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <div className={`font-mono font-bold shrink-0 ${tx.amount >= 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                          {tx.amount >= 0 ? '+' : ''}{tx.amount} 🪙
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {resetPassUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-white flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-amber-400" />
                Reset Password for @{resetPassUser.username}
              </h3>
              <button onClick={() => setResetPassUser(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-2">
              <label className="text-slate-300 font-semibold block">New Password:</label>
              <input
                type="text"
                value={newResetPassword}
                onChange={e => setNewResetPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setResetPassUser(null)}
                className="w-1/3 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const res = await resetUserPassword(resetPassUser.id, newResetPassword);
                  if (res.success) {
                    setUserNotice(`Password updated for @${resetPassUser.username} to "${newResetPassword}". Please share with the user.`);
                    setTimeout(() => setUserNotice(null), 6000);
                  } else {
                    setUserNotice(res.error || 'Failed to update password');
                    setTimeout(() => setUserNotice(null), 5000);
                  }
                  setResetPassUser(null);
                }}
                className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold uppercase tracking-wider"
              >
                Save New Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE USER CONFIRMATION MODAL */}
      {deleteTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-xs">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/90">
              <div className="flex items-center gap-2 text-rose-400">
                <Trash2 className="w-5 h-5" />
                <h3 className="font-bold text-base text-white">Delete User Account</h3>
              </div>
              <button 
                onClick={() => setDeleteTargetUser(null)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Target Account:</span>
                  <span className="font-bold text-white text-sm">@{deleteTargetUser.username}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Full Name:</span>
                  <span className="text-slate-200">{deleteTargetUser.fullName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Current Wallet Balance:</span>
                  <span className="font-mono font-bold text-amber-400">🪙 {deleteTargetUser.coins.toLocaleString()} Coins</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Registered Predictions:</span>
                  <span className="font-mono text-slate-300">{bets.filter(b => b.userId === deleteTargetUser.id).length} slips</span>
                </div>
              </div>

              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-1 text-rose-300">
                <div className="font-bold flex items-center gap-1.5 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>Permanent Account Deletion</span>
                </div>
                <p className="text-[11px] text-rose-200/90 leading-relaxed">
                  This action is permanent and cannot be undone. Any active prediction slips for this user will be voided and their account credentials permanently removed.
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDeleteTargetUser(null)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const res = await deleteUser(deleteTargetUser.id);
                    if (res.success) {
                      setUserNotice(`Account for @${deleteTargetUser.username} (${deleteTargetUser.fullName}) has been permanently deleted.`);
                      setTimeout(() => setUserNotice(null), 5000);
                      if (inspectUser?.id === deleteTargetUser.id) {
                        setInspectUser(null);
                      }
                    } else {
                      setUserNotice(res.error || 'Failed to delete user');
                      setTimeout(() => setUserNotice(null), 5000);
                    }
                    setDeleteTargetUser(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold uppercase tracking-wider shadow-lg shadow-rose-950/40 transition cursor-pointer"
                >
                  Confirm Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DIRECT COIN MANAGEMENT MODAL */}
      {coinManageUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-xs">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/90">
              <div className="flex items-center gap-2 text-amber-400">
                <Coins className="w-5 h-5" />
                <h3 className="font-bold text-base text-white">Manage Coins: @{coinManageUser.username}</h3>
              </div>
              <button 
                onClick={() => setCoinManageUser(null)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setModalCoinError('');
                if (modalCoinAmount <= 0 && modalCoinType !== 'set') {
                  setModalCoinError('Amount must be greater than zero');
                  return;
                }
                if (!modalCoinReason.trim()) {
                  setModalCoinError('A reason is mandatory for the immutable audit log');
                  return;
                }

                const res = await adjustUserCoins(coinManageUser.id, modalCoinType, modalCoinAmount, modalCoinReason);
                if (res.success) {
                  setUserNotice(
                    `Updated @${coinManageUser.username}'s coin balance via ${modalCoinType.toUpperCase()} of ${modalCoinAmount} coins.`
                  );
                  setTimeout(() => setUserNotice(null), 5000);
                  
                  // If inspect modal is open, refresh balance
                  if (inspectUser && inspectUser.id === coinManageUser.id) {
                    const newBal = modalCoinType === 'credit'
                      ? coinManageUser.coins + modalCoinAmount
                      : modalCoinType === 'debit'
                      ? Math.max(0, coinManageUser.coins - modalCoinAmount)
                      : modalCoinAmount;
                    setInspectUser({ ...inspectUser, coins: newBal });
                  }
                  setCoinManageUser(null);
                } else {
                  setModalCoinError(res.error || 'Failed to adjust coins');
                }
              }}
              className="p-5 space-y-4"
            >
              {/* Target User Info Card */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white text-sm">{coinManageUser.fullName}</div>
                  <div className="text-slate-400 text-[11px]">@{coinManageUser.username} • {coinManageUser.id}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Current Balance</div>
                  <div className="font-mono font-black text-emerald-400 text-base">
                    🪙 {coinManageUser.coins.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Adjustment Mode Selector */}
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Adjustment Action:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setModalCoinType('credit')}
                    className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                      modalCoinType === 'credit'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Credit (+)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalCoinType('debit')}
                    className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                      modalCoinType === 'debit'
                        ? 'bg-rose-600 text-white shadow-md'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    <span>Debit (-)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalCoinType('set')}
                    className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                      modalCoinType === 'set'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Set Exact</span>
                  </button>
                </div>
              </div>

              {/* Amount input */}
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Coins Amount:</label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={modalCoinAmount}
                  onChange={e => setModalCoinAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-base font-bold font-mono text-white outline-none"
                />
                <div className="flex gap-1.5 pt-1">
                  {[100, 500, 1000, 5000].map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setModalCoinAmount(v)}
                      className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px] cursor-pointer"
                    >
                      +{v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Preview */}
              {(() => {
                const prev = coinManageUser.coins;
                let next = prev;
                if (modalCoinType === 'credit') next = prev + (modalCoinAmount || 0);
                else if (modalCoinType === 'debit') next = Math.max(0, prev - (modalCoinAmount || 0));
                else if (modalCoinType === 'set') next = modalCoinAmount || 0;

                return (
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Previous Balance:</span>
                      <span className="font-mono text-slate-300">{prev.toLocaleString()} 🪙</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                      <span className="font-bold text-white">Updated Balance Result:</span>
                      <span className="font-mono font-black text-amber-400 text-sm">
                        {next.toLocaleString()} 🪙
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Mandatory Reason */}
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Adjustment Reason (Audit Log) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VIP promo reward, manual UPI payment match"
                  value={modalCoinReason}
                  onChange={e => setModalCoinReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-white outline-none"
                />
                <div className="flex flex-wrap gap-1 pt-1">
                  {['Promotional Bonus', 'Manual Deposit Grant', 'Dispute Settlement', 'Correction'].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setModalCoinReason(preset)}
                      className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-400 px-2 py-0.5 rounded transition cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {modalCoinError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{modalCoinError}</span>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setCoinManageUser(null)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold uppercase tracking-wider shadow-lg shadow-amber-950/40 transition cursor-pointer"
                >
                  Apply Balance Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PER-USER PAYMENT GATEWAY MODAL */}
      {gatewayManageUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/90 shrink-0">
              <div className="flex items-center gap-2 text-cyan-400">
                <Landmark className="w-5 h-5" />
                <h3 className="font-bold text-base text-white">
                  Official Admin Payment Gateway: @{gatewayManageUser.username}
                </h3>
              </div>
              <button
                onClick={() => setGatewayManageUser(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto">
              {(() => {
                const liveUser = users.find(u => u.id === gatewayManageUser.id) || gatewayManageUser;
                const effective = getEffectivePaymentGateway(liveUser.id);
                const hasCustom = Boolean(liveUser.customPaymentGateway && liveUser.customPaymentGateway.channels.length > 0);

                return (
                  <PaymentGatewayEditor
                    initialConfig={effective}
                    targetLabel={`@${liveUser.username} (${liveUser.fullName})`}
                    hasCustomOverride={hasCustom}
                    onSave={async (cfg) => {
                      const res = await updateUserPaymentGateway(liveUser.id, cfg);
                      if (res.success) {
                        setUserNotice(`Updated Official Admin Payment Gateway for @${liveUser.username}.`);
                        setTimeout(() => setUserNotice(null), 5000);
                      }
                      return res;
                    }}
                    onResetToGlobal={async () => {
                      await updateUserPaymentGateway(liveUser.id, null);
                      setUserNotice(`Reset @${liveUser.username} to use the Global Official Admin Payment Gateway.`);
                      setTimeout(() => setUserNotice(null), 5000);
                    }}
                  />
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
