import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  WhatsAppSupportConfig
} from '../types';
import { handleStaticApiRequest } from '../utils/staticFallback';

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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USER_TOKEN: 'apex_user_token_v2',
  ADMIN_TOKEN: 'apex_admin_token_v2',
  PORTAL: 'apex_active_portal_v2'
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

interface UserStatePayload {
  user: User;
  predictions: Prediction[];
  bets: Bet[];
  transactions: Transaction[];
  deposits: DepositRequest[];
  withdrawals: WithdrawalRequest[];
  effectivePaymentGateway: PaymentGatewayConfig;
  whatsappSupport?: WhatsAppSupportConfig;
}

interface AdminStatePayload {
  admin: User;
  users: User[];
  predictions: Prediction[];
  bets: Bet[];
  transactions: Transaction[];
  deposits: DepositRequest[];
  withdrawals: WithdrawalRequest[];
  coinLogs: CoinAdjustmentLog[];
  paymentGateway: PaymentGatewayConfig;
  whatsappSupport?: WhatsAppSupportConfig;
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

  const [userToken, setUserToken] = useState<string | null>(() => safeGetStorage(STORAGE_KEYS.USER_TOKEN));
  const [adminToken, setAdminToken] = useState<string | null>(() => safeGetStorage(STORAGE_KEYS.ADMIN_TOKEN));
  const [isHydrating, setIsHydrating] = useState<boolean>(true);
  const staticModeRef = useRef<boolean>(
    typeof window !== 'undefined' && window.location.hostname.endsWith('.github.io')
  );

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [userEffectiveGateway, setUserEffectiveGateway] = useState<PaymentGatewayConfig>(DEFAULT_PAYMENT_GATEWAY);

  const [users, setUsers] = useState<User[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [bets, setBets] = useState<Bet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [coinLogs, setCoinLogs] = useState<CoinAdjustmentLog[]>([]);
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

  const stateEpochRef = useRef<number>(0);

  const applyUserState = useCallback((state: UserStatePayload, isMutation = false) => {
    if (isMutation) stateEpochRef.current += 1;
    setCurrentUser(state.user);
    setPredictions(state.predictions);
    setBets(state.bets);
    setTransactions(state.transactions);
    setDeposits(state.deposits);
    setWithdrawals(state.withdrawals);
    setUserEffectiveGateway(prev =>
      JSON.stringify(prev) === JSON.stringify(state.effectivePaymentGateway)
        ? prev
        : state.effectivePaymentGateway
    );
    if (state.whatsappSupport) {
      const nextWa = state.whatsappSupport;
      setWhatsappSupport(prev =>
        JSON.stringify(prev) === JSON.stringify(nextWa) ? prev : nextWa
      );
    }
  }, []);

  const applyAdminState = useCallback((state: AdminStatePayload, isMutation = false) => {
    if (isMutation) stateEpochRef.current += 1;
    setAdminUser(state.admin);
    setUsers(state.users);
    setPredictions(state.predictions);
    setBets(state.bets);
    setTransactions(state.transactions);
    setDeposits(state.deposits);
    setWithdrawals(state.withdrawals);
    setCoinLogs(state.coinLogs);
    setPaymentGateway(prev =>
      JSON.stringify(prev) === JSON.stringify(state.paymentGateway)
        ? prev
        : state.paymentGateway
    );
    if (state.whatsappSupport) {
      const nextWa = state.whatsappSupport;
      setWhatsappSupport(prev =>
        JSON.stringify(prev) === JSON.stringify(nextWa) ? prev : nextWa
      );
    }
  }, []);

  const apiCall = useCallback(
    async <T = Record<string, unknown>>(
      url: string,
      options: RequestInit = {},
      token?: string | null
    ): Promise<{ ok: boolean; status: number; data: T & { success?: boolean; error?: string } }> => {
      if (staticModeRef.current) {
        return handleStaticApiRequest(url, options, token) as {
          ok: boolean;
          status: number;
          data: T & { success?: boolean; error?: string };
        };
      }
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> | undefined)
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const res = await fetch(url, { ...options, headers, cache: 'no-store' });
      const contentType = res.headers.get('content-type') || '';
      if (res.status === 404 && !contentType.includes('application/json')) {
        staticModeRef.current = true;
        return handleStaticApiRequest(url, options, token) as {
          ok: boolean;
          status: number;
          data: T & { success?: boolean; error?: string };
        };
      }
      let data = {} as T & { success?: boolean; error?: string };
      try {
        data = (await res.json()) as T & { success?: boolean; error?: string };
      } catch {
        // Ignore invalid JSON
      }
      return { ok: res.ok, status: res.status, data };
    },
    []
  );

