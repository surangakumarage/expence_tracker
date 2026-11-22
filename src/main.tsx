import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { db, ensureSeeded, processRecurring } from './db';

async function start() {
  const root = createRoot(document.getElementById('root')!);
  try {
    await ensureSeeded();
    await processRecurring();
    const locked = !!(await db.settings.get('pinHash'));
    root.render(
      <StrictMode>
        <App locked={locked} />
      </StrictMode>,
    );
  } catch (err) {
    console.error(err);
    root.render(
      <div style={{ padding: 24, fontFamily: 'system-ui' }}>
        <h1>Could not open the local database</h1>
        <p>Your browser may be blocking storage (for example in private mode). Details: {String(err)}</p>
      </div>,
    );
  }
}

start();
