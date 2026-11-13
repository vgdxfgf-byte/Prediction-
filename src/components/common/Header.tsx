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
  Sparkles,
  X,
  CheckCircle2,
  AlertTriangle,
  Lock
} from 'lucide-react';

interface HeaderProps {
  onOpenDeposit?: () => void;
  onOpenWithdraw?: () => void;
  onOpenProfile?: () => void;
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenDeposit,
  onOpenProfile,
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
    withdrawals
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

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100">
        {/* Main Navigation Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Optional Admin Switcher */}
            <div className="flex items-center gap-6">
              <div
                onClick={() => setCurrentTab(activePortal === 'admin' ? 'dashboard' : 'predictions')}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition">
                  <Sparkles className="w-5 h-5 text-slate-950 font-black" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-lg tracking-tight text-white">APEX</span>
                    <span className="font-bold text-lg text-emerald-400">PREDICT</span>
                    <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      EXCHANGE
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 -mt-0.5 tracking-wide">
                    {activePortal === 'admin' ? 'Management Console' : 'YES / NO Sports Predictions'}
                  </div>
                </div>
              </div>

              {/* Portal Toggle Pill (visible when logged in as Admin) */}
              {adminUser && (
                <div className="hidden md:flex bg-slate-950/80 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => {
                      setActivePortal('user');
                      setCurrentTab('predictions');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                      activePortal === 'user'
                        ? 'bg-emerald-600 text-white shadow-sm'
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                      activePortal === 'admin'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Admin Portal
                    {pendingRequestsCount > 0 && (
                      <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold animate-pulse">
                        {pendingRequestsCount}
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Desktop Navigation Links according to Portal */}
            {activePortal === 'user' && currentUser && (
              <div className="hidden lg:flex items-center gap-1">
                <button
                  onClick={() => setCurrentTab('dashboard')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                    currentTab === 'dashboard'
                      ? 'text-emerald-400 bg-slate-800'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setCurrentTab('predictions')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                    currentTab === 'predictions'
                      ? 'text-emerald-400 bg-slate-800'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  Prediction Markets
                </button>
                <button
                  onClick={() => setCurrentTab('history')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                    currentTab === 'history'
                      ? 'text-emerald-400 bg-slate-800'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  My Predictions
                </button>
                <button
                  onClick={() => setCurrentTab('wallet')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                    currentTab === 'wallet'
                      ? 'text-emerald-400 bg-slate-800'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  Wallet
                </button>
              </div>
            )}

            {activePortal === 'admin' && adminUser && (
              <div className="hidden lg:flex items-center gap-1">
                <button
                  onClick={() => setCurrentTab('dashboard')}
                  className={`px-2.5 py-2 rounded-lg text-xs xl:text-sm font-medium transition cursor-pointer ${
                    currentTab === 'dashboard'
                      ? 'text-amber-400 bg-slate-800'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setCurrentTab('users')}
                  className={`px-2.5 py-2 rounded-lg text-xs xl:text-sm font-medium transition cursor-pointer ${
                    currentTab === 'users'
                      ? 'text-amber-400 bg-slate-800'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  Users
                </button>
                <button
                  onClick={() => setCurrentTab('coins')}
                  className={`px-2.5 py-2 rounded-lg text-xs xl:text-sm font-medium transition cursor-pointer ${
                    currentTab === 'coins'
                      ? 'text-amber-400 bg-slate-800'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  Coins
                </button>
                <button
                  onClick={() => setCurrentTab('predictions')}
                  className={`px-2.5 py-2 rounded-lg text-xs xl:text-sm font-medium transition cursor-pointer ${
                    currentTab === 'predictions'
                      ? 'text-amber-400 bg-slate-800'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  Predictions
                </button>
                <button
                  onClick={() => setCurrentTab('requests')}
                  className={`px-2.5 py-2 rounded-lg text-xs xl:text-sm font-medium relative transition cursor-pointer ${
                    currentTab === 'requests'
                      ? 'text-amber-400 bg-slate-800'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  Requests
                  {pendingRequestsCount > 0 && (
                    <span className="ml-1.5 bg-amber-500 text-slate-950 font-bold px-1.5 py-0.2 rounded-full text-xs">
                      {pendingRequestsCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setCurrentTab('gateway')}
                  className={`px-2.5 py-2 rounded-lg text-xs xl:text-sm font-medium transition cursor-pointer whitespace-nowrap ${
                    currentTab === 'gateway'
                      ? 'text-amber-400 bg-slate-800'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  Payment Gateway
                </button>
                <button
                  onClick={() => setCurrentTab('audit')}
                  className={`px-2.5 py-2 rounded-lg text-xs xl:text-sm font-medium transition cursor-pointer ${
                    currentTab === 'audit'
                      ? 'text-amber-400 bg-slate-800'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  Audit Log
                </button>
              </div>
            )}

            {/* Right Action Area */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              {activePortal === 'user' && currentUser && (
                <>
                  {/* Coin Wallet Button */}
                  <div
                    onClick={() => setCurrentTab('wallet')}
                    className="cursor-pointer bg-slate-950/90 border border-slate-800 hover:border-emerald-500/50 px-2.5 sm:px-3 py-1.5 rounded-xl flex items-center gap-2 transition shadow-sm"
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      🪙
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-[10px] uppercase font-bold text-slate-400 leading-none">Balance</span>
                      <span className="font-mono-numbers font-bold text-sm text-emerald-400 leading-tight">
                        {currentUser.coins.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Quick Deposit Button */}
                  <button
                    onClick={onOpenDeposit}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-md shadow-emerald-950/30 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Deposit
                  </button>

                  {/* User Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowUserDropdown(!showUserDropdown)}
                      className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-sm border border-emerald-500/30">
                        {currentUser.username.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="hidden md:inline text-xs font-semibold text-slate-200">
                        {currentUser.username}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </button>

                    {showUserDropdown && (
                      <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-50">
                        <div className="px-3 py-2 border-b border-slate-800">
                          <div className="font-bold text-sm text-white">{currentUser.fullName}</div>
                          <div className="text-xs text-slate-400">@{currentUser.username}</div>
                          <div className="mt-1 flex items-center justify-between text-xs font-mono text-emerald-400 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                            <span>Coins:</span>
                            <span className="font-bold">{currentUser.coins.toLocaleString()} 🪙</span>
                          </div>
                        </div>

                        <div className="py-1">
                          <button
                            onClick={() => {
                              setCurrentTab('dashboard');
                              setShowUserDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-lg flex items-center gap-2 cursor-pointer"
                          >
                            <Layers className="w-4 h-4 text-slate-400" />
                            Dashboard
                          </button>
                          <button
                            onClick={() => {
                              setCurrentTab('history');
                              setShowUserDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-lg flex items-center gap-2 cursor-pointer"
                          >
                            <ArrowDownUp className="w-4 h-4 text-slate-400" />
                            My Predictions
                          </button>
                          <button
                            onClick={() => {
                              setCurrentTab('wallet');
                              setShowUserDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-lg flex items-center gap-2 cursor-pointer"
                          >
                            <Coins className="w-4 h-4 text-slate-400" />
                            Wallet & Withdraw
                          </button>
                          <button
                            onClick={() => {
                              onOpenProfile?.();
                              setShowUserDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-lg flex items-center gap-2 cursor-pointer"
                          >
                            <KeyRound className="w-4 h-4 text-slate-400" />
                            Change Password
                          </button>
                        </div>

                        <div className="pt-1 border-t border-slate-800">
                          <button
                            onClick={() => {
                              logout();
                              setShowUserDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg flex items-center gap-2 cursor-pointer"
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
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-semibold transition cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Admin Security</span>
                  </button>
                  <button
                    onClick={logout}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 text-xs font-semibold border border-slate-700 transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile & Tablet Navigation Bar */}
          {activePortal === 'user' && currentUser && (
            <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto pb-2.5 pt-0.5 no-scrollbar">
              {[
                { id: 'dashboard', label: 'Dashboard' },
                { id: 'predictions', label: 'Markets' },
                { id: 'history', label: 'My Predictions' },
                { id: 'wallet', label: 'Wallet' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    currentTab === tab.id
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800/80 text-slate-300 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
              <button
                onClick={onOpenDeposit}
                className="sm:hidden px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                Deposit
              </button>
            </div>
          )}

          {activePortal === 'admin' && adminUser && (
            <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto pb-2.5 pt-0.5 no-scrollbar">
              {[
                { id: 'dashboard', label: 'Overview' },
                { id: 'users', label: 'Users' },
                { id: 'coins', label: 'Coins' },
                { id: 'predictions', label: 'Predictions' },
                {
                  id: 'requests',
                  label: pendingRequestsCount > 0 ? `Requests (${pendingRequestsCount})` : 'Requests'
                },
                { id: 'gateway', label: 'Gateway / UPI' },
                { id: 'audit', label: 'Audit' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    currentTab === tab.id
                      ? 'bg-amber-600 text-slate-950'
                      : 'bg-slate-800/80 text-slate-300 hover:text-white'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-xs">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm text-white">Administrator Security Settings</h3>
              </div>
              <button
                onClick={() => setShowAdminSecurity(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
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
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-white outline-none"
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
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl text-white outline-none"
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
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-white outline-none"
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
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>

              {adminSecError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{adminSecError}</span>
                </div>
              )}

              {adminSecSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{adminSecSuccess}</span>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdminSecurity(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold uppercase tracking-wider transition cursor-pointer"
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
