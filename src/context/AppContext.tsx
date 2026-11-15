import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { onAuthStateChanged, type ConfirmationResult, type User as FirebaseAuthUser } from 'firebase/auth';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { isMarketBettingOpen } from '../utils/marketTiming';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  checkIsFirebaseAdmin,
  clearPhoneRecaptchaVerifier,
  completePhoneOtpForLoggedInUser,
  completePhoneOtpPasswordReset,
  completePhoneOtpRegistration,
  fsAdjustUserCoins,
  fsChangeOwnPassword,
  fsCreatePrediction,
  fsCreateUser,
  fsDeletePrediction,
  fsDeleteUser,
  fsGetOwnPrivatePhone,
  fsPlaceBet,
  fsPlaceParlayBet,
  fsRequestDeposit,
  fsUploadDepositProof,
  fsRequestWithdrawal,
  fsResetUserPassword,
  fsReviewDeposit,
  fsReviewWithdrawal,
  fsUploadWithdrawalProof,
  fsSettlePrediction,
  fsToggleUserStatus,
  fsUpdateGlobalPaymentGateway,
  fsUpdatePrediction,
  fsUpdateUser,
  fsUpdateUserPaymentGateway,
  fsUpdateWhatsAppSupport,
  fsAdminSendIdChatReply,
  fsAdminUpdateIdChatStatus,
  fsAdminDeleteIdChat,
  fsMarkIdChatRead,
  logoutFirebase,
  seedInitialFirestoreIfNeeded,
  sendPhoneOtpForLoggedInUser,
  sendPhoneOtpForPasswordReset,
  sendPhoneOtpForRegistration,
  signInAdminWithGoogle,
  signInUserWithCredentials,
  subscribeAdminPortalData,
  subscribePublicData,
  subscribeUserPortalData
} from '../services/firestoreService';
import {
  CricketLiveClient,
  fetchCricketMatchesRest,
  fetchCricketMatchDetailRest
} from '../services/cricketLiveClient';
import {
  User,
  Prediction,
  Bet,
  ParlayBet,
  BuilderSelection,
  LiveCricketMatch,
  LiveCricketDetail,
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
  sendRegistrationOtp: (params: {
    fullName: string;
    username: string;
    phone: string;
    countryCode?: string;
    recaptchaContainerId?: string;
  }) => Promise<
    ActionResult & {
      confirmationResult?: ConfirmationResult;
      e164Phone?: string;
      normalizedUsername?: string;
    }
  >;
  completeRegistrationOtp: (params: {
    confirmationResult: ConfirmationResult;
    otpCode: string;
    fullName: string;
    username: string;
    password: string;
    e164Phone: string;
  }) => Promise<ActionResult & { userId?: string; username?: string }>;
  sendPasswordResetOtp: (params: {
    phone: string;
    countryCode?: string;
    recaptchaContainerId?: string;
  }) => Promise<
    ActionResult & {
      confirmationResult?: ConfirmationResult;
      e164Phone?: string;
      username?: string;
    }
  >;
  completePasswordResetOtp: (params: {
    confirmationResult: ConfirmationResult;
    otpCode: string;
    newPassword: string;
    e164Phone: string;
  }) => Promise<ActionResult & { userId?: string; username?: string }>;
  sendOwnPhoneOtp: (params: {
    phone: string;
    countryCode?: string;
    recaptchaContainerId?: string;
  }) => Promise<
    ActionResult & {
      confirmationResult?: ConfirmationResult;
      e164Phone?: string;
    }
  >;
  completeOwnPhoneOtp: (params: {
    confirmationResult: ConfirmationResult;
    otpCode: string;
    newPassword: string;
    e164Phone: string;
  }) => Promise<ActionResult>;
  getOwnPrivatePhone: () => Promise<string>;
  clearPhoneRecaptcha: (containerId?: string) => void;
  loginAdmin: (username: string, pass: string) => Promise<ActionResult>;
  loginAdminWithGoogle: () => Promise<ActionResult>;
  logout: () => void;
  changePassword: (userId: string, oldPass: string, newPass: string) => Promise<ActionResult>;
  changeAdminCredentials: (currentPassword: string, newPassword: string, newUsername?: string) => Promise<ActionResult>;

  // Data
  users: User[];
  predictions: Prediction[];
  bets: Bet[];
  parlayBets: ParlayBet[];
  transactions: Transaction[];
  deposits: DepositRequest[];
  withdrawals: WithdrawalRequest[];
  coinLogs: CoinAdjustmentLog[];
  stats: PlatformStats;
  nowMs: number;
  portalDataError: string | null;

  // Live Cricket Real-Time Stream
  liveCricketMatches: LiveCricketMatch[];
  liveCricketFetchedAt: string;
  cricketStreamConnected: boolean;
  cricketLoading: boolean;
  cricketError: string | null;
  activeCricketDetail: LiveCricketDetail | null;
  cricketDetailLoading: boolean;
  refreshCricketMatches: () => Promise<void>;
  selectCricketMatchForDetail: (match: LiveCricketMatch | null) => Promise<void>;

  // Bet Builder (Multi-Prediction Combo)
  builderSelections: BuilderSelection[];
  toggleBuilderLeg: (prediction: Prediction, choice: 'YES' | 'NO') => void;
  removeBuilderLeg: (predictionId: string) => void;
  clearBuilder: () => void;
  placeParlayBet: (amount: number) => Promise<
    ActionResult & { parlayId?: string; combinedOdds?: number; potentialWinnings?: number }
  >;

  // User Actions
  placeBet: (
    predictionId: string,
    choice: 'YES' | 'NO',
    amount: number
  ) => Promise<ActionResult & { betId?: string; lockedOdds?: number; lockedPayout?: number }>;
  requestDeposit: (
    amount: number,
    paymentMethod: string,
    referenceNumber: string,
    notes?: string,
    proofImageUrl?: string
  ) => Promise<ActionResult>;
  uploadDepositProof: (depositId: string, proofImageUrl: string) => Promise<ActionResult>;
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
    adminRemark?: string,
    proofImageUrl?: string
  ) => Promise<ActionResult>;
  uploadWithdrawalProof: (
    withdrawalId: string,
    proofImageUrl: string,
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
    imageUrl?: string;
    issuedUsername?: string;
    issuedPassword?: string;
    nextStatus?: IdChatStatus;
  }) => Promise<ActionResult>;
  updateIdChatStatus: (chatId: string, status: IdChatStatus) => Promise<ActionResult>;
  deleteIdChat: (chatId: string) => Promise<ActionResult>;
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
  const [parlayBets, setParlayBets] = useState<ParlayBet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [coinLogs, setCoinLogs] = useState<CoinAdjustmentLog[]>([]);
  const [idChats, setIdChats] = useState<IdChatThread[]>([]);
  const [paymentGateway, setPaymentGateway] = useState<PaymentGatewayConfig>(DEFAULT_PAYMENT_GATEWAY);
  const [whatsappSupport, setWhatsappSupport] = useState<WhatsAppSupportConfig>(DEFAULT_WHATSAPP_SUPPORT);
  const [portalDataError, setPortalDataError] = useState<string | null>(null);

  // Bet Builder state
  const [builderSelections, setBuilderSelections] = useState<BuilderSelection[]>([]);

  // Live Cricket Real-Time State
  const [liveCricketMatches, setLiveCricketMatches] = useState<LiveCricketMatch[]>([]);
  const [liveCricketFetchedAt, setLiveCricketFetchedAt] = useState<string>('');
  const [cricketStreamConnected, setCricketStreamConnected] = useState<boolean>(false);
  const [cricketLoading, setCricketLoading] = useState<boolean>(true);
  const [cricketError, setCricketError] = useState<string | null>(null);
  const [activeCricketDetail, setActiveCricketDetail] = useState<LiveCricketDetail | null>(null);
  const [cricketDetailLoading, setCricketDetailLoading] = useState<boolean>(false);
  const cricketClientRef = useRef<CricketLiveClient | null>(null);
  const selectedMatchKeyRef = useRef<string | null>(null);

  const clearPortalRecords = useCallback(() => {
    setUsers([]);
    setBets([]);
    setParlayBets([]);
    setTransactions([]);
    setDeposits([]);
    setWithdrawals([]);
    setCoinLogs([]);
    setIdChats([]);
    setPortalDataError(null);
  }, []);

  const setActivePortal = useCallback((portal: 'user' | 'admin') => {
    setActivePortalState(prev => {
      if (prev !== portal) {
        clearPortalRecords();
      }
      return portal;
    });
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
  }, [clearPortalRecords]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      setFbAuthUser(user);
      if (!user) {
        setAdminUser(null);
        setCurrentUser(null);
        setUsers([]);
        setBets([]);
        setParlayBets([]);
        setTransactions([]);
        setDeposits([]);
        setWithdrawals([]);
        setCoinLogs([]);
        setIdChats([]);
        setPortalDataError(null);
      }
      setIsHydrating(false);
    });
    return () => unsub();
  }, []);

  // Real-time Cricket Match WebSocket + Initial REST hydration
  const refreshCricketMatches = useCallback(async () => {
    setCricketLoading(true);
    try {
      const { matches, fetchedAt } = await fetchCricketMatchesRest();
      setLiveCricketMatches(matches);
      setLiveCricketFetchedAt(fetchedAt);
      setCricketError(null);
      cricketClientRef.current?.requestRefresh();
    } catch (err) {
      setCricketError(err instanceof Error ? err.message : 'Unable to load live cricket feed');
    } finally {
      setCricketLoading(false);
    }
  }, []);

  const selectCricketMatchForDetail = useCallback(async (match: LiveCricketMatch | null) => {
    if (!match) {
      selectedMatchKeyRef.current = null;
      setActiveCricketDetail(null);
      setCricketDetailLoading(false);
      return;
    }
    const key = `${match.leagueId}:${match.id}`;
    selectedMatchKeyRef.current = key;
    setCricketDetailLoading(true);
    cricketClientRef.current?.subscribeMatch(match.leagueId, match.id);
    try {
      const detail = await fetchCricketMatchDetailRest(match.leagueId, match.id);
      if (selectedMatchKeyRef.current === key) {
        setActiveCricketDetail(detail);
      }
    } catch {
      // Keep fallback match header even if scorecard detail endpoint fails
      if (selectedMatchKeyRef.current === key) {
        setActiveCricketDetail({
          match,
          matchcards: [],
          fetchedAt: new Date().toISOString()
        });
      }
    } finally {
      if (selectedMatchKeyRef.current === key) {
        setCricketDetailLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (activePortal !== 'admin' || !adminUser) {
      setCricketStreamConnected(false);
      setActiveCricketDetail(null);
      selectedMatchKeyRef.current = null;
      return;
    }

    let mounted = true;
    void refreshCricketMatches();

    const client = new CricketLiveClient({
      onMatches: (matches, fetchedAt) => {
        if (!mounted) return;
        setLiveCricketMatches(matches);
        setLiveCricketFetchedAt(fetchedAt);
        setCricketError(null);
        setCricketLoading(false);
      },
      onDetail: detail => {
        if (!mounted) return;
        const incomingKey = `${detail.match.leagueId}:${detail.match.id}`;
        if (selectedMatchKeyRef.current === incomingKey) {
          setActiveCricketDetail(detail);
          setCricketDetailLoading(false);
        }
      },
      onConnectionChange: connected => {
        if (!mounted) return;
        setCricketStreamConnected(connected);
      }
    });
    cricketClientRef.current = client;
    client.start();

    return () => {
      mounted = false;
      client.stop();
      cricketClientRef.current = null;
    };
  }, [activePortal, adminUser, refreshCricketMatches]);

  // Synchronized market clock (ticks every 5 seconds to auto-pause markets at exact closing time)
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const autoPausedKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 5000);
    return () => window.clearInterval(id);
  }, []);

  // Public predictions + WhatsApp support subscription (always live)
  useEffect(() => {
    const unsub = subscribePublicData({
      onPredictions: preds => setPredictions(preds),
      onWhatsAppSupport: cfg => setWhatsappSupport(prev => (JSON.stringify(prev) === JSON.stringify(cfg) ? prev : cfg))
    });
    return () => unsub();
  }, []);

  // Automatically persist status='paused' in Firestore for expired open markets when admin is signed in
  useEffect(() => {
    if (!adminUser || activePortal !== 'admin') return;
    for (const pred of predictions) {
      if (pred.status === 'open' && !isMarketBettingOpen(pred, nowMs)) {
        const key = `${pred.id}|${pred.closingTime}`;
        if (!autoPausedKeysRef.current.has(key)) {
          autoPausedKeysRef.current.add(key);
          void fsUpdatePrediction(pred.id, { status: 'paused' }).catch(() => {
            autoPausedKeysRef.current.delete(key);
          });
        }
      }
    }
  }, [adminUser, activePortal, predictions, nowMs]);

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
          onParlayBets: pb => setParlayBets(pb),
          onTransactions: t => setTransactions(t),
          onDeposits: d => setDeposits(d),
          onWithdrawals: w => setWithdrawals(w),
          onCoinLogs: l => setCoinLogs(l),
          onIdChats: c => setIdChats(c),
          onPaymentGateway: cfg =>
            setPaymentGateway(prev => (JSON.stringify(prev) === JSON.stringify(cfg) ? prev : cfg))
        });
      } else {
        setPortalDataError(null);
        let resolvedUserId: string | null = null;
        try {
          const q = query(collection(db, 'users'), where('ownerUid', '==', fbAuthUser.uid), limit(1));
          const snap = await getDocs(q);
          if (!snap.empty) {
            resolvedUserId = snap.docs[0].id;
            safeSetStorage(STORAGE_KEYS.USER_DOC_ID, resolvedUserId);
            if (active && resolvedUserId !== activeUserId) {
              setActiveUserId(resolvedUserId);
            }
          } else {
            // Current Firebase auth user has no player profile (e.g. admin switching to User App)
            safeRemoveStorage(STORAGE_KEYS.USER_DOC_ID);
            if (active) {
              setCurrentUser(null);
              clearPortalRecords();
              if (activeUserId !== null) setActiveUserId(null);
            }
            return;
          }
        } catch {
          resolvedUserId = activeUserId;
        }
        if (!active || !resolvedUserId) return;

        portalUnsub = subscribeUserPortalData(fbAuthUser.uid, resolvedUserId, {
          onUser: u => {
            if (!u || u.status === 'suspended' || (u.ownerUid && u.ownerUid !== fbAuthUser.uid)) {
              setCurrentUser(null);
              if (!u || (u.ownerUid && u.ownerUid !== fbAuthUser.uid)) {
                safeRemoveStorage(STORAGE_KEYS.USER_DOC_ID);
                setActiveUserId(null);
              }
              return;
            }
            setCurrentUser(u);
          },
          onBets: b => setBets(b),
          onParlayBets: pb => setParlayBets(pb),
          onTransactions: t => setTransactions(t),
          onDeposits: d => setDeposits(d),
          onWithdrawals: w => setWithdrawals(w),
          onPaymentGateway: cfg =>
            setPaymentGateway(prev => (JSON.stringify(prev) === JSON.stringify(cfg) ? prev : cfg)),
          onError: msg => setPortalDataError(msg)
        });
      }
    })();

    return () => {
      active = false;
      if (portalUnsub) portalUnsub();
    };
  }, [fbAuthUser, activePortal, activeUserId]);

  // Platform Stats (including Bet Builder parlays)
  const regularUsers = users.filter(u => u.id !== 'usr_admin');
  const stats: PlatformStats = {
    totalUsers: regularUsers.length,
    activeUsers: regularUsers.filter(u => u.status === 'active').length,
    suspendedUsers: regularUsers.filter(u => u.status === 'suspended').length,
    totalCoinsInCirculation: regularUsers.reduce((sum, u) => sum + u.coins, 0),
    totalPredictions: predictions.length,
    openPredictions: predictions.filter(p => isMarketBettingOpen(p, nowMs)).length,
    settledPredictions: predictions.filter(p => p.status === 'settled').length,
    totalBetsPlaced: bets.length + parlayBets.length,
    totalBetVolume:
      bets.reduce((sum, b) => sum + b.amount, 0) +
      parlayBets.reduce((sum, pb) => sum + pb.amount, 0),
    totalWonPayouts:
      bets.filter(b => b.result === 'won').reduce((sum, b) => sum + b.actualWinnings, 0) +
      parlayBets.filter(pb => pb.result === 'won').reduce((sum, pb) => sum + pb.actualWinnings, 0),
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

  const sendRegistrationOtp = async (params: {
    fullName: string;
    username: string;
    phone: string;
    countryCode?: string;
    recaptchaContainerId?: string;
  }) => {
    return sendPhoneOtpForRegistration(params);
  };

  const completeRegistrationOtp = async (params: {
    confirmationResult: ConfirmationResult;
    otpCode: string;
    fullName: string;
    username: string;
    password: string;
    e164Phone: string;
  }) => {
    const res = await completePhoneOtpRegistration(params);
    if (res.success && res.userId) {
      safeSetStorage(STORAGE_KEYS.USER_DOC_ID, res.userId);
      setActiveUserId(res.userId);
      setActivePortal('user');
    }
    return res;
  };

  const sendPasswordResetOtp = async (params: {
    phone: string;
    countryCode?: string;
    recaptchaContainerId?: string;
  }) => {
    return sendPhoneOtpForPasswordReset(params);
  };

  const completePasswordResetOtp = async (params: {
    confirmationResult: ConfirmationResult;
    otpCode: string;
    newPassword: string;
    e164Phone: string;
  }) => {
    const res = await completePhoneOtpPasswordReset(params);
    if (res.success && res.userId) {
      safeSetStorage(STORAGE_KEYS.USER_DOC_ID, res.userId);
      setActiveUserId(res.userId);
      setActivePortal('user');
    }
    return res;
  };

  const sendOwnPhoneOtp = async (params: {
    phone: string;
    countryCode?: string;
    recaptchaContainerId?: string;
  }) => {
    if (!currentUser) return { success: false, error: 'Not signed in' };
    return sendPhoneOtpForLoggedInUser({
      user: currentUser,
      ...params
    });
  };

  const completeOwnPhoneOtp = async (params: {
    confirmationResult: ConfirmationResult;
    otpCode: string;
    newPassword: string;
    e164Phone: string;
  }) => {
    if (!currentUser) return { success: false, error: 'Not signed in' };
    return completePhoneOtpForLoggedInUser({
      user: currentUser,
      ...params
    });
  };

  const getOwnPrivatePhone = async (): Promise<string> => {
    if (!currentUser) return '';
    return fsGetOwnPrivatePhone(currentUser.id);
  };

  const clearPhoneRecaptcha = (containerId?: string) => {
    clearPhoneRecaptchaVerifier(containerId);
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
    setBuilderSelections([]);
    clearPortalRecords();
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

  // --- Bet Builder Actions ---

  const toggleBuilderLeg = useCallback((prediction: Prediction, choice: 'YES' | 'NO') => {
    setBuilderSelections(prev => {
      const existingIdx = prev.findIndex(s => s.prediction.id === prediction.id);
      if (existingIdx >= 0) {
        const existing = prev[existingIdx];
        if (existing.choice === choice) {
          return prev.filter(s => s.prediction.id !== prediction.id);
        }
        return prev.map(s => (s.prediction.id === prediction.id ? { prediction, choice } : s));
      }
      if (prev.length >= 10) {
        return prev;
      }
      return [...prev, { prediction, choice }];
    });
  }, []);

  const removeBuilderLeg = useCallback((predictionId: string) => {
    setBuilderSelections(prev => prev.filter(s => s.prediction.id !== predictionId));
  }, []);

  const clearBuilder = useCallback(() => {
    setBuilderSelections([]);
  }, []);

  const placeParlayBet = async (
    amount: number
  ): Promise<ActionResult & { parlayId?: string; combinedOdds?: number; potentialWinnings?: number }> => {
    if (!fbAuthUser || !currentUser) return { success: false, error: 'Please sign in first' };
    if (builderSelections.length < 2) {
      return { success: false, error: 'Select at least 2 predictions to place a Bet Builder combo' };
    }
    try {
      // Sync latest prediction snapshots for each selected leg
      const syncedSelections = builderSelections.map(sel => {
        const latest = predictions.find(p => p.id === sel.prediction.id) || sel.prediction;
        return { prediction: latest, choice: sel.choice };
      });
      const res = await fsPlaceParlayBet(fbAuthUser.uid, currentUser, syncedSelections, amount);
      if (res.success) {
        setBuilderSelections([]);
      }
      return res;
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to place Bet Builder slip' };
    }
  };

  // --- User Actions ---

  const placeBet = async (
    predictionId: string,
    choice: 'YES' | 'NO',
    amount: number
  ): Promise<ActionResult & { betId?: string; lockedOdds?: number; lockedPayout?: number }> => {
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
    notes?: string,
    proofImageUrl?: string
  ): Promise<ActionResult> => {
    if (!fbAuthUser || !currentUser) return { success: false, error: 'Please sign in first' };
    try {
      return await fsRequestDeposit(
        fbAuthUser.uid,
        currentUser,
        amount,
        paymentMethod,
        referenceNumber,
        notes,
        proofImageUrl
      );
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to submit deposit request' };
    }
  };

  const uploadDepositProof = async (depositId: string, proofImageUrl: string): Promise<ActionResult> => {
    if (!fbAuthUser || !currentUser) return { success: false, error: 'Please sign in first' };
    const targetDeposit = deposits.find(d => d.id === depositId);
    if (!targetDeposit) return { success: false, error: 'Deposit request not found' };
    try {
      return await fsUploadDepositProof(targetDeposit, proofImageUrl);
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to upload deposit screenshot' };
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
    adminRemark?: string,
    proofImageUrl?: string
  ): Promise<ActionResult> => {
    const wdr = withdrawals.find(w => w.id === withdrawalId);
    if (!wdr) return { success: false, error: 'Withdrawal not found' };
    const targetUser = users.find(u => u.id === wdr.userId);
    try {
      return await fsReviewWithdrawal(
        wdr,
        action,
        adminUser?.username || 'admin',
        targetUser,
        adminRemark,
        proofImageUrl
      );
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to review withdrawal' };
    }
  };

  const uploadWithdrawalProof = async (
    withdrawalId: string,
    proofImageUrl: string,
    adminRemark?: string
  ): Promise<ActionResult> => {
    const wdr = withdrawals.find(w => w.id === withdrawalId);
    if (!wdr) return { success: false, error: 'Withdrawal not found' };
    try {
      return await fsUploadWithdrawalProof(
        wdr,
        proofImageUrl,
        adminUser?.username || 'admin',
        adminRemark
      );
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to upload screenshot' };
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
    imageUrl?: string;
    issuedUsername?: string;
    issuedPassword?: string;
    nextStatus?: IdChatStatus;
  }): Promise<ActionResult> => {
    try {
      return await fsAdminSendIdChatReply({
        chatId: params.chatId,
        adminName: adminUser?.fullName || adminUser?.username || 'Admin',
        text: params.text,
        imageUrl: params.imageUrl,
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

  const deleteIdChat = async (chatId: string): Promise<ActionResult> => {
    try {
      return await fsAdminDeleteIdChat(chatId);
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to delete chat' };
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
        sendRegistrationOtp,
        completeRegistrationOtp,
        sendPasswordResetOtp,
        completePasswordResetOtp,
        sendOwnPhoneOtp,
        completeOwnPhoneOtp,
        getOwnPrivatePhone,
        clearPhoneRecaptcha,
        loginAdmin,
        loginAdminWithGoogle,
        logout,
        changePassword,
        changeAdminCredentials,

        users,
        predictions,
        bets,
        parlayBets,
        transactions,
        deposits,
        withdrawals,
        coinLogs,
        stats,
        nowMs,
        portalDataError,

        liveCricketMatches,
        liveCricketFetchedAt,
        cricketStreamConnected,
        cricketLoading,
        cricketError,
        activeCricketDetail,
        cricketDetailLoading,
        refreshCricketMatches,
        selectCricketMatchForDetail,

        builderSelections,
        toggleBuilderLeg,
        removeBuilderLeg,
        clearBuilder,
        placeParlayBet,

        placeBet,
        requestDeposit,
        uploadDepositProof,
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
        uploadWithdrawalProof,
        paymentGateway,
        updateGlobalPaymentGateway,
        updateUserPaymentGateway,
        getEffectivePaymentGateway,
        whatsappSupport,
        updateWhatsAppSupport,
        idChats,
        sendAdminIdChatReply,
        updateIdChatStatus,
        deleteIdChat,
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
