export type Currency = 'CAD' | 'USD' | 'INR';
export type BetType = 'back' | 'lay';
export type BetStatus = 'open' | 'matched' | 'settled' | 'void' | 'cancelled';
export type MarketStatus = 'open' | 'suspended' | 'closed' | 'settled';
export type UserRole = 'user' | 'admin';
export type TransactionType = 'deposit' | 'withdrawal' | 'bet_placed' | 'bet_won' | 'bet_lost' | 'bonus';
export type WithdrawalStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  email: string;
  phone: string;
  name: string;
  role: UserRole;
  pointsBalance: number;
  currency: Currency;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  totalDeposited: number;
  totalWithdrawn: number;
  kycStatus: 'pending' | 'verified' | 'rejected';
}

export interface Runner {
  id: string;
  name: string;
  backOdds: OddsLevel[];
  layOdds: OddsLevel[];
  lastTradedPrice: number;
  status: 'active' | 'winner' | 'loser' | 'removed';
  sort: number;
}

export interface OddsLevel {
  price: number;
  size: number; // in points available
}

export interface Market {
  id: string;
  matchId: string;
  name: string;
  type: 'match_odds' | 'fancy' | 'over_under';
  status: MarketStatus;
  runners: Runner[];
  inPlay: boolean;
  startTime: string;
  settlementTime?: string;
  minBet: number;
  maxBet: number;
  fancyQuestion?: string; // for fancy markets e.g. "Runs in over 5"
  fancyLine?: number; // line for yes/no
  fancyYesOdds?: number;
  fancyNoOdds?: number;
}

export interface Match {
  id: string;
  series: string;
  homeTeam: string;
  awayTeam: string;
  venue: string;
  startTime: string;
  status: 'upcoming' | 'live' | 'completed';
  score?: MatchScore;
  markets: Market[];
  sport: 'cricket' | 'football' | 'tennis' | string;
  sportGroup?: string;
  sportKey?: string;
  region?: string;
}

export interface MatchScore {
  homeRuns: number;
  homeWickets: number;
  homeOvers: string;
  awayRuns?: number;
  awayWickets?: number;
  awayOvers?: string;
  currentBatsman1: string;
  currentBatsman2: string;
  currentBowler: string;
  lastBallResult: string;
  reqRunRate?: number;
  currRunRate: number;
}

export interface Bet {
  id: string;
  userId: string;
  marketId: string;
  matchId: string;
  matchName: string;
  marketName: string;
  runnerName: string;
  betType: BetType;
  requestedOdds: number;
  matchedOdds?: number;
  stake: number; // in points
  potentialPnl: number;
  status: BetStatus;
  placedAt: string;
  settledAt?: string;
  pnl?: number; // settled profit/loss in points
}

export interface BetSlipItem {
  marketId: string;
  matchId: string;
  matchName: string;
  marketName: string;
  runnerId: string;
  runnerName: string;
  betType: BetType;
  odds: number;
  stake: number;
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  points: number;
  currency?: Currency;
  currencyAmount?: number;
  description: string;
  timestamp: string;
  stripePaymentId?: string;
  balanceAfter: number;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userName: string;
  points: number;
  currency: Currency;
  currencyAmount: number;
  bankDetails: string;
  status: WithdrawalStatus;
  requestedAt: string;
  processedAt?: string;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalDeposited: number;
  totalWithdrawn: number;
  platformPnl: number;
  openBets: number;
  pendingWithdrawals: number;
  todayBets: number;
}
