import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, type User as FirebaseAuthUser } from 'firebase/auth';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  checkIsFirebaseAdmin,
  fsAdjustUserCoins,
  fsChangeOwnPassword,
  fsCreatePrediction,
  fsCreateUser,
  fsDeletePrediction,
  fsDeleteUser,
  fsPlaceBet,
  fsRequestDeposit,
  fsRequestWithdrawal,
  fsResetUserPassword,
  fsReviewDeposit,
  fsReviewWithdrawal,
  fsSettlePrediction,
  fsToggleUserStatus,
  fsUpdateGlobalPaymentGateway,
  fsUpdatePrediction,
  fsUpdateUser,
  fsUpdateUserPaymentGateway,
  fsUpdateWhatsAppSupport,
  fsAdminSendIdChatReply,
  fsAdminUpdateIdChatStatus,
  fsMarkIdChatRead,
  logoutFirebase,
  seedInitialFirestoreIfNeeded,
  signInAdminWithGoogle,
  signInUserWithCredentials,
  subscribeAdminPortalData,
  subscribePublicData,
  subscribeUserPortalData
} from '../services/firestoreService';
import {
  User,
  Prediction,
  Bet,
  Transaction,
  DepositRequest,
  WithdrawalRequest,
  CoinAdjustmentLog,
  PlatformStats,
  PredictionStatus,
  PaymentGatewayConfig,
  WhatsAppSupportConfig,
  IdChatThread,
  IdChatStatus
} from '../types';

const DEFAULT_PAYMENT_GATEWAY: PaymentGatewayConfig = {
  title: 'Official Admin Payment Gateway',
  instructions: '',
  channels: [],
  updatedAt: ''
};

const DEFAULT_WHATSAPP_SUPPORT: WhatsAppSupportConfig = {
  enabled: true,
  phoneNumber: '',
  buttonLabel: 'WhatsApp Support',
  defaultMessage: 'Hello Admin, I need assistance with my ApexPredict account.',
  updatedAt: ''
};

interface ActionResult {
  success: boolean;
  error?: string;
}

interface AppContextType {
  // Navigation & Auth
  activePortal: 'user' | 'admin';
  setActivePortal: (portal: 'user' | 'admin') => void;
  currentUser: User | null;
  adminUser: User | null;
  isHydrating: boolean;
  loginUser: (username: string, pass: string) => Promise<ActionResult>;
  loginAdmin: (username: string, pass: string) => Promise<ActionResult>;
  loginAdminWithGoogle: () => Promise<ActionResult>;
  logout: () => void;
  changePassword: (userId: string, oldPass: string, newPass: string) => Promise<ActionResult>;
  changeAdminCredentials: (currentPassword: string, newPassword: string, newUsername?: string) => Promise<ActionResult>;

  // Data
  users: User[];
  predictions: Prediction[];
  bets: Bet[];
  transactions: Transaction[];
  deposits: DepositRequest[];
  withdrawals: WithdrawalRequest[];
  coinLogs: CoinAdjustmentLog[];
  stats: PlatformStats;

  // User Actions
  placeBet: (predictionId: string, choice: 'YES' | 'NO', amount: number) => Promise<ActionResult & { betId?: string }>;
  requestDeposit: (amount: number, paymentMethod: string, referenceNumber: string, notes?: string) => Promise<ActionResult>;
  requestWithdrawal: (amount: number, payoutMethod: string, payoutDetails: string) => Promise<ActionResult>;

  // Admin Actions - Users
  createUser: (data: {
    username: string;
    password: string;
    fullName: string;
    email?: string;
    phone?: string;
    initialCoins?: number;
    notes?: string;
  }) => Promise<ActionResult & { user?: User }>;
  updateUser: (userId: string, data: Partial<User>) => Promise<ActionResult>;
  toggleUserStatus: (userId: string) => Promise<ActionResult>;
  resetUserPassword: (userId: string, newPass: string) => Promise<ActionResult>;
  deleteUser: (userId: string) => Promise<ActionResult>;

