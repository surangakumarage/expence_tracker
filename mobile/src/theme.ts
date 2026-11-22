export interface Theme {
  dark: boolean;
  bg: string;
  card: string;
  text: string;
  muted: string;
  border: string;
  input: string;
  track: string;
  primary: string;
  primarySoft: string;
  onPrimary: string;
  danger: string;
  dangerSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
}

export const light: Theme = {
  dark: false,
  bg: '#f8fafc',
  card: '#ffffff',
  text: '#0f172a',
  muted: '#64748b',
  border: '#e2e8f0',
  input: '#ffffff',
  track: '#e2e8f0',
  primary: '#4f46e5',
  primarySoft: '#eef2ff',
  onPrimary: '#ffffff',
  danger: '#dc2626',
  dangerSoft: '#fef2f2',
  success: '#16a34a',
  successSoft: '#f0fdf4',
  warning: '#b45309',
  warningSoft: '#fffbeb',
};

export const dark: Theme = {
  dark: true,
  bg: '#020617',
  card: '#0f172a',
  text: '#f1f5f9',
  muted: '#94a3b8',
  border: '#1e293b',
  input: '#1e293b',
  track: '#1e293b',
  primary: '#6366f1',
  primarySoft: '#1e1b4b',
  onPrimary: '#ffffff',
  danger: '#f87171',
  dangerSoft: '#450a0a',
  success: '#4ade80',
  successSoft: '#052e16',
  warning: '#fbbf24',
  warningSoft: '#451a03',
};

export const SWATCHES = [
  '#ef4444', '#f97316', '#eab308', '#84cc16', '#16a34a', '#14b8a6',
  '#0ea5e9', '#2563eb', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#64748b',
];
