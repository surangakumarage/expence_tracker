# Expense Tracker (MVP)

> There is also a React Native (Expo) mobile app in [`mobile/`](mobile/README.md) with the same features and backup format.

A fast, private, offline-first personal expense tracker. All data is stored locally in your browser (IndexedDB) — no account, no server.

## Features

- **Transactions** – add/edit/delete income and expenses with category, account, date and note. Grouped by day, with search, filters (type, category, account, amount range), month or all-time view, and CSV export.
- **Dashboard** – monthly income, expenses, net savings and savings rate, total balance, spending-by-category donut, 6-month income vs expense chart, budget alerts and recent transactions.
- **Budgets** – monthly limit per category with progress bars; warnings at 80% and when over budget.
- **Recurring transactions** – daily/weekly/monthly/yearly rules (rent, subscriptions, salary) that are posted automatically, including any missed dates; pause/resume, optional end date, month-end aware (Jan 31 → Feb 28 → Mar 31).
- **Accounts** – cash, bank, card and e-wallet accounts with opening balance and live balance; archive old accounts.
- **Categories** – default set plus custom categories with icon and color.
- **Settings** – currency, light/dark/system theme, PIN lock, JSON backup & restore, full CSV export, sample data, erase all.
- Responsive: sidebar on desktop, bottom navigation + floating add button on mobile. Press **N** to add a transaction.

## Tech stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · Dexie (IndexedDB) · Recharts · Lucide icons · Vitest

Amounts are stored as integers in minor units (cents) to avoid floating-point errors.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests for money, dates, recurring, CSV and stats logic
npm run build    # type-check + production build to dist/
```

## Project structure

```
src/
  db.ts              Dexie schema, seeding, recurring processing, backup/restore
  hooks.ts           live-query hooks for settings, categories, accounts
  lib/               pure logic: format, recurring, stats, csv, pin, sample data (+ tests)
  components/        modal, form, rows, pickers, shared UI
  pages/             Dashboard, Transactions, Budgets, Recurring, Accounts, Categories, Settings, LockScreen
```

## Notes

- The PIN lock is a convenience lock for shared devices; data in IndexedDB is not encrypted.
- Data lives only in the current browser profile — use **Settings → Backup** regularly.

## Roadmap (next phases)

Cloud sync & login, receipt photos/OCR, savings goals, debts/loans, multi-currency, shared wallets, bill reminders, natural-language/voice entry, AI insights, SMS/statement import, bill splitting.
