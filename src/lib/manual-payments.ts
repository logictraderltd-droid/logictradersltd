import { createHmac, randomUUID, timingSafeEqual } from "crypto";

export type ManualPaymentMethod = "mobile_money" | "binance";
export type SettlementCurrency = "RWF" | "USDT";
export type DisplayCurrency = "USD" | SettlementCurrency;

export interface ManualPaymentQuote {
  quoteId: string;
  userId: string;
  productId: string;
  originalAmountCents: number;
  originalCurrency: "USD";
  amountMinor: number;
  currency: SettlementCurrency;
  displayAmountMinor: number;
  displayCurrency: DisplayCurrency;
  method: ManualPaymentMethod;
  exchangeRate: number;
  rateSource: "ExchangeRate-API" | "CoinGecko";
  rateAsOf: string;
  issuedAt: string;
  expiresAt: string;
}

const QUOTE_LIFETIME_MS = 15 * 60 * 1000;
const MAX_FX_RATE_AGE_MS = 36 * 60 * 60 * 1000;
const MAX_CRYPTO_RATE_AGE_MS = 30 * 60 * 1000;

function getQuoteSecret() {
  const secret = process.env.PAYMENT_QUOTE_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secret) throw new Error("Payment quote signing secret is not configured.");
  return secret;
}

function configuredUrl(value: string | undefined, fallback: string) {
  const url = new URL(value || fallback);
  if (url.protocol !== "https:") {
    throw new Error("Payment exchange-rate URLs must use HTTPS.");
  }
  return url;
}

function assertRateTimestamp(timestamp: number, maxAgeMs: number, source: string) {
  const now = Date.now();
  const age = now - timestamp * 1000;
  if (!Number.isFinite(age) || age < -5 * 60 * 1000 || age > maxAgeMs) {
    throw new Error(`${source} exchange-rate data is unavailable or stale.`);
  }
  return new Date(timestamp * 1000).toISOString();
}

async function fetchRateResponse(url: URL) {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    throw new Error(`Exchange-rate service returned HTTP ${response.status}.`);
  }
  const data: unknown = await response.json();
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Exchange-rate service returned an invalid response.");
  }
  return data as Record<string, unknown>;
}

function getObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

async function getRwfPerUsd(): Promise<{ rate: number; asOf: string }> {
  const url = configuredUrl(
    process.env.PAYMENT_FX_API_URL,
    "https://open.er-api.com/v6/latest/USD",
  );
  const data = await fetchRateResponse(url);
  const rates = getObject(data.rates);
  const rate = Number(rates?.RWF);
  const timestamp = Number(data.time_last_update_unix);
  if (data.result !== "success" || data.base_code !== "USD" ||
      !Number.isFinite(rate) || rate <= 0 || !Number.isFinite(timestamp)) {
    throw new Error("The USD/RWF exchange-rate response is invalid.");
  }
  return {
    rate,
    asOf: assertRateTimestamp(timestamp, MAX_FX_RATE_AGE_MS, "USD/RWF"),
  };
}

async function getUsdtPerUsd(): Promise<{ rate: number; asOf: string }> {
  const url = configuredUrl(
    process.env.PAYMENT_CRYPTO_RATE_API_URL,
    "https://api.coingecko.com/api/v3/simple/price",
  );
  url.searchParams.set("ids", "tether");
  url.searchParams.set("vs_currencies", "usd");
  url.searchParams.set("include_last_updated_at", "true");
  const apiKey = process.env.COINGECKO_API_KEY?.trim();
  if (apiKey) url.searchParams.set("x_cg_demo_api_key", apiKey);

  const data = await fetchRateResponse(url);
  const tether = getObject(data.tether);
  const usdPerUsdt = Number(tether?.usd);
  const timestamp = Number(tether?.last_updated_at);
  if (!Number.isFinite(usdPerUsdt) || usdPerUsdt <= 0 || !Number.isFinite(timestamp)) {
    throw new Error("The USD/USDT exchange-rate response is invalid.");
  }
  return {
    rate: 1 / usdPerUsdt,
    asOf: assertRateTimestamp(timestamp, MAX_CRYPTO_RATE_AGE_MS, "USD/USDT"),
  };
}

