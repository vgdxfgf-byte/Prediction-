import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
  serverTimestamp,
  Timestamp,
  type Unsubscribe
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  deleteUser as deleteFirebaseAuthUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  type User as FirebaseAuthUser
} from 'firebase/auth';
import { auth, db, getSecondaryAuth, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import type {
  User,
  Prediction,
  Bet,
  Transaction,
  DepositRequest,
  WithdrawalRequest,
  CoinAdjustmentLog,
  PaymentGatewayConfig,
  WhatsAppSupportConfig,
  PredictionStatus,
  IdChatThread,
  IdChatMessage,
  IdChatStatus
} from '../types';

export const BOOTSTRAPPED_ADMIN_EMAIL = 'vgdxfgf@gmail.com';

function toIso(value: unknown): string {
  if (!value) return new Date().toISOString();
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof value === 'string') return value;
  return new Date().toISOString();
}

export const SYNTHETIC_USER_DOMAIN = 'users.apexpredict.app';

export function sanitizeId(raw: string): string {
  const cleaned = raw.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  return cleaned.slice(0, 128) || `id_${Date.now()}`;
}

export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@+/, '');
}

export function usernameToInternalEmail(username: string): string {
  const clean = sanitizeId(normalizeUsername(username).toLowerCase());
  return `${clean}@${SYNTHETIC_USER_DOMAIN}`;
}

export function deriveFirebasePassword(rawPassword: string): string {
  return `ApexKey#${rawPassword.trim()}`;
}

function mapUserDoc(id: string, data: Record<string, unknown>): User {
  return {
    id: String(data.id || id),
    username: String(data.username || ''),
    passwordHash: '',
    fullName: String(data.fullName || 'Player'),
    coins: Number(data.coins ?? 0),
    status: data.status === 'suspended' ? 'suspended' : 'active',
    createdAt: toIso(data.createdAt),
    lastLogin: data.lastLogin ? String(data.lastLogin) : undefined,
    notes: data.notes ? String(data.notes) : undefined,
    customPaymentGateway: (data.customPaymentGateway as PaymentGatewayConfig | null | undefined) ?? null
  };
}

function mapPredictionDoc(id: string, data: Record<string, unknown>): Prediction {
  return {
    id: String(data.id || id),
    title: String(data.title || ''),
    subtitle: String(data.subtitle || ''),
    category: data.category as Prediction['category'],
    yesOdds: Number(data.yesOdds ?? 1.9),
    noOdds: Number(data.noOdds ?? 1.9),
    minBet: Number(data.minBet ?? 50),
    maxBet: Number(data.maxBet ?? 5000),
    closingTime: String(data.closingTime || new Date().toISOString()),
    status: (data.status as PredictionStatus) || 'open',
    outcome: (data.outcome as Prediction['outcome']) ?? null,
    totalYesVolume: Number(data.totalYesVolume ?? 0),
    totalNoVolume: Number(data.totalNoVolume ?? 0),
    totalParticipants: Number(data.totalParticipants ?? 0),
    createdAt: toIso(data.createdAt),
    settledAt: data.settledAt ? String(data.settledAt) : undefined,
    settledBy: data.settledBy ? String(data.settledBy) : undefined,
    iconName: data.iconName ? String(data.iconName) : undefined,
    description: data.description ? String(data.description) : undefined
  };
}

function mapBetDoc(id: string, data: Record<string, unknown>): Bet {
  return {
    id: String(data.id || id),
    userId: String(data.userId || ''),
    username: String(data.username || ''),
    predictionId: String(data.predictionId || ''),
    predictionTitle: String(data.predictionTitle || ''),
    predictionCategory: data.predictionCategory as Bet['predictionCategory'],
    choice: data.choice === 'NO' ? 'NO' : 'YES',
    odds: Number(data.odds ?? 1),
    amount: Number(data.amount ?? 0),
    potentialWinnings: Number(data.potentialWinnings ?? 0),
    actualWinnings: Number(data.actualWinnings ?? 0),
    result: (data.result as Bet['result']) || 'pending',
    createdAt: toIso(data.createdAt),
    settledAt: data.settledAt ? String(data.settledAt) : undefined,
    transactionId: String(data.transactionId || '')
  };
}

function mapTransactionDoc(id: string, data: Record<string, unknown>): Transaction {
  return {
    id: String(data.id || id),
    userId: String(data.userId || ''),
    username: String(data.username || ''),
    type: data.type as Transaction['type'],
    amount: Number(data.amount ?? 0),
    balanceBefore: Number(data.balanceBefore ?? 0),
    balanceAfter: Number(data.balanceAfter ?? 0),
    status: (data.status as Transaction['status']) || 'completed',
    description: String(data.description || ''),
    createdAt: toIso(data.createdAt),
    referenceId: data.referenceId ? String(data.referenceId) : undefined
  };
}

function mapDepositDoc(id: string, data: Record<string, unknown>): DepositRequest {
  return {
    id: String(data.id || id),
    userId: String(data.userId || ''),
    username: String(data.username || ''),
    amount: Number(data.amount ?? 0),
    paymentMethod: String(data.paymentMethod || ''),
    referenceNumber: String(data.referenceNumber || ''),
    notes: data.notes ? String(data.notes) : undefined,
    status: (data.status as DepositRequest['status']) || 'pending',
    createdAt: toIso(data.createdAt),
    reviewedAt: data.reviewedAt ? String(data.reviewedAt) : undefined,
    reviewedBy: data.reviewedBy ? String(data.reviewedBy) : undefined,
    adminRemark: data.adminRemark ? String(data.adminRemark) : undefined
  };
}

function mapWithdrawalDoc(id: string, data: Record<string, unknown>): WithdrawalRequest {
  return {
    id: String(data.id || id),
    userId: String(data.userId || ''),
    username: String(data.username || ''),
    amount: Number(data.amount ?? 0),
    payoutMethod: String(data.payoutMethod || ''),
    payoutDetails: String(data.payoutDetails || ''),
    status: (data.status as WithdrawalRequest['status']) || 'pending',
    createdAt: toIso(data.createdAt),
    reviewedAt: data.reviewedAt ? String(data.reviewedAt) : undefined,
    reviewedBy: data.reviewedBy ? String(data.reviewedBy) : undefined,
    adminRemark: data.adminRemark ? String(data.adminRemark) : undefined
  };
}

function mapCoinLogDoc(id: string, data: Record<string, unknown>): CoinAdjustmentLog {
  return {
    id: String(data.id || id),
    userId: String(data.userId || ''),
    username: String(data.username || ''),
    adminId: String(data.adminId || ''),
    adminUsername: String(data.adminUsername || ''),
    type: (data.type as CoinAdjustmentLog['type']) || 'credit',
    amount: Number(data.amount ?? 0),
    previousBalance: Number(data.previousBalance ?? 0),
    newBalance: Number(data.newBalance ?? 0),
    reason: String(data.reason || ''),
    createdAt: toIso(data.createdAt)
  };
}

