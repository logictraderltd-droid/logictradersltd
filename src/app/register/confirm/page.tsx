"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function RegisterConfirmPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  const handleConfirmed = async () => {
    setChecking(true);
    try {
      // call server to check session and create users if needed (callback should handle it)
      // here we just reload the page which will pick up auth state and redirect via auth flow
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Error checking confirmation');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-6">
      <div className="dark-card p-8 max-w-md w-full text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Check your email</h2>
        <p className="text-sm text-gray-400 mb-6">We sent a confirmation link to your email. Click it to confirm your address, then return here and press the button below.</p>
        {error && <div className="text-red-400 mb-4">{error}</div>}
        <button className="gold-button w-full mb-3" onClick={handleConfirmed} disabled={checking}>{checking ? 'Checking...' : 'I confirmed — continue'}</button>
        <Link href="/login" className="text-sm text-gray-400">Back to sign in</Link>
      </div>
    </div>
  );
}
