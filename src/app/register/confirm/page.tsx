"use client";

import Link from 'next/link';

export default function RegisterConfirmPage() {
  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-6">
      <div className="dark-card p-8 max-w-md w-full text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Check your email</h2>
        <p className="text-sm text-gray-400 mb-6">We sent a confirmation link to your email. Open the link to verify your address and continue to your trader dashboard.</p>
        <Link href="/login" className="text-sm text-gray-400">Back to sign in</Link>
      </div>
    </div>
  );
}
