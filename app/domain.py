"""Core domain logic for the mock multi-market subscription service.

In-memory only. No database, no real payment gateway.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Dict, List, Optional

# --- Tiers -----------------------------------------------------------------

TIER_HOURS: Dict[str, int] = {
    "silver": 20,
    "gold": 45,
    "premium": 100,
}

# --- Markets ---------------------------------------------------------------


@dataclass(frozen=True)
class Market:
    code: str
    currency: str
    prices: Dict[str, float]
    restricted_catalog: bool = False


MARKETS: Dict[str, Market] = {
    "SE": Market("SE", "SEK", {"silver": 129.0, "gold": 189.0, "premium": 249.0}),
    "FI": Market("FI", "EUR", {"silver": 12.99, "gold": 17.99, "premium": 24.99}),
    "DE": Market("DE", "EUR", {"silver": 11.99, "gold": 16.99, "premium": 22.99}),
    "GB": Market("GB", "GBP", {"silver": 9.99, "gold": 14.99, "premium": 19.99}),
    "PL": Market(
        "PL",
        "PLN",
        {"silver": 39.9, "gold": 54.9, "premium": 74.9},
        restricted_catalog=True,
    ),
    "CH": Market(
        "CH",
        "CHF",
        {"silver": 14.9, "gold": 19.9, "premium": 26.9},
        restricted_catalog=True,
    ),
}

CATALOG: List[dict] = [
    {"id": "b1", "title": "Nordic Silence", "language": "sv", "markets": ["SE", "FI"]},
    {"id": "b2", "title": "The Baltic Ledger", "language": "en", "markets": ["SE", "FI", "DE", "GB", "PL", "CH"]},
    {"id": "b3", "title": "Berliner Nacht", "language": "de", "markets": ["DE", "CH"]},
    {"id": "b4", "title": "Warsaw Frequencies", "language": "pl", "markets": ["PL"]},
    {"id": "b5", "title": "Thames Tide", "language": "en", "markets": ["GB"]},
    {"id": "b6", "title": "Helsinki Hours", "language": "fi", "markets": ["FI"]},
]


class DomainError(Exception):
    """Raised for invalid domain operations (maps to HTTP 400/404)."""

    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


@dataclass
class Subscription:
    id: str
    user_id: str
    market: str
    tier: str
    hours_allowance: int
    hours_used: float = 0.0
    active: bool = True
    payment_state: str = "pending"
    history: List[dict] = field(default_factory=list)

    @property
    def hours_remaining(self) -> float:
        return round(self.hours_allowance - self.hours_used, 4)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "market": self.market,
            "tier": self.tier,
            "hours_allowance": self.hours_allowance,
            "hours_used": round(self.hours_used, 4),
            "hours_remaining": self.hours_remaining,
            "active": self.active,
            "payment_state": self.payment_state,
            "history": self.history,
        }


class Store:
    """In-memory subscription store."""

    def __init__(self) -> None:
        self.subscriptions: Dict[str, Subscription] = {}
        self.payments: List[dict] = []

    def reset(self) -> None:
        self.subscriptions.clear()
        self.payments.clear()


store = Store()


# --- Operations ------------------------------------------------------------


def get_market(code: str) -> Market:
    market = MARKETS.get((code or "").upper())
    if market is None:
        raise DomainError(f"Unsupported market: {code}", 400)
    return market


def create_subscription(user_id: str, market: str, tier: str) -> Subscription:
    m = get_market(market)
    tier = (tier or "").lower()
    if tier not in TIER_HOURS:
        raise DomainError(f"Unknown tier: {tier}", 400)
    sub = Subscription(
        id=str(uuid.uuid4()),
        user_id=user_id,
        market=m.code,
        tier=tier,
        hours_allowance=TIER_HOURS[tier],
    )
    sub.history.append({"event": "created", "tier": tier, "market": m.code})
    store.subscriptions[sub.id] = sub
    return sub


def get_subscription(sub_id: str) -> Subscription:
    sub = store.subscriptions.get(sub_id)
    if sub is None:
        raise DomainError("Subscription not found", 404)
    return sub


def consume_hours(sub_id: str, hours: float) -> Subscription:
    sub = get_subscription(sub_id)
    if not sub.active:
        raise DomainError("Subscription is not active", 409)
    if hours is None or hours <= 0:
        raise DomainError("Hours must be greater than zero", 400)
    if round(sub.hours_used + hours, 6) > sub.hours_allowance:
        raise DomainError(
            f"Usage exceeds allowance: {sub.hours_remaining}h remaining", 409
        )
    sub.hours_used = round(sub.hours_used + hours, 6)
    sub.history.append({"event": "usage", "hours": hours, "remaining": sub.hours_remaining})
    return sub


def change_tier(sub_id: str, new_tier: str) -> Subscription:
    sub = get_subscription(sub_id)
    new_tier = (new_tier or "").lower()
    if new_tier not in TIER_HOURS:
        raise DomainError(f"Unknown tier: {new_tier}", 400)
    old_tier = sub.tier
    new_allowance = TIER_HOURS[new_tier]
    # Used hours always carry over; a downgrade can never produce negative
    # remaining hours -- it clamps used hours to the new allowance.
    sub.hours_used = min(sub.hours_used, float(new_allowance))
    sub.tier = new_tier
    sub.hours_allowance = new_allowance
    sub.history.append(
        {"event": "tier_change", "from": old_tier, "to": new_tier, "remaining": sub.hours_remaining}
    )
    return sub


# --- Payments (Adyen-style simulated outcomes) -----------------------------

DECLINE_CARDS = {"4000000000000002", "0002"}
RETRY_CARDS = {"4000000000000069", "0069"}


def process_payment(sub_id: str, card_number: str) -> dict:
    sub = get_subscription(sub_id)
    market = get_market(sub.market)
    amount = market.prices[sub.tier]
    card = (card_number or "").strip()

    if card in DECLINE_CARDS or card.endswith("0002"):
        outcome, refusal = "declined", "REFUSED"
    elif card in RETRY_CARDS or card.endswith("0069"):
        outcome, refusal = "retry_scheduled", "INSUFFICIENT_FUNDS"
    else:
        outcome, refusal = "authorised", None

    if outcome == "authorised":
        sub.payment_state = "paid"
        sub.active = True
    elif outcome == "retry_scheduled":
        sub.payment_state = "retry_scheduled"
        sub.active = True  # grace period: access stays on until retry fails
    else:
        sub.payment_state = "declined"
        sub.active = False  # declined payment must revoke access

    result = {
        "subscription_id": sub.id,
        "outcome": outcome,
        "refusal_reason": refusal,
        "amount": amount,
        "currency": market.currency,
        "market": market.code,
        "tier": sub.tier,
        "subscription_active": sub.active,
    }
    sub.history.append({"event": "payment", "outcome": outcome, "amount": amount})
    store.payments.append(result)
    return result


def market_catalog(code: str) -> dict:
    m = get_market(code)
    books = [b for b in CATALOG if m.code in b["markets"]]
    return {
        "market": m.code,
        "currency": m.currency,
        "prices": m.prices,
        "restricted_catalog": m.restricted_catalog,
        "catalog_size": len(books),
        "catalog": books,
    }
