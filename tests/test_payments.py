"""Payment outcomes and their downstream effect on subscription state."""

import pytest

SUCCESS_CARD = "4111111111111111"
DECLINE_CARD = "4000000000000002"
RETRY_CARD = "4000000000000069"


def test_successful_payment_activates_subscription(client, make_subscription):
    sub = make_subscription()
    body = client.post(f"/subscriptions/{sub['id']}/payments", json={"card_number": SUCCESS_CARD}).json()
    assert body["outcome"] == "authorised"
    assert body["subscription_active"] is True
    assert client.get(f"/subscriptions/{sub['id']}").json()["payment_state"] == "paid"


def test_declined_payment_deactivates_subscription(client, make_subscription):
    sub = make_subscription()
    body = client.post(f"/subscriptions/{sub['id']}/payments", json={"card_number": DECLINE_CARD}).json()
    assert body["outcome"] == "declined"
    assert body["refusal_reason"] == "REFUSED"
    assert client.get(f"/subscriptions/{sub['id']}").json()["active"] is False


def test_inactive_subscription_blocks_further_usage(client, make_subscription):
    sub = make_subscription()
    client.post(f"/subscriptions/{sub['id']}/payments", json={"card_number": DECLINE_CARD})
    resp = client.post(f"/subscriptions/{sub['id']}/usage", json={"hours": 1})
    assert resp.status_code == 409
    assert "not active" in resp.json()["detail"]


def test_retry_scheduled_payment_keeps_access_during_grace_period(client, make_subscription):
    sub = make_subscription()
    body = client.post(f"/subscriptions/{sub['id']}/payments", json={"card_number": RETRY_CARD}).json()
    assert body["outcome"] == "retry_scheduled"
    assert body["subscription_active"] is True
    assert client.post(f"/subscriptions/{sub['id']}/usage", json={"hours": 1}).status_code == 200


def test_successful_retry_restores_paid_state(client, make_subscription):
    sub = make_subscription()
    client.post(f"/subscriptions/{sub['id']}/payments", json={"card_number": DECLINE_CARD})
    client.post(f"/subscriptions/{sub['id']}/payments", json={"card_number": SUCCESS_CARD})
    state = client.get(f"/subscriptions/{sub['id']}").json()
    assert state["payment_state"] == "paid"
    assert state["active"] is True


@pytest.mark.parametrize(
    "market,tier,currency,amount",
    [
        ("SE", "gold", "SEK", 189.0),
        ("FI", "silver", "EUR", 12.99),
        ("GB", "premium", "GBP", 19.99),
        ("PL", "gold", "PLN", 54.9),
    ],
)
def test_charge_uses_market_currency_and_price(client, make_subscription, market, tier, currency, amount):
    sub = make_subscription(market=market, tier=tier)
    body = client.post(f"/subscriptions/{sub['id']}/payments", json={"card_number": SUCCESS_CARD}).json()
    assert body["currency"] == currency
    assert body["amount"] == amount


def test_tier_change_repriced_on_next_charge(client, make_subscription):
    sub = make_subscription(market="FI", tier="silver")
    client.post(f"/subscriptions/{sub['id']}/tier", json={"tier": "premium"})
    body = client.post(f"/subscriptions/{sub['id']}/payments", json={"card_number": SUCCESS_CARD}).json()
    assert body["amount"] == 24.99


def test_payment_for_unknown_subscription_returns_404(client):
    resp = client.post("/subscriptions/nope/payments", json={"card_number": SUCCESS_CARD})
    assert resp.status_code == 404
