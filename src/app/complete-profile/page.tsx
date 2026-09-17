"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CompleteProfilePage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const res = await fetch('/api/auth/complete-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName })
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
        <p className="text-sm text-gray-400 mb-6">Please provide your first and last name to finish account setup.</p>
        {error && <div className="mb-4 text-red-400">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">First name</label>
            <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="dark-input w-full" />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Last name</label>
            <input required value={lastName} onChange={(e) => setLastName(e.target.value)} className="dark-input w-full" />
          </div>
          <button className="gold-button w-full" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save and continue'}</button>
        </form>
      </div>
    </div>
  );
}
