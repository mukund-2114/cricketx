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

export const APP_NAME = 'CricketX Elite';
export const APP_TAGLINE = 'Institutional Grade Liquidity Exchange';

export const STRIPE_TEST_KEY = 'pk_test_placeholder';
