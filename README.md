# Multi-Market Subscription QA Automation Framework

A test automation project built around the technical challenges of a multi-market
audiobook/ebook subscription platform: tiered listening-hour plans, per-market
pricing/licensing differences, and Adyen-style payment processing.

It is deliberately scoped around the bug classes a subscription-streaming business
at that scale has to guard against:

- **Usage-tracking edge cases** — exact-boundary hour deductions, over-usage attempts, tier upgrades/downgrades mid-cycle
- **Cross-market regression** — the same user flow validated against different currencies, prices and catalog-availability rules per country
- **Payment failure handling** — declined cards, retry-scheduled payments, and the downstream effect on subscription state (a declined payment must deactivate access)

## Architecture

```
app/                        FastAPI mock service (subscriptions, hours, markets, payments)
tests/                      the deliverable: pytest suite, organised by domain
.github/workflows/ci.yml    runs the full suite on every push / PR (py3.11 + 3.12)
src/                        web demo page presenting the framework
```

## Run it yourself

```bash
pip install -r requirements.txt

# run the test suite
pytest -v

# or run the API live and explore it interactively
uvicorn app.main:app --reload
# then open http://127.0.0.1:8000/docs
```

## Test coverage summary

| Area | What's tested |
| --- | --- |
| Subscription creation | Correct hour allowance per tier, invalid-market and unknown-tier rejection |
| Usage tracking | Deduction accuracy, exact-boundary usage, over-usage rejection, zero/negative-hour rejection |
| Tier changes | Upgrade carries used hours over correctly; downgrade never goes negative |
| Payments | Success / decline / retry outcomes, per-market currency and price, declined payment deactivates the subscription, inactive subscription blocks further usage |
| Markets | Per-market catalog and pricing correctness, restricted-catalog markets flagged, unknown market handling |

48 parametrised tests, all passing, wired into CI on every commit.

## Notes

Mock service for demonstration: in-memory storage (no database) and simulated payment
outcomes (no real gateway). The goal is to demonstrate test design and automation
practice in this domain, not to reproduce a production system.

## Web demo

The repo also ships a TanStack Start page that presents the framework and lets you
exercise the same domain rules in the browser (`src/lib/subscription-domain.ts`
mirrors `app/domain.py`).
