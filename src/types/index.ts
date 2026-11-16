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
  ownerUid?: string;
  customPaymentGateway?: PaymentGatewayConfig | null;
}

export type PredictionCategory = 'Cricket' | 'Movies' | 'Football' | 'Basketball' | 'Tennis' | 'Esports' | 'Crypto & Finance';

export type PredictionStatus = 'open' | 'paused' | 'closed' | 'settled';

export type PredictionOutcome = 'YES' | 'NO' | 'VOID' | null;

export interface Prediction {
  id: string;
  title: string;
  subtitle: string; // e.g. "India vs Australia - 2nd Test"
  category: PredictionCategory;
  yesOdds: number; // e.g. 1.8 (pays 1.80x)
  noOdds: number; // e.g. 3.2 (pays 3.20x)
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
  cricketMatchId?: string;
  cricketLeagueId?: string;
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
  ownerUid?: string;
}

export interface ParlayLeg {
  predictionId: string;
  predictionTitle: string;
  predictionCategory: PredictionCategory;
  choice: 'YES' | 'NO';
  odds: number;
  status: BetResult;
  closingTime: string;
  outcome?: PredictionOutcome;
}

export interface ParlayBet {
  id: string;
  userId: string;
  ownerUid?: string;
  username: string;
  legs: ParlayLeg[];
  legCount: number;
  combinedOdds: number;
  effectiveOdds: number;
  amount: number;
  potentialWinnings: number;
  actualWinnings: number;
  result: BetResult;
  createdAt: string;
  settledAt?: string;
  transactionId: string;
}

export interface BuilderSelection {
  prediction: Prediction;
  choice: 'YES' | 'NO';
}

export type LiveCricketStatus = 'in' | 'pre' | 'post';

export interface CricketTeamInfo {
  id: string;
  name: string;
  shortName: string;
  abbreviation: string;
  score: string;
  logo?: string;
  color?: string;
  winner: boolean;
  isBatting: boolean;
}

export interface LiveCricketMatch {
  id: string;
  leagueId: string;
  leagueName: string;
  name: string;
  shortName: string;
  format: string;
  status: LiveCricketStatus;
  statusText: string;
  statusSummary: string;
  session?: string;
  dayNumber?: number;
  presentLocalTime?: string;
  venue: string;
  startTime: string;
  homeTeam: CricketTeamInfo;
  awayTeam: CricketTeamInfo;
  lastUpdatedAt: string;
}

export interface CricketBatterCard {
  playerId: string;
  name: string;
  dismissal: string;
  runs: string;
  balls: string;
  fours: string;
  sixes: string;
  strikeRate: string;
}

export interface CricketBowlerCard {
  playerId: string;
  name: string;
  overs: string;
  maidens: string;
  runs: string;
  wickets: string;
  economy: string;
}

export interface CricketInningsCard {
  headline: string;
  total: string;
  batters?: CricketBatterCard[];
  bowlers?: CricketBowlerCard[];
}

export interface LiveCricketDetail {
  match: LiveCricketMatch;
  venueCity?: string;
  venueCountry?: string;
  tossNote?: string;
  playerOfTheMatch?: string;
  matchcards: CricketInningsCard[];
  fetchedAt: string;
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
  ownerUid?: string;
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
  proofImageUrl?: string;
  ownerUid?: string;
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
  userId?: string;
  username?: string;
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
  imageUrl?: string;
  issuedUsername?: string;
  issuedPassword?: string;
  createdAt: string;
}
