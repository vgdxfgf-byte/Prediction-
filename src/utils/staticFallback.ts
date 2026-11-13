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
  PredictionStatus
} from '../types';

const STATIC_DB_KEY = 'apex_static_db_v1';

interface StaticDatabaseState {
  users: User[];
  predictions: Prediction[];
  bets: Bet[];
  transactions: Transaction[];
  deposits: DepositRequest[];
  withdrawals: WithdrawalRequest[];
  coinLogs: CoinAdjustmentLog[];
  paymentGateway: PaymentGatewayConfig;
  whatsappSupport: WhatsAppSupportConfig;
}

function createInitialStaticState(): StaticDatabaseState {
  const now = Date.now();
  return {
    users: [
      {
        id: 'usr_admin',
        username: 'admin',
        passwordHash: 'admin123',
        fullName: 'System Administrator',
        email: 'admin@apexpredict.com',
        coins: 999999,
        status: 'active',
        createdAt: '2026-01-01T00:00:00Z',
        notes: 'Super administrator account'
      },
      {
        id: 'usr_alex',
        username: 'alex_sports',
        passwordHash: 'user123',
        fullName: 'Alex Morgan',
        email: 'alex@example.com',
        phone: '+1 555-0192',
        coins: 2450,
        status: 'active',
        createdAt: '2026-10-15T12:00:00Z',
        notes: 'High-volume cricket and football enthusiast'
      }
    ],
    predictions: [
      {
        id: 'pred_1',
        title: "Will India win today's cricket match against Australia?",
        subtitle: 'Border-Gavaskar Trophy - Match 2, Melbourne',
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
        createdAt: new Date(now).toISOString(),
        iconName: 'trophy',
        description:
          'Match resolves to YES if India wins outright. In case of tie/draw or rain washout without result, bets will be refunded.'
      },
      {
        id: 'pred_2',
        title: "Will Real Madrid win today's UEFA Champions League clash?",
        subtitle: 'UEFA Champions League - Real Madrid vs Bayern Munich',
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
        createdAt: new Date(now).toISOString(),
        iconName: 'flame',
        description: 'Official 90 minutes + injury time result.'
      }
    ],
    bets: [],
    transactions: [],
    deposits: [],
    withdrawals: [],
    coinLogs: [],
    paymentGateway: {
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
      updatedAt: new Date(now).toISOString()
    },
    whatsappSupport: {
      enabled: true,
      phoneNumber: '',
      buttonLabel: 'WhatsApp Support',
      defaultMessage: 'Hello Admin, I need assistance with my ApexPredict account.',
      updatedAt: new Date(now).toISOString()
    }
  };
}

let memoryFallbackState: StaticDatabaseState | null = null;

function loadStaticDb(): StaticDatabaseState {
  if (memoryFallbackState) return memoryFallbackState;
  try {
    const raw = window.localStorage.getItem(STATIC_DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StaticDatabaseState>;
      const fallback = createInitialStaticState();
      const loaded: StaticDatabaseState = {
        users: Array.isArray(parsed.users) && parsed.users.length > 0 ? parsed.users : fallback.users,
        predictions: Array.isArray(parsed.predictions) ? parsed.predictions : fallback.predictions,
        bets: Array.isArray(parsed.bets) ? parsed.bets : [],
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
        deposits: Array.isArray(parsed.deposits) ? parsed.deposits : [],
        withdrawals: Array.isArray(parsed.withdrawals) ? parsed.withdrawals : [],
        coinLogs: Array.isArray(parsed.coinLogs) ? parsed.coinLogs : [],
        paymentGateway: parsed.paymentGateway || fallback.paymentGateway,
        whatsappSupport: parsed.whatsappSupport || fallback.whatsappSupport
      };
      memoryFallbackState = loaded;
      return loaded;
    }
  } catch {
    // Ignore storage access errors in strict privacy contexts
  }
  const fresh = createInitialStaticState();
  saveStaticDb(fresh);
  return fresh;
}

function saveStaticDb(db: StaticDatabaseState) {
  memoryFallbackState = db;
  try {
    window.localStorage.setItem(STATIC_DB_KEY, JSON.stringify(db));
  } catch {
    // Ignore storage quota / private mode errors
  }
}

function sanitizeUser(u: User): User {
  return { ...u, passwordHash: '' };
}

