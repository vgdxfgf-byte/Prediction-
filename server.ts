import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import type {
  User,
  Prediction,
  Bet,
  Transaction,
  DepositRequest,
  WithdrawalRequest,
  CoinAdjustmentLog,
  PaymentGatewayConfig,
  PredictionStatus
} from './src/types/index.ts';
import { createInitialDatabaseState, INITIAL_ADMIN_USER } from './server/seedData.ts';
import type { DatabaseState } from './server/seedData.ts';

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const DIST_DIR = path.join(process.cwd(), 'dist');

interface SessionPayload {
  uid: string;
  role: 'user' | 'admin';
  iat: number;
}

interface AuthedRequest extends Request {
  auth?: SessionPayload;
}

// --- Persistent JSON Store with Serialized Write Queue ---

function loadOrInitDb(): DatabaseState {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(DB_PATH)) {
    try {
      const raw = fs.readFileSync(DB_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<DatabaseState>;
      const fallback = createInitialDatabaseState(crypto.randomBytes(32).toString('hex'));
      return {
        sessionSecret: parsed.sessionSecret || fallback.sessionSecret,
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
    } catch (err) {
      console.error('Failed to read existing db.json, creating fresh store:', err);
    }
  }
  const initial = createInitialDatabaseState(crypto.randomBytes(32).toString('hex'));
  fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf-8');
  return initial;
}

let db: DatabaseState = loadOrInitDb();
let writeQueue: Promise<void> = Promise.resolve();

async function persistDb(): Promise<void> {
  const snapshot = JSON.stringify(db, null, 2);
  writeQueue = writeQueue.then(async () => {
    await fsp.mkdir(DATA_DIR, { recursive: true });
    const tmpPath = `${DB_PATH}.tmp`;
    await fsp.writeFile(tmpPath, snapshot, 'utf-8');
    await fsp.rename(tmpPath, DB_PATH);
  });
  return writeQueue;
}

function sanitizeUser(u: User): User {
  return {
    ...u,
    passwordHash: ''
  };
}

function getEffectiveGatewayForUser(userId?: string): PaymentGatewayConfig {
  if (userId) {
    const user = db.users.find(u => u.id === userId);
    if (user?.customPaymentGateway && user.customPaymentGateway.channels.length > 0) {
      return user.customPaymentGateway;
    }
  }
  return db.paymentGateway;
}

// --- HMAC Token Helpers ---

function signToken(payload: SessionPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', db.sessionSecret)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyToken(token: string): SessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  if (!encoded || !sig) return null;

  const expectedSig = crypto
    .createHmac('sha256', db.sessionSecret)
    .update(encoded)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as SessionPayload;
    if (!parsed.uid || (parsed.role !== 'user' && parsed.role !== 'admin')) return null;
    return parsed;
  } catch {
    return null;
  }
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7).trim();
}

function requireUser(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }
  const payload = verifyToken(token);
  if (!payload || payload.role !== 'user') {
    res.status(401).json({ success: false, error: 'Invalid or expired user session' });
    return;
  }
  const user = db.users.find(u => u.id === payload.uid && u.id !== 'usr_admin');
  if (!user) {
    res.status(401).json({ success: false, error: 'Account no longer exists' });
    return;
  }
  if (user.status === 'suspended') {
    res.status(403).json({ success: false, error: 'This account has been suspended by the administrator' });
    return;
  }
  req.auth = payload;
  next();
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ success: false, error: 'Administrator authentication required' });
    return;
  }
  const payload = verifyToken(token);
  if (!payload || payload.role !== 'admin') {
    res.status(401).json({ success: false, error: 'Invalid or expired administrator session' });
    return;
  }
  req.auth = payload;
  next();
}

function getUserStatePayload(userId: string) {
  const user = db.users.find(u => u.id === userId);
  if (!user) return null;
  return {
    user: sanitizeUser(user),
    predictions: db.predictions,
    bets: db.bets.filter(b => b.userId === userId),
    transactions: db.transactions.filter(t => t.userId === userId),
    deposits: db.deposits.filter(d => d.userId === userId),
    withdrawals: db.withdrawals.filter(w => w.userId === userId),
    effectivePaymentGateway: getEffectiveGatewayForUser(userId),
    whatsappSupport: db.whatsappSupport
  };
}