  const refreshState = useCallback(async () => {
    const startEpoch = stateEpochRef.current;
    try {
      if (activePortal === 'admin') {
        if (adminToken) {
          const res = await apiCall<{ state?: AdminStatePayload }>('/api/admin/state', { method: 'GET' }, adminToken);
          if (stateEpochRef.current !== startEpoch) return;
          if (res.ok && res.data.state) {
            applyAdminState(res.data.state);
            return;
          }
          if (res.status === 401 || res.status === 403) {
            setAdminToken(null);
            setAdminUser(null);
            safeRemoveStorage(STORAGE_KEYS.ADMIN_TOKEN);
          }
        }
        const pub = await apiCall<{ predictions?: Prediction[]; whatsappSupport?: WhatsAppSupportConfig }>('/api/public', { method: 'GET' });
        if (stateEpochRef.current !== startEpoch) return;
        if (pub.ok && pub.data.predictions) {
          setPredictions(pub.data.predictions);
        }
        if (pub.ok && pub.data.whatsappSupport) {
          const nextWa = pub.data.whatsappSupport;
          setWhatsappSupport(prev =>
            JSON.stringify(prev) === JSON.stringify(nextWa) ? prev : nextWa
          );
        }
      } else {
        if (userToken) {
          const res = await apiCall<{ state?: UserStatePayload }>('/api/user/state', { method: 'GET' }, userToken);
          if (stateEpochRef.current !== startEpoch) return;
          if (res.ok && res.data.state) {
            applyUserState(res.data.state);
            return;
          }
          if (res.status === 401 || res.status === 403) {
            setUserToken(null);
            setCurrentUser(null);
            safeRemoveStorage(STORAGE_KEYS.USER_TOKEN);
          }
        }
        const pub = await apiCall<{ predictions?: Prediction[]; whatsappSupport?: WhatsAppSupportConfig }>('/api/public', { method: 'GET' });
        if (stateEpochRef.current !== startEpoch) return;
        if (pub.ok && pub.data.predictions) {
          setPredictions(pub.data.predictions);
        }
        if (pub.ok && pub.data.whatsappSupport) {
          const nextWa = pub.data.whatsappSupport;
          setWhatsappSupport(prev =>
            JSON.stringify(prev) === JSON.stringify(nextWa) ? prev : nextWa
          );
        }
      }
    } catch {
      // Network hiccup — retry on next poll
    }
  }, [activePortal, adminToken, userToken, apiCall, applyAdminState, applyUserState]);

  // Initial hydration + portal switch refresh
  useEffect(() => {
    let active = true;
    (async () => {
      await refreshState();
      if (active) setIsHydrating(false);
    })();
    return () => {
      active = false;
    };
  }, [refreshState]);