  // Admin Actions - Coins
  adjustUserCoins: (userId: string, type: 'credit' | 'debit' | 'set', amount: number, reason: string) => Promise<ActionResult>;

  // Admin Actions - Predictions
  createPrediction: (
    data: Omit<Prediction, 'id' | 'createdAt' | 'totalYesVolume' | 'totalNoVolume' | 'totalParticipants' | 'outcome'>
  ) => Promise<ActionResult & { prediction?: Prediction }>;
  updatePrediction: (id: string, data: Partial<Prediction>) => Promise<ActionResult>;
  setPredictionStatus: (id: string, status: PredictionStatus) => Promise<ActionResult>;
  deletePrediction: (id: string) => Promise<ActionResult & { refundedCount?: number; refundedTotal?: number }>;
  settlePrediction: (
    predictionId: string,
    outcome: 'YES' | 'NO' | 'VOID'
  ) => Promise<ActionResult & { winnersCount: number; totalPayout: number }>;

  // Admin Actions - Financial Requests & Payment Gateway
  reviewDeposit: (depositId: string, action: 'approve' | 'reject', adminRemark?: string) => Promise<ActionResult>;
  reviewWithdrawal: (
    withdrawalId: string,
    action: 'approve' | 'reject' | 'processing',
    adminRemark?: string
  ) => Promise<ActionResult>;
  paymentGateway: PaymentGatewayConfig;
  updateGlobalPaymentGateway: (config: Omit<PaymentGatewayConfig, 'updatedAt'>) => Promise<ActionResult>;
  updateUserPaymentGateway: (userId: string, config: Omit<PaymentGatewayConfig, 'updatedAt'> | null) => Promise<ActionResult>;
  getEffectivePaymentGateway: (userId?: string) => PaymentGatewayConfig;
  whatsappSupport: WhatsAppSupportConfig;
  updateWhatsAppSupport: (config: Omit<WhatsAppSupportConfig, 'updatedAt'>) => Promise<ActionResult>;

  // Admin Actions - New ID Live Chats
  idChats: IdChatThread[];
  sendAdminIdChatReply: (params: {
    chatId: string;
    text: string;
    issuedUsername?: string;
    issuedPassword?: string;
    nextStatus?: IdChatStatus;
  }) => Promise<ActionResult>;
  updateIdChatStatus: (chatId: string, status: IdChatStatus) => Promise<ActionResult>;
  markIdChatRead: (chatId: string, role: 'user' | 'admin') => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  PORTAL: 'apex_active_portal_v2',
  USER_DOC_ID: 'apex_active_user_doc_v3'
};

function safeGetStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage access errors
  }
}

