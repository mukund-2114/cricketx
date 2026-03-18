import type { Currency } from '@/types';

// Points conversion rates: 1 point = these currency units
export const POINTS_TO_CURRENCY: Record<Currency, number> = {
  CAD: 0.01,   // 100 points = 1 CAD
  USD: 0.01,   // 100 points = 1 USD
  INR: 0.80,   // 100 points = 80 INR
};

export const CURRENCY_TO_POINTS: Record<Currency, number> = {
  CAD: 100,    // 1 CAD = 100 points
  USD: 100,    // 1 USD = 100 points
  INR: 1.25,   // 1 INR = 1.25 points
};

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  CAD: 'CA$',
  USD: 'US$',
  INR: '₹',
};

export const PLATFORM_COMMISSION = 0.02; // 2% on winnings

export const MIN_DEPOSIT_POINTS = 1000;
export const MIN_WITHDRAWAL_POINTS = 500;
export const MAX_BET_POINTS = 500000;
export const MIN_BET_POINTS = 100;

export const APP_NAME = 'CricketX Exchange';
export const APP_TAGLINE = 'The Premier Cricket Betting Exchange';

export const IPL_TEAMS = [
  { id: 'mi', name: 'Mumbai Indians', short: 'MI', color: '#004BA0', logo: '🔵' },
  { id: 'csk', name: 'Chennai Super Kings', short: 'CSK', color: '#FFFF3C', logo: '🟡' },
  { id: 'rcb', name: 'Royal Challengers Bengaluru', short: 'RCB', color: '#EC1C24', logo: '🔴' },
  { id: 'kkr', name: 'Kolkata Knight Riders', short: 'KKR', color: '#3A225D', logo: '🟣' },
  { id: 'dc', name: 'Delhi Capitals', short: 'DC', color: '#0078BC', logo: '🔵' },
  { id: 'srh', name: 'Sunrisers Hyderabad', short: 'SRH', color: '#FF822A', logo: '🟠' },
  { id: 'pbks', name: 'Punjab Kings', short: 'PBKS', color: '#ED1B24', logo: '🔴' },
  { id: 'rr', name: 'Rajasthan Royals', short: 'RR', color: '#EA1A85', logo: '🩷' },
  { id: 'gt', name: 'Gujarat Titans', short: 'GT', color: '#1B2133', logo: '⚫' },
  { id: 'lsg', name: 'Lucknow Super Giants', short: 'LSG', color: '#A3C9F7', logo: '🩵' },
];

export const STRIPE_TEST_KEY = 'pk_test_placeholder'; // Replace with actual Stripe publishable key
