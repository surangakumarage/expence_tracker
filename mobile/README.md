# Expense Tracker — Mobile (React Native / Expo)

The mobile version of the Expense Tracker, built with **Expo SDK 58**, **Expo Router** and **expo-sqlite**. Offline-first: all data is stored in a SQLite database on the device.

## Features

- **Dashboard** – month picker, income / expenses / net savings / total balance, budget alerts, donut chart by category with an **Expenses ↔ Income** toggle, 6‑month income vs expense bars, budget progress, recent transactions.
- **Transactions** – grouped by day with daily totals, search, type and category filters, month or all-time view, CSV export via the share sheet.
- **Add / edit transaction** – amount, category grid, account, date (stepper + Today/Yesterday), note, and optional repeat (daily/weekly/monthly/yearly).
- **Budgets** – monthly limit per category with progress bars and 80% / over-budget alerts.
- **Recurring** – rules that post transactions automatically (catches up missed dates on launch and when the app returns to the foreground); pause/resume, end date, month-end aware.
- **Accounts** – cash, bank, card, e-wallet with opening and live balances; archive.
- **Categories** – custom name, color and icon.
- **Settings** – currency, light/dark/system theme, PIN lock, JSON backup & restore, CSV export, sample data, erase all.

Backups use the **same JSON format as the web app**, so you can export from one and restore into the other.

## Run it

```bash
cd mobile
npm install
npx expo start
```

Then scan the QR code with **Expo Go** (Android) or the Camera app (iOS). Expo Go must support SDK 58. Press `w` to open the web version.

Build an installable app in the cloud with EAS (no Android Studio/Xcode needed):

```bash
npx eas-cli@latest build --platform android --profile preview
```

Before publishing, change `android.package` / `ios.bundleIdentifier` in `app.json` (currently `com.example.expensetracker`) and replace the icons in `assets/`.

## Checks

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # expo lint
npm test            # vitest: money, dates, recurring, CSV and stats logic
npx expo-doctor
```

## Structure

```
src/
  app/                 Expo Router screens
    (tabs)/            Dashboard, Transactions, Budgets, More
    transaction.tsx    add/edit modal (?id=)
    accounts, categories, recurring, settings (+ *-edit modals)
  data/
    db.ts              SQLite schema/migrations, queries, recurring processing, backup/restore, useQuery()
    settings.tsx       settings + theme context
    hooks.ts, sample.ts
  lib/                 pure logic shared with the web app (format, recurring, stats, csv) + tests
  components/          UI kit, charts (react-native-svg), date field, rows, lock screen
```

`src/lib/{types,format,recurring,stats}.ts` are copies of the web app's `src/lib` files; keep them in sync (or move them to a shared package later).

## Notes

- The PIN lock is a convenience lock; the database is not encrypted.
- On web, expo-sqlite needs the COOP/COEP headers set in `metro.config.js`.
- If code changes don't show up in the dev server, restart it with `npx expo start --clear`.
