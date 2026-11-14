import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Coins,
  ShieldCheck,
  LogOut,
  KeyRound,
  Layers,
  Plus,
  ArrowDownUp,
  ChevronDown,
  TrendingUp,
  Crown,
  X,
  CheckCircle2,
  AlertTriangle,
  Lock,
  User as UserIcon,
  LayoutDashboard,
  MessageSquareText
} from 'lucide-react';

interface HeaderProps {
  onOpenDeposit?: () => void;
  onOpenWithdraw?: () => void;
  onOpenProfile?: () => void;
  onOpenChat?: () => void;
  hasUnreadChat?: boolean;
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenDeposit,
  onOpenProfile,
  onOpenChat,
  hasUnreadChat,
  currentTab,
  setCurrentTab
}) => {
  const {
    activePortal,
    setActivePortal,
    currentUser,
    adminUser,
    logout,
    changeAdminCredentials,
    deposits,
    withdrawals,
    idChats
  } = useApp();

  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showAdminSecurity, setShowAdminSecurity] = useState(false);

  // Admin password change state
  const [adminCurrPass, setAdminCurrPass] = useState('');
  const [adminNewUsername, setAdminNewUsername] = useState('');
  const [adminNewPass, setAdminNewPass] = useState('');
  const [adminConfirmPass, setAdminConfirmPass] = useState('');
  const [adminSecError, setAdminSecError] = useState('');
  const [adminSecSuccess, setAdminSecSuccess] = useState('');

  const pendingRequestsCount =
    deposits.filter(d => d.status === 'pending').length +
    withdrawals.filter(w => w.status === 'pending').length;
  const unreadIdChatsCount = idChats.filter(c => c.unreadByAdmin).length;

  const handleOpenAdminSecurity = () => {
    setAdminNewUsername(adminUser?.username || 'admin');
    setAdminCurrPass('');
    setAdminNewPass('');
    setAdminConfirmPass('');
    setAdminSecError('');
    setAdminSecSuccess('');
    setShowAdminSecurity(true);
  };

  const handleAdminSecuritySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminSecError('');
    setAdminSecSuccess('');

    if (adminNewPass !== adminConfirmPass) {
      setAdminSecError('New password and confirmation do not match');
      return;
    }
    if (adminNewPass.length < 6) {
      setAdminSecError('New admin password must be at least 6 characters long');
      return;
    }

    const res = await changeAdminCredentials(adminCurrPass, adminNewPass, adminNewUsername);
    if (res.success) {
      setAdminSecSuccess('Administrator credentials updated successfully.');
      setAdminCurrPass('');
      setAdminNewPass('');
      setAdminConfirmPass('');
      setTimeout(() => {
        setShowAdminSecurity(false);
        setAdminSecSuccess('');
      }, 1800);
    } else {
      setAdminSecError(res.error || 'Failed to update administrator credentials');
    }
  };

  const isAdminPortal = activePortal === 'admin';

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#080e13]/95 backdrop-blur-md border-b border-white/[0.07] text-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Zone 1: Brand Identity */}
            <div className="flex items-center gap-5 shrink-0">
              <button
                type="button"
                onClick={() => setCurrentTab(isAdminPortal ? 'dashboard' : 'dashboard')}
                className="flex items-center gap-2.5 cursor-pointer group text-left"
              >
                {isAdminPortal ? (
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-amber-400/40 flex items-center justify-center shadow-[0_0_20px_-6px_rgba(245,158,11,0.5)] group-hover:scale-105 transition">
                    <Crown className="w-5 h-5 text-amber-400" />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#16f27b] to-[#0bb55a] flex items-center justify-center shadow-[0_0_20px_-4px_rgba(20,224,113,0.65)] group-hover:scale-105 transition">
                    <TrendingUp className="w-5 h-5 text-[#04130b] stroke-[2.5]" />
                  </div>
                )}

                <div className="whitespace-nowrap">
                  <div className="flex items-center gap-1 text-base sm:text-lg tracking-tight leading-none">
                    <span className="font-black text-white">APEX</span>
                    <span className={`font-black ${isAdminPortal ? 'text-amber-400' : 'text-[#14e071]'}`}>
                      {isAdminPortal ? 'ADMIN' : 'PREDICT'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 tracking-wide">
                    {isAdminPortal ? 'Control · Manage · Grow' : 'Predict · Play · Win'}
                  </div>
                </div>
              </button>

              {/* Portal Toggle Pill (visible when logged in as Admin) */}
              {adminUser && (
                <div className="hidden md:flex bg-[#0c141a] p-1 rounded-xl border border-white/[0.08]">
                  <button
                    onClick={() => {
                      setActivePortal('user');
                      setCurrentTab('dashboard');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition cursor-pointer ${
                      activePortal === 'user'
                        ? 'bg-[#14e071] text-[#04130b] font-bold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    User App
                  </button>
                  <button
                    onClick={() => {
                      setActivePortal('admin');
                      setCurrentTab('dashboard');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition cursor-pointer ${
                      activePortal === 'admin'
                        ? 'bg-emerald-500/20 text-[#14e071] border border-emerald-500/35'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Admin Portal
                    {pendingRequestsCount > 0 && (
                      <span className="bg-amber-500 text-slate-950 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                        {pendingRequestsCount}
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Zone 2: Desktop User Navigation Links */}
            {activePortal === 'user' && currentUser && (
              <nav className="hidden lg:flex items-center gap-1">
                {[
                  { id: 'dashboard', label: 'Dashboard' },
                  { id: 'predictions', label: 'Markets' },
                  { id: 'history', label: 'My Predictions' },
                  { id: 'wallet', label: 'Wallet' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setCurrentTab(item.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition cursor-pointer ${
                      currentTab === item.id
                        ? 'text-[#14e071] bg-emerald-500/10 border border-emerald-500/25'
                        : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            )}

            {/* Zone 3: Right Action Area */}
            <div className="flex items-center gap-2.5 shrink-0">
              {activePortal === 'user' && currentUser && (
                <>
                  {/* Balance Pill */}
                  <button
                    type="button"
                    onClick={() => setCurrentTab('wallet')}
                    className="cursor-pointer bg-[#0d161d] border border-emerald-500/25 hover:border-[#14e071]/60 px-2.5 sm:px-3 py-1.5 rounded-xl flex items-center gap-2 transition"
                  >
                    <div className="w-6 h-6 rounded-full bg-amber-400/15 border border-amber-400/35 flex items-center justify-center">
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-[10px] text-slate-400 leading-none">Balance</span>
                      <span className="font-mono-numbers font-bold text-xs sm:text-sm text-white leading-tight">
                        {currentUser.coins.toLocaleString()}
                      </span>
                    </div>
                  </button>

                  {/* + Deposit CTA */}
                  <button
                    onClick={onOpenDeposit}
                    className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl apex-glow-btn font-bold text-xs whitespace-nowrap shrink-0 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    Deposit
                  </button>

                  {/* Chat with Admin CTA (visible on mobile & desktop for logged-in users) */}
                  {onOpenChat && (
                    <button
                      type="button"
                      onClick={onOpenChat}
                      title="Chat with Admin"
                      className="relative flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-[#14e071]/35 text-[#14e071] font-bold text-xs whitespace-nowrap shrink-0 transition cursor-pointer"
                    >
                      <MessageSquareText className="w-4 h-4" />
                      <span className="hidden md:inline">Chat Admin</span>
                      {hasUnreadChat && (
                        <span className="px-1.5 py-0.2 rounded-full bg-[#14e071] text-[#04130b] text-[9px] font-black uppercase">
                          New
                        </span>
                      )}
                    </button>
                  )}

                  {/* User Profile Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowUserDropdown(!showUserDropdown)}
                      className="flex items-center gap-2 p-1.5 rounded-xl bg-[#0d161d] hover:bg-[#13202a] border border-white/[0.08] transition cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-[#14e071] flex items-center justify-center font-bold text-xs border border-emerald-500/30">
                        {currentUser.username.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="hidden md:inline text-xs font-semibold text-slate-200 max-w-[110px] truncate">
                        {currentUser.username}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </button>

                    {showUserDropdown && (
                      <div className="absolute right-0 mt-2 w-56 bg-[#0d151b] border border-white/[0.1] rounded-2xl shadow-2xl p-2 z-50">
                        <div className="px-3 py-2 border-b border-white/[0.07]">
                          <div className="font-bold text-sm text-white truncate">{currentUser.fullName}</div>
                          <div className="text-xs text-slate-400 truncate">@{currentUser.username}</div>
                          <div className="mt-1.5 flex items-center justify-between text-xs font-mono-numbers text-[#14e071] bg-[#070d11] px-2.5 py-1.5 rounded-lg border border-white/[0.06]">
                            <span>Coins</span>
                            <span className="font-bold">{currentUser.coins.toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="py-1 space-y-0.5">
                          <button
                            onClick={() => {
                              setCurrentTab('dashboard');
                              setShowUserDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-white/[0.05] rounded-lg flex items-center gap-2 cursor-pointer"
                          >
                            <LayoutDashboard className="w-4 h-4 text-[#14e071]" />
                            Dashboard
                          </button>
                          <button
                            onClick={() => {
                              setCurrentTab('history');
                              setShowUserDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-white/[0.05] rounded-lg flex items-center gap-2 cursor-pointer"
                          >
                            <ArrowDownUp className="w-4 h-4 text-slate-400" />
                            My Predictions
                          </button>
                          <button
                            onClick={() => {
                              setCurrentTab('wallet');
                              setShowUserDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-white/[0.05] rounded-lg flex items-center gap-2 cursor-pointer"
                          >
                            <Coins className="w-4 h-4 text-amber-400" />
                            Wallet & Withdraw
                          </button>
                          <button
                            onClick={() => {
                              onOpenProfile?.();
                              setShowUserDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-white/[0.05] rounded-lg flex items-center gap-2 cursor-pointer"
                          >
                            <UserIcon className="w-4 h-4 text-slate-400" />
                            Profile & Password
                          </button>
                        </div>

                        <div className="pt-1 border-t border-white/[0.07]">
                          <button
                            onClick={() => {
                              logout();
                              setShowUserDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg flex items-center gap-2 cursor-pointer"
                          >
                            <LogOut className="w-4 h-4" />
                            Log Out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {activePortal === 'admin' && adminUser && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleOpenAdminSecurity}
                    title="Manage Admin Password & Security"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-[#14e071] text-xs font-semibold whitespace-nowrap shrink-0 transition cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Security</span>
                  </button>
                  <button
                    onClick={logout}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0d161d] hover:bg-rose-500/15 text-slate-300 hover:text-rose-400 text-xs font-semibold border border-white/[0.08] whitespace-nowrap shrink-0 transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile & Tablet Navigation Bar for Admin */}
          {activePortal === 'admin' && adminUser && (
            <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto pb-2.5 pt-0.5 no-scrollbar">
              {[
                { id: 'dashboard', label: 'Dashboard' },
                { id: 'users', label: 'Users' },
                { id: 'predictions', label: 'Markets' },
                { id: 'coins', label: 'Coins' },
                {
                  id: 'requests',
                  label: pendingRequestsCount > 0 ? `Requests (${pendingRequestsCount})` : 'Requests'
                },
                {
                  id: 'id_chats',
                  label: unreadIdChatsCount > 0 ? `ID Chat (${unreadIdChatsCount})` : 'ID Chat'
                },
                { id: 'gateway', label: 'Gateway' },
                { id: 'audit', label: 'Audit' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition cursor-pointer ${
                    currentTab === tab.id
                      ? 'bg-emerald-500/20 text-[#14e071] border border-emerald-500/35'
                      : 'bg-[#0d161d] text-slate-300 hover:text-white border border-white/[0.06]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Admin Security / Password Update Modal */}
      {showAdminSecurity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#0d151b] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden text-xs">
            <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-[#080e13]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#14e071]" />
                <h3 className="font-bold text-sm text-white">Administrator Security Settings</h3>
              </div>
              <button
                onClick={() => setShowAdminSecurity(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.06] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdminSecuritySubmit} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Admin Username</label>
                <input
                  type="text"
                  required
                  minLength={3}
                  value={adminNewUsername}
                  onChange={e => setAdminNewUsername(e.target.value)}
                  className="w-full bg-[#070c10] border border-white/[0.1] focus:border-[#14e071] rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Current Admin Password</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={adminCurrPass}
                    onChange={e => setAdminCurrPass(e.target.value)}
                    placeholder="Enter current admin password"
                    className="w-full pl-9 pr-3 py-2 bg-[#070c10] border border-white/[0.1] focus:border-[#14e071] rounded-xl text-white outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">New Admin Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={adminNewPass}
                  onChange={e => setAdminNewPass(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full bg-[#070c10] border border-white/[0.1] focus:border-[#14e071] rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Confirm New Admin Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={adminConfirmPass}
                  onChange={e => setAdminConfirmPass(e.target.value)}
                  placeholder="Re-enter new admin password"
                  className="w-full bg-[#070c10] border border-white/[0.1] focus:border-[#14e071] rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>

              {adminSecError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{adminSecError}</span>
                </div>
              )}

              {adminSecSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[#14e071] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{adminSecSuccess}</span>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdminSecurity(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl apex-glow-btn font-bold uppercase tracking-wider transition cursor-pointer"
                >
                  Update Credentials
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
