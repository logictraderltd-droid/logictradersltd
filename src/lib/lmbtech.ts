export const LMBTECH_API_URL = "https://pay.lmbtech.rw/pay/config/api.php";

export type LmbtechPaymentMethod = "MTN_MOMO_RWA" | "card";
export type LmbtechTransactionStatus = "pending" | "success" | "failed" | "cancelled";

export interface LmbtechApiResponse {
  status?: unknown;
  message?: unknown;
  data?: unknown;
  [key: string]: unknown;
}

function getCredentials() {
  const appKey = process.env.LMBTECH_APP_KEY?.trim();
  const secretKey = process.env.LMBTECH_SECRET_KEY?.trim();
  if (!appKey || !secretKey) {
    throw new Error("LMBTech credentials are not configured.");
  }
  return `Basic ${Buffer.from(`${appKey}:${secretKey}`).toString("base64")}`;
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

async function requestLmbtech(url: URL, init: RequestInit) {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: getCredentials(),
      Accept: "application/json",
      ...init.headers,
    },
  });
  const body: unknown = await response.json().catch(() => null);
  const record = getRecord(body);
  if (!response.ok || !record) {
    throw new Error(`LMBTech request failed with HTTP ${response.status}.`);
  }
  return record as LmbtechApiResponse;
}

function assertRequestAccepted(response: LmbtechApiResponse) {
  if (response.status === false || response.status === "fail" || response.status === "failed") {
    const message = typeof response.message === "string" ? response.message : "LMBTech rejected the request.";
    throw new Error(message);
  }
}

export async function initiateLmbtechCollection(input: {
  email: string;
  name: string;
  amount: number;
  servicePaid: string;
  referenceId: string;
  callbackUrl: string;
  paymentMethod: LmbtechPaymentMethod;
  payerPhone?: string;
  cardRedirectUrl?: string;
}) {
  const payload: Record<string, string | number> = {
    email: input.email,
    name: input.name,
    amount: input.amount,
    service_paid: input.servicePaid,
    reference_id: input.referenceId,
    callback_url: input.callbackUrl,
    action: "pay",
    payment_method: input.paymentMethod,
  };
  if (input.paymentMethod === "MTN_MOMO_RWA") {
    if (!input.payerPhone) throw new Error("A payer phone number is required for MTN Mobile Money.");
    payload.payer_phone = input.payerPhone;
  } else {
    if (!input.cardRedirectUrl) throw new Error("A card return URL is required for card payments.");
    payload.card_redirect_url = input.cardRedirectUrl;
  }

  const response = await requestLmbtech(new URL(LMBTECH_API_URL), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  assertRequestAccepted(response);
  return response;
}

export async function initiateLmbtechPayout(input: {
  email: string;
  name: string;
  amount: number;
  servicePaid: string;
  referenceId: string;
  callbackUrl: string;
  payerPhone: string;
}) {
  const response = await requestLmbtech(new URL(LMBTECH_API_URL), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: input.email,
      name: input.name,
      payment_method: "MTN_MOMO_RWA",
      amount: input.amount,
      payer_phone: input.payerPhone,
      service_paid: input.servicePaid,
      reference_id: input.referenceId,
      callback_url: input.callbackUrl,
      action: "payout",
    }),
  });
  assertRequestAccepted(response);
  return response;
}

export function normalizeLmbtechStatus(value: unknown): LmbtechTransactionStatus | null {
  if (typeof value !== "string") return null;
  const status = value.trim().toLowerCase();
  if (status === "success" || status === "successful" || status === "paid") return "success";
  if (status === "failed" || status === "fail") return "failed";
  if (status === "cancelled" || status === "canceled") return "cancelled";
  if (status === "pending" || status === "processing") return "pending";
  return null;
}

export async function getLmbtechTransactionStatus(referenceId: string) {
  const url = new URL(LMBTECH_API_URL);
  url.searchParams.set("reference_id", referenceId);
  const response = await requestLmbtech(url, { method: "GET" });
  const data = getRecord(response.data);
  const status = normalizeLmbtechStatus(data?.status) ?? normalizeLmbtechStatus(response.status);
  if (!status) throw new Error("LMBTech returned an unrecognized transaction status.");
  const transactionId = data?.transaction_id ?? data?.id ?? response.transaction_id;
  return {
    status,
    transactionId: transactionId == null ? null : String(transactionId),
    response,
  };
}

export function getLmbtechCallbackUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!configuredUrl) throw new Error("NEXT_PUBLIC_APP_URL is required for LMBTech callbacks.");
  const appUrl = new URL(configuredUrl);
  if (appUrl.protocol !== "https:" && appUrl.hostname !== "localhost") {
    throw new Error("The LMBTech callback URL must use HTTPS.");
  }
  return new URL("/api/webhooks/lmbtech", appUrl).toString();
}

export function getLmbtechCardRedirectUrl(productId: string, referenceId: string) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!configuredUrl) throw new Error("NEXT_PUBLIC_APP_URL is required for LMBTech card returns.");
  const url = new URL("/checkout", configuredUrl);
  url.searchParams.set("product", productId);
  url.searchParams.set("lmbtech_reference", referenceId);
  return url.toString();
}

export function getLmbtechRedirectUrl(response: LmbtechApiResponse) {
  const data = getRecord(response.data);
  const redirectUrl = data?.redirect_url ?? response.redirect_url;
  if (typeof redirectUrl !== "string") return null;
  try {
    const parsedUrl = new URL(redirectUrl);
    if (parsedUrl.protocol !== "https:" || parsedUrl.hostname !== "pay.lmbtech.rw") return null;
    return parsedUrl.toString();
  } catch {
    return null;
  }
}