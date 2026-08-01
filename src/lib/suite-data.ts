export interface TestCase {
  name: string;
  params?: string[];
}

export interface TestModule {
  file: string;
  area: string;
  blurb: string;
  cases: TestCase[];
}

export const SUITE: TestModule[] = [
  {
    file: "tests/test_subscriptions.py",
    area: "Usage tracking & tier changes",
    blurb: "Exact-boundary deductions, over-usage rejection, mid-cycle upgrades and downgrades.",
    cases: [
      { name: "creation_grants_correct_hour_allowance", params: ["silver-20", "gold-45", "premium-100"] },
      { name: "creation_rejects_invalid_market" },
      { name: "creation_rejects_unknown_tier" },
      { name: "usage_deducts_accurately_across_multiple_sessions" },
      { name: "usage_at_exact_boundary_is_allowed" },
      { name: "usage_one_minute_over_boundary_is_rejected" },
      { name: "zero_or_negative_usage_is_rejected", params: ["0", "-1", "-0.5"] },
      { name: "upgrade_mid_cycle_carries_over_used_hours" },
      { name: "downgrade_never_produces_negative_remaining_hours" },
      { name: "usage_after_downgrade_respects_new_allowance" },
      { name: "unknown_subscription_returns_404" },
    ],
  },
  {
    file: "tests/test_payments.py",
    area: "Payment failure handling",
    blurb: "Declines, scheduled retries, and the downstream effect on subscription access.",
    cases: [
      { name: "successful_payment_activates_subscription" },
      { name: "declined_payment_deactivates_subscription" },
      { name: "inactive_subscription_blocks_further_usage" },
      { name: "retry_scheduled_payment_keeps_access_during_grace_period" },
      { name: "successful_retry_restores_paid_state" },
      { name: "charge_uses_market_currency_and_price", params: ["SE-SEK", "FI-EUR", "GB-GBP", "PL-PLN"] },
      { name: "tier_change_repriced_on_next_charge" },
      { name: "payment_for_unknown_subscription_returns_404" },
    ],
  },
  {
    file: "tests/test_markets.py",
    area: "Cross-market regression",
    blurb: "One flow, six markets: currency, pricing and licensing-driven catalog differences.",
    cases: [
      { name: "every_market_prices_all_tiers_in_its_own_currency", params: ["CH", "DE", "FI", "GB", "PL", "SE"] },
      { name: "same_signup_flow_works_in_every_market", params: ["CH", "DE", "FI", "GB", "PL", "SE"] },
      { name: "market_catalog_only_contains_licensed_titles", params: ["CH", "DE", "FI", "GB", "PL", "SE"] },
      { name: "restricted_markets_are_flagged_and_have_smaller_catalogs" },
      { name: "market_code_is_case_insensitive" },
      { name: "unknown_market_returns_400" },
      { name: "pricing_differs_across_markets_for_same_tier" },
    ],
  },
];

export const TOTAL_CASES = SUITE.reduce(
  (sum, m) => sum + m.cases.reduce((s, c) => s + (c.params?.length ?? 1), 0),
  0,
);
