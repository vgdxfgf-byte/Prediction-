export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'suspended';

export interface PaymentGatewayChannel {
  id: string;
  label: string;
  value: string;
  enabled: boolean;
}

export interface PaymentGatewayConfig {
  title: string;
  instructions?: string;
  channels: PaymentGatewayChannel[];
  updatedAt: string;
}

export interface WhatsAppSupportConfig {
  enabled: boolean;
  phoneNumber: string;
  buttonLabel: string;
  defaultMessage: string;
  updatedAt: string;
}

export interface User {
  id: string;
  username: string;
  passwordHash: string; // Plain/stored for demo authentication
  fullName: string;
  email?: string;
  phone?: string;
  coins: number;
  status: UserStatus;
  createdAt: string;
  lastLogin?: string;
  notes?: string;
  customPaymentGateway?: PaymentGatewayConfig | null;
}

export type PredictionCategory = 'Cricket' | 'Movies' | 'Football' | 'Basketball' | 'Tennis' | 'Esports' | 'Crypto & Finance';

export type PredictionStatus = 'open' | 'paused' | 'closed' | 'settled';

export type PredictionOutcome = 'YES' | 'NO' | 'VOID' | null;

export interface Prediction {
  id: string;
  title: string;
  subtitle: string; // e.g. "India vs Australia - 2nd ODI"
  category: PredictionCategory;
  yesOdds: number; // e.g. 1.85 (pays 1.85x)
  noOdds: number; // e.g. 2.10 (pays 2.10x)
  minBet: number;
  maxBet: number;
  closingTime: string; // ISO string
  status: PredictionStatus;
  outcome: PredictionOutcome;
  totalYesVolume: number;
  totalNoVolume: number;
  totalParticipants: number;
  createdAt: string;
  settledAt?: string;
  settledBy?: string;
  iconName?: string;
  description?: string;
}

export type BetResult = 'pending' | 'won' | 'lost' | 'voided';

export interface Bet {
  id: string;
  userId: string;
  username: string;
  predictionId: string;
  predictionTitle: string;
  predictionCategory: PredictionCategory;
  choice: 'YES' | 'NO';
  odds: number;
  amount: number;
  potentialWinnings: number; // amount * odds
  actualWinnings: number;
  result: BetResult;
  createdAt: string;
  settledAt?: string;
  transactionId: string;
}

export type TransactionType = 
  | 'deposit' 
  | 'withdrawal' 
  | 'bet_placed' 
  | 'bet_won' 
  | 'bet_refund' 
  | 'admin_credit' 
  | 'admin_debit';

export type TransactionStatus = 'pending' | 'completed' | 'rejected' | 'processing';

export interface Transaction {
  id: string;
  userId: string;
  username: string;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  status: TransactionStatus;
  description: string;
  createdAt: string;
  referenceId?: string; // betId, depositId, withdrawalId
}

export interface DepositRequest {
  id: string;
  userId: string;
  username: string;
  amount: number;
  paymentMethod: string; // e.g. "UPI Transfer", "Bank Wire", "USDT / Crypto", "Cash Agent"
  referenceNumber: string;
  proofImageUrl?: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  adminRemark?: string;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  username: string;
  amount: number;
  payoutMethod: string; // e.g. "UPI ID", "Bank Account", "Crypto Wallet"
  payoutDetails: string; // account number, IFSC, UPI ID, or USDT address
  status: 'pending' | 'processing' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  adminRemark?: string;
}

export interface CoinAdjustmentLog {
  id: string;
  userId: string;
  username: string;
  adminId: string;
  adminUsername: string;
  type: 'credit' | 'debit' | 'set';
  amount: number;
  previousBalance: number;
  newBalance: number;
  reason: string;
  createdAt: string;
}

export interface PlatformStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  totalCoinsInCirculation: number;
  totalPredictions: number;
  openPredictions: number;
  settledPredictions: number;
  totalBetsPlaced: number;
  totalBetVolume: number;
  totalWonPayouts: number;
  pendingDepositsCount: number;
  pendingDepositsAmount: number;
  pendingWithdrawalsCount: number;
  pendingWithdrawalsAmount: number;
}

export type IdChatStatus = 'open' | 'issued' | 'closed';

export interface IdChatThread {
  id: string;
  visitorName: string;
  contactInfo?: string;
  requestedUsername?: string;
  status: IdChatStatus;
  lastMessage: string;
  unreadByAdmin: boolean;
  unreadByUser: boolean;
  issuedUsername?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IdChatMessage {
  id: string;
  chatId: string;
  senderRole: 'user' | 'admin';
  senderName: string;
  text: string;
  issuedUsername?: string;
  issuedPassword?: string;
  createdAt: string;
}