function mapIdChatDoc(id: string, data: Record<string, unknown>): IdChatThread {
  return {
    id: String(data.id || id),
    userId: data.userId ? String(data.userId) : undefined,
    username: data.username ? String(data.username) : undefined,
    visitorName: String(data.visitorName || 'Guest'),
    contactInfo: data.contactInfo ? String(data.contactInfo) : undefined,
    requestedUsername: data.requestedUsername ? String(data.requestedUsername) : undefined,
    status: (data.status as IdChatStatus) || 'open',
    lastMessage: String(data.lastMessage || ''),
    unreadByAdmin: Boolean(data.unreadByAdmin),
    unreadByUser: Boolean(data.unreadByUser),
    issuedUsername: data.issuedUsername ? String(data.issuedUsername) : undefined,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt)
  };
}

function mapIdChatMessageDoc(id: string, data: Record<string, unknown>): IdChatMessage {
  return {
    id: String(data.id || id),
    chatId: String(data.chatId || ''),
    senderRole: data.senderRole === 'admin' ? 'admin' : 'user',
    senderName: String(data.senderName || 'User'),
    text: String(data.text || ''),
    imageUrl: data.imageUrl ? String(data.imageUrl) : undefined,
    issuedUsername: data.issuedUsername ? String(data.issuedUsername) : undefined,
    issuedPassword: data.issuedPassword ? String(data.issuedPassword) : undefined,
    createdAt: toIso(data.createdAt)
  };
}

function formatAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code || '';
  if (code === 'auth/popup-closed-by-user') return 'Google sign-in popup was closed. Please try again.';
  if (code === 'auth/popup-blocked') return 'Popup was blocked by your browser. Please allow popups and try again.';
  if (code === 'auth/operation-not-allowed' || code === 'auth/admin-restricted-operation') {
    return 'Username/Password login needs Email/Password enabled once in Firebase Console → Authentication → Sign-in method.';
  }
  if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
    return 'Invalid username or password';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many login attempts. Please wait a minute and try again.';
  }
  if (code === 'auth/unauthorized-domain') {
    return `This domain (${window.location.hostname}) must be added under Firebase Console → Authentication → Settings → Authorized domains.`;
  }
  if (err instanceof Error) return err.message;
  return 'Authentication failed. Please try again.';
}

export async function checkIsFirebaseAdmin(authUser: FirebaseAuthUser): Promise<boolean> {
  if (!authUser.emailVerified) return false;
  if (authUser.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()) return true;
  try {
    const snap = await getDoc(doc(db, 'admins', authUser.uid));
    return snap.exists();
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `admins/${authUser.uid}`);
  }
}

