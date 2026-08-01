/**
 * Browser mirror of app/domain.py so the demo page can exercise the same
 * rules the pytest suite asserts against, without a Python runtime.
 */

export const TIER_HOURS: Record<string, number> = {
  silver: 20,
  gold: 45,
  premium: 100,
};

export type Tier = keyof typeof TIER_HOURS;

export interface Market {
  code: string;
  name: string;
  currency: string;
  prices: Record<string, number>;
  restricted: boolean;
}

export const MARKETS: Market[] = [
  { code: "SE", name: "Sweden", currency: "SEK", prices: { silver: 129, gold: 189, premium: 249 }, restricted: false },
  { code: "FI", name: "Finland", currency: "EUR", prices: { silver: 12.99, gold: 17.99, premium: 24.99 }, restricted: false },
  { code: "DE", name: "Germany", currency: "EUR", prices: { silver: 11.99, gold: 16.99, premium: 22.99 }, restricted: false },
  { code: "GB", name: "United Kingdom", currency: "GBP", prices: { silver: 9.99, gold: 14.99, premium: 19.99 }, restricted: false },
  { code: "PL", name: "Poland", currency: "PLN", prices: { silver: 39.9, gold: 54.9, premium: 74.9 }, restricted: true },
  { code: "CH", name: "Switzerland", currency: "CHF", prices: { silver: 14.9, gold: 19.9, premium: 26.9 }, restricted: true },
];

export const CATALOG = [
  { id: "b1", title: "Nordic Silence", markets: ["SE", "FI"] },
  { id: "b2", title: "The Baltic Ledger", markets: ["SE", "FI", "DE", "GB", "PL", "CH"] },
  { id: "b3", title: "Berliner Nacht", markets: ["DE", "CH"] },
  { id: "b4", title: "Warsaw Frequencies", markets: ["PL"] },
  { id: "b5", title: "Thames Tide", markets: ["GB"] },
  { id: "b6", title: "Helsinki Hours", markets: ["FI"] },
];

export const getMarket = (code: string) =>
  MARKETS.find((m) => m.code === code.toUpperCase())!;

export const catalogFor = (code: string) =>
  CATALOG.filter((b) => b.markets.includes(code.toUpperCase()));

export interface Subscription {
  market: string;
  tier: Tier;
  allowance: number;
  used: number;
  active: boolean;
  paymentState: "pending" | "paid" | "declined" | "retry_scheduled";
}

export const createSubscription = (market: string, tier: Tier): Subscription => ({
  market,
  tier,
  allowance: TIER_HOURS[tier],
  used: 0,
  active: true,
  paymentState: "pending",
});

export type Outcome = { ok: boolean; message: string; sub: Subscription };

export function consumeHours(sub: Subscription, hours: number): Outcome {
  if (!sub.active)
    return { ok: false, message: "409 — subscription is not active", sub };
  if (!(hours > 0))
    return { ok: false, message: "400 — hours must be greater than zero", sub };
  if (round(sub.used + hours) > sub.allowance)
    return {
      ok: false,
      message: `409 — usage exceeds allowance: ${round(sub.allowance - sub.used)}h remaining`,
      sub,
    };
  const next = { ...sub, used: round(sub.used + hours) };
  return { ok: true, message: `200 — ${hours}h logged, ${round(next.allowance - next.used)}h remaining`, sub: next };
}

export function changeTier(sub: Subscription, tier: Tier): Outcome {
  const allowance = TIER_HOURS[tier];
  const next: Subscription = {
    ...sub,
    tier,
    allowance,
    // downgrade clamps used hours so remaining can never go negative
    used: Math.min(sub.used, allowance),
  };
  const direction = allowance > sub.allowance ? "upgrade" : "downgrade";
  return {
    ok: true,
    message: `200 — ${direction} to ${tier}: ${next.used}h carried over, ${round(allowance - next.used)}h remaining`,
    sub: next,
  };
}

export type Card = "success" | "declined" | "retry";

export function processPayment(sub: Subscription, card: Card): Outcome {
  const market = getMarket(sub.market);
  const amount = market.prices[sub.tier];
  const price = `${amount.toFixed(2)} ${market.currency}`;
  if (card === "declined")
    return {
      ok: false,
      message: `REFUSED — ${price} declined, access revoked`,
      sub: { ...sub, paymentState: "declined", active: false },
    };
  if (card === "retry")
    return {
      ok: true,
      message: `INSUFFICIENT_FUNDS — ${price} retry scheduled, access kept during grace period`,
      sub: { ...sub, paymentState: "retry_scheduled", active: true },
    };
  return {
    ok: true,
    message: `AUTHORISED — ${price} charged, subscription active`,
    sub: { ...sub, paymentState: "paid", active: true },
  };
}

const round = (n: number) => Math.round(n * 1e6) / 1e6;
