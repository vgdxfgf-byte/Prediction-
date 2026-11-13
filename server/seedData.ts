import type {
  User,
  Prediction,
  Bet,
  Transaction,
  DepositRequest,
  WithdrawalRequest,
  CoinAdjustmentLog,
  PaymentGatewayConfig,
  WhatsAppSupportConfig
} from '../src/types/index.ts';

export interface DatabaseState {
  sessionSecret: string;
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

export const INITIAL_ADMIN_USER: User = {
  id: 'usr_admin',
  username: 'admin',
  passwordHash: 'admin123',
  fullName: 'System Administrator',
  email: 'admin@apexpredict.com',
  coins: 999999,
  status: 'active',
  createdAt: '2026-01-01T00:00:00Z',
  notes: 'Super administrator account'
};

export function createInitialDatabaseState(sessionSecret: string): DatabaseState {
  const now = Date.now();
  return {
    sessionSecret,
    users: [
      INITIAL_ADMIN_USER,
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
        title: 'Will Real Madrid win today\'s UEFA Champions League clash?',
        subtitle: 'UEFA Champions League - Real Madrid vs Bayern Munich',
        category: 'Football',
        yesOdds: 2.10,
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
        {
          id: 'gw_upi',
          label: 'Admin UPI ID',
          value: 'apexpredict@icici',
          enabled: true
        },
        {
          id: 'gw_usdt',
          label: 'USDT TRC-20',
          value: 'TX9vK7m842jqp1y38aG98kL',
          enabled: true
        },
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