export async function seedInitialFirestoreIfNeeded(): Promise<void> {
  const gwRef = doc(db, 'settings', 'paymentGateway');
  let gwSnap;
  try {
    gwSnap = await getDoc(gwRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'settings/paymentGateway');
  }

  const now = Date.now();
  if (!gwSnap.exists()) {
    const batch = writeBatch(db);

    batch.set(gwRef, {
      title: 'Official Admin Payment Gateway',
      instructions:
        'Transfer your exact amount to any active Official Admin Payment Gateway channel below, then enter your transaction reference ID.',
      channels: [
        { id: 'gw_upi', label: 'Admin UPI ID', value: 'apexpredict@icici', enabled: true },
        { id: 'gw_usdt', label: 'USDT TRC-20', value: 'TX9vK7m842jqp1y38aG98kL', enabled: true },
        {
          id: 'gw_bank',
          label: 'Bank Account / IMPS',
          value: 'ApexPredict Holdings • A/C 9028174650 • IFSC ICIC0001042',
          enabled: false
        }
      ],
      updatedAt: serverTimestamp()
    });

    batch.set(doc(db, 'settings', 'whatsappSupport'), {
      enabled: true,
      phoneNumber: '',
      buttonLabel: 'WhatsApp Support',
      defaultMessage: 'Hello Admin, I need assistance with my ApexPredict account.',
      updatedAt: serverTimestamp()
    });

    batch.set(doc(db, 'predictions', 'pred_1'), {
      id: 'pred_1',
      title: "Will India win today's cricket match against Australia?",
      subtitle: 'Border-Gavaskar Trophy · Match 2, Melbourne',
      category: 'Cricket',
      yesOdds: 1.85,
      noOdds: 2.15,
      minBet: 50,
      maxBet: 5000,
      closingTime: new Date(now + 24 * 3600 * 1000).toISOString(),
      status: 'open',
      outcome: null,
      totalYesVolume: 0,
      totalNoVolume: 0,
      totalParticipants: 0,
      iconName: 'trophy',
      description:
        'Match resolves to YES if India wins outright. In case of tie/draw or rain washout without result, bets will be refunded.',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    batch.set(doc(db, 'predictions', 'pred_2'), {
      id: 'pred_2',
      title: "Will Real Madrid win today's UEFA Champions League clash?",
      subtitle: 'UEFA Champions League · Real Madrid vs Bayern Munich',
      category: 'Football',
      yesOdds: 2.1,
      noOdds: 1.78,
      minBet: 50,
      maxBet: 10000,
      closingTime: new Date(now + 36 * 3600 * 1000).toISOString(),
      status: 'open',
      outcome: null,
      totalYesVolume: 0,
      totalNoVolume: 0,
      totalParticipants: 0,
      iconName: 'flame',
      description: 'Official 90 minutes + injury time result.',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'seedInitialFirestore');
    }
  }

  // Ensure Movies & extra Cricket markets exist if none for Movies exist yet
  let moviesSnap;
  try {
    moviesSnap = await getDocs(query(collection(db, 'predictions'), where('category', '==', 'Movies'), limit(1)));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'predictions');
  }

  if (moviesSnap.empty) {
    const extraBatch = writeBatch(db);

    extraBatch.set(doc(db, 'predictions', 'pred_cricket_2'), {
      id: 'pred_cricket_2',
      title: 'Will the Mumbai vs Chennai T20 clash cross 360+ total match runs?',
      subtitle: 'T20 Premier League · Wankhede Stadium',
      category: 'Cricket',
      yesOdds: 1.92,
      noOdds: 1.88,
      minBet: 50,
      maxBet: 5000,
      closingTime: new Date(now + 18 * 3600 * 1000).toISOString(),
      status: 'open',
      outcome: null,
      totalYesVolume: 0,
      totalNoVolume: 0,
      totalParticipants: 0,
      iconName: 'trophy',
      description: 'Combined first and second innings runs across both teams.',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    extraBatch.set(doc(db, 'predictions', 'pred_movie_1'), {
      id: 'pred_movie_1',
      title: "Will this week's Pan-India blockbuster cross ₹100 Cr Nett in 3 days?",
      subtitle: 'Opening Weekend Box Office · India Theatrical',
      category: 'Movies',
      yesOdds: 1.78,
      noOdds: 2.2,
      minBet: 50,
      maxBet: 10000,
      closingTime: new Date(now + 48 * 3600 * 1000).toISOString(),
      status: 'open',
      outcome: null,
      totalYesVolume: 0,
      totalNoVolume: 0,
      totalParticipants: 0,
      iconName: 'film',
      description: 'Settled using official weekend India theatrical nett box-office trade figures.',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    extraBatch.set(doc(db, 'predictions', 'pred_movie_2'), {
      id: 'pred_movie_2',
      title: "Will Friday's big cinema sequel hold an 8.0+ IMDb score after 48 hours?",
      subtitle: 'Cinema & Audience Verdict · Multiplex Release',
      category: 'Movies',
      yesOdds: 2.05,
      noOdds: 1.82,
      minBet: 50,
      maxBet: 5000,
      closingTime: new Date(now + 42 * 3600 * 1000).toISOString(),
      status: 'open',
      outcome: null,
      totalYesVolume: 0,
      totalNoVolume: 0,
      totalParticipants: 0,
      iconName: 'film',
      description: 'Resolves to YES if IMDb rating is 8.0 or above 48 hours post-release.',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    try {
      await extraBatch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'seedMovieAndCricketMarkets');
    }
  }
}

export async function signInAdminWithGoogle(): Promise<{ success: boolean; error?: string; admin?: User }> {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    const isAdmin = await checkIsFirebaseAdmin(cred.user);
    if (!isAdmin) {
      await signOut(auth);
      return {
        success: false,
        error: `Access denied for ${cred.user.email || 'this account'}. Sign in with ${BOOTSTRAPPED_ADMIN_EMAIL} for Admin access.`
      };
    }
    await seedInitialFirestoreIfNeeded();
    return {
      success: true,
      admin: {
        id: 'usr_admin',
        username: cred.user.email?.split('@')[0] || 'admin',
        passwordHash: '',
        fullName: cred.user.displayName || 'System Administrator',
        email: cred.user.email || BOOTSTRAPPED_ADMIN_EMAIL,
        coins: 999999,
        status: 'active',
        createdAt: new Date().toISOString()
      }
    };
  } catch (err) {
    return { success: false, error: formatAuthError(err) };
  }
}

export async function signInUserWithCredentials(
  usernameInput: string,
  passwordInput: string
): Promise<{ success: boolean; error?: string; userId?: string }> {
  const cleanUsername = normalizeUsername(usernameInput || '');
  const cleanPassword = (passwordInput || '').trim();

  if (cleanUsername.length < 2 || !/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
    return { success: false, error: 'Invalid username or password' };
  }
  if (cleanPassword.length < 4) {
    return { success: false, error: 'Invalid username or password' };
  }

  try {
    const internalEmail = usernameToInternalEmail(cleanUsername);
    const derivedPassword = deriveFirebasePassword(cleanPassword);
    const cred = await signInWithEmailAndPassword(auth, internalEmail, derivedPassword);
    const authUid = cred.user.uid;

    const usersQ = query(collection(db, 'users'), where('ownerUid', '==', authUid), limit(1));
    let usersSnap;
    try {
      usersSnap = await getDocs(usersQ);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'users');
    }

    if (usersSnap.empty) {
      await signOut(auth);
      return { success: false, error: 'Account profile not found. Please contact administrator.' };
    }

    const existingDoc = usersSnap.docs[0];
    if (existingDoc.data().status === 'suspended') {
      await signOut(auth);
      return { success: false, error: 'This account has been suspended by the administrator' };
    }

    try {
      await updateDoc(existingDoc.ref, {
        lastLogin: new Date().toISOString(),
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${existingDoc.id}`);
    }

    return { success: true, userId: existingDoc.id };
  } catch (err) {
    return { success: false, error: formatAuthError(err) };
  }
}

export async function logoutFirebase(): Promise<void> {
  await signOut(auth);
}

// --- Real-time Subscriptions ---

export function subscribePublicData(handlers: {
  onPredictions: (preds: Prediction[]) => void;
  onWhatsAppSupport: (cfg: WhatsAppSupportConfig) => void;
}): Unsubscribe {
  const unsubPreds = onSnapshot(
    collection(db, 'predictions'),
    snap => {
      const list = snap.docs
        .map(d => mapPredictionDoc(d.id, d.data()))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      handlers.onPredictions(list);
    },
    error => {
      handleFirestoreError(error, OperationType.LIST, 'predictions');
    }
  );

  const unsubWa = onSnapshot(
    doc(db, 'settings', 'whatsappSupport'),
    snap => {
      if (snap.exists()) {
        const d = snap.data();
        handlers.onWhatsAppSupport({
          enabled: Boolean(d.enabled),
          phoneNumber: String(d.phoneNumber || ''),
          buttonLabel: String(d.buttonLabel || 'WhatsApp Support'),
          defaultMessage: String(d.defaultMessage || 'Hello Admin, I need assistance with my ApexPredict account.'),
          updatedAt: toIso(d.updatedAt)
        });
      }
    },
    error => {
      handleFirestoreError(error, OperationType.GET, 'settings/whatsappSupport');
    }
  );

  return () => {
    unsubPreds();
    unsubWa();
  };
}

export function subscribeUserPortalData(
  authUid: string,
  userId: string,
  handlers: {
    onUser: (user: User | null) => void;
    onBets: (bets: Bet[]) => void;
    onTransactions: (txs: Transaction[]) => void;
    onDeposits: (deps: DepositRequest[]) => void;
    onWithdrawals: (wdrs: WithdrawalRequest[]) => void;
    onPaymentGateway: (cfg: PaymentGatewayConfig) => void;
  }
): Unsubscribe {
  const unsubs: Unsubscribe[] = [];

  unsubs.push(
    onSnapshot(
      doc(db, 'users', userId),
      snap => {
        if (!snap.exists()) {
          handlers.onUser(null);
          return;
        }
        handlers.onUser(mapUserDoc(snap.id, snap.data()));
      },
      error => handleFirestoreError(error, OperationType.GET, `users/${userId}`)
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'bets'), where('ownerUid', '==', authUid)),
      snap => {
        handlers.onBets(
          snap.docs.map(d => mapBetDoc(d.id, d.data())).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        );
      },
      error => handleFirestoreError(error, OperationType.LIST, 'bets')
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'transactions'), where('ownerUid', '==', authUid)),
      snap => {
        handlers.onTransactions(
          snap.docs.map(d => mapTransactionDoc(d.id, d.data())).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        );
      },
      error => handleFirestoreError(error, OperationType.LIST, 'transactions')
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'deposits'), where('ownerUid', '==', authUid)),
      snap => {
        handlers.onDeposits(
          snap.docs.map(d => mapDepositDoc(d.id, d.data())).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        );
      },
      error => handleFirestoreError(error, OperationType.LIST, 'deposits')
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'withdrawals'), where('ownerUid', '==', authUid)),
      snap => {
        handlers.onWithdrawals(
          snap.docs.map(d => mapWithdrawalDoc(d.id, d.data())).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        );
      },
      error => handleFirestoreError(error, OperationType.LIST, 'withdrawals')
    )
  );

  unsubs.push(
    onSnapshot(
      doc(db, 'settings', 'paymentGateway'),
      snap => {
        if (snap.exists()) {
          const d = snap.data();
          handlers.onPaymentGateway({
            title: String(d.title || 'Official Admin Payment Gateway'),
            instructions: String(d.instructions || ''),
            channels: Array.isArray(d.channels) ? d.channels : [],
            updatedAt: toIso(d.updatedAt)
          });
        }
      },
      error => handleFirestoreError(error, OperationType.GET, 'settings/paymentGateway')
    )
  );

  return () => {
    unsubs.forEach(u => u());
  };
}

export function subscribeAdminPortalData(handlers: {
  onUsers: (users: User[]) => void;
  onBets: (bets: Bet[]) => void;
  onTransactions: (txs: Transaction[]) => void;
  onDeposits: (deps: DepositRequest[]) => void;
  onWithdrawals: (wdrs: WithdrawalRequest[]) => void;
  onCoinLogs: (logs: CoinAdjustmentLog[]) => void;
  onPaymentGateway: (cfg: PaymentGatewayConfig) => void;
  onIdChats?: (chats: IdChatThread[]) => void;
}): Unsubscribe {
  const unsubs: Unsubscribe[] = [];

  unsubs.push(
    onSnapshot(
      collection(db, 'users'),
      snap => {
        handlers.onUsers(
          snap.docs.map(d => mapUserDoc(d.id, d.data())).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        );
      },
      error => handleFirestoreError(error, OperationType.LIST, 'users')
    )
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'bets'),
      snap => {
        handlers.onBets(
          snap.docs.map(d => mapBetDoc(d.id, d.data())).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        );
      },
      error => handleFirestoreError(error, OperationType.LIST, 'bets')
    )
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'transactions'),
      snap => {
        handlers.onTransactions(
          snap.docs.map(d => mapTransactionDoc(d.id, d.data())).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        );
      },
      error => handleFirestoreError(error, OperationType.LIST, 'transactions')
    )
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'deposits'),
      snap => {
        handlers.onDeposits(
          snap.docs.map(d => mapDepositDoc(d.id, d.data())).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        );
      },
      error => handleFirestoreError(error, OperationType.LIST, 'deposits')
    )
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'withdrawals'),
      snap => {
        handlers.onWithdrawals(
          snap.docs.map(d => mapWithdrawalDoc(d.id, d.data())).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        );
      },
      error => handleFirestoreError(error, OperationType.LIST, 'withdrawals')
    )
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'coinLogs'),
      snap => {
        handlers.onCoinLogs(
          snap.docs.map(d => mapCoinLogDoc(d.id, d.data())).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        );
      },
      error => handleFirestoreError(error, OperationType.LIST, 'coinLogs')
    )
  );

  if (handlers.onIdChats) {
    unsubs.push(
      onSnapshot(
        collection(db, 'id_chats'),
        snap => {
          handlers.onIdChats?.(
            snap.docs.map(d => mapIdChatDoc(d.id, d.data())).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
          );
        },
        error => handleFirestoreError(error, OperationType.LIST, 'id_chats')
      )
    );
  }

  unsubs.push(
    onSnapshot(
      doc(db, 'settings', 'paymentGateway'),
      snap => {
        if (snap.exists()) {
          const d = snap.data();
          handlers.onPaymentGateway({
            title: String(d.title || 'Official Admin Payment Gateway'),
            instructions: String(d.instructions || ''),
            channels: Array.isArray(d.channels) ? d.channels : [],
            updatedAt: toIso(d.updatedAt)
          });
        }
      },
      error => handleFirestoreError(error, OperationType.GET, 'settings/paymentGateway')
    )
  );

  return () => {
    unsubs.forEach(u => u());
  };
}

// --- User Actions ---

export async function fsPlaceBet(
  authUid: string,
  user: User,
  prediction: Prediction,
  choice: 'YES' | 'NO',
  amount: number
): Promise<{ success: boolean; error?: string; betId?: string }> {
  if (prediction.status !== 'open') return { success: false, error: 'Market is not open for predictions' };
  if (!Number.isFinite(amount) || amount < prediction.minBet || amount > prediction.maxBet) {
    return { success: false, error: `Amount must be between ${prediction.minBet} and ${prediction.maxBet}` };
  }
  if (user.coins < amount) return { success: false, error: 'Insufficient coin balance' };

  const odds = choice === 'YES' ? prediction.yesOdds : prediction.noOdds;
  const betId = `bet_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const txId = `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const newBalance = user.coins - amount;
  const potentialWinnings = Math.round(amount * odds);

  const batch = writeBatch(db);
  batch.update(doc(db, 'users', user.id), {
    coins: newBalance,
    updatedAt: serverTimestamp()
  });
  batch.set(doc(db, 'bets', betId), {
    id: betId,
    userId: user.id,
    ownerUid: authUid,
    username: user.username,
    predictionId: prediction.id,
    predictionTitle: prediction.title.slice(0, 240),
    predictionCategory: prediction.category,
    choice,
    odds,
    amount,
    potentialWinnings,
    actualWinnings: 0,
    result: 'pending',
    transactionId: txId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  batch.set(doc(db, 'transactions', txId), {
    id: txId,
    userId: user.id,
    ownerUid: authUid,
    username: user.username,
    type: 'bet_placed',
    amount: -amount,
    balanceBefore: user.coins,
    balanceAfter: newBalance,
    status: 'completed',
    description: `Stake on "${prediction.title.slice(0, 60)}" (${choice} @ ${odds}x)`.slice(0, 300),
    referenceId: betId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  batch.update(doc(db, 'predictions', prediction.id), {
    totalYesVolume: choice === 'YES' ? prediction.totalYesVolume + amount : prediction.totalYesVolume,
    totalNoVolume: choice === 'NO' ? prediction.totalNoVolume + amount : prediction.totalNoVolume,
    totalParticipants: prediction.totalParticipants + 1,
    updatedAt: serverTimestamp()
  });

  try {
    await batch.commit();
    return { success: true, betId };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `bets/${betId}`);
  }
}

export async function fsRequestDeposit(
  authUid: string,
  user: User,
  amount: number,
  paymentMethod: string,
  referenceNumber: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  if (!Number.isFinite(amount) || amount <= 0) return { success: false, error: 'Amount must be greater than 0' };
  if (!referenceNumber.trim()) return { success: false, error: 'Payment reference number is required' };
  const depId = `dep_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  try {
    await setDoc(doc(db, 'deposits', depId), {
      id: depId,
      userId: user.id,
      ownerUid: authUid,
      username: user.username,
      amount,
      paymentMethod: (paymentMethod.trim() || 'UPI Transfer').slice(0, 120),
      referenceNumber: referenceNumber.trim().slice(0, 120),
      notes: notes ? notes.trim().slice(0, 400) : '',
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `deposits/${depId}`);
  }
}

export async function fsRequestWithdrawal(
  authUid: string,
  user: User,
  amount: number,
  payoutMethod: string,
  payoutDetails: string
): Promise<{ success: boolean; error?: string }> {
  if (!Number.isFinite(amount) || amount <= 0) return { success: false, error: 'Amount must be greater than 0' };
  if (amount > user.coins) return { success: false, error: `Insufficient balance. Available: ${user.coins} coins` };
  if (!payoutDetails.trim()) return { success: false, error: 'Payout address or bank details required' };

  const wdrId = `wdr_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const txId = `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const newBalance = user.coins - amount;

  const batch = writeBatch(db);
  batch.update(doc(db, 'users', user.id), {
    coins: newBalance,
    updatedAt: serverTimestamp()
  });
  batch.set(doc(db, 'withdrawals', wdrId), {
    id: wdrId,
    userId: user.id,
    ownerUid: authUid,
    username: user.username,
    amount,
    payoutMethod: (payoutMethod.trim() || 'UPI Payout').slice(0, 120),
    payoutDetails: payoutDetails.trim().slice(0, 300),
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  batch.set(doc(db, 'transactions', txId), {
    id: txId,
    userId: user.id,
    ownerUid: authUid,
    username: user.username,
    type: 'withdrawal',
    amount: -amount,
    balanceBefore: user.coins,
    balanceAfter: newBalance,
    status: 'pending',
    description: `Withdrawal request (${payoutMethod.trim() || 'UPI'})`.slice(0, 300),
    referenceId: wdrId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  try {
    await batch.commit();
    return { success: true };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `withdrawals/${wdrId}`);
  }
}

// --- Admin Actions ---

export async function fsCreateUser(data: {
  username: string;
  password: string;
  fullName: string;
  email?: string;
  phone?: string;
  initialCoins?: number;
  notes?: string;
}): Promise<{ success: boolean; error?: string; user?: User }> {
  const cleanUsername = normalizeUsername(data.username);
  const cleanPassword = data.password.trim();
  const cleanFullName = data.fullName.trim();

  if (cleanUsername.length < 2 || cleanUsername.length > 64) {
    return { success: false, error: 'Username must be between 2 and 64 characters' };
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
    return { success: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' };
  }
  if (cleanPassword.length < 4) {
    return { success: false, error: 'Password must be at least 4 characters' };
  }
  if (!cleanFullName) {
    return { success: false, error: 'Full name is required' };
  }

  const claimKey = cleanUsername.toLowerCase();
  const claimRef = doc(db, 'account_claims', claimKey);
  let existingClaim;
  try {
    existingClaim = await getDoc(claimRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `account_claims/${claimKey}`);
  }
  if (existingClaim.exists()) {
    return { success: false, error: 'Username already exists' };
  }

  const secondaryAuth = getSecondaryAuth();
  const internalEmail = usernameToInternalEmail(cleanUsername);
  const derivedPassword = deriveFirebasePassword(cleanPassword);
  let createdUid = '';

  try {
    try {
      const cred = await createUserWithEmailAndPassword(secondaryAuth, internalEmail, derivedPassword);
      createdUid = cred.user.uid;
    } catch (authErr) {
      const code = (authErr as { code?: string })?.code || '';
      if (code === 'auth/email-already-in-use') {
        try {
          const signCred = await signInWithEmailAndPassword(secondaryAuth, internalEmail, derivedPassword);
          createdUid = signCred.user.uid;
        } catch {
          return {
            success: false,
            error: 'This username already exists in authentication. Please choose another username.'
          };
        }
      } else {
        return { success: false, error: formatAuthError(authErr) };
      }
    }
  } finally {
    await signOut(secondaryAuth).catch(() => {});
  }

  const userId = `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const coins = Math.max(0, Number(data.initialCoins) || 0);
  const batch = writeBatch(db);

  batch.set(doc(db, 'users', userId), {
    id: userId,
    username: cleanUsername,
    fullName: cleanFullName.slice(0, 100),
    coins,
    status: 'active',
    ownerUid: createdUid,
    notes: data.notes ? data.notes.trim().slice(0, 500) : '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  batch.set(claimRef, {
    userId,
    username: cleanUsername,
    accessCode: cleanPassword.slice(0, 64),
    claimedByUid: createdUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  if (data.email || data.phone) {
    batch.set(doc(db, 'users', userId, 'private', 'info'), {
      ownerUid: createdUid,
      email: data.email ? data.email.trim().slice(0, 160) : '',
      phone: data.phone ? data.phone.trim().slice(0, 40) : '',
      updatedAt: serverTimestamp()
    });
  }

  try {
    await batch.commit();
    return {
      success: true,
      user: {
        id: userId,
        username: cleanUsername,
        passwordHash: '',
        fullName: cleanFullName,
        email: data.email?.trim(),
        phone: data.phone?.trim(),
        coins,
        status: 'active',
        createdAt: new Date().toISOString(),
        notes: data.notes?.trim()
      }
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${userId}`);
  }
}

export async function fsUpdateUser(userId: string, data: Partial<User>): Promise<{ success: boolean; error?: string }> {
  const updates: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (typeof data.fullName === 'string' && data.fullName.trim()) updates.fullName = data.fullName.trim().slice(0, 100);
  if (typeof data.notes === 'string') updates.notes = data.notes.trim().slice(0, 500);
  if (data.status === 'active' || data.status === 'suspended') updates.status = data.status;

  try {
    await updateDoc(doc(db, 'users', userId), updates);
    if (typeof data.email === 'string' || typeof data.phone === 'string') {
      await setDoc(
        doc(db, 'users', userId, 'private', 'info'),
        {
          ...(typeof data.email === 'string' ? { email: data.email.trim().slice(0, 160) } : {}),
          ...(typeof data.phone === 'string' ? { phone: data.phone.trim().slice(0, 40) } : {}),
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    }
    return { success: true };
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
  }
}

export async function fsToggleUserStatus(user: User): Promise<{ success: boolean; error?: string }> {
  const nextStatus = user.status === 'active' ? 'suspended' : 'active';
  try {
    await updateDoc(doc(db, 'users', user.id), {
      status: nextStatus,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${user.id}`);
  }
}

export async function fsResetUserPassword(user: User, newPass: string): Promise<{ success: boolean; error?: string }> {
  const clean = newPass.trim();
  if (clean.length < 4) return { success: false, error: 'Password must be at least 4 characters' };
  const claimKey = sanitizeId(user.username.toLowerCase());
  const claimRef = doc(db, 'account_claims', claimKey);

  let claimSnap;
  try {
    claimSnap = await getDoc(claimRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `account_claims/${claimKey}`);
  }

  if (claimSnap.exists()) {
    const oldAccessCode = String(claimSnap.data().accessCode || '').trim();
    if (oldAccessCode) {
      const secondaryAuth = getSecondaryAuth();
      try {
        const cred = await signInWithEmailAndPassword(
          secondaryAuth,
          usernameToInternalEmail(user.username),
          deriveFirebasePassword(oldAccessCode)
        );
        await updatePassword(cred.user, deriveFirebasePassword(clean));
      } catch (err) {
        return { success: false, error: formatAuthError(err) };
      } finally {
        await signOut(secondaryAuth).catch(() => {});
      }
    }
  }

  try {
    await updateDoc(claimRef, {
      accessCode: clean.slice(0, 64),
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `account_claims/${claimKey}`);
  }
}

export async function fsChangeOwnPassword(
  user: User,
  oldPass: string,
  newPass: string
): Promise<{ success: boolean; error?: string }> {
  const cleanOld = oldPass.trim();
  const cleanNew = newPass.trim();
  if (cleanNew.length < 4) return { success: false, error: 'New password must be at least 4 characters' };
  if (!auth.currentUser || !auth.currentUser.email) {
    return { success: false, error: 'Not signed in' };
  }

  try {
    const credential = EmailAuthProvider.credential(auth.currentUser.email, deriveFirebasePassword(cleanOld));
    await reauthenticateWithCredential(auth.currentUser, credential);
    await updatePassword(auth.currentUser, deriveFirebasePassword(cleanNew));
  } catch (err) {
    const code = (err as { code?: string })?.code || '';
    if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
      return { success: false, error: 'Current password is incorrect' };
    }
    return { success: false, error: formatAuthError(err) };
  }

  const claimKey = sanitizeId(user.username.toLowerCase());
  try {
    await updateDoc(doc(db, 'account_claims', claimKey), {
      accessCode: cleanNew.slice(0, 64),
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `account_claims/${claimKey}`);
  }
}

export async function fsDeleteUser(user: User): Promise<{ success: boolean; error?: string }> {
  const claimKey = sanitizeId(user.username.toLowerCase());
  const claimRef = doc(db, 'account_claims', claimKey);

  try {
    const claimSnap = await getDoc(claimRef);
    if (claimSnap.exists()) {
      const accessCode = String(claimSnap.data().accessCode || '').trim();
      if (accessCode) {
        const secondaryAuth = getSecondaryAuth();
        try {
          const cred = await signInWithEmailAndPassword(
            secondaryAuth,
            usernameToInternalEmail(user.username),
            deriveFirebasePassword(accessCode)
          );
          await deleteFirebaseAuthUser(cred.user);
        } catch {
          // Ignore if auth account was already deleted
        } finally {
          await signOut(secondaryAuth).catch(() => {});
        }
      }
    }
  } catch {
    // Proceed with Firestore deletion even if lookup fails
  }

  const batch = writeBatch(db);
  batch.delete(doc(db, 'users', user.id));
  batch.delete(claimRef);
  try {
    await batch.commit();
    return { success: true };
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `users/${user.id}`);
  }
}

export async function fsAdjustUserCoins(
  adminUser: User,
  targetUser: User,
  type: 'credit' | 'debit' | 'set',
  amount: number,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const amt = Math.max(0, Number(amount) || 0);
  const prev = targetUser.coins;
  let next = prev;
  if (type === 'credit') next = prev + amt;
  else if (type === 'debit') next = Math.max(0, prev - amt);
  else next = amt;

  const logId = `clog_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const batch = writeBatch(db);

  batch.update(doc(db, 'users', targetUser.id), {
    coins: next,
    updatedAt: serverTimestamp()
  });

  batch.set(doc(db, 'coinLogs', logId), {
    id: logId,
    userId: targetUser.id,
    username: targetUser.username,
    adminId: adminUser.id || 'usr_admin',
    adminUsername: adminUser.username || 'admin',
    type,
    amount: amt,
    previousBalance: prev,
    newBalance: next,
    reason: (reason.trim() || 'Admin adjustment').slice(0, 300),
    createdAt: serverTimestamp()
  });

  try {
    await batch.commit();
    return { success: true };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${targetUser.id}`);
  }
}

export async function fsCreatePrediction(
  data: Omit<Prediction, 'id' | 'createdAt' | 'totalYesVolume' | 'totalNoVolume' | 'totalParticipants' | 'outcome'>
): Promise<{ success: boolean; error?: string; prediction?: Prediction }> {
  const id = `pred_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const payload = {
    id,
    title: data.title.trim().slice(0, 240),
    subtitle: data.subtitle.trim().slice(0, 200),
    category: data.category,
    yesOdds: Number(data.yesOdds),
    noOdds: Number(data.noOdds),
    minBet: Number(data.minBet),
    maxBet: Number(data.maxBet),
    closingTime: data.closingTime,
    status: data.status || 'open',
    outcome: null,
    totalYesVolume: 0,
    totalNoVolume: 0,
    totalParticipants: 0,
    iconName: data.iconName || 'trophy',
    description: data.description ? data.description.slice(0, 1000) : '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  try {
    await setDoc(doc(db, 'predictions', id), payload);
    return {
      success: true,
      prediction: {
        ...data,
        id,
        outcome: null,
        totalYesVolume: 0,
        totalNoVolume: 0,
        totalParticipants: 0,
        createdAt: new Date().toISOString()
      }
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `predictions/${id}`);
  }
}

export async function fsUpdatePrediction(id: string, data: Partial<Prediction>): Promise<{ success: boolean; error?: string }> {
  const updates: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (typeof data.title === 'string') updates.title = data.title.trim().slice(0, 240);
  if (typeof data.subtitle === 'string') updates.subtitle = data.subtitle.trim().slice(0, 200);
  if (data.category) updates.category = data.category;
  if (typeof data.yesOdds === 'number') updates.yesOdds = data.yesOdds;
  if (typeof data.noOdds === 'number') updates.noOdds = data.noOdds;
  if (typeof data.minBet === 'number') updates.minBet = data.minBet;
  if (typeof data.maxBet === 'number') updates.maxBet = data.maxBet;
  if (typeof data.closingTime === 'string') updates.closingTime = data.closingTime;
  if (typeof data.description === 'string') updates.description = data.description.slice(0, 1000);
  if (data.status) updates.status = data.status;

  try {
    await updateDoc(doc(db, 'predictions', id), updates);
    return { success: true };
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `predictions/${id}`);
  }
}

export async function fsDeletePrediction(
  id: string,
  bets: Bet[],
  users: User[]
): Promise<{ success: boolean; error?: string; refundedCount: number; refundedTotal: number }> {
  const pendingBets = bets.filter(b => b.predictionId === id && b.result === 'pending');
  let refundedCount = 0;
  let refundedTotal = 0;
  const userCoins = new Map<string, number>(users.map(u => [u.id, u.coins]));

  const batch = writeBatch(db);
  batch.delete(doc(db, 'predictions', id));

  for (const bet of pendingBets) {
    batch.update(doc(db, 'bets', bet.id), {
      result: 'voided',
      actualWinnings: bet.amount,
      settledAt: new Date().toISOString(),
      updatedAt: serverTimestamp()
    });
    const cur = userCoins.get(bet.userId);
    if (cur !== undefined) {
      userCoins.set(bet.userId, cur + bet.amount);
    }
    refundedCount += 1;
    refundedTotal += bet.amount;
  }

  for (const [uid, nextCoins] of userCoins.entries()) {
    const orig = users.find(u => u.id === uid);
    if (orig && orig.coins !== nextCoins) {
      batch.update(doc(db, 'users', uid), { coins: nextCoins, updatedAt: serverTimestamp() });
    }
  }

  try {
    await batch.commit();
    return { success: true, refundedCount, refundedTotal };
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `predictions/${id}`);
  }
}

export async function fsSettlePrediction(
  predictionId: string,
  outcome: 'YES' | 'NO' | 'VOID',
  adminUsername: string,
  bets: Bet[],
  users: User[]
): Promise<{ success: boolean; error?: string; winnersCount: number; totalPayout: number }> {
  const nowIso = new Date().toISOString();
  const pendingBets = bets.filter(b => b.predictionId === predictionId && b.result === 'pending');
  const userCoins = new Map<string, number>(users.map(u => [u.id, u.coins]));
  let winnersCount = 0;
  let totalPayout = 0;

  const batch = writeBatch(db);
  batch.update(doc(db, 'predictions', predictionId), {
    status: 'settled',
    outcome,
    settledAt: nowIso,
    settledBy: adminUsername.slice(0, 64),
    updatedAt: serverTimestamp()
  });

  for (const bet of pendingBets) {
    if (outcome === 'VOID') {
      batch.update(doc(db, 'bets', bet.id), {
        result: 'voided',
        actualWinnings: bet.amount,
        settledAt: nowIso,
        updatedAt: serverTimestamp()
      });
      const cur = userCoins.get(bet.userId);
      if (cur !== undefined) userCoins.set(bet.userId, cur + bet.amount);
    } else if (bet.choice === outcome) {
      batch.update(doc(db, 'bets', bet.id), {
        result: 'won',
        actualWinnings: bet.potentialWinnings,
        settledAt: nowIso,
        updatedAt: serverTimestamp()
      });
      const cur = userCoins.get(bet.userId);
      if (cur !== undefined) userCoins.set(bet.userId, cur + bet.potentialWinnings);
      winnersCount += 1;
      totalPayout += bet.potentialWinnings;
    } else {
      batch.update(doc(db, 'bets', bet.id), {
        result: 'lost',
        actualWinnings: 0,
        settledAt: nowIso,
        updatedAt: serverTimestamp()
      });
    }
  }

  for (const [uid, nextCoins] of userCoins.entries()) {
    const orig = users.find(u => u.id === uid);
    if (orig && orig.coins !== nextCoins) {
      batch.update(doc(db, 'users', uid), { coins: nextCoins, updatedAt: serverTimestamp() });
    }
  }

  try {
    await batch.commit();
    return { success: true, winnersCount, totalPayout };
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `predictions/${predictionId}`);
  }
}

export async function fsReviewDeposit(
  deposit: DepositRequest,
  action: 'approve' | 'reject',
  adminUsername: string,
  targetUser: User | undefined,
  adminRemark?: string
): Promise<{ success: boolean; error?: string }> {
  const status = action === 'approve' ? 'approved' : 'rejected';
  const batch = writeBatch(db);
  batch.update(doc(db, 'deposits', deposit.id), {
    status,
    reviewedAt: new Date().toISOString(),
    reviewedBy: adminUsername.slice(0, 64),
    adminRemark: adminRemark ? adminRemark.trim().slice(0, 400) : '',
    updatedAt: serverTimestamp()
  });

  if (action === 'approve' && targetUser) {
    batch.update(doc(db, 'users', targetUser.id), {
      coins: targetUser.coins + deposit.amount,
      updatedAt: serverTimestamp()
    });
  }

  try {
    await batch.commit();
    return { success: true };
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `deposits/${deposit.id}`);
  }
}

export async function fsReviewWithdrawal(
  withdrawal: WithdrawalRequest,
  action: 'approve' | 'reject' | 'processing',
  adminUsername: string,
  targetUser: User | undefined,
  adminRemark?: string
): Promise<{ success: boolean; error?: string }> {
  const status = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'processing';
  const batch = writeBatch(db);
  batch.update(doc(db, 'withdrawals', withdrawal.id), {
    status,
    reviewedAt: new Date().toISOString(),
    reviewedBy: adminUsername.slice(0, 64),
    adminRemark: adminRemark ? adminRemark.trim().slice(0, 400) : '',
    updatedAt: serverTimestamp()
  });

  if (action === 'reject' && targetUser) {
    batch.update(doc(db, 'users', targetUser.id), {
      coins: targetUser.coins + withdrawal.amount,
      updatedAt: serverTimestamp()
    });
  }

  try {
    await batch.commit();
    return { success: true };
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `withdrawals/${withdrawal.id}`);
  }
}

export async function fsUpdateGlobalPaymentGateway(
  config: Omit<PaymentGatewayConfig, 'updatedAt'>
): Promise<{ success: boolean; error?: string }> {
  try {
    await setDoc(doc(db, 'settings', 'paymentGateway'), {
      title: (config.title || 'Official Admin Payment Gateway').trim().slice(0, 120),
      instructions: (config.instructions || '').trim().slice(0, 1000),
      channels: (config.channels || []).slice(0, 20).map(c => ({
        id: c.id || `gw_${Date.now()}`,
        label: String(c.label || '').trim(),
        value: String(c.value || '').trim(),
        enabled: c.enabled !== false
      })),
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'settings/paymentGateway');
  }
}

export async function fsUpdateUserPaymentGateway(
  userId: string,
  config: Omit<PaymentGatewayConfig, 'updatedAt'> | null
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateDoc(doc(db, 'users', userId), {
      customPaymentGateway: config
        ? {
            title: (config.title || 'Assigned Payment Gateway').trim().slice(0, 120),
            instructions: (config.instructions || '').trim().slice(0, 1000),
            channels: (config.channels || []).slice(0, 20),
            updatedAt: new Date().toISOString()
          }
        : null,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
  }
}

export async function fsUpdateWhatsAppSupport(
  config: Omit<WhatsAppSupportConfig, 'updatedAt'>
): Promise<{ success: boolean; error?: string }> {
  try {
    await setDoc(doc(db, 'settings', 'whatsappSupport'), {
      enabled: Boolean(config.enabled),
      phoneNumber: (config.phoneNumber || '').trim().slice(0, 40),
      buttonLabel: (config.buttonLabel || 'WhatsApp Support').trim().slice(0, 60),
      defaultMessage: (config.defaultMessage || 'Hello Admin, I need assistance with my ApexPredict account.')
        .trim()
        .slice(0, 300),
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'settings/whatsappSupport');
  }
}

// --- New ID Live Chat Helpers ---

export function generateSecureChatId(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = new Uint8Array(24);
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  let token = 'chat_';
  for (let i = 0; i < bytes.length; i++) {
    token += alphabet[bytes[i] % alphabet.length];
  }
  return token;
}

export function getUserSupportChatId(userId: string): string {
  const base = `chat_user_${sanitizeId(userId)}`;
  return base.length >= 24 ? base : `${base}_apxsupport`.slice(0, 128);
}

export function subscribeIdChatThread(
  chatId: string,
  onThread: (thread: IdChatThread | null, meta?: { hasPendingWrites: boolean }) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, 'id_chats', chatId),
    snap => {
      if (!snap.exists()) {
        onThread(null, { hasPendingWrites: snap.metadata.hasPendingWrites });
        return;
      }
      onThread(mapIdChatDoc(snap.id, snap.data()), {
        hasPendingWrites: snap.metadata.hasPendingWrites
      });
    },
    error => handleFirestoreError(error, OperationType.GET, `id_chats/${chatId}`)
  );
}

export function subscribeIdChatMessages(
  chatId: string,
  onMessages: (messages: IdChatMessage[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'id_chats', chatId, 'messages'),
    snap => {
      const list = snap.docs
        .map(d => mapIdChatMessageDoc(d.id, d.data()))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      onMessages(list);
    },
    error => handleFirestoreError(error, OperationType.LIST, `id_chats/${chatId}/messages`)
  );
}

export async function fsSendVisitorIdChatMessage(params: {
  chatId: string;
  userId?: string;
  username?: string;
  visitorName: string;
  contactInfo?: string;
  requestedUsername?: string;
  text: string;
  imageUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  const cleanChatId = sanitizeId(params.chatId);
  if (cleanChatId.length < 20) {
    return { success: false, error: 'Invalid chat session ID' };
  }
  const cleanImageUrl =
    params.imageUrl &&
    /^data:image\/(jpeg|jpg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(params.imageUrl) &&
    params.imageUrl.length <= 500000
      ? params.imageUrl
      : undefined;
  const trimmedText = params.text.trim().slice(0, 1000) || (cleanImageUrl ? '[Photo]' : '');
  if (!trimmedText) {
    return { success: false, error: 'Message or photo is required' };
  }
  const cleanName = params.visitorName.trim().slice(0, 80) || 'New Player';
  const threadRef = doc(db, 'id_chats', cleanChatId);

  let existingSnap;
  try {
    existingSnap = await getDoc(threadRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `id_chats/${cleanChatId}`);
  }

  if (!existingSnap.exists()) {
    try {
      const threadPayload: Record<string, unknown> = {
        id: cleanChatId,
        visitorName: cleanName,
        contactInfo: (params.contactInfo || '').trim().slice(0, 80),
        requestedUsername: (params.requestedUsername || '').trim().slice(0, 64),
        status: 'open',
        lastMessage: trimmedText.slice(0, 500),
        unreadByAdmin: true,
        unreadByUser: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      if (params.userId) {
        threadPayload.userId = sanitizeId(params.userId);
      }
      if (params.username) {
        threadPayload.username = normalizeUsername(params.username).slice(0, 64);
      }
      await setDoc(threadRef, threadPayload);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `id_chats/${cleanChatId}`);
    }
  } else {
    try {
      await updateDoc(threadRef, {
        lastMessage: trimmedText.slice(0, 500),
        unreadByAdmin: true,
        unreadByUser: false,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `id_chats/${cleanChatId}`);
    }
  }

  const msgId = `msg_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
  const msgPayload: Record<string, unknown> = {
    id: msgId,
    chatId: cleanChatId,
    senderRole: 'user',
    senderName: cleanName,
    text: trimmedText,
    createdAt: serverTimestamp()
  };
  if (cleanImageUrl) {
    msgPayload.imageUrl = cleanImageUrl;
  }

  try {
    await setDoc(doc(db, 'id_chats', cleanChatId, 'messages', msgId), msgPayload);
    return { success: true };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `id_chats/${cleanChatId}/messages/${msgId}`);
  }
}

export async function fsMarkIdChatRead(
  chatId: string,
  role: 'user' | 'admin'
): Promise<void> {
  const cleanChatId = sanitizeId(chatId);
  if (cleanChatId.length < 20) return;
  try {
    const threadRef = doc(db, 'id_chats', cleanChatId);
    const snap = await getDoc(threadRef);
    if (!snap.exists()) return;
    await updateDoc(threadRef, {
      ...(role === 'admin' ? { unreadByAdmin: false } : { unreadByUser: false }),
      updatedAt: serverTimestamp()
    });
  } catch {
    // Non-critical read receipt update
  }
}

export async function fsAdminSendIdChatReply(params: {
  chatId: string;
  adminName: string;
  text: string;
  imageUrl?: string;
  issuedUsername?: string;
  issuedPassword?: string;
  nextStatus?: IdChatStatus;
}): Promise<{ success: boolean; error?: string }> {
  const cleanChatId = sanitizeId(params.chatId);
  const cleanImageUrl =
    params.imageUrl &&
    /^data:image\/(jpeg|jpg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(params.imageUrl) &&
    params.imageUrl.length <= 500000
      ? params.imageUrl
      : undefined;
  const trimmedText = params.text.trim().slice(0, 1000) || (cleanImageUrl ? '[Photo]' : '');
  if (!trimmedText) return { success: false, error: 'Message or photo is required' };

  const msgId = `msg_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
  const msgPayload: Record<string, unknown> = {
    id: msgId,
    chatId: cleanChatId,
    senderRole: 'admin',
    senderName: params.adminName.trim().slice(0, 80) || 'Admin',
    text: trimmedText,
    createdAt: serverTimestamp()
  };
  if (cleanImageUrl) {
    msgPayload.imageUrl = cleanImageUrl;
  }
  if (params.issuedUsername) {
    msgPayload.issuedUsername = params.issuedUsername.trim().slice(0, 64);
  }
  if (params.issuedPassword) {
    msgPayload.issuedPassword = params.issuedPassword.trim().slice(0, 64);
  }

  try {
    await setDoc(doc(db, 'id_chats', cleanChatId, 'messages', msgId), msgPayload);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `id_chats/${cleanChatId}/messages/${msgId}`);
  }

  const threadUpdates: Record<string, unknown> = {
    lastMessage: trimmedText.slice(0, 500),
    unreadByAdmin: false,
    unreadByUser: true,
    updatedAt: serverTimestamp()
  };
  if (params.nextStatus) {
    threadUpdates.status = params.nextStatus;
  }
  if (params.issuedUsername) {
    threadUpdates.status = 'issued';
    threadUpdates.issuedUsername = params.issuedUsername.trim().slice(0, 64);
  }

  try {
    await updateDoc(doc(db, 'id_chats', cleanChatId), threadUpdates);
    return { success: true };
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `id_chats/${cleanChatId}`);
  }
}

export async function fsAdminUpdateIdChatStatus(
  chatId: string,
  status: IdChatStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateDoc(doc(db, 'id_chats', sanitizeId(chatId)), {
      status,
      unreadByAdmin: false,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `id_chats/${chatId}`);
  }
}

export async function fsAdminDeleteIdChat(
  chatId: string
): Promise<{ success: boolean; error?: string }> {
  const cleanChatId = sanitizeId(chatId);
  if (!cleanChatId) return { success: false, error: 'Invalid chat ID' };

  try {
    const msgsSnap = await getDocs(collection(db, 'id_chats', cleanChatId, 'messages'));
    const docsToDelete = msgsSnap.docs;

    for (let i = 0; i < docsToDelete.length; i += 400) {
      const batch = writeBatch(db);
      const chunk = docsToDelete.slice(i, i + 400);
      chunk.forEach(d => batch.delete(d.ref));
      if (i + 400 >= docsToDelete.length) {
        batch.delete(doc(db, 'id_chats', cleanChatId));
      }
      await batch.commit();
    }

    if (docsToDelete.length === 0) {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'id_chats', cleanChatId));
      await batch.commit();
    }

    return { success: true };
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `id_chats/${cleanChatId}`);
  }
}

