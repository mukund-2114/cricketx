import type { Match, Bet, Transaction, WithdrawalRequest } from '@/types';
import { generateId } from '@/lib/utils';

const now = new Date();
const inHour = (h: number) => new Date(now.getTime() + h * 3600000).toISOString();
const pastHour = (h: number) => new Date(now.getTime() - h * 3600000).toISOString();

export const MOCK_MATCHES: Match[] = [
  {
    id: 'match-001',
    series: 'IPL 2026',
    homeTeam: 'Mumbai Indians',
    awayTeam: 'Chennai Super Kings',
    venue: 'Wankhede Stadium, Mumbai',
    startTime: pastHour(1.5),
    status: 'live',
    score: {
      homeRuns: 148,
      homeWickets: 4,
      homeOvers: '16.3',
      awayRuns: undefined,
      awayWickets: undefined,
      currentBatsman1: 'Rohit Sharma (52)',
      currentBatsman2: 'Ishan Kishan (34)',
      currentBowler: 'Deepak Chahar',
      lastBallResult: 'FOUR',
      currRunRate: 8.97,
      reqRunRate: undefined,
    },
    sport: 'cricket',
    markets: [
      {
        id: 'mkt-001-mo',
        matchId: 'match-001',
        name: 'Match Odds',
        type: 'match_odds',
        status: 'open',
        inPlay: true,
        startTime: pastHour(1.5),
        minBet: 100,
        maxBet: 500000,
        runners: [
          {
            id: 'run-mi',
            name: 'Mumbai Indians',
            sort: 1,
            status: 'active',
            lastTradedPrice: 1.62,
            backOdds: [{ price: 1.62, size: 45000 }, { price: 1.60, size: 23000 }, { price: 1.58, size: 12000 }],
            layOdds: [{ price: 1.63, size: 32000 }, { price: 1.65, size: 15000 }, { price: 1.67, size: 8000 }],
          },
          {
            id: 'run-csk',
            name: 'Chennai Super Kings',
            sort: 2,
            status: 'active',
            lastTradedPrice: 2.50,
            backOdds: [{ price: 2.50, size: 38000 }, { price: 2.48, size: 19000 }, { price: 2.44, size: 9000 }],
            layOdds: [{ price: 2.52, size: 27000 }, { price: 2.54, size: 12000 }, { price: 2.58, size: 6000 }],
          },
        ],
      },
      {
        id: 'mkt-001-f1',
        matchId: 'match-001',
        name: 'Over 17 Runs',
        type: 'fancy',
        status: 'open',
        inPlay: true,
        startTime: pastHour(1.5),
        minBet: 100,
        maxBet: 50000,
        fancyQuestion: 'Runs in Over 17',
        fancyLine: 9,
        fancyYesOdds: 1.90,
        fancyNoOdds: 1.95,
        runners: [],
      },
      {
        id: 'mkt-001-f2',
        matchId: 'match-001',
        name: 'Top Scorer',
        type: 'fancy',
        status: 'open',
        inPlay: true,
        startTime: pastHour(1.5),
        minBet: 100,
        maxBet: 50000,
        fancyQuestion: 'MI Total Runs',
        fancyLine: 165,
        fancyYesOdds: 1.85,
        fancyNoOdds: 1.95,
        runners: [],
      },
    ],
  },
  {
    id: 'match-002',
    series: 'IPL 2026',
    homeTeam: 'Royal Challengers Bengaluru',
    awayTeam: 'Kolkata Knight Riders',
    venue: 'M. Chinnaswamy Stadium, Bengaluru',
    startTime: inHour(3),
    status: 'upcoming',
    sport: 'cricket',
    markets: [
      {
        id: 'mkt-002-mo',
        matchId: 'match-002',
        name: 'Match Odds',
        type: 'match_odds',
        status: 'open',
        inPlay: false,
        startTime: inHour(3),
        minBet: 100,
        maxBet: 500000,
        runners: [
          {
            id: 'run-rcb',
            name: 'Royal Challengers Bengaluru',
            sort: 1,
            status: 'active',
            lastTradedPrice: 1.88,
            backOdds: [{ price: 1.88, size: 52000 }, { price: 1.86, size: 28000 }, { price: 1.84, size: 14000 }],
            layOdds: [{ price: 1.90, size: 40000 }, { price: 1.92, size: 20000 }, { price: 1.94, size: 10000 }],
          },
          {
            id: 'run-kkr',
            name: 'Kolkata Knight Riders',
            sort: 2,
            status: 'active',
            lastTradedPrice: 2.10,
            backOdds: [{ price: 2.10, size: 41000 }, { price: 2.08, size: 22000 }, { price: 2.06, size: 11000 }],
            layOdds: [{ price: 2.12, size: 30000 }, { price: 2.14, size: 15000 }, { price: 2.16, size: 7000 }],
          },
        ],
      },
    ],
  },
  {
    id: 'match-003',
    series: 'IPL 2026',
    homeTeam: 'Delhi Capitals',
    awayTeam: 'Rajasthan Royals',
    venue: 'Arun Jaitley Stadium, Delhi',
    startTime: inHour(7),
    status: 'upcoming',
    sport: 'cricket',
    markets: [
      {
        id: 'mkt-003-mo',
        matchId: 'match-003',
        name: 'Match Odds',
        type: 'match_odds',
        status: 'open',
        inPlay: false,
        startTime: inHour(7),
        minBet: 100,
        maxBet: 500000,
        runners: [
          {
            id: 'run-dc',
            name: 'Delhi Capitals',
            sort: 1,
            status: 'active',
            lastTradedPrice: 2.20,
            backOdds: [{ price: 2.20, size: 35000 }, { price: 2.18, size: 18000 }, { price: 2.14, size: 9000 }],
            layOdds: [{ price: 2.22, size: 25000 }, { price: 2.24, size: 12000 }, { price: 2.28, size: 6000 }],
          },
          {
            id: 'run-rr',
            name: 'Rajasthan Royals',
            sort: 2,
            status: 'active',
            lastTradedPrice: 1.80,
            backOdds: [{ price: 1.80, size: 42000 }, { price: 1.78, size: 21000 }, { price: 1.76, size: 10000 }],
            layOdds: [{ price: 1.82, size: 30000 }, { price: 1.84, size: 15000 }, { price: 1.86, size: 8000 }],
          },
        ],
      },
    ],
  },
  {
    id: 'match-004',
    series: 'IPL 2026',
    homeTeam: 'Gujarat Titans',
    awayTeam: 'Punjab Kings',
    venue: 'Narendra Modi Stadium, Ahmedabad',
    startTime: inHour(27),
    status: 'upcoming',
    sport: 'cricket',
    markets: [
      {
        id: 'mkt-004-mo',
        matchId: 'match-004',
        name: 'Match Odds',
        type: 'match_odds',
        status: 'open',
        inPlay: false,
        startTime: inHour(27),
        minBet: 100,
        maxBet: 500000,
        runners: [
          {
            id: 'run-gt',
            name: 'Gujarat Titans',
            sort: 1,
            status: 'active',
            lastTradedPrice: 1.95,
            backOdds: [{ price: 1.95, size: 38000 }, { price: 1.93, size: 20000 }, { price: 1.91, size: 10000 }],
            layOdds: [{ price: 1.97, size: 28000 }, { price: 1.99, size: 14000 }, { price: 2.02, size: 7000 }],
          },
          {
            id: 'run-pbks',
            name: 'Punjab Kings',
            sort: 2,
            status: 'active',
            lastTradedPrice: 2.00,
            backOdds: [{ price: 2.00, size: 36000 }, { price: 1.98, size: 18000 }, { price: 1.96, size: 9000 }],
            layOdds: [{ price: 2.02, size: 26000 }, { price: 2.04, size: 13000 }, { price: 2.06, size: 6000 }],
          },
        ],
      },
    ],
  },
];

