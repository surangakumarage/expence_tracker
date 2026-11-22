import type { Frequency } from './types';
import { fromISODate, toISODate } from './format';

/**
 * Advance a date by one period. Monthly/yearly keep the original day-of-month
 * (`anchorDay`) and clamp to the month's last day, so Jan 31 -> Feb 28 -> Mar 31.
 */
export function advanceDate(iso: string, freq: Frequency, anchorDay?: number): string {
  const d = fromISODate(iso);
  const day = anchorDay ?? d.getDate();
  switch (freq) {
    case 'daily':
      d.setDate(d.getDate() + 1);
      return toISODate(d);
    case 'weekly':
      d.setDate(d.getDate() + 7);
      return toISODate(d);
    case 'monthly':
    case 'yearly': {
      const y = d.getFullYear() + (freq === 'yearly' ? 1 : 0);
      const m = d.getMonth() + (freq === 'monthly' ? 1 : 0);
      const lastDay = new Date(y, m + 1, 0).getDate();
      return toISODate(new Date(y, m, Math.min(day, lastDay)));
    }
  }
}

/**
 * All due occurrence dates from `nextDate` up to and including `until`
 * (and `endDate` if given), plus the following nextDate. Capped to avoid runaway loops.
 */
export function dueOccurrences(
  nextDate: string,
  freq: Frequency,
  until: string,
  endDate?: string,
  cap = 500,
): { dates: string[]; next: string } {
  const anchorDay = fromISODate(nextDate).getDate();
  const limit = endDate && endDate < until ? endDate : until;
  const dates: string[] = [];
  let cur = nextDate;
  while (cur <= limit && dates.length < cap) {
    dates.push(cur);
    cur = advanceDate(cur, freq, anchorDay);
  }
  return { dates, next: cur };
}

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};