function getEffectiveGateway(db: StaticDatabaseState, userId?: string): PaymentGatewayConfig {
  if (userId) {
    const user = db.users.find(u => u.id === userId);
    if (user?.customPaymentGateway && user.customPaymentGateway.channels.length > 0) {
      return user.customPaymentGateway;
    }
  }
  return db.paymentGateway;
}

function buildUserState(db: StaticDatabaseState, userId: string) {
  const user = db.users.find(u => u.id === userId);
  if (!user) return null;
  return {
    user: sanitizeUser(user),
    predictions: db.predictions,
    bets: db.bets.filter(b => b.userId === userId),
    transactions: db.transactions.filter(t => t.userId === userId),
    deposits: db.deposits.filter(d => d.userId === userId),
    withdrawals: db.withdrawals.filter(w => w.userId === userId),
    effectivePaymentGateway: getEffectiveGateway(db, userId),
    whatsappSupport: db.whatsappSupport
  };
}

function buildAdminState(db: StaticDatabaseState) {
  const admin = db.users.find(u => u.id === 'usr_admin') || db.users[0];
  return {
    admin: sanitizeUser(admin),
    users: db.users.map(sanitizeUser),
    predictions: db.predictions,
    bets: db.bets,
    transactions: db.transactions,
    deposits: db.deposits,
    withdrawals: db.withdrawals,
    coinLogs: db.coinLogs,
    paymentGateway: db.paymentGateway,
    whatsappSupport: db.whatsappSupport
  };
}

function jsonResponse(status: number, data: Record<string, unknown>) {
  return { ok: status >= 200 && status < 300, status, data };
}