const BETS_KEY = 'cricketx_bets';
const TRANSACTIONS_KEY = 'cricketx_transactions';
const WITHDRAWALS_KEY = 'cricketx_withdrawals';

export function getUserBets(userId: string): Bet[] {
  const raw = localStorage.getItem(BETS_KEY);
  if (!raw) return [];
  const all: Bet[] = JSON.parse(raw);
  return all.filter(b => b.userId === userId);
}

export function getAllBets(): Bet[] {
  const raw = localStorage.getItem(BETS_KEY);
  if (!raw) return [];
  return JSON.parse(raw);
}

export function saveBet(bet: Bet): void {
  const all = getAllBets();
  all.unshift(bet);
  localStorage.setItem(BETS_KEY, JSON.stringify(all));
}

export function getUserTransactions(userId: string): Transaction[] {
  const raw = localStorage.getItem(TRANSACTIONS_KEY);
  if (!raw) return [];
  const all: Transaction[] = JSON.parse(raw);
  return all.filter(t => t.userId === userId);
}

export function saveTransaction(tx: Transaction): void {
  const raw = localStorage.getItem(TRANSACTIONS_KEY);
  const all: Transaction[] = raw ? JSON.parse(raw) : [];
  all.unshift(tx);
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(all));
}

export function getWithdrawalRequests(): WithdrawalRequest[] {
  const raw = localStorage.getItem(WITHDRAWALS_KEY);
  if (!raw) return [];
  return JSON.parse(raw);
}

export function saveWithdrawal(wr: WithdrawalRequest): void {
  const all = getWithdrawalRequests();
  const idx = all.findIndex(w => w.id === wr.id);
  if (idx >= 0) all[idx] = wr;
  else all.unshift(wr);
  localStorage.setItem(WITHDRAWALS_KEY, JSON.stringify(all));
}

export function seedWelcomeTransaction(userId: string): void {
  const existing = getUserTransactions(userId);
  if (existing.length > 0) return;
  saveTransaction({
    id: generateId(),
    userId,
    type: 'bonus',
    points: 1000,
    description: 'Welcome bonus — 1,000 points',
    timestamp: new Date().toISOString(),
    balanceAfter: 1000,
  });
}
