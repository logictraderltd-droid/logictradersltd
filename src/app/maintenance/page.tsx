import Link from "next/link";
import { Wrench } from "lucide-react";
import { getSupportGmailUrl } from "@/lib/support";

export default function MaintenancePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-dark-950 px-4 text-center">
      <div className="max-w-lg">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gold-500/10 text-gold-400">
          <Wrench className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold text-white">We&apos;ll be back soon</h1>
        <p className="mt-3 text-gray-400">
          Logic Traders Ltd is temporarily undergoing maintenance. Please check back shortly.
        </p>
        <p className="mt-5 text-sm text-gray-500">
          Need help? <a className="text-gold-400 hover:text-gold-300" href={getSupportGmailUrl("Website support", "Hello Logic Traders support,\n\nI need help with the website.\n\n")} target="_blank" rel="noopener noreferrer">Contact support</a>
        </p>
        <Link href="/login" className="mt-7 inline-block text-sm text-gray-400 hover:text-white">
          Administrator sign in
        </Link>
      </div>
    </main>
  );
}
