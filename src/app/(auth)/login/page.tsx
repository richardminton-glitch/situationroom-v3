'use client';

import { useState } from 'react';
import { useAuth } from '@/components/layout/AuthProvider';
import { useRouter } from 'next/navigation';

type Step = 'email' | 'pin';

export default function LoginPage() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { refresh } = useAuth();
  const router = useRouter();

  async function handleSendPin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/send-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to send PIN');
        return;
      }

      setStep('pin');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyPin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pin }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Invalid PIN');
        return;
      }

      await refresh();
      router.push('/');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="panel-card w-full max-w-md p-8">
        <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
          The Situation Room
        </h1>
        <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
          {step === 'email' ? 'Enter your email to sign in' : `Enter the PIN sent to ${email}`}
        </p>

        {error && (
          <div className="mb-4 p-3 rounded text-sm" style={{ backgroundColor: 'rgba(155, 50, 50, 0.1)', color: 'var(--accent-danger)' }}>
            {error}
          </div>
        )}

        {step === 'email' ? (
          <form onSubmit={handleSendPin}>
            <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full p-3 rounded mb-4 outline-none"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                color: 'var(--text-primary)',
              }}
              placeholder="you@example.com"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full p-3 rounded font-medium transition-opacity"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--bg-primary)',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Sending...' : 'Send PIN'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyPin}>
            <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
              6-digit PIN
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              required
              autoFocus
              className="w-full p-3 rounded mb-4 text-center text-2xl tracking-[0.5em] outline-none"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-data)',
              }}
              placeholder="000000"
            />
            <button
              type="submit"
              disabled={loading || pin.length !== 6}
              className="w-full p-3 rounded font-medium transition-opacity"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--bg-primary)',
                opacity: loading || pin.length !== 6 ? 0.7 : 1,
              }}
            >
              {loading ? 'Verifying...' : 'Verify & Sign In'}
            </button>
            <button
              type="button"
              onClick={() => { setStep('email'); setPin(''); setError(''); }}
              className="w-full mt-3 p-2 text-sm"
              style={{ color: 'var(--text-muted)' }}
            >
              Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