function getAdminStatePayload() {
  const admin = db.users.find(u => u.id === 'usr_admin') || INITIAL_ADMIN_USER;
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

// --- Express App ---

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Health & Public
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  app.get('/api/public', (_req, res) => {
    res.json({
      predictions: db.predictions,
      whatsappSupport: db.whatsappSupport
    });
  });

  // --- Auth Endpoints ---

  app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string') {
      res.status(400).json({ success: false, error: 'Username and password are required' });
      return;
    }

    const cleanIdentifier = username.trim().replace(/^@+/, '').toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanIdentifier || !cleanPassword) {
      res.status(400).json({ success: false, error: 'Username and password are required' });
      return;
    }

    const user = db.users.find(
      u =>
        u.id !== 'usr_admin' &&
        (u.username.trim().replace(/^@+/, '').toLowerCase() === cleanIdentifier ||
          u.id.toLowerCase() === cleanIdentifier)
    );

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User account not found. Please check your username or contact the administrator.'
      });
      return;
    }
    if (user.passwordHash !== password && user.passwordHash !== cleanPassword) {
      res.status(401).json({
        success: false,
        error: 'Invalid password. Please check your credentials.'
      });
      return;
    }
    if (user.status === 'suspended') {
      res.status(403).json({
        success: false,
        error: 'This account has been suspended by the administrator.'
      });
      return;
    }

    user.lastLogin = new Date().toISOString();
    await persistDb();

    const token = signToken({ uid: user.id, role: 'user', iat: Date.now() });
    res.json({
      success: true,
      token,
      state: getUserStatePayload(user.id)
    });
  });

  app.post('/api/auth/admin-login', (req, res) => {
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string') {
      res.status(400).json({ success: false, error: 'Admin username and password are required' });
      return;
    }

    const cleanAdminUser = username.trim().replace(/^@+/, '').toLowerCase();
    const cleanAdminPass = password.trim();
    const admin = db.users.find(u => u.id === 'usr_admin') || INITIAL_ADMIN_USER;
    if (
      admin.username.trim().toLowerCase() !== cleanAdminUser ||
      (admin.passwordHash !== password && admin.passwordHash !== cleanAdminPass)
    ) {
      res.status(401).json({
        success: false,
        error: 'Invalid admin username or password.'
      });
      return;
    }

    const token = signToken({ uid: admin.id, role: 'admin', iat: Date.now() });
    res.json({
      success: true,
      token,
      state: getAdminStatePayload()
    });
  });

  // --- Authenticated User Endpoints ---

  app.get('/api/user/state', requireUser, (req: AuthedRequest, res) => {
    const payload = getUserStatePayload(req.auth!.uid);
    if (!payload) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    res.json({ success: true, state: payload });
  });

  app.post('/api/user/change-password', requireUser, async (req: AuthedRequest, res) => {
    const { oldPassword, newPassword } = req.body || {};
    const user = db.users.find(u => u.id === req.auth!.uid);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    if (typeof oldPassword !== 'string' || user.passwordHash !== oldPassword) {
      res.status(400).json({ success: false, error: 'Current password is incorrect' });
      return;
    }
    if (typeof newPassword !== 'string' || newPassword.length < 4) {
      res.status(400).json({ success: false, error: 'New password must be at least 4 characters long' });
      return;
    }

    user.passwordHash = newPassword;
    await persistDb();
    res.json({ success: true });
  });

  app.post('/api/user/bets', requireUser, async (req: AuthedRequest, res) => {
    const { predictionId, choice, amount } = req.body || {};
    const user = db.users.find(u => u.id === req.auth!.uid);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    if (choice !== 'YES' && choice !== 'NO') {
      res.status(400).json({ success: false, error: 'Invalid prediction side' });
      return;
    }
    const betAmount = Number(amount);
    if (!Number.isFinite(betAmount) || betAmount <= 0) {
      res.status(400).json({ success: false, error: 'Invalid prediction amount' });
      return;
    }

    const pred = db.predictions.find(p => p.id === predictionId);
    if (!pred) {
      res.status(404).json({ success: false, error: 'Prediction not found' });
      return;
    }
    if (pred.status !== 'open') {
      res.status(400).json({ success: false, error: 'This prediction is closed for new entries' });
      return;
    }
    if (new Date(pred.closingTime).getTime() <= Date.now()) {
      res.status(400).json({ success: false, error: 'Prediction closing time has already passed' });
      return;
    }
    if (betAmount < pred.minBet) {
      res.status(400).json({ success: false, error: `Minimum prediction is ${pred.minBet} coins` });
      return;
    }
    if (betAmount > pred.maxBet) {
      res.status(400).json({ success: false, error: `Maximum prediction is ${pred.maxBet} coins` });
      return;
    }
    if (user.coins < betAmount) {
      res.status(400).json({ success: false, error: `Insufficient coins. Available: ${user.coins}` });
      return;
    }

    const odds = choice === 'YES' ? pred.yesOdds : pred.noOdds;
    const potentialWinnings = Math.round(betAmount * odds);
    const betId = `bet_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const txId = `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const nowIso = new Date().toISOString();

    const prevBalance = user.coins;
    const newBalance = prevBalance - betAmount;
    user.coins = newBalance;

    const newBet: Bet = {
      id: betId,
      userId: user.id,
      username: user.username,
      predictionId: pred.id,
      predictionTitle: pred.title,
      predictionCategory: pred.category,
      choice,
      odds,
      amount: betAmount,
      potentialWinnings,
      actualWinnings: 0,
      result: 'pending',
      createdAt: nowIso,
      transactionId: txId
    };
    db.bets.unshift(newBet);

    if (choice === 'YES') {
      pred.totalYesVolume += betAmount;
    } else {
      pred.totalNoVolume += betAmount;
    }
    pred.totalParticipants += 1;

    const newTx: Transaction = {
      id: txId,
      userId: user.id,
      username: user.username,
      type: 'bet_placed',
      amount: -betAmount,
      balanceBefore: prevBalance,
      balanceAfter: newBalance,
      status: 'completed',
      description: `Stake on "${pred.title.substring(0, 40)}..." (${choice} @ ${odds}x)`,
      createdAt: nowIso,
      referenceId: betId
    };
    db.transactions.unshift(newTx);

    await persistDb();
    res.json({ success: true, betId, state: getUserStatePayload(user.id) });
  });

  app.post('/api/user/deposits', requireUser, async (req: AuthedRequest, res) => {
    const { amount, paymentMethod, referenceNumber, notes } = req.body || {};
    const user = db.users.find(u => u.id === req.auth!.uid);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    const depAmount = Number(amount);
    if (!Number.isFinite(depAmount) || depAmount <= 0) {
      res.status(400).json({ success: false, error: 'Amount must be greater than 0' });
      return;
    }
    if (typeof referenceNumber !== 'string' || !referenceNumber.trim()) {
      res.status(400).json({ success: false, error: 'Payment reference number is required' });
      return;
    }

    const newDeposit: DepositRequest = {
      id: `dep_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      userId: user.id,
      username: user.username,
      amount: depAmount,
      paymentMethod: typeof paymentMethod === 'string' && paymentMethod.trim() ? paymentMethod.trim() : 'UPI Transfer',
      referenceNumber: referenceNumber.trim(),
      notes: typeof notes === 'string' ? notes.trim() : '',
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    db.deposits.unshift(newDeposit);

    await persistDb();
    res.json({ success: true, state: getUserStatePayload(user.id) });
  });

  app.post('/api/user/withdrawals', requireUser, async (req: AuthedRequest, res) => {
    const { amount, payoutMethod, payoutDetails } = req.body || {};
    const user = db.users.find(u => u.id === req.auth!.uid);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    const wdrAmount = Number(amount);
    if (!Number.isFinite(wdrAmount) || wdrAmount <= 0) {
      res.status(400).json({ success: false, error: 'Amount must be greater than 0' });
      return;
    }
    if (wdrAmount > user.coins) {
      res.status(400).json({ success: false, error: `Insufficient balance. Available: ${user.coins} coins` });
      return;
    }
    if (typeof payoutDetails !== 'string' || !payoutDetails.trim()) {
      res.status(400).json({ success: false, error: 'Payout address or bank details required' });
      return;
    }

    const prevBalance = user.coins;
    const newBalance = prevBalance - wdrAmount;
    user.coins = newBalance;

    const wId = `wdr_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const nowIso = new Date().toISOString();

    const newWdr: WithdrawalRequest = {
      id: wId,
      userId: user.id,
      username: user.username,
      amount: wdrAmount,
      payoutMethod: typeof payoutMethod === 'string' && payoutMethod.trim() ? payoutMethod.trim() : 'UPI Payout',
      payoutDetails: payoutDetails.trim(),
      status: 'pending',
      createdAt: nowIso
    };
    db.withdrawals.unshift(newWdr);

    const newTx: Transaction = {
      id: `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      userId: user.id,
      username: user.username,
      type: 'withdrawal',
      amount: -wdrAmount,
      balanceBefore: prevBalance,
      balanceAfter: newBalance,
      status: 'pending',
      description: `Withdrawal request via ${newWdr.payoutMethod} (${payoutDetails.trim().substring(0, 15)}...)`,
      createdAt: nowIso,
      referenceId: wId
    };
    db.transactions.unshift(newTx);

    await persistDb();
    res.json({ success: true, state: getUserStatePayload(user.id) });
  });

  // --- Authenticated Admin Endpoints ---

  app.get('/api/admin/state', requireAdmin, (_req, res) => {
    res.json({ success: true, state: getAdminStatePayload() });
  });

  app.post('/api/admin/change-password', requireAdmin, async (req, res) => {
    const { currentPassword, newUsername, newPassword } = req.body || {};
    let admin = db.users.find(u => u.id === 'usr_admin');
    if (!admin) {
      admin = { ...INITIAL_ADMIN_USER };
      db.users.unshift(admin);
    }

    if (typeof currentPassword !== 'string' || admin.passwordHash !== currentPassword) {
      res.status(400).json({ success: false, error: 'Current admin password is incorrect' });
      return;
    }
    if (typeof newPassword !== 'string' || newPassword.trim().length < 6) {
      res.status(400).json({ success: false, error: 'New admin password must be at least 6 characters long' });
      return;
    }

    if (typeof newUsername === 'string' && newUsername.trim().length >= 3) {
      const cleanNewUsername = newUsername.trim();
      const collision = db.users.some(
        u => u.id !== 'usr_admin' && u.username.toLowerCase() === cleanNewUsername.toLowerCase()
      );
      if (collision) {
        res.status(400).json({ success: false, error: 'Username is already in use by a player account' });
        return;
      }
      admin.username = cleanNewUsername;
    }
    admin.passwordHash = newPassword.trim();

    await persistDb();
    res.json({ success: true, state: getAdminStatePayload() });
  });

  app.post('/api/admin/users', requireAdmin, async (req, res) => {
    const { username, password, fullName, email, phone, initialCoins, notes } = req.body || {};
    const displayUsername = typeof username === 'string' ? username.trim().replace(/^@+/, '') : '';
    if (!displayUsername) {
      res.status(400).json({ success: false, error: 'Username is required' });
      return;
    }
    if (typeof password !== 'string' || password.trim().length < 4) {
      res.status(400).json({ success: false, error: 'Password must be at least 4 characters long' });
      return;
    }

    const cleanUsername = displayUsername.toLowerCase();
    const exists = db.users.some(u => u.username.trim().replace(/^@+/, '').toLowerCase() === cleanUsername);
    if (exists) {
      res.status(400).json({ success: false, error: `Username "${displayUsername}" already exists` });
      return;
    }

    const startingCoins = Math.max(0, Number(initialCoins) || 0);
    const nowIso = new Date().toISOString();
    const newUser: User = {
      id: `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      username: displayUsername,
      passwordHash: password.trim(),
      fullName: (typeof fullName === 'string' && fullName.trim()) || displayUsername,
      email: typeof email === 'string' ? email.trim() : '',
      phone: typeof phone === 'string' ? phone.trim() : '',
      coins: startingCoins,
      status: 'active',
      createdAt: nowIso,
      notes: typeof notes === 'string' ? notes.trim() : ''
    };
    db.users.push(newUser);

    if (startingCoins > 0) {
      const admin = db.users.find(u => u.id === 'usr_admin') || INITIAL_ADMIN_USER;
      db.coinLogs.unshift({
        id: `log_${Date.now()}_init`,
        userId: newUser.id,
        username: newUser.username,
        adminId: 'usr_admin',
        adminUsername: admin.username,
        type: 'set',
        amount: startingCoins,
        previousBalance: 0,
        newBalance: startingCoins,
        reason: 'Initial account coin balance configured upon creation',
        createdAt: nowIso
      });
      db.transactions.unshift({
        id: `tx_init_${Date.now()}`,
        userId: newUser.id,
        username: newUser.username,
        type: 'admin_credit',
        amount: startingCoins,
        balanceBefore: 0,
        balanceAfter: startingCoins,
        status: 'completed',
        description: 'Initial balance credited by Administrator',
        createdAt: nowIso
      });
    }

    await persistDb();
    res.json({ success: true, user: sanitizeUser(newUser), state: getAdminStatePayload() });
  });

  app.patch('/api/admin/users/:id', requireAdmin, async (req, res) => {
    const userId = req.params.id;
    const target = db.users.find(u => u.id === userId);
    if (!target) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const { fullName, email, phone, notes } = req.body || {};
    if (typeof fullName === 'string' && fullName.trim()) target.fullName = fullName.trim();
    if (typeof email === 'string') target.email = email.trim();
    if (typeof phone === 'string') target.phone = phone.trim();
    if (typeof notes === 'string') target.notes = notes.trim();

    await persistDb();
    res.json({ success: true, state: getAdminStatePayload() });
  });

  app.post('/api/admin/users/:id/toggle-status', requireAdmin, async (req, res) => {
    const userId = req.params.id;
    if (userId === 'usr_admin') {
      res.status(400).json({ success: false, error: 'Cannot suspend administrator account' });
      return;
    }
    const target = db.users.find(u => u.id === userId);
    if (!target) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    target.status = target.status === 'active' ? 'suspended' : 'active';
    await persistDb();
    res.json({ success: true, state: getAdminStatePayload() });
  });

  app.post('/api/admin/users/:id/reset-password', requireAdmin, async (req, res) => {
    const userId = req.params.id;
    const { newPassword } = req.body || {};
    if (typeof newPassword !== 'string' || newPassword.trim().length < 4) {
      res.status(400).json({ success: false, error: 'Password must be at least 4 characters' });
      return;
    }
    const target = db.users.find(u => u.id === userId);
    if (!target) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    target.passwordHash = newPassword.trim();
    await persistDb();
    res.json({ success: true, state: getAdminStatePayload() });
  });

  app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
    const userId = req.params.id;
    if (userId === 'usr_admin') {
      res.status(400).json({ success: false, error: 'Cannot delete administrator account' });
      return;
    }
    const target = db.users.find(u => u.id === userId);
    if (!target) {
      res.status(404).json({ success: false, error: 'User account not found' });
      return;
    }

    db.users = db.users.filter(u => u.id !== userId);
    db.bets = db.bets.filter(b => b.userId !== userId);
    db.transactions = db.transactions.filter(t => t.userId !== userId);
    db.deposits = db.deposits.filter(d => d.userId !== userId);
    db.withdrawals = db.withdrawals.filter(w => w.userId !== userId);
    db.coinLogs = db.coinLogs.filter(l => l.userId !== userId);

    await persistDb();
    res.json({ success: true, state: getAdminStatePayload() });
  });

  app.post('/api/admin/users/:id/coins', requireAdmin, async (req, res) => {
    const userId = req.params.id;
    const { type, amount, reason } = req.body || {};
    const target = db.users.find(u => u.id === userId);
    if (!target) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount < 0) {
      res.status(400).json({ success: false, error: 'Amount must be a non-negative number' });
      return;
    }
    if (typeof reason !== 'string' || !reason.trim()) {
      res.status(400).json({ success: false, error: 'Adjustment reason is required for audit logs' });
      return;
    }

    const prevBalance = target.coins;
    let newBalance = prevBalance;
    let logType: 'credit' | 'debit' | 'set' = 'credit';
    let txType: 'admin_credit' | 'admin_debit' = 'admin_credit';
    let deltaAmount = numAmount;

    if (type === 'credit') {
      newBalance = prevBalance + numAmount;
      logType = 'credit';
      txType = 'admin_credit';
      deltaAmount = numAmount;
    } else if (type === 'debit') {
      newBalance = Math.max(0, prevBalance - numAmount);
      logType = 'debit';
      txType = 'admin_debit';
      deltaAmount = -(prevBalance - newBalance);
    } else if (type === 'set') {
      newBalance = Math.max(0, numAmount);
      logType = 'set';
      deltaAmount = newBalance - prevBalance;
      txType = deltaAmount >= 0 ? 'admin_credit' : 'admin_debit';
    } else {
      res.status(400).json({ success: false, error: 'Invalid adjustment type' });
      return;
    }

    target.coins = newBalance;
    const admin = db.users.find(u => u.id === 'usr_admin') || INITIAL_ADMIN_USER;
    const nowIso = new Date().toISOString();

    db.coinLogs.unshift({
      id: `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      userId: target.id,
      username: target.username,
      adminId: 'usr_admin',
      adminUsername: admin.username,
      type: logType,
      amount: Math.abs(deltaAmount),
      previousBalance: prevBalance,
      newBalance,
      reason: reason.trim(),
      createdAt: nowIso
    });

    db.transactions.unshift({
      id: `tx_adm_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      userId: target.id,
      username: target.username,
      type: txType,
      amount: deltaAmount,
      balanceBefore: prevBalance,
      balanceAfter: newBalance,
      status: 'completed',
      description: `Admin adjustment: ${reason.trim()}`,
      createdAt: nowIso
    });

    await persistDb();
    res.json({ success: true, state: getAdminStatePayload() });
  });

  app.put('/api/admin/users/:id/payment-gateway', requireAdmin, async (req, res) => {
    const userId = req.params.id;
    const target = db.users.find(u => u.id === userId);
    if (!target) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const { config } = req.body || {};
    if (config === null) {
      target.customPaymentGateway = null;
      await persistDb();
      res.json({ success: true, state: getAdminStatePayload() });
      return;
    }

    const channels = Array.isArray(config?.channels)
      ? config.channels.filter((c: { label?: string; value?: string }) => c?.label?.trim() && c?.value?.trim())
      : [];

    if (channels.length === 0) {
      res.status(400).json({
        success: false,
        error: 'At least one payment gateway channel with label and details is required'
      });
      return;
    }

    target.customPaymentGateway = {
      title: (typeof config.title === 'string' && config.title.trim()) || 'Official Admin Payment Gateway',
      instructions: typeof config.instructions === 'string' ? config.instructions.trim() : '',
      channels: channels.map((c: { id?: string; label: string; value: string; enabled?: boolean }) => ({
        id: c.id || `gw_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        label: c.label.trim(),
        value: c.value.trim(),
        enabled: c.enabled !== false
      })),
      updatedAt: new Date().toISOString()
    };

    await persistDb();
    res.json({ success: true, state: getAdminStatePayload() });
  });

  // --- Predictions Management ---

  app.post('/api/admin/predictions', requireAdmin, async (req, res) => {
    const data = req.body || {};
    if (typeof data.title !== 'string' || !data.title.trim()) {
      res.status(400).json({ success: false, error: 'Prediction question is required' });
      return;
    }

    const newPred: Prediction = {
      id: `pred_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      title: data.title.trim(),
      subtitle: typeof data.subtitle === 'string' ? data.subtitle.trim() : '',
      category: data.category || 'Sports',
      yesOdds: Number(data.yesOdds) || 1.9,
      noOdds: Number(data.noOdds) || 1.9,
      minBet: Number(data.minBet) || 50,
      maxBet: Number(data.maxBet) || 5000,
      closingTime: data.closingTime || new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      status: data.status || 'open',
      outcome: null,
      totalYesVolume: 0,
      totalNoVolume: 0,
      totalParticipants: 0,
      createdAt: new Date().toISOString(),
      iconName: data.iconName || 'trophy',
      description: typeof data.description === 'string' ? data.description.trim() : ''
    };

    db.predictions.unshift(newPred);
    await persistDb();
    res.json({ success: true, prediction: newPred, state: getAdminStatePayload() });
  });

  app.patch('/api/admin/predictions/:id', requireAdmin, async (req, res) => {
    const pred = db.predictions.find(p => p.id === req.params.id);
    if (!pred) {
      res.status(404).json({ success: false, error: 'Prediction not found' });
      return;
    }

    const data = req.body || {};
    if (typeof data.title === 'string' && data.title.trim()) pred.title = data.title.trim();
    if (typeof data.subtitle === 'string') pred.subtitle = data.subtitle.trim();
    if (data.category) pred.category = data.category;
    if (data.yesOdds !== undefined) pred.yesOdds = Number(data.yesOdds);
    if (data.noOdds !== undefined) pred.noOdds = Number(data.noOdds);
    if (data.minBet !== undefined) pred.minBet = Number(data.minBet);
    if (data.maxBet !== undefined) pred.maxBet = Number(data.maxBet);
    if (typeof data.closingTime === 'string') pred.closingTime = data.closingTime;
    if (data.status) pred.status = data.status;
    if (typeof data.description === 'string') pred.description = data.description.trim();

    await persistDb();
    res.json({ success: true, state: getAdminStatePayload() });
  });

  app.post('/api/admin/predictions/:id/status', requireAdmin, async (req, res) => {
    const pred = db.predictions.find(p => p.id === req.params.id);
    if (!pred) {
      res.status(404).json({ success: false, error: 'Prediction not found' });
      return;
    }
    const { status } = req.body || {};
    const allowed: PredictionStatus[] = ['open', 'paused', 'closed', 'settled'];
    if (!allowed.includes(status)) {
      res.status(400).json({ success: false, error: 'Invalid prediction status' });
      return;
    }
    pred.status = status;
    await persistDb();
    res.json({ success: true, state: getAdminStatePayload() });
  });

  app.delete('/api/admin/predictions/:id', requireAdmin, async (req, res) => {
    const pred = db.predictions.find(p => p.id === req.params.id);
    if (!pred) {
      res.status(404).json({ success: false, error: 'Prediction not found' });
      return;
    }

    const nowIso = new Date().toISOString();
    const activePendingBets = db.bets.filter(
      b => b.predictionId === pred.id && b.result === 'pending'
    );

    const userRefundTotals: Record<string, number> = {};
    let refundedTotal = 0;

    for (const bet of activePendingBets) {
      userRefundTotals[bet.userId] = (userRefundTotals[bet.userId] || 0) + bet.amount;
      refundedTotal += bet.amount;
    }

    const newRefundTxs: Transaction[] = [];
    for (const user of db.users) {
      const refundAmt = userRefundTotals[user.id] || 0;
      if (refundAmt > 0) {
        const prevBal = user.coins;
        user.coins = prevBal + refundAmt;
        newRefundTxs.push({
          id: `tx_del_ref_${Date.now()}_${user.id}`,
          userId: user.id,
          username: user.username,
          type: 'bet_refund',
          amount: refundAmt,
          balanceBefore: prevBal,
          balanceAfter: user.coins,
          status: 'completed',
          description: `Refund for deleted market: "${pred.title.substring(0, 35)}..."`,
          createdAt: nowIso,
          referenceId: pred.id
        });
      }
    }

    db.bets = db.bets.map(b =>
      b.predictionId === pred.id && b.result === 'pending'
        ? { ...b, result: 'voided', actualWinnings: b.amount, settledAt: nowIso }
        : b
    );
    if (newRefundTxs.length > 0) {
      db.transactions = [...newRefundTxs, ...db.transactions];
    }
    db.predictions = db.predictions.filter(p => p.id !== pred.id);

    await persistDb();
    res.json({
      success: true,
      refundedCount: activePendingBets.length,
      refundedTotal,
      state: getAdminStatePayload()
    });
  });

  app.post('/api/admin/predictions/:id/settle', requireAdmin, async (req, res) => {
    const pred = db.predictions.find(p => p.id === req.params.id);
    if (!pred) {
      res.status(404).json({ success: false, error: 'Prediction not found' });
      return;
    }
    if (pred.status === 'settled') {
      res.status(400).json({ success: false, error: 'Prediction is already settled' });
      return;
    }
    const { outcome } = req.body || {};
    if (outcome !== 'YES' && outcome !== 'NO' && outcome !== 'VOID') {
      res.status(400).json({ success: false, error: 'Invalid settlement outcome' });
      return;
    }

    const nowIso = new Date().toISOString();
    const targetBets = db.bets.filter(b => b.predictionId === pred.id && b.result === 'pending');

    let winnersCount = 0;
    let totalPayout = 0;
    const userPayouts: Record<string, { amount: number; count: number; isVoid: boolean }> = {};

    for (const bet of targetBets) {
      if (outcome === 'VOID') {
        bet.result = 'voided';
        bet.actualWinnings = bet.amount;
        bet.settledAt = nowIso;
        if (!userPayouts[bet.userId]) userPayouts[bet.userId] = { amount: 0, count: 0, isVoid: true };
        userPayouts[bet.userId].amount += bet.amount;
        userPayouts[bet.userId].count += 1;
        totalPayout += bet.amount;
      } else if (bet.choice === outcome) {
        bet.result = 'won';
        bet.actualWinnings = bet.potentialWinnings;
        winnersCount += 1;
        totalPayout += bet.potentialWinnings;
        if (!userPayouts[bet.userId]) userPayouts[bet.userId] = { amount: 0, count: 0, isVoid: false };
        userPayouts[bet.userId].amount += bet.potentialWinnings;
        userPayouts[bet.userId].count += 1;
      } else {
        bet.result = 'lost';
        bet.actualWinnings = 0;
      }
    }

    const payoutTxs: Transaction[] = [];
    for (const user of db.users) {
      const payout = userPayouts[user.id];
      if (payout && payout.amount > 0) {
        const prevBal = user.coins;
        user.coins = prevBal + payout.amount;
        payoutTxs.push({
          id: `tx_settle_${Date.now()}_${user.id}`,
          userId: user.id,
          username: user.username,
          type: payout.isVoid ? 'bet_refund' : 'bet_won',
          amount: payout.amount,
          balanceBefore: prevBal,
          balanceAfter: user.coins,
          status: 'completed',
          description: payout.isVoid
            ? `Refund (VOID Market): "${pred.title.substring(0, 35)}..."`
            : `Payout WON (${outcome}): "${pred.title.substring(0, 35)}..."`,
          createdAt: nowIso,
          referenceId: pred.id
        });
      }
    }

    if (payoutTxs.length > 0) {
      db.transactions = [...payoutTxs, ...db.transactions];
    }

    pred.status = 'settled';
    pred.outcome = outcome;
    pred.settledAt = nowIso;
    pred.settledBy = (db.users.find(u => u.id === 'usr_admin') || INITIAL_ADMIN_USER).username;

    await persistDb();
    res.json({
      success: true,
      winnersCount,
      totalPayout,
      state: getAdminStatePayload()
    });
  });

  // --- Financial Requests & Global Payment Gateway ---

  app.post('/api/admin/deposits/:id/review', requireAdmin, async (req, res) => {
    const dep = db.deposits.find(d => d.id === req.params.id);
    if (!dep || dep.status !== 'pending') {
      res.status(400).json({ success: false, error: 'Pending deposit request not found' });
      return;
    }
    const { action, adminRemark } = req.body || {};
    if (action !== 'approve' && action !== 'reject') {
      res.status(400).json({ success: false, error: 'Invalid deposit review action' });
      return;
    }

    const nowIso = new Date().toISOString();
    const admin = db.users.find(u => u.id === 'usr_admin') || INITIAL_ADMIN_USER;

    if (action === 'approve') {
      const targetUser = db.users.find(u => u.id === dep.userId);
      const prevBal = targetUser ? targetUser.coins : 0;
      const newBal = prevBal + dep.amount;
      if (targetUser) {
        targetUser.coins = newBal;
      }

      db.transactions.unshift({
        id: `tx_dep_appr_${dep.id}`,
        userId: dep.userId,
        username: dep.username,
        type: 'deposit',
        amount: dep.amount,
        balanceBefore: prevBal,
        balanceAfter: newBal,
        status: 'completed',
        description: `Deposit approved via ${dep.paymentMethod} (Ref: ${dep.referenceNumber})`,
        createdAt: nowIso,
        referenceId: dep.id
      });
    }

    dep.status = action === 'approve' ? 'approved' : 'rejected';
    dep.reviewedAt = nowIso;
    dep.reviewedBy = admin.username;
    dep.adminRemark =
      (typeof adminRemark === 'string' && adminRemark.trim()) ||
      (action === 'approve' ? 'Deposit verified & coins credited' : 'Rejected by admin');

    await persistDb();
    res.json({ success: true, state: getAdminStatePayload() });
  });

  app.post('/api/admin/withdrawals/:id/review', requireAdmin, async (req, res) => {
    const wdr = db.withdrawals.find(w => w.id === req.params.id);
    if (!wdr) {
      res.status(404).json({ success: false, error: 'Withdrawal request not found' });
      return;
    }
    if (wdr.status === 'approved' || wdr.status === 'rejected') {
      res.status(400).json({ success: false, error: 'Withdrawal request has already been finalized' });
      return;
    }
    const { action, adminRemark } = req.body || {};
    if (action !== 'approve' && action !== 'reject' && action !== 'processing') {
      res.status(400).json({ success: false, error: 'Invalid withdrawal review action' });
      return;
    }

    const nowIso = new Date().toISOString();
    const admin = db.users.find(u => u.id === 'usr_admin') || INITIAL_ADMIN_USER;

    if (action === 'reject') {
      const targetUser = db.users.find(u => u.id === wdr.userId);
      const prevBal = targetUser ? targetUser.coins : 0;
      const newBal = prevBal + wdr.amount;
      if (targetUser) {
        targetUser.coins = newBal;
      }

      db.transactions.unshift({
        id: `tx_wdr_rej_${wdr.id}`,
        userId: wdr.userId,
        username: wdr.username,
        type: 'withdrawal',
        amount: wdr.amount,
        balanceBefore: prevBal,
        balanceAfter: newBal,
        status: 'rejected',
        description: `Withdrawal rejected & refunded: ${adminRemark || 'Admin rejected request'}`,
        createdAt: nowIso,
        referenceId: wdr.id
      });
    } else if (action === 'approve') {
      db.transactions = db.transactions.map(t =>
        t.referenceId === wdr.id ? { ...t, status: 'completed' } : t
      );
    }

    const mappedStatus: 'approved' | 'rejected' | 'processing' =
      action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'processing';

    wdr.status = mappedStatus;
    wdr.reviewedAt = nowIso;
    wdr.reviewedBy = admin.username;
    wdr.adminRemark =
      (typeof adminRemark === 'string' && adminRemark.trim()) ||
      `Status updated to ${mappedStatus} by administrator`;

    await persistDb();
    res.json({ success: true, state: getAdminStatePayload() });
  });

  app.put('/api/admin/payment-gateway', requireAdmin, async (req, res) => {
    const config = req.body || {};
    const channels = Array.isArray(config.channels)
      ? config.channels.filter((c: { label?: string; value?: string }) => c?.label?.trim() && c?.value?.trim())
      : [];

    if (channels.length === 0) {
      res.status(400).json({
        success: false,
        error: 'At least one payment gateway channel with label and details is required'
      });
      return;
    }

    db.paymentGateway = {
      title: (typeof config.title === 'string' && config.title.trim()) || 'Official Admin Payment Gateway',
      instructions: typeof config.instructions === 'string' ? config.instructions.trim() : '',
      channels: channels.map((c: { id?: string; label: string; value: string; enabled?: boolean }) => ({
        id: c.id || `gw_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        label: c.label.trim(),
        value: c.value.trim(),
        enabled: c.enabled !== false
      })),
      updatedAt: new Date().toISOString()
    };

    await persistDb();
    res.json({ success: true, state: getAdminStatePayload() });
  });

  app.put('/api/admin/whatsapp-support', requireAdmin, async (req, res) => {
    const body = req.body || {};
    const enabled = Boolean(body.enabled);
    const phoneNumber = typeof body.phoneNumber === 'string' ? body.phoneNumber.trim() : '';
    const digitsOnly = phoneNumber.replace(/\D/g, '');

    if (enabled && digitsOnly.length < 6) {
      res.status(400).json({
        success: false,
        error: 'Please enter a valid WhatsApp phone number with country code (at least 6 digits)'
      });
      return;
    }

    db.whatsappSupport = {
      enabled,
      phoneNumber,
      buttonLabel:
        (typeof body.buttonLabel === 'string' && body.buttonLabel.trim()) || 'WhatsApp Support',
      defaultMessage:
        (typeof body.defaultMessage === 'string' && body.defaultMessage.trim()) ||
        'Hello Admin, I need assistance with my ApexPredict account.',
      updatedAt: new Date().toISOString()
    };

    await persistDb();
    res.json({ success: true, state: getAdminStatePayload() });
  });

  // --- Vite Dev Middleware or Production Static Bundle ---

  const isDev =
    process.env.npm_lifecycle_event === 'dev' ||
    (process.env.NODE_ENV !== 'production' &&
      process.env.npm_lifecycle_event !== 'start' &&
      !fs.existsSync(path.join(DIST_DIR, 'index.html')));

  app.get(['/admin', '/admin/*'], (_req, res) => {
    res.redirect('/#admin');
  });

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(DIST_DIR));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(DIST_DIR, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ApexPredict Exchange server listening on http://0.0.0.0:${PORT} (${isDev ? 'dev' : 'production'})`);
  });
}

startServer().catch(err => {
  console.error('Failed to start ApexPredict server:', err);
  process.exit(1);
});