function safeRemoveStorage(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage access errors
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activePortal, setActivePortalState] = useState<'user' | 'admin'>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      const roleParam = (params.get('role') || params.get('portal') || '').toLowerCase();
      if (path === '/admin' || path.startsWith('/admin/') || hash === '#admin' || roleParam === 'admin') {
        return 'admin';
      }
    }
    const saved = safeGetStorage(STORAGE_KEYS.PORTAL);
    return saved === 'admin' ? 'admin' : 'user';
  });

  const [fbAuthUser, setFbAuthUser] = useState<FirebaseAuthUser | null>(null);
  const [activeUserId, setActiveUserId] = useState<string | null>(() => safeGetStorage(STORAGE_KEYS.USER_DOC_ID));
  const [isHydrating, setIsHydrating] = useState<boolean>(true);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [adminUser, setAdminUser] = useState<User | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [bets, setBets] = useState<Bet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [coinLogs, setCoinLogs] = useState<CoinAdjustmentLog[]>([]);
  const [idChats, setIdChats] = useState<IdChatThread[]>([]);
  const [paymentGateway, setPaymentGateway] = useState<PaymentGatewayConfig>(DEFAULT_PAYMENT_GATEWAY);
  const [whatsappSupport, setWhatsappSupport] = useState<WhatsAppSupportConfig>(DEFAULT_WHATSAPP_SUPPORT);

  const setActivePortal = useCallback((portal: 'user' | 'admin') => {
    setActivePortalState(portal);
    safeSetStorage(STORAGE_KEYS.PORTAL, portal);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (portal === 'admin') {
        url.hash = 'admin';
      } else {
        if (url.hash === '#admin') url.hash = '';
        if (url.searchParams.get('role') === 'admin') url.searchParams.delete('role');
      }
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      setFbAuthUser(user);
      if (!user) {
        setAdminUser(null);
        setCurrentUser(null);
        setUsers([]);
        setBets([]);
        setTransactions([]);
        setDeposits([]);
        setWithdrawals([]);
        setCoinLogs([]);
        setIdChats([]);
      }
      setIsHydrating(false);
    });
    return () => unsub();
  }, []);

  // Public predictions + WhatsApp support subscription (always live)
  useEffect(() => {
    const unsub = subscribePublicData({
      onPredictions: preds => setPredictions(preds),
      onWhatsAppSupport: cfg => setWhatsappSupport(prev => (JSON.stringify(prev) === JSON.stringify(cfg) ? prev : cfg))
    });
    return () => unsub();
  }, []);

  // Portal-specific Firestore subscriptions when Firebase Auth is ready
  useEffect(() => {
    if (!fbAuthUser) return;
    let active = true;
    let portalUnsub: (() => void) | undefined;

    (async () => {
      if (activePortal === 'admin') {
        const isAdmin = await checkIsFirebaseAdmin(fbAuthUser);
        if (!active) return;
        if (!isAdmin) {
          setAdminUser(null);
          return;
        }
        await seedInitialFirestoreIfNeeded();
        if (!active) return;
        setAdminUser({
          id: 'usr_admin',
          username: fbAuthUser.email?.split('@')[0] || 'admin',
          passwordHash: '',
          fullName: fbAuthUser.displayName || 'System Administrator',
          email: fbAuthUser.email || BOOTSTRAPPED_ADMIN_EMAIL,
          coins: 999999,
          status: 'active',
          createdAt: new Date().toISOString()
        });
        portalUnsub = subscribeAdminPortalData({
          onUsers: u => setUsers(u),
          onBets: b => setBets(b),
          onTransactions: t => setTransactions(t),
          onDeposits: d => setDeposits(d),
          onWithdrawals: w => setWithdrawals(w),
          onCoinLogs: l => setCoinLogs(l),
          onIdChats: c => setIdChats(c),
          onPaymentGateway: cfg =>
            setPaymentGateway(prev => (JSON.stringify(prev) === JSON.stringify(cfg) ? prev : cfg))
        });
      } else {
        let resolvedUserId = activeUserId;
        if (!resolvedUserId) {
          try {
            const q = query(collection(db, 'users'), where('ownerUid', '==', fbAuthUser.uid), limit(1));
            const snap = await getDocs(q);
            if (!snap.empty) {
              resolvedUserId = snap.docs[0].id;
              safeSetStorage(STORAGE_KEYS.USER_DOC_ID, resolvedUserId);
              if (active) setActiveUserId(resolvedUserId);
            }
          } catch {
            // No linked user yet; wait for explicit login
          }
        }
        if (!active || !resolvedUserId) return;

        portalUnsub = subscribeUserPortalData(fbAuthUser.uid, resolvedUserId, {
          onUser: u => {
            if (!u || u.status === 'suspended') {
              setCurrentUser(null);
              if (!u) {
                safeRemoveStorage(STORAGE_KEYS.USER_DOC_ID);
                setActiveUserId(null);
              }
              return;
            }
            setCurrentUser(u);
          },
          onBets: b => setBets(b),
          onTransactions: t => setTransactions(t),
          onDeposits: d => setDeposits(d),
          onWithdrawals: w => setWithdrawals(w),
          onPaymentGateway: cfg =>
            setPaymentGateway(prev => (JSON.stringify(prev) === JSON.stringify(cfg) ? prev : cfg))
        });
      }
    })();

    return () => {
      active = false;
      if (portalUnsub) portalUnsub();
    };
  }, [fbAuthUser, activePortal, activeUserId]);

  // Platform Stats
  const regularUsers = users.filter(u => u.id !== 'usr_admin');
  const stats: PlatformStats = {
    totalUsers: regularUsers.length,
    activeUsers: regularUsers.filter(u => u.status === 'active').length,
    suspendedUsers: regularUsers.filter(u => u.status === 'suspended').length,
    totalCoinsInCirculation: regularUsers.reduce((sum, u) => sum + u.coins, 0),
    totalPredictions: predictions.length,
    openPredictions: predictions.filter(p => p.status === 'open').length,
    settledPredictions: predictions.filter(p => p.status === 'settled').length,
    totalBetsPlaced: bets.length,
    totalBetVolume: bets.reduce((sum, b) => sum + b.amount, 0),
    totalWonPayouts: bets.filter(b => b.result === 'won').reduce((sum, b) => sum + b.actualWinnings, 0),
    pendingDepositsCount: deposits.filter(d => d.status === 'pending').length,
    pendingDepositsAmount: deposits.filter(d => d.status === 'pending').reduce((sum, d) => sum + d.amount, 0),
    pendingWithdrawalsCount: withdrawals.filter(w => w.status === 'pending' || w.status === 'processing').length,
    pendingWithdrawalsAmount: withdrawals
      .filter(w => w.status === 'pending' || w.status === 'processing')
      .reduce((sum, w) => sum + w.amount, 0)
  };

  // --- Auth Functions ---

  const loginUser = async (username: string, pass: string): Promise<ActionResult> => {
    const res = await signInUserWithCredentials(username, pass);
    if (!res.success || !res.userId) {
      return { success: false, error: res.error || 'Invalid credentials' };
    }
    safeSetStorage(STORAGE_KEYS.USER_DOC_ID, res.userId);
    setActiveUserId(res.userId);
    setActivePortal('user');
    return { success: true };
  };

  const loginAdminWithGoogle = async (): Promise<ActionResult> => {
    const res = await signInAdminWithGoogle();
    if (!res.success || !res.admin) {
      return { success: false, error: res.error || 'Administrator sign-in failed' };
    }
    setAdminUser(res.admin);
    setActivePortal('admin');
    return { success: true };
  };

  const loginAdmin = async (_username: string, _pass: string): Promise<ActionResult> => {
    return loginAdminWithGoogle();
  };

  const logout = () => {
    safeRemoveStorage(STORAGE_KEYS.USER_DOC_ID);
    setActiveUserId(null);
    setCurrentUser(null);
    setAdminUser(null);
    void logoutFirebase();
  };

  const changePassword = async (_userId: string, oldPass: string, newPass: string): Promise<ActionResult> => {
    if (!currentUser) return { success: false, error: 'Not signed in' };
    return fsChangeOwnPassword(currentUser, oldPass, newPass);
  };

  const changeAdminCredentials = async (
    _currentPassword: string,
    _newPassword: string,
    _newUsername?: string
  ): Promise<ActionResult> => {
    return {
      success: false,
      error: `Admin authentication is managed via Google Sign-In (${BOOTSTRAPPED_ADMIN_EMAIL}).`
    };
  };

  // --- User Actions ---

  const placeBet = async (
    predictionId: string,
    choice: 'YES' | 'NO',
    amount: number
  ): Promise<ActionResult & { betId?: string }> => {
    if (!fbAuthUser || !currentUser) return { success: false, error: 'Please sign in first' };
    const pred = predictions.find(p => p.id === predictionId);
    if (!pred) return { success: false, error: 'Prediction market not found' };
    try {
      return await fsPlaceBet(fbAuthUser.uid, currentUser, pred, choice, amount);
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to place prediction' };
    }
  };

  const requestDeposit = async (
    amount: number,
    paymentMethod: string,
    referenceNumber: string,
    notes?: string
  ): Promise<ActionResult> => {
    if (!fbAuthUser || !currentUser) return { success: false, error: 'Please sign in first' };
    try {
      return await fsRequestDeposit(fbAuthUser.uid, currentUser, amount, paymentMethod, referenceNumber, notes);
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to submit deposit request' };
    }
  };

  const requestWithdrawal = async (
    amount: number,
    payoutMethod: string,
    payoutDetails: string
  ): Promise<ActionResult> => {
    if (!fbAuthUser || !currentUser) return { success: false, error: 'Please sign in first' };
    try {
      return await fsRequestWithdrawal(fbAuthUser.uid, currentUser, amount, payoutMethod, payoutDetails);
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to submit withdrawal request' };
    }
  };

  // --- Admin Actions ---

  const createUser = async (data: {
    username: string;
    password: string;
    fullName: string;
    email?: string;
    phone?: string;
    initialCoins?: number;
    notes?: string;
  }): Promise<ActionResult & { user?: User }> => {
    try {
      return await fsCreateUser(data);
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to create user' };
    }
  };

  const updateUser = async (userId: string, data: Partial<User>): Promise<ActionResult> => {
    try {
      return await fsUpdateUser(userId, data);
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update user' };
    }
  };

  const toggleUserStatus = async (userId: string): Promise<ActionResult> => {
    const user = users.find(u => u.id === userId);
    if (!user) return { success: false, error: 'User not found' };
    try {
      return await fsToggleUserStatus(user);
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update user status' };
    }
  };

  const resetUserPassword = async (userId: string, newPass: string): Promise<ActionResult> => {
    const user = users.find(u => u.id === userId);
    if (!user) return { success: false, error: 'User not found' };
    try {
      return await fsResetUserPassword(user, newPass);
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to reset password' };
    }
  };

  const deleteUser = async (userId: string): Promise<ActionResult> => {
    const user = users.find(u => u.id === userId);
    if (!user) return { success: false, error: 'User not found' };
    try {
      return await fsDeleteUser(user);
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to delete user' };
    }
  };

  const adjustUserCoins = async (
    userId: string,
    type: 'credit' | 'debit' | 'set',
    amount: number,
    reason: string
  ): Promise<ActionResult> => {
    const target = users.find(u => u.id === userId);
    if (!target || !adminUser) return { success: false, error: 'User or Admin not found' };
    try {
      return await fsAdjustUserCoins(adminUser, target, type, amount, reason);
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to adjust coins' };
    }
  };

  const createPrediction = async (
    data: Omit<Prediction, 'id' | 'createdAt' | 'totalYesVolume' | 'totalNoVolume' | 'totalParticipants' | 'outcome'>
  ): Promise<ActionResult & { prediction?: Prediction }> => {
    try {
      return await fsCreatePrediction(data);
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to create prediction' };
    }
  };

  const updatePrediction = async (id: string, data: Partial<Prediction>): Promise<ActionResult> => {
    try {
      return await fsUpdatePrediction(id, data);
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update prediction' };
    }
  };

  const setPredictionStatus = async (id: string, status: PredictionStatus): Promise<ActionResult> => {
    return updatePrediction(id, { status });
  };

  const deletePrediction = async (
    id: string
  ): Promise<ActionResult & { refundedCount?: number; refundedTotal?: number }> => {
    try {
      return await fsDeletePrediction(id, bets, users);
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to delete prediction' };
    }
  };

  const settlePrediction = async (
    predictionId: string,
    outcome: 'YES' | 'NO' | 'VOID'
  ): Promise<ActionResult & { winnersCount: number; totalPayout: number }> => {
    try {
      return await fsSettlePrediction(predictionId, outcome, adminUser?.username || 'admin', bets, users);
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to settle prediction',
        winnersCount: 0,
        totalPayout: 0
      };
    }
  };

  const reviewDeposit = async (
    depositId: string,
    action: 'approve' | 'reject',
    adminRemark?: string
  ): Promise<ActionResult> => {
    const dep = deposits.find(d => d.id === depositId);
    if (!dep) return { success: false, error: 'Deposit not found' };
    const targetUser = users.find(u => u.id === dep.userId);
    try {
      return await fsReviewDeposit(dep, action, adminUser?.username || 'admin', targetUser, adminRemark);
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to review deposit' };
    }
  };

  const reviewWithdrawal = async (
    withdrawalId: string,
    action: 'approve' | 'reject' | 'processing',
    adminRemark?: string
  ): Promise<ActionResult> => {
    const wdr = withdrawals.find(w => w.id === withdrawalId);
    if (!wdr) return { success: false, error: 'Withdrawal not found' };
    const targetUser = users.find(u => u.id === wdr.userId);
    try {
      return await fsReviewWithdrawal(wdr, action, adminUser?.username || 'admin', targetUser, adminRemark);
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to review withdrawal' };
    }
  };

  const updateGlobalPaymentGateway = async (config: Omit<PaymentGatewayConfig, 'updatedAt'>): Promise<ActionResult> => {
    try {
      return await fsUpdateGlobalPaymentGateway(config);
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update payment gateway' };
    }
  };

  const updateUserPaymentGateway = async (
    userId: string,
    config: Omit<PaymentGatewayConfig, 'updatedAt'> | null
  ): Promise<ActionResult> => {
    try {
      return await fsUpdateUserPaymentGateway(userId, config);
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update user gateway' };
    }
  };

  const getEffectivePaymentGateway = (userId?: string): PaymentGatewayConfig => {
    if (activePortal === 'user' && currentUser && (!userId || userId === currentUser.id)) {
      if (currentUser.customPaymentGateway && currentUser.customPaymentGateway.channels.length > 0) {
        return currentUser.customPaymentGateway;
      }
      return paymentGateway;
    }
    if (userId) {
      const user = users.find(u => u.id === userId);
      if (user?.customPaymentGateway && user.customPaymentGateway.channels.length > 0) {
        return user.customPaymentGateway;
      }
    }
    return paymentGateway;
  };

  const updateWhatsAppSupport = async (config: Omit<WhatsAppSupportConfig, 'updatedAt'>): Promise<ActionResult> => {
    try {
      return await fsUpdateWhatsAppSupport(config);
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update WhatsApp support' };
    }
  };

  const sendAdminIdChatReply = async (params: {
    chatId: string;
    text: string;
    issuedUsername?: string;
    issuedPassword?: string;
    nextStatus?: IdChatStatus;
  }): Promise<ActionResult> => {
    try {
      return await fsAdminSendIdChatReply({
        chatId: params.chatId,
        adminName: adminUser?.fullName || adminUser?.username || 'Admin',
        text: params.text,
        issuedUsername: params.issuedUsername,
        issuedPassword: params.issuedPassword,
        nextStatus: params.nextStatus
      });
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to send reply' };
    }
  };

  const updateIdChatStatus = async (chatId: string, status: IdChatStatus): Promise<ActionResult> => {
    try {
      return await fsAdminUpdateIdChatStatus(chatId, status);
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update chat status' };
    }
  };

  const markIdChatRead = async (chatId: string, role: 'user' | 'admin'): Promise<void> => {
    await fsMarkIdChatRead(chatId, role);
  };

  return (
    <AppContext.Provider
      value={{
        activePortal,
        setActivePortal,
        currentUser,
        adminUser,
        isHydrating,
        loginUser,
        loginAdmin,
        loginAdminWithGoogle,
        logout,
        changePassword,
        changeAdminCredentials,

        users,
        predictions,
        bets,
        transactions,
        deposits,
        withdrawals,
        coinLogs,
        stats,

        placeBet,
        requestDeposit,
        requestWithdrawal,

        createUser,
        updateUser,
        toggleUserStatus,
        resetUserPassword,
        deleteUser,

        adjustUserCoins,

        createPrediction,
        updatePrediction,
        setPredictionStatus,
        deletePrediction,
        settlePrediction,

        reviewDeposit,
        reviewWithdrawal,
        paymentGateway,
        updateGlobalPaymentGateway,
        updateUserPaymentGateway,
        getEffectivePaymentGateway,
        whatsappSupport,
        updateWhatsAppSupport,
        idChats,
        sendAdminIdChatReply,
        updateIdChatStatus,
        markIdChatRead
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
