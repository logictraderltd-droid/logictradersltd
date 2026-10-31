"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Send } from "lucide-react";

interface LmbtechPayout {
  id: string;
  reference_id: string;
  recipient_email: string;
  recipient_name: string;
  payer_phone: string;
  amount_rwf: number;
  service_paid: string;
  status: "pending" | "success" | "failed" | "cancelled";
  created_at: string;
}

export function LmbtechPayoutsPanel() {
  const [payouts, setPayouts] = useState<LmbtechPayout[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [payerPhone, setPayerPhone] = useState("");
  const [amountRwf, setAmountRwf] = useState("");
  const [servicePaid, setServicePaid] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkingReference, setCheckingReference] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadPayouts = async () => {
    try {
      const response = await fetch("/api/admin/payments/lmbtech-payouts", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load payouts.");
      setPayouts(result.payouts || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load payouts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadPayouts(); }, []);

  const submitPayout = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(amountRwf);
    if (!window.confirm(`Send ${new Intl.NumberFormat("en-US").format(amount)} RWF to ${name} at ${payerPhone}?`)) return;
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/payments/lmbtech-payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, payerPhone, amountRwf: amount, servicePaid }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to initiate payout.");
      setMessage(`Payout submitted. Reference: ${result.referenceId}. Status: ${result.status}.`);
      setEmail("");
      setName("");
      setPayerPhone("");
      setAmountRwf("");
      setServicePaid("");
      await loadPayouts();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to initiate payout.");
    } finally {
      setSubmitting(false);
    }
  };

  const refreshPayoutStatus = async (referenceId: string) => {
    setCheckingReference(referenceId);
    setError("");
    try {
      const response = await fetch("/api/admin/payments/lmbtech-payouts/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referenceId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to check payout status.");
      setMessage(`Payout ${referenceId}: ${result.status}.`);
      await loadPayouts();
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Unable to check payout status.");
    } finally {
      setCheckingReference("");
    }
  };

  return (
    <section className="space-y-5 border-t border-dark-800 pt-6">
      <div>
        <h3 className="text-lg font-bold text-white">LMBTech MTN MoMo payout</h3>
        <p className="mt-2 text-sm text-gray-500">Payouts are sent in whole RWF amounts. Confirm recipient details carefully before sending.</p>
      </div>
      {message && <p role="status" className="text-sm text-green-300">{message}</p>}
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <form onSubmit={(event) => void submitPayout(event)} className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm text-gray-400">Recipient name
          <input required minLength={2} maxLength={150} value={name} onChange={(event) => setName(event.target.value)} className="dark-input w-full" />
        </label>
        <label className="space-y-1 text-sm text-gray-400">Recipient email
          <input required type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className="dark-input w-full" />
        </label>
        <label className="space-y-1 text-sm text-gray-400">Rwanda Mobile Money number
          <input required value={payerPhone} onChange={(event) => setPayerPhone(event.target.value)} placeholder="+2507XXXXXXXX" className="dark-input w-full" />
        </label>
        <label className="space-y-1 text-sm text-gray-400">Amount (RWF)
          <input required type="number" min="1" step="1" value={amountRwf} onChange={(event) => setAmountRwf(event.target.value)} className="dark-input w-full" />
        </label>
        <label className="space-y-1 text-sm text-gray-400 sm:col-span-2">Payout purpose
          <input required minLength={2} maxLength={150} value={servicePaid} onChange={(event) => setServicePaid(event.target.value)} className="dark-input w-full" />
        </label>
        <button type="submit" disabled={submitting} className="gold-button flex items-center justify-center gap-2 disabled:opacity-50 sm:col-span-2">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {submitting ? "Submitting payout..." : "Send payout"}
        </button>
      </form>

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h4 className="font-semibold text-white">Recent payouts</h4>
          <button type="button" title="Refresh payouts" onClick={() => void loadPayouts()} disabled={loading} className="rounded border border-dark-700 p-2 text-gray-300 disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </button>
        </div>
        {loading ? <p className="text-sm text-gray-400">Loading payouts...</p> : payouts.length === 0 ? <p className="text-sm text-gray-500">No payouts yet.</p> : (
          <div className="space-y-2">
            {payouts.map((payout) => (
              <div key={payout.id} className="flex flex-wrap items-center justify-between gap-3 border border-dark-800 p-3 text-sm">
                <div>
                  <p className="text-white">{payout.recipient_name} · {new Intl.NumberFormat("en-US").format(payout.amount_rwf)} RWF</p>
                  <p className="mt-1 text-xs text-gray-500">{payout.payer_phone} · {payout.reference_id}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="capitalize text-gray-300">{payout.status}</span>
                  {payout.status === "pending" && <button type="button" onClick={() => void refreshPayoutStatus(payout.reference_id)} disabled={checkingReference === payout.reference_id} className="text-xs text-gold-300 underline disabled:opacity-50">
                    {checkingReference === payout.reference_id ? "Checking..." : "Check status"}
                  </button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
