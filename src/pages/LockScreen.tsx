import { useState, type FormEvent } from 'react';
import { Lock } from 'lucide-react';
import { db } from '../db';
import { hashPin } from '../lib/pin';

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    const [hash, salt] = await Promise.all([db.settings.get('pinHash'), db.settings.get('pinSalt')]);
    if (hash && salt && (await hashPin(pin, salt.value)) === hash.value) {
      onUnlock();
    } else {
      setError('Incorrect PIN');
      setPin('');
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-xs space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white">
          <Lock size={22} />
        </div>
        <h1 className="text-lg font-semibold">Enter PIN</h1>
        <input
          className="input text-center text-2xl tracking-[0.5em]"
          type="password"
          inputMode="numeric"
          autoFocus
          maxLength={8}
          value={pin}
          onChange={(e) => { setPin(e.target.value); setError(''); }}
          aria-label="PIN"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full" type="submit" disabled={pin.length < 4}>Unlock</button>
        <p className="text-xs text-slate-500">Forgot your PIN? Clear this site's data in your browser to reset the app.</p>
      </form>
    </div>
  );
}