export function handleStaticApiRequest(
  url: string,
  options: RequestInit = {},
  token?: string | null
): { ok: boolean; status: number; data: Record<string, unknown> } {
  const db = loadStaticDb();
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? (JSON.parse(String(options.body)) as Record<string, unknown>) : {};
  const cleanUrl = url.split('?')[0];

  const getTokenUid = (expectedPrefix: string): string | null => {
    if (!token || !token.startsWith(expectedPrefix)) return null;
    return token.slice(expectedPrefix.length);
  };

  if (cleanUrl === '/api/public' && method === 'GET') {
    return jsonResponse(200, {
      predictions: db.predictions,
      whatsappSupport: db.whatsappSupport
    });
  }

  if (cleanUrl === '/api/auth/login' && method === 'POST') {
    const identifier = String(body.username || '').trim().replace(/^@+/, '').toLowerCase();
    const password = String(body.password || '').trim();
    const user = db.users.find(
      u =>
        u.id !== 'usr_admin' &&
        (u.username.trim().replace(/^@+/, '').toLowerCase() === identifier || u.id.toLowerCase() === identifier)
    );
    if (!user || user.passwordHash.trim() !== password) {
      return jsonResponse(401, { success: false, error: 'Invalid username or password' });
    }
    if (user.status === 'suspended') {
      return jsonResponse(403, { success: false, error: 'This account has been suspended by the administrator' });
    }
    user.lastLogin = new Date().toISOString();
    saveStaticDb(db);
    return jsonResponse(200, {
      success: true,
      token: `static_user:${user.id}`,
      state: buildUserState(db, user.id)
    });
  }

  if (cleanUrl === '/api/auth/admin-login' && method === 'POST') {
    const username = String(body.username || '').trim().toLowerCase();
    const password = String(body.password || '').trim();
    const admin = db.users.find(u => u.id === 'usr_admin');
    if (!admin || admin.username.trim().toLowerCase() !== username || admin.passwordHash.trim() !== password) {
      return jsonResponse(401, { success: false, error: 'Invalid administrator credentials' });
    }
    admin.lastLogin = new Date().toISOString();
    saveStaticDb(db);
    return jsonResponse(200, {
      success: true,
      token: 'static_admin:usr_admin',
      state: buildAdminState(db)
    });
  }

  if (cleanUrl === '/api/user/state' && method === 'GET') {
    const uid = getTokenUid('static_user:');
    const state = uid ? buildUserState(db, uid) : null;
    if (!state) return jsonResponse(401, { success: false, error: 'Invalid or expired user session' });
    return jsonResponse(200, { success: true, state });
  }

  if (cleanUrl === '/api/user/change-password' && method === 'POST') {
    const uid = getTokenUid('static_user:');
    const user = db.users.find(u => u.id === uid);
    if (!user) return jsonResponse(401, { success: false, error: 'Unauthorized' });
    if (user.passwordHash !== String(body.oldPassword || '')) {
      return jsonResponse(400, { success: false, error: 'Current password is incorrect' });
    }
    user.passwordHash = String(body.newPassword || '').trim();
    saveStaticDb(db);
    return jsonResponse(200, { success: true });
  }

  if (cleanUrl === '/api/user/bets' && method === 'POST') {
    const uid = getTokenUid('static_user:');
    const user = db.users.find(u => u.id === uid);
    if (!user) return jsonResponse(401, { success: false, error: 'Unauthorized' });
    const pred = db.predictions.find(p => p.id === body.predictionId);
    const amount = Number(body.amount);
    const choice = body.choice === 'YES' ? 'YES' : 'NO';
    if (!pred || pred.status !== 'open') {
      return jsonResponse(400, { success: false, error: 'Market is not open for predictions' });
    }
    if (!Number.isFinite(amount) || amount < pred.minBet || amount > pred.maxBet) {
      return jsonResponse(400, { success: false, error: `Amount must be between ${pred.minBet} and ${pred.maxBet}` });
    }
    if (user.coins < amount) {
      return jsonResponse(400, { success: false, error: 'Insufficient coin balance' });
    }

    const odds = choice === 'YES' ? pred.yesOdds : pred.noOdds;
    const betId = `bet_${Date.now()}`;
    const txId = `tx_${Date.now()}`;
    const balanceBefore = user.coins;
    user.coins -= amount;

    db.bets.unshift({
      id: betId,
      userId: user.id,
      username: user.username,
      predictionId: pred.id,
      predictionTitle: pred.title,
      predictionCategory: pred.category,
      choice,
      odds,
      amount,
      potentialWinnings: Math.round(amount * odds),
      actualWinnings: 0,
      result: 'pending',
      createdAt: new Date().toISOString(),
      transactionId: txId
    });

    db.transactions.unshift({
      id: txId,
      userId: user.id,
      username: user.username,
      type: 'bet_placed',
      amount: -amount,
      balanceBefore,
      balanceAfter: user.coins,
      status: 'completed',
      description: `Placed ${choice} on "${pred.title}" @ ${odds}x`,
      createdAt: new Date().toISOString(),
      referenceId: betId
    });

    if (choice === 'YES') pred.totalYesVolume += amount;
    else pred.totalNoVolume += amount;
    pred.totalParticipants += 1;

    saveStaticDb(db);
    return jsonResponse(200, { success: true, betId, state: buildUserState(db, user.id) });
  }

  if (cleanUrl === '/api/user/deposits' && method === 'POST') {
    const uid = getTokenUid('static_user:');
    const user = db.users.find(u => u.id === uid);
    if (!user) return jsonResponse(401, { success: false, error: 'Unauthorized' });
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return jsonResponse(400, { success: false, error: 'Valid deposit amount is required' });
    }
    db.deposits.unshift({
      id: `dep_${Date.now()}`,
      userId: user.id,
      username: user.username,
      amount,
      paymentMethod: String(body.paymentMethod || 'UPI Transfer'),
      referenceNumber: String(body.referenceNumber || ''),
      notes: body.notes ? String(body.notes) : undefined,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    saveStaticDb(db);
    return jsonResponse(200, { success: true, state: buildUserState(db, user.id) });
  }

  if (cleanUrl === '/api/user/withdrawals' && method === 'POST') {
    const uid = getTokenUid('static_user:');
    const user = db.users.find(u => u.id === uid);
    if (!user) return jsonResponse(401, { success: false, error: 'Unauthorized' });
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > user.coins) {
      return jsonResponse(400, { success: false, error: 'Insufficient balance or invalid withdrawal amount' });
    }
    const wdrId = `wdr_${Date.now()}`;
    const balanceBefore = user.coins;
    user.coins -= amount;
    db.withdrawals.unshift({
      id: wdrId,
      userId: user.id,
      username: user.username,
      amount,
      payoutMethod: String(body.payoutMethod || 'UPI ID'),
      payoutDetails: String(body.payoutDetails || ''),
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    db.transactions.unshift({
      id: `tx_${Date.now()}`,
      userId: user.id,
      username: user.username,
      type: 'withdrawal',
      amount: -amount,
      balanceBefore,
      balanceAfter: user.coins,
      status: 'pending',
      description: `Withdrawal request (${String(body.payoutMethod || 'UPI ID')})`,
      createdAt: new Date().toISOString(),
      referenceId: wdrId
    });
    saveStaticDb(db);
    return jsonResponse(200, { success: true, state: buildUserState(db, user.id) });
  }

  // --- Admin Endpoints ---
  const adminUid = getTokenUid('static_admin:');
  if (!adminUid) {
    return jsonResponse(401, { success: false, error: 'Administrator authentication required' });
  }
  const admin = db.users.find(u => u.id === 'usr_admin') || db.users[0];

  if (cleanUrl === '/api/admin/state' && method === 'GET') {
    return jsonResponse(200, { success: true, state: buildAdminState(db) });
  }

  if (cleanUrl === '/api/admin/change-password' && method === 'POST') {
    if (admin.passwordHash !== String(body.currentPassword || '').trim()) {
      return jsonResponse(400, { success: false, error: 'Current admin password is incorrect' });
    }
    if (body.newUsername) admin.username = String(body.newUsername).trim();
    admin.passwordHash = String(body.newPassword || '').trim();
    saveStaticDb(db);
    return jsonResponse(200, { success: true, state: buildAdminState(db) });
  }

  if (cleanUrl === '/api/admin/users' && method === 'POST') {
    const username = String(body.username || '').trim().replace(/^@+/, '');
    const password = String(body.password || '').trim();
    const fullName = String(body.fullName || '').trim();
    if (!username || !password || !fullName) {
      return jsonResponse(400, { success: false, error: 'Username, password, and full name are required' });
    }
    if (db.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      return jsonResponse(400, { success: false, error: 'Username already exists' });
    }
    const initialCoins = Number(body.initialCoins) || 0;
    const newUser: User = {
      id: `usr_${Date.now()}`,
      username,
      passwordHash: password,
      fullName,
      email: body.email ? String(body.email).trim() : undefined,
      phone: body.phone ? String(body.phone).trim() : undefined,
      coins: initialCoins,
      status: 'active',
      createdAt: new Date().toISOString(),
      notes: body.notes ? String(body.notes) : undefined
    };
    db.users.push(newUser);
    saveStaticDb(db);
    return jsonResponse(200, { success: true, user: sanitizeUser(newUser), state: buildAdminState(db) });
  }

  const userMatch = cleanUrl.match(/^\/api\/admin\/users\/([^/]+)$/);
  if (userMatch && method === 'PATCH') {
    const targetId = decodeURIComponent(userMatch[1]);
    const user = db.users.find(u => u.id === targetId);
    if (!user) return jsonResponse(404, { success: false, error: 'User not found' });
    Object.assign(user, body);
    saveStaticDb(db);
    return jsonResponse(200, { success: true, state: buildAdminState(db) });
  }
  if (userMatch && method === 'DELETE') {
    const targetId = decodeURIComponent(userMatch[1]);
    db.users = db.users.filter(u => u.id !== targetId);
    saveStaticDb(db);
    return jsonResponse(200, { success: true, state: buildAdminState(db) });
  }

  const toggleMatch = cleanUrl.match(/^\/api\/admin\/users\/([^/]+)\/toggle-status$/);
  if (toggleMatch && method === 'POST') {
    const user = db.users.find(u => u.id === decodeURIComponent(toggleMatch[1]));
    if (!user) return jsonResponse(404, { success: false, error: 'User not found' });
    user.status = user.status === 'active' ? 'suspended' : 'active';
    saveStaticDb(db);
    return jsonResponse(200, { success: true, state: buildAdminState(db) });
  }

  const resetPwdMatch = cleanUrl.match(/^\/api\/admin\/users\/([^/]+)\/reset-password$/);
  if (resetPwdMatch && method === 'POST') {
    const user = db.users.find(u => u.id === decodeURIComponent(resetPwdMatch[1]));
    if (!user) return jsonResponse(404, { success: false, error: 'User not found' });
    user.passwordHash = String(body.newPassword || '').trim();
    saveStaticDb(db);
    return jsonResponse(200, { success: true, state: buildAdminState(db) });
  }

  const coinsMatch = cleanUrl.match(/^\/api\/admin\/users\/([^/]+)\/coins$/);
  if (coinsMatch && method === 'POST') {
    const user = db.users.find(u => u.id === decodeURIComponent(coinsMatch[1]));
    if (!user) return jsonResponse(404, { success: false, error: 'User not found' });
    const prev = user.coins;
    const amt = Number(body.amount) || 0;
    const type = (body.type as 'credit' | 'debit' | 'set') || 'credit';
    if (type === 'credit') user.coins += amt;
    else if (type === 'debit') user.coins = Math.max(0, user.coins - amt);
    else user.coins = Math.max(0, amt);
    db.coinLogs.unshift({
      id: `clog_${Date.now()}`,
      userId: user.id,
      username: user.username,
      adminId: admin.id,
      adminUsername: admin.username,
      type,
      amount: amt,
      previousBalance: prev,
      newBalance: user.coins,
      reason: String(body.reason || 'Admin adjustment'),
      createdAt: new Date().toISOString()
    });
    saveStaticDb(db);
    return jsonResponse(200, { success: true, state: buildAdminState(db) });
  }

  const userGwMatch = cleanUrl.match(/^\/api\/admin\/users\/([^/]+)\/payment-gateway$/);
  if (userGwMatch && method === 'PUT') {
    const user = db.users.find(u => u.id === decodeURIComponent(userGwMatch[1]));
    if (!user) return jsonResponse(404, { success: false, error: 'User not found' });
    const cfg = body.config as Omit<PaymentGatewayConfig, 'updatedAt'> | null;
    user.customPaymentGateway = cfg ? { ...cfg, updatedAt: new Date().toISOString() } : null;
    saveStaticDb(db);
    return jsonResponse(200, { success: true, state: buildAdminState(db) });
  }

  if (cleanUrl === '/api/admin/predictions' && method === 'POST') {
    const newPred: Prediction = {
      ...(body as unknown as Omit<Prediction, 'id' | 'createdAt' | 'totalYesVolume' | 'totalNoVolume' | 'totalParticipants' | 'outcome'>),
      id: `pred_${Date.now()}`,
      totalYesVolume: 0,
      totalNoVolume: 0,
      totalParticipants: 0,
      outcome: null,
      createdAt: new Date().toISOString()
    };
    db.predictions.unshift(newPred);
    saveStaticDb(db);
    return jsonResponse(200, { success: true, prediction: newPred, state: buildAdminState(db) });
  }

  const predMatch = cleanUrl.match(/^\/api\/admin\/predictions\/([^/]+)$/);
  if (predMatch && method === 'PATCH') {
    const pred = db.predictions.find(p => p.id === decodeURIComponent(predMatch[1]));
    if (!pred) return jsonResponse(404, { success: false, error: 'Prediction not found' });
    Object.assign(pred, body);
    saveStaticDb(db);
    return jsonResponse(200, { success: true, state: buildAdminState(db) });
  }
  if (predMatch && method === 'DELETE') {
    const predId = decodeURIComponent(predMatch[1]);
    let refundedCount = 0;
    let refundedTotal = 0;
    db.bets
      .filter(b => b.predictionId === predId && b.result === 'pending')
      .forEach(b => {
        const u = db.users.find(usr => usr.id === b.userId);
        if (u) u.coins += b.amount;
        b.result = 'voided';
        refundedCount += 1;
        refundedTotal += b.amount;
      });
    db.predictions = db.predictions.filter(p => p.id !== predId);
    saveStaticDb(db);
    return jsonResponse(200, { success: true, refundedCount, refundedTotal, state: buildAdminState(db) });
  }

  const predStatusMatch = cleanUrl.match(/^\/api\/admin\/predictions\/([^/]+)\/status$/);
  if (predStatusMatch && method === 'POST') {
    const pred = db.predictions.find(p => p.id === decodeURIComponent(predStatusMatch[1]));
    if (!pred) return jsonResponse(404, { success: false, error: 'Prediction not found' });
    pred.status = body.status as PredictionStatus;
    saveStaticDb(db);
    return jsonResponse(200, { success: true, state: buildAdminState(db) });
  }

  const predSettleMatch = cleanUrl.match(/^\/api\/admin\/predictions\/([^/]+)\/settle$/);
  if (predSettleMatch && method === 'POST') {
    const pred = db.predictions.find(p => p.id === decodeURIComponent(predSettleMatch[1]));
    if (!pred) return jsonResponse(404, { success: false, error: 'Prediction not found' });
    const outcome = body.outcome as 'YES' | 'NO' | 'VOID';
    pred.status = 'settled';
    pred.outcome = outcome;
    pred.settledAt = new Date().toISOString();
    pred.settledBy = admin.username;
    let winnersCount = 0;
    let totalPayout = 0;
    db.bets
      .filter(b => b.predictionId === pred.id && b.result === 'pending')
      .forEach(b => {
        const u = db.users.find(usr => usr.id === b.userId);
        if (outcome === 'VOID') {
          b.result = 'voided';
          b.actualWinnings = b.amount;
          if (u) u.coins += b.amount;
        } else if (b.choice === outcome) {
          b.result = 'won';
          b.actualWinnings = b.potentialWinnings;
          if (u) u.coins += b.potentialWinnings;
          winnersCount += 1;
          totalPayout += b.potentialWinnings;
        } else {
          b.result = 'lost';
          b.actualWinnings = 0;
        }
        b.settledAt = new Date().toISOString();
      });
    saveStaticDb(db);
    return jsonResponse(200, { success: true, winnersCount, totalPayout, state: buildAdminState(db) });
  }

  const depMatch = cleanUrl.match(/^\/api\/admin\/deposits\/([^/]+)\/review$/);
  if (depMatch && method === 'POST') {
    const dep = db.deposits.find(d => d.id === decodeURIComponent(depMatch[1]));
    if (!dep) return jsonResponse(404, { success: false, error: 'Deposit not found' });
    const action = body.action === 'approve' ? 'approved' : 'rejected';
    dep.status = action;
    dep.reviewedAt = new Date().toISOString();
    dep.reviewedBy = admin.username;
    dep.adminRemark = body.adminRemark ? String(body.adminRemark) : undefined;
    if (action === 'approved') {
      const u = db.users.find(usr => usr.id === dep.userId);
      if (u) u.coins += dep.amount;
    }
    saveStaticDb(db);
    return jsonResponse(200, { success: true, state: buildAdminState(db) });
  }

  const wdrMatch = cleanUrl.match(/^\/api\/admin\/withdrawals\/([^/]+)\/review$/);
  if (wdrMatch && method === 'POST') {
    const wdr = db.withdrawals.find(w => w.id === decodeURIComponent(wdrMatch[1]));
    if (!wdr) return jsonResponse(404, { success: false, error: 'Withdrawal not found' });
    const action = body.action as 'approve' | 'reject' | 'processing';
    wdr.status = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'processing';
    wdr.reviewedAt = new Date().toISOString();
    wdr.reviewedBy = admin.username;
    wdr.adminRemark = body.adminRemark ? String(body.adminRemark) : undefined;
    if (action === 'reject') {
      const u = db.users.find(usr => usr.id === wdr.userId);
      if (u) u.coins += wdr.amount;
    }
    saveStaticDb(db);
    return jsonResponse(200, { success: true, state: buildAdminState(db) });
  }

  if (cleanUrl === '/api/admin/payment-gateway' && method === 'PUT') {
    const channels = Array.isArray(body.channels) ? body.channels : [];
    db.paymentGateway = {
      title: String(body.title || 'Official Admin Payment Gateway').trim(),
      instructions: String(body.instructions || '').trim(),
      channels: channels.map((c: { id?: string; label: string; value: string; enabled?: boolean }) => ({
        id: c.id || `gw_${Date.now()}`,
        label: String(c.label || '').trim(),
        value: String(c.value || '').trim(),
        enabled: c.enabled !== false
      })),
      updatedAt: new Date().toISOString()
    };
    saveStaticDb(db);
    return jsonResponse(200, { success: true, state: buildAdminState(db) });
  }

  if (cleanUrl === '/api/admin/whatsapp-support' && method === 'PUT') {
    db.whatsappSupport = {
      enabled: Boolean(body.enabled),
      phoneNumber: String(body.phoneNumber || '').trim(),
      buttonLabel: String(body.buttonLabel || 'WhatsApp Support').trim(),
      defaultMessage: String(body.defaultMessage || 'Hello Admin, I need assistance with my ApexPredict account.').trim(),
      updatedAt: new Date().toISOString()
    };
    saveStaticDb(db);
    return jsonResponse(200, { success: true, state: buildAdminState(db) });
  }

  return jsonResponse(404, { success: false, error: 'Endpoint not found' });
}
