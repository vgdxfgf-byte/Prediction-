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

// Admin Portal Components
import { AdminLogin } from './components/admin/AdminLogin';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminUserManagement } from './components/admin/AdminUserManagement';
import { AdminCoinManagement } from './components/admin/AdminCoinManagement';
import { AdminPredictions } from './components/admin/AdminPredictions';
import { AdminRequests } from './components/admin/AdminRequests';
import { AdminAuditLogs } from './components/admin/AdminAuditLogs';

import { Prediction } from './types';
import { ShieldCheck, Layers } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { activePortal, setActivePortal, currentUser, adminUser, isHydrating } = useApp();

  // Navigation State
  const [userTab, setUserTab] = useState<string>('predictions');
  const [adminTab, setAdminTab] = useState<string>('dashboard');

  // Bet Slip Modal State
  const [betModalPrediction, setBetModalPrediction] = useState<Prediction | null>(null);
  const [betModalChoice, setBetModalChoice] = useState<'YES' | 'NO'>('YES');

  // User Profile / Change Password Modal
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);

  // Quick Action triggers for Wallet
  const [walletInitialModal, setWalletInitialModal] = useState<'deposit' | 'withdraw' | null>(null);

  // Quick Action triggers for Admin
  const [adminCreateUserOpen, setAdminCreateUserOpen] = useState<boolean>(false);
  const [adminCreatePredOpen, setAdminCreatePredOpen] = useState<boolean>(false);
  const [adminPreselectedUserId, setAdminPreselectedUserId] = useState<string | undefined>(undefined);

  if (isHydrating) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
        <p className="text-xs text-slate-400 font-medium tracking-wide">Connecting to ApexPredict Exchange...</p>
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
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
          <Header
            currentTab={adminTab}
            setCurrentTab={setAdminTab}
          />
          <AdminLogin onGoToUserApp={() => setActivePortal('user')} />
          <footer className="py-4 text-center text-xs text-slate-600 border-t border-slate-900">
            ApexPredict Exchange © 2026 • Secure Administrator Subsystem
          </footer>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
        <Header
          currentTab={adminTab}
          setCurrentTab={setAdminTab}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
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

              {adminTab === 'gateway' && <AdminRequests key="gateway" initialTab="gateway" />}

              {adminTab === 'audit' && <AdminAuditLogs />}
            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="py-5 text-center text-xs text-slate-500 border-t border-slate-900 bg-slate-950">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>ApexPredict Exchange Risk Engine • Admin Console v2.4</span>
            <div className="flex items-center gap-3 text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                Immutable Audit Trail Active
              </span>
              <span>•</span>
              <button
                onClick={() => setActivePortal('user')}
                className="text-amber-400 hover:text-amber-300 font-semibold"
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
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
        <Header
          currentTab={userTab}
          setCurrentTab={setUserTab}
        />
        <UserLogin onGoToAdmin={() => setActivePortal('admin')} />
        <footer className="py-4 text-center text-xs text-slate-600 border-t border-slate-900">
          ApexPredict Sports Prediction Exchange © 2026
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      <Header
        currentTab={userTab}
        setCurrentTab={setUserTab}
        onOpenDeposit={handleOpenDeposit}
        onOpenWithdraw={handleOpenWithdraw}
        onOpenProfile={() => setShowProfileModal(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
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

      {/* Footer */}
      <footer className="py-5 text-center text-xs text-slate-500 border-t border-slate-900 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>ApexPredict Sports & Events Prediction Exchange • For Entertainment & Skill Predictions</span>
          <div className="flex items-center gap-3 text-slate-400">
            <span>Coins Exchange</span>
            <span>•</span>
            <button
              onClick={() => setActivePortal('admin')}
              className="text-emerald-400 hover:text-emerald-300 font-semibold"
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
