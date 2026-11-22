import type { AccountType } from '../lib/types';
import type { IconName } from './ui';

export const ACCOUNT_TYPES: Record<AccountType, { label: string; icon: IconName }> = {
  cash: { label: 'Cash', icon: 'cash' },
  bank: { label: 'Bank account', icon: 'business' },
  card: { label: 'Credit card', icon: 'card' },
  wallet: { label: 'E-wallet', icon: 'phone-portrait' },
};