  // Live sync polling across devices (every 5s + window focus)
  useEffect(() => {
    const interval = setInterval(() => {
      refreshState();
    }, 5000);
    const onFocus = () => refreshState();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshState]);

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
    try {
      const res = await apiCall<{ token?: string; state?: UserStatePayload }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password: pass })
      });
      if (!res.ok || !res.data.success || !res.data.token || !res.data.state) {
        return { success: false, error: res.data.error || 'Invalid credentials' };
      }
      safeSetStorage(STORAGE_KEYS.USER_TOKEN, res.data.token);
      setUserToken(res.data.token);
      applyUserState(res.data.state);
      setActivePortal('user');
      return { success: true };
    } catch {
      return { success: false, error: 'Unable to reach server. Please try again.' };
    }
  };

  const loginAdmin = async (username: string, pass: string): Promise<ActionResult> => {
    try {
      const res = await apiCall<{ token?: string; state?: AdminStatePayload }>('/api/auth/admin-login', {
        method: 'POST',
        body: JSON.stringify({ username, password: pass })
      });
      if (!res.ok || !res.data.success || !res.data.token || !res.data.state) {
        return { success: false, error: res.data.error || 'Invalid administrator credentials' };
      }
      safeSetStorage(STORAGE_KEYS.ADMIN_TOKEN, res.data.token);
      setAdminToken(res.data.token);
      applyAdminState(res.data.state);
      setActivePortal('admin');
      return { success: true };
    } catch {
      return { success: false, error: 'Unable to reach server. Please try again.' };
    }
  };

  const logout = () => {
    if (activePortal === 'admin') {
      safeRemoveStorage(STORAGE_KEYS.ADMIN_TOKEN);
      setAdminToken(null);
      setAdminUser(null);
      setUsers([]);
      setCoinLogs([]);
    } else {
      safeRemoveStorage(STORAGE_KEYS.USER_TOKEN);
      setUserToken(null);
      setCurrentUser(null);
      setBets([]);
      setTransactions([]);
      setDeposits([]);
      setWithdrawals([]);
    }
  };

  const changePassword = async (_userId: string, oldPass: string, newPass: string): Promise<ActionResult> => {
    const res = await apiCall(
      '/api/user/change-password',
      { method: 'POST', body: JSON.stringify({ oldPassword: oldPass, newPassword: newPass }) },
      userToken
    );
    return { success: !!res.data.success, error: res.data.error };
  };

  const changeAdminCredentials = async (
    currentPassword: string,
    newPassword: string,
    newUsername?: string
  ): Promise<ActionResult> => {
    const res = await apiCall<{ state?: AdminStatePayload }>(
      '/api/admin/change-password',
      {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword, newUsername })
      },
      adminToken
    );
    if (res.ok && res.data.success && res.data.state) {
      applyAdminState(res.data.state);
      return { success: true };
    }
    return { success: false, error: res.data.error || 'Failed to update admin credentials' };
  };

  // --- User Actions ---

  const placeBet = async (
    predictionId: string,
    choice: 'YES' | 'NO',
    amount: number
  ): Promise<ActionResult & { betId?: string }> => {
    const res = await apiCall<{ betId?: string; state?: UserStatePayload }>(
      '/api/user/bets',
      { method: 'POST', body: JSON.stringify({ predictionId, choice, amount }) },
      userToken
    );
    if (res.ok && res.data.success && res.data.state) {
      applyUserState(res.data.state);
      return { success: true, betId: res.data.betId };
    }
    return { success: false, error: res.data.error || 'Failed to place prediction' };
  };

  const requestDeposit = async (
    amount: number,
    paymentMethod: string,
    referenceNumber: string,
    notes?: string
  ): Promise<ActionResult> => {
    const res = await apiCall<{ state?: UserStatePayload }>(
      '/api/user/deposits',
      { method: 'POST', body: JSON.stringify({ amount, paymentMethod, referenceNumber, notes }) },
      userToken
    );
    if (res.ok && res.data.success && res.data.state) {
      applyUserState(res.data.state);
      return { success: true };
    }
    return { success: false, error: res.data.error || 'Failed to submit deposit request' };
  };

  const requestWithdrawal = async (
    amount: number,
    payoutMethod: string,
    payoutDetails: string
  ): Promise<ActionResult> => {
    const res = await apiCall<{ state?: UserStatePayload }>(
      '/api/user/withdrawals',
      { method: 'POST', body: JSON.stringify({ amount, payoutMethod, payoutDetails }) },
      userToken
    );
    if (res.ok && res.data.success && res.data.state) {
      applyUserState(res.data.state);
      return { success: true };
    }
    return { success: false, error: res.data.error || 'Failed to submit withdrawal request' };
  };

  // --- Admin Actions - Users ---

  const createUser = async (data: {
    username: string;
    password: string;
    fullName: string;
    email?: string;
    phone?: string;
    initialCoins?: number;
    notes?: string;
  }): Promise<ActionResult & { user?: User }> => {
    const res = await apiCall<{ user?: User; state?: AdminStatePayload }>(
      '/api/admin/users',
      { method: 'POST', body: JSON.stringify(data) },
      adminToken
    );
    if (res.ok && res.data.success && res.data.state) {
      applyAdminState(res.data.state);
      return { success: true, user: res.data.user };
    }
    return { success: false, error: res.data.error || 'Failed to create user account' };
  };

  const updateUser = async (userId: string, data: Partial<User>): Promise<ActionResult> => {
    const res = await apiCall<{ state?: AdminStatePayload }>(
      `/api/admin/users/${encodeURIComponent(userId)}`,
      { method: 'PATCH', body: JSON.stringify(data) },
      adminToken
    );
    if (res.ok && res.data.success && res.data.state) {
      applyAdminState(res.data.state);
      return { success: true };
    }
    return { success: false, error: res.data.error || 'Failed to update user' };
  };

  const toggleUserStatus = async (userId: string): Promise<ActionResult> => {
    const res = await apiCall<{ state?: AdminStatePayload }>(
      `/api/admin/users/${encodeURIComponent(userId)}/toggle-status`,
      { method: 'POST' },
      adminToken
    );
    if (res.ok && res.data.success && res.data.state) {
      applyAdminState(res.data.state);
      return { success: true };
    }
    return { success: false, error: res.data.error || 'Failed to toggle user status' };
  };

  const resetUserPassword = async (userId: string, newPass: string): Promise<ActionResult> => {
    const res = await apiCall<{ state?: AdminStatePayload }>(
      `/api/admin/users/${encodeURIComponent(userId)}/reset-password`,
      { method: 'POST', body: JSON.stringify({ newPassword: newPass }) },
      adminToken
    );
    if (res.ok && res.data.success && res.data.state) {
      applyAdminState(res.data.state);
      return { success: true };
    }
    return { success: false, error: res.data.error || 'Failed to reset password' };
  };

  const deleteUser = async (userId: string): Promise<ActionResult> => {
    const res = await apiCall<{ state?: AdminStatePayload }>(
      `/api/admin/users/${encodeURIComponent(userId)}`,
      { method: 'DELETE' },
      adminToken
    );
    if (res.ok && res.data.success && res.data.state) {
      applyAdminState(res.data.state);
      return { success: true };
    }
    return { success: false, error: res.data.error || 'Failed to delete user' };
  };

  // --- Admin Actions - Coins ---

  const adjustUserCoins = async (
    userId: string,
    type: 'credit' | 'debit' | 'set',
    amount: number,
    reason: string
  ): Promise<ActionResult> => {
    const res = await apiCall<{ state?: AdminStatePayload }>(
      `/api/admin/users/${encodeURIComponent(userId)}/coins`,
      { method: 'POST', body: JSON.stringify({ type, amount, reason }) },
      adminToken
    );
    if (res.ok && res.data.success && res.data.state) {
      applyAdminState(res.data.state);
      return { success: true };
    }
    return { success: false, error: res.data.error || 'Failed to adjust coins' };
  };

  // --- Admin Actions - Predictions ---

  const createPrediction = async (
    data: Omit<Prediction, 'id' | 'createdAt' | 'totalYesVolume' | 'totalNoVolume' | 'totalParticipants' | 'outcome'>
  ): Promise<ActionResult & { prediction?: Prediction }> => {
    const res = await apiCall<{ prediction?: Prediction; state?: AdminStatePayload }>(
      '/api/admin/predictions',
      { method: 'POST', body: JSON.stringify(data) },
      adminToken
    );
    if (res.ok && res.data.success && res.data.state) {
      applyAdminState(res.data.state);
      return { success: true, prediction: res.data.prediction };
    }
    return { success: false, error: res.data.error || 'Failed to create prediction' };
  };

  const updatePrediction = async (id: string, data: Partial<Prediction>): Promise<ActionResult> => {
    const res = await apiCall<{ state?: AdminStatePayload }>(
      `/api/admin/predictions/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: JSON.stringify(data) },
      adminToken
    );
    if (res.ok && res.data.success && res.data.state) {
      applyAdminState(res.data.state);
      return { success: true };
    }
    return { success: false, error: res.data.error || 'Failed to update prediction' };
  };

  const setPredictionStatus = async (id: string, status: PredictionStatus): Promise<ActionResult> => {
    const res = await apiCall<{ state?: AdminStatePayload }>(
      `/api/admin/predictions/${encodeURIComponent(id)}/status`,
      { method: 'POST', body: JSON.stringify({ status }) },
      adminToken
    );
    if (res.ok && res.data.success && res.data.state) {
      applyAdminState(res.data.state);
      return { success: true };
    }
    return { success: false, error: res.data.error || 'Failed to update status' };
  };

  const deletePrediction = async (
    id: string
  ): Promise<ActionResult & { refundedCount?: number; refundedTotal?: number }> => {
    const res = await apiCall<{ refundedCount?: number; refundedTotal?: number; state?: AdminStatePayload }>(
      `/api/admin/predictions/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      adminToken
    );
    if (res.ok && res.data.success && res.data.state) {
      applyAdminState(res.data.state);
      return {
        success: true,
        refundedCount: res.data.refundedCount,
        refundedTotal: res.data.refundedTotal
      };
    }
    return { success: false, error: res.data.error || 'Failed to delete prediction' };
  };

  const settlePrediction = async (
    predictionId: string,
    outcome: 'YES' | 'NO' | 'VOID'
  ): Promise<ActionResult & { winnersCount: number; totalPayout: number }> => {
    const res = await apiCall<{ winnersCount?: number; totalPayout?: number; state?: AdminStatePayload }>(
      `/api/admin/predictions/${encodeURIComponent(predictionId)}/settle`,
      { method: 'POST', body: JSON.stringify({ outcome }) },
      adminToken
    );
    if (res.ok && res.data.success && res.data.state) {
      applyAdminState(res.data.state);
      return {
        success: true,
        winnersCount: res.data.winnersCount || 0,
        totalPayout: res.data.totalPayout || 0
      };
    }
    return {
      success: false,
      error: res.data.error || 'Failed to settle prediction',
      winnersCount: 0,
      totalPayout: 0
    };
  };

  // --- Admin Actions - Financial Requests & Payment Gateway ---

  const reviewDeposit = async (
    depositId: string,
    action: 'approve' | 'reject',
    adminRemark?: string
  ): Promise<ActionResult> => {
    const res = await apiCall<{ state?: AdminStatePayload }>(
      `/api/admin/deposits/${encodeURIComponent(depositId)}/review`,
      { method: 'POST', body: JSON.stringify({ action, adminRemark }) },
      adminToken
    );
    if (res.ok && res.data.success && res.data.state) {
      applyAdminState(res.data.state);
      return { success: true };
    }
    return { success: false, error: res.data.error || 'Failed to review deposit' };
  };

  const reviewWithdrawal = async (
    withdrawalId: string,
    action: 'approve' | 'reject' | 'processing',
    adminRemark?: string
  ): Promise<ActionResult> => {
    const res = await apiCall<{ state?: AdminStatePayload }>(
      `/api/admin/withdrawals/${encodeURIComponent(withdrawalId)}/review`,
      { method: 'POST', body: JSON.stringify({ action, adminRemark }) },
      adminToken
    );
    if (res.ok && res.data.success && res.data.state) {
      applyAdminState(res.data.state);
      return { success: true };
    }
    return { success: false, error: res.data.error || 'Failed to review withdrawal' };
  };

  const updateGlobalPaymentGateway = async (config: Omit<PaymentGatewayConfig, 'updatedAt'>): Promise<ActionResult> => {
    stateEpochRef.current += 1;
    const res = await apiCall<{ state?: AdminStatePayload }>(
      '/api/admin/payment-gateway',
      { method: 'PUT', body: JSON.stringify(config) },
      adminToken
    );
    if (res.ok && res.data.success && res.data.state) {
      applyAdminState(res.data.state, true);
      return { success: true };
    }
    return { success: false, error: res.data.error || 'Failed to update payment gateway' };
  };

  const updateUserPaymentGateway = async (
    userId: string,
    config: Omit<PaymentGatewayConfig, 'updatedAt'> | null
  ): Promise<ActionResult> => {
    stateEpochRef.current += 1;
    const res = await apiCall<{ state?: AdminStatePayload }>(
      `/api/admin/users/${encodeURIComponent(userId)}/payment-gateway`,
      { method: 'PUT', body: JSON.stringify({ config }) },
      adminToken
    );
    if (res.ok && res.data.success && res.data.state) {
      applyAdminState(res.data.state, true);
      return { success: true };
    }
    return { success: false, error: res.data.error || 'Failed to update user payment gateway' };
  };

  const getEffectivePaymentGateway = (userId?: string): PaymentGatewayConfig => {
    if (activePortal === 'user' && currentUser && (!userId || userId === currentUser.id)) {
      return userEffectiveGateway;
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
    stateEpochRef.current += 1;
    const res = await apiCall<{ state?: AdminStatePayload }>(
      '/api/admin/whatsapp-support',
      { method: 'PUT', body: JSON.stringify(config) },
      adminToken
    );
    if (res.ok && res.data.success && res.data.state) {
      applyAdminState(res.data.state, true);
      return { success: true };
    }
    return { success: false, error: res.data.error || 'Failed to update WhatsApp support settings' };
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
        updateWhatsAppSupport
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
