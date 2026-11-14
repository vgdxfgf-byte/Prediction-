/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { BetSlipModal } from './components/common/BetSlipModal';

// User Portal Components
import { UserLogin } from './components/user/UserLogin';
import { UserDashboard } from './components/user/UserDashboard';
import { PredictionsView } from './components/user/PredictionsView';
import { PredictionHistoryView } from './components/user/PredictionHistoryView';
import { WalletView } from './components/user/WalletView';
import { ProfileView } from './components/user/ProfileView';
import { NewIdChatModal } from './components/user/NewIdChatModal';

// Admin Portal Components
import { AdminLogin } from './components/admin/AdminLogin';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminUserManagement } from './components/admin/AdminUserManagement';
import { AdminCoinManagement } from './components/admin/AdminCoinManagement';
import { AdminPredictions } from './components/admin/AdminPredictions';
import { AdminRequests } from './components/admin/AdminRequests';
import { AdminAuditLogs } from './components/admin/AdminAuditLogs';
import { AdminIdChats } from './components/admin/AdminIdChats';

import { Prediction } from './types';
import {
  ShieldCheck,
  LayoutDashboard,
  Users,
  BarChart3,
  Coins,
  ArrowDownUp,
  Landmark,
  FileText,
  LogOut,
  Home,
  Compass,
  Zap,
  Wallet,
  User as UserIcon,
  Layers,
  MessageSquareText
} from 'lucide-react';