export async function createManualPaymentQuote(
  input: {
    userId: string;
    productId: string;
    originalAmountCents: number;
    originalCurrency: string;
    method: ManualPaymentMethod;
    displayCurrency: DisplayCurrency;
  },
  now = Date.now(),
) {
  if (!Number.isSafeInteger(input.originalAmountCents) || input.originalAmountCents <= 0) {
    throw new Error("Product price is not configured correctly.");
  }
  if (input.originalCurrency.toUpperCase() !== "USD") {
    throw new Error("Manual payment checkout currently supports products priced in USD only.");
  }

  const settlement = input.method === "mobile_money"
    ? { currency: "RWF" as const, precision: 0, rateSource: "ExchangeRate-API" as const, source: getRwfPerUsd }
    : { currency: "USDT" as const, precision: 2, rateSource: "CoinGecko" as const, source: getUsdtPerUsd };
  if (input.displayCurrency !== "USD" && input.displayCurrency !== settlement.currency) {
    throw new Error(`${input.displayCurrency} is not supported for this payment method.`);
  }
  const { rate, asOf } = await settlement.source();
  const amountMinor = Math.round((input.originalAmountCents / 100) * rate * 10 ** settlement.precision);
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw new Error("The converted payment amount is invalid.");
  }

  const quote: ManualPaymentQuote = {
    quoteId: randomUUID(),
    userId: input.userId,
    productId: input.productId,
    originalAmountCents: input.originalAmountCents,
    originalCurrency: "USD",
    amountMinor,
    currency: settlement.currency,
    displayAmountMinor: input.displayCurrency === "USD"
      ? input.originalAmountCents
      : amountMinor,
    displayCurrency: input.displayCurrency,
    method: input.method,
    exchangeRate: rate,
    rateSource: settlement.rateSource,
    rateAsOf: asOf,
    issuedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + QUOTE_LIFETIME_MS).toISOString(),
  };
  const payload = Buffer.from(JSON.stringify(quote)).toString("base64url");
  const signature = createHmac("sha256", getQuoteSecret()).update(payload).digest("base64url");

  return { quote, token: `${payload}.${signature}` };
}

export function verifyManualPaymentQuote(token: string, userId: string): ManualPaymentQuote {
  const [payload, signature, ...extra] = token.split(".");
  if (!payload || !signature || extra.length > 0) throw new Error("Invalid payment quote.");
  const expected = createHmac("sha256", getQuoteSecret()).update(payload).digest();
  let provided: Buffer;
  try {
    provided = Buffer.from(signature, "base64url");
  } catch {
    throw new Error("Invalid payment quote.");
  }
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    throw new Error("Invalid payment quote.");
  }

  let quote: ManualPaymentQuote;
  try {
    quote = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    throw new Error("Invalid payment quote.");
  }
  const issuedAt = Date.parse(quote.issuedAt);
  const expiresAt = Date.parse(quote.expiresAt);
  if (quote.userId !== userId ||
      !["mobile_money", "binance"].includes(quote.method) ||
      (quote.method === "mobile_money" && quote.currency !== "RWF") ||
      (quote.method === "binance" && quote.currency !== "USDT") ||
      (quote.displayCurrency !== "USD" && quote.displayCurrency !== quote.currency) ||
      !Number.isSafeInteger(quote.originalAmountCents) || quote.originalAmountCents <= 0 ||
      !Number.isSafeInteger(quote.amountMinor) || quote.amountMinor <= 0 ||
      !Number.isSafeInteger(quote.displayAmountMinor) || quote.displayAmountMinor <= 0 ||
      !Number.isFinite(quote.exchangeRate) || quote.exchangeRate <= 0 ||
      !Number.isFinite(issuedAt) || !Number.isFinite(expiresAt) ||
      expiresAt <= Date.now() || issuedAt > Date.now() + 60_000) {
    throw new Error("The payment quote is invalid or expired. Request a new quote.");
  }
  return quote;
}

export function formatSettlementAmount(amountMinor: number, currency: DisplayCurrency) {
  const precision = currency === "RWF" ? 0 : 2;
  const amount = amountMinor / 10 ** precision;
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(amount)} ${currency}`;
}
