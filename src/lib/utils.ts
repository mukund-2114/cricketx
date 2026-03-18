import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Currency } from '@/types';
import { CURRENCY_SYMBOLS, POINTS_TO_CURRENCY, CURRENCY_TO_POINTS } from '@/constants';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPoints(points: number): string {
  if (points >= 1000000) return `${(points / 1000000).toFixed(1)}M pts`;
  if (points >= 1000) return `${(points / 1000).toFixed(1)}K pts`;
  return `${points.toLocaleString()} pts`;
}

export function pointsToCurrency(points: number, currency: Currency): string {
  const amount = points * POINTS_TO_CURRENCY[currency];
  const symbol = CURRENCY_SYMBOLS[currency];
  return `${symbol}${amount.toFixed(2)}`;
}

export function currencyToPoints(amount: number, currency: Currency): number {
  return Math.floor(amount * CURRENCY_TO_POINTS[currency]);
}

export function formatOdds(odds: number): string {
  return odds.toFixed(2);
}

export function calcPotentialWin(stake: number, odds: number, type: 'back' | 'lay'): number {
  if (type === 'back') {
    return Math.floor(stake * (odds - 1));
  } else {
    // Lay: liability
    return Math.floor(stake * (odds - 1));
  }
}

export function calcLayLiability(stake: number, odds: number): number {
  return Math.floor(stake * (odds - 1));
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-CA', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(dateStr: string): string {
  return `${formatDate(dateStr)} ${formatTime(dateStr)}`;
}

export function timeUntil(dateStr: string): string {
  const now = new Date().getTime();
  const target = new Date(dateStr).getTime();
  const diff = target - now;
  if (diff <= 0) return 'Live';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) return `${Math.floor(hours / 24)}d`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}
