"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from 'lucide-react';

export default function CompleteProfilePage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const res = await fetch('/api/auth/complete-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName })
    });

    const data = await res.json();
    setIsLoading(false);
    if (data?.success) {
      router.push('/dashboard');
    } else {
      setError(data?.error || 'Failed to save profile');
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-6">
      <div className="dark-card p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-white mb-4">Complete your profile</h2>
        <p className="text-sm text-gray-400 mb-6">Please provide your full name to finish account setup.</p>
        {error && <div className="mb-4 text-red-400">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="full-name" className="block text-sm text-gray-300 mb-2">Full name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input id="full-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="dark-input w-full pl-10" autoComplete="name" />
            </div>
          </div>
          <button className="gold-button w-full" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save and continue'}</button>
        </form>
      </div>
    </div>
  );
}