const MainAppContent: React.FC = () => {
  const {
    activePortal,
    setActivePortal,
    currentUser,
    adminUser,
    isHydrating,
    logout,
    deposits,
    withdrawals,
    idChats
  } = useApp();

  // Navigation State — default to User Dashboard so users land on the rich home UI immediately
  const [userTab, setUserTab] = useState<string>('dashboard');
  const [adminTab, setAdminTab] = useState<string>('dashboard');

  // Bet Slip Modal State
  const [betModalPrediction, setBetModalPrediction] = useState<Prediction | null>(null);
  const [betModalChoice, setBetModalChoice] = useState<'YES' | 'NO'>('YES');

  // User Profile / Change Password Modal & New ID Chat Modal
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showUserIdChat, setShowUserIdChat] = useState<boolean>(false);

  // Quick Action triggers for Wallet
  const [walletInitialModal, setWalletInitialModal] = useState<'deposit' | 'withdraw' | null>(null);

  // Quick Action triggers for Admin
  const [adminCreateUserOpen, setAdminCreateUserOpen] = useState<boolean>(false);
  const [adminCreatePredOpen, setAdminCreatePredOpen] = useState<boolean>(false);
  const [adminPreselectedUserId, setAdminPreselectedUserId] = useState<string | undefined>(undefined);

  const pendingRequestsCount =
    deposits.filter(d => d.status === 'pending').length +
    withdrawals.filter(w => w.status === 'pending').length;
  const unreadIdChatsCount = idChats.filter(c => c.unreadByAdmin).length;

  if (isHydrating) {
    return (
      <div className="min-h-screen bg-[#060b0e] text-slate-200 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-[#14e071]/25 border-t-[#14e071] animate-spin" />
        <p className="text-xs text-slate-400 font-medium tracking-wide">
          Connecting to ApexPredict Exchange...
        </p>
      </div>
    );
  }

  const handleSelectPrediction = (pred: Prediction, choice: 'YES' | 'NO') => {
    setBetModalPrediction(pred);
    setBetModalChoice(choice);
  };

  const handleOpenDeposit = () => {
    setUserTab('wallet');
    setWalletInitialModal('deposit');
  };

  const handleOpenWithdraw = () => {
    setUserTab('wallet');
    setWalletInitialModal('withdraw');
  };

  const handleAdjustCoinsForUser = (userId: string) => {
    setAdminPreselectedUserId(userId);
    setAdminTab('coins');
  };

  // --- RENDERING LOGIC ---

  // 1. ADMIN PORTAL
  if (activePortal === 'admin') {
    if (!adminUser) {
      return (
        <div className="min-h-screen bg-[#060b0e] text-slate-100 flex flex-col justify-between">
          <Header currentTab={adminTab} setCurrentTab={setAdminTab} />
          <AdminLogin onGoToUserApp={() => setActivePortal('user')} />
          <footer className="py-4 text-center text-xs text-slate-500 border-t border-white/[0.06]">
            ApexPredict Exchange © 2026 • Administrator Console
          </footer>
        </div>
      );
    }

    const adminNavItems = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'users', label: 'Users', icon: Users },
      { id: 'predictions', label: 'Markets', icon: BarChart3 },
      { id: 'coins', label: 'Coins', icon: Coins },
      {
        id: 'requests',
        label: 'Requests',
        icon: ArrowDownUp,
        badge: pendingRequestsCount
      },
      {
        id: 'id_chats',
        label: 'ID Chat',
        icon: MessageSquareText,
        badge: unreadIdChatsCount
      },
      { id: 'gateway', label: 'Deposits & UPI', icon: Landmark },
      { id: 'audit', label: 'Audit Logs', icon: FileText }
    ];

    return (
      <div className="min-h-screen bg-[#060b0e] text-slate-100 flex flex-col justify-between">
        <Header currentTab={adminTab} setCurrentTab={setAdminTab} />

        <div className="flex-1 max-w-[1440px] w-full mx-auto flex gap-6 px-4 sm:px-6 lg:px-8 py-6">
          {/* Desktop Left Navigation Rail (Screen 3 style) */}
          <aside className="hidden lg:flex flex-col w-60 shrink-0">
            <div className="sticky top-22 rounded-2xl bg-[#0b1217] border border-white/[0.07] p-3 flex flex-col justify-between min-h-[calc(100vh-8rem)] shadow-2xl">
              <div className="space-y-1">
                {adminNavItems.map(item => {
                  const Icon = item.icon;
                  const isActive = adminTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setAdminTab(item.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        isActive
                          ? 'bg-emerald-500/15 text-[#14e071] border border-emerald-500/35 shadow-[0_0_22px_-10px_rgba(20,224,113,0.7)]'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] border border-transparent'
                      }`}
                    >
                      <span className="flex items-center gap-3 whitespace-nowrap">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-[#14e071]' : 'text-slate-400'}`} />
                        {item.label}
                      </span>
                      {item.badge ? (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 font-mono-numbers">
                          {item.badge}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <div className="pt-3 mt-4 border-t border-white/[0.07] space-y-1">
                <button
                  onClick={() => {
                    setActivePortal('user');
                    setUserTab('dashboard');
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/[0.04] transition cursor-pointer"
                >
                  <Layers className="w-4 h-4" />
                  Switch to User App
                </button>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          </aside>

          {/* Admin Main Content */}
          <main className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={adminTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              >
                {adminTab === 'dashboard' && (
                  <AdminDashboard
                    onNavigateTab={setAdminTab}
                    onOpenCreateUser={() => {
                      setAdminTab('users');
                      setAdminCreateUserOpen(true);
                    }}
                    onOpenCreatePrediction={() => {
                      setAdminTab('predictions');
                      setAdminCreatePredOpen(true);
                    }}
                    onOpenPaymentGateway={() => setAdminTab('gateway')}
                  />
                )}

                {adminTab === 'users' && (
                  <AdminUserManagement
                    initialCreateOpen={adminCreateUserOpen}
                    onClearInitialCreate={() => setAdminCreateUserOpen(false)}
                    onAdjustCoinsForUser={handleAdjustCoinsForUser}
                  />
                )}

                {adminTab === 'coins' && (
                  <AdminCoinManagement
                    preselectedUserId={adminPreselectedUserId}
                    onClearPreselected={() => setAdminPreselectedUserId(undefined)}
                  />
                )}

                {adminTab === 'predictions' && (
                  <AdminPredictions
                    initialCreateOpen={adminCreatePredOpen}
                    onClearInitialCreate={() => setAdminCreatePredOpen(false)}
                  />
                )}

                {adminTab === 'requests' && <AdminRequests key="requests" />}

                {adminTab === 'id_chats' && <AdminIdChats />}

                {adminTab === 'gateway' && <AdminRequests key="gateway" initialTab="gateway" />}

                {adminTab === 'audit' && <AdminAuditLogs />}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        <footer className="py-5 text-center text-xs text-slate-500 border-t border-white/[0.06] bg-[#060b0e]">
          <div className="max-w-[1440px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>ApexPredict Exchange • Admin Control Center</span>
            <div className="flex items-center gap-3 text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#14e071]" />
                Encrypted Ledger Synced
              </span>
              <span>·</span>
              <button
                onClick={() => setActivePortal('user')}
                className="text-[#14e071] hover:text-emerald-300 font-semibold cursor-pointer"
              >
                Switch to User App →
              </button>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // 2. USER PORTAL
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#060b0e] text-slate-100 flex flex-col justify-between">
        <Header currentTab={userTab} setCurrentTab={setUserTab} />
        <UserLogin onGoToAdmin={() => setActivePortal('admin')} />
        <footer className="py-4 text-center text-xs text-slate-500 border-t border-white/[0.06]">
          ApexPredict Sports & Events Prediction Exchange © 2026
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060b0e] text-slate-100 flex flex-col justify-between">
      <Header
        currentTab={userTab}
        setCurrentTab={setUserTab}
        onOpenDeposit={handleOpenDeposit}
        onOpenWithdraw={handleOpenWithdraw}
        onOpenProfile={() => setShowProfileModal(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={userTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
            {userTab === 'dashboard' && (
              <UserDashboard
                onSelectPrediction={handleSelectPrediction}
                onNavigateTab={setUserTab}
                onOpenDeposit={handleOpenDeposit}
                onOpenWithdraw={handleOpenWithdraw}
                onOpenProfile={() => setShowProfileModal(true)}
                onOpenIdChat={() => setShowUserIdChat(true)}
              />
            )}

            {userTab === 'predictions' && (
              <PredictionsView onSelectPrediction={handleSelectPrediction} />
            )}

            {userTab === 'history' && <PredictionHistoryView />}

            {userTab === 'wallet' && (
              <WalletView
                initialModal={walletInitialModal}
                onClearInitialModal={() => setWalletInitialModal(null)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Dock (Screen 1 inspired) */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#080f14]/95 backdrop-blur-lg border-t border-white/[0.08] px-3 py-1.5"
      >
        <div className="max-w-md mx-auto flex items-center justify-around">
          <button
            type="button"
            onClick={() => setUserTab('dashboard')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-semibold transition cursor-pointer ${
              userTab === 'dashboard' ? 'text-[#14e071]' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </button>

          <button
            type="button"
            onClick={() => setUserTab('predictions')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-semibold transition cursor-pointer ${
              userTab === 'predictions' ? 'text-[#14e071]' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Markets</span>
          </button>

          <button
            type="button"
            onClick={() => setUserTab('predictions')}
            aria-label="Quick Predict"
            className="w-11 h-11 -mt-4 rounded-full apex-glow-btn flex items-center justify-center border-2 border-[#060b0e] transition cursor-pointer"
          >
            <Zap className="w-5 h-5 fill-current" />
          </button>

          <button
            type="button"
            onClick={() => setUserTab('wallet')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-semibold transition cursor-pointer ${
              userTab === 'wallet' ? 'text-[#14e071]' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Wallet</span>
          </button>

          <button
            type="button"
            onClick={() => setShowProfileModal(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-semibold text-slate-400 hover:text-[#14e071] transition cursor-pointer"
          >
            <UserIcon className="w-4 h-4" />
            <span>Profile</span>
          </button>
        </div>
      </nav>

      {/* Floating Bet Slip Modal */}
      <AnimatePresence>
        {betModalPrediction && (
          <BetSlipModal
            prediction={betModalPrediction}
            initialChoice={betModalChoice}
            onClose={() => setBetModalPrediction(null)}
            onSuccessViewHistory={() => {
              setUserTab('history');
            }}
            onOpenDeposit={handleOpenDeposit}
          />
        )}
      </AnimatePresence>

      {/* User Profile / Change Password Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <ProfileView onClose={() => setShowProfileModal(false)} />
        )}
      </AnimatePresence>

      {/* Logged-in User Admin Live Chat for New ID */}
      <NewIdChatModal
        isOpen={showUserIdChat}
        onClose={() => setShowUserIdChat(false)}
        defaultVisitorName={currentUser.fullName}
      />

      {/* Footer */}
      <footer className="hidden lg:block py-5 text-center text-xs text-slate-500 border-t border-white/[0.06] bg-[#060b0e]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>ApexPredict Sports & Events Prediction Exchange • 100% Fair Coin Settlement</span>
          <div className="flex items-center gap-3 text-slate-400">
            <span>Instant Exchange</span>
            <span>·</span>
            <button
              onClick={() => setActivePortal('admin')}
              className="text-[#14e071] hover:text-emerald-300 font-semibold cursor-pointer"
            >
              Administrator Access →
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AppProvider>
        <MainAppContent />
      </AppProvider>
    </MotionConfig>
  );
}
