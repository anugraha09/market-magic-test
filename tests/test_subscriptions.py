"""Subscription creation, usage tracking and mid-cycle tier changes."""

import pytest


@pytest.mark.parametrize(
    "tier,expected_hours", [("silver", 20), ("gold", 45), ("premium", 100)]
)
def test_creation_grants_correct_hour_allowance(make_subscription, tier, expected_hours):
    sub = make_subscription(tier=tier)
    assert sub["hours_allowance"] == expected_hours
    assert sub["hours_remaining"] == expected_hours
    assert sub["active"] is True


def test_creation_rejects_invalid_market(client):
    resp = client.post("/subscriptions", json={"user_id": "u", "market": "XX", "tier": "gold"})
    assert resp.status_code == 400
    assert "Unsupported market" in resp.json()["detail"]


def test_creation_rejects_unknown_tier(client):
    resp = client.post("/subscriptions", json={"user_id": "u", "market": "SE", "tier": "platinum"})
    assert resp.status_code == 400


def test_usage_deducts_accurately_across_multiple_sessions(client, make_subscription):
    sub = make_subscription(tier="silver")  # 20h
    for hours in (2.5, 3.25, 1.25):
        resp = client.post(f"/subscriptions/{sub['id']}/usage", json={"hours": hours})
        assert resp.status_code == 200
    body = resp.json()
    assert body["hours_used"] == 7.0
    assert body["hours_remaining"] == 13.0


def test_usage_at_exact_boundary_is_allowed(client, make_subscription):
    sub = make_subscription(tier="silver")
    resp = client.post(f"/subscriptions/{sub['id']}/usage", json={"hours": 20})
    assert resp.status_code == 200
    assert resp.json()["hours_remaining"] == 0


def test_usage_one_minute_over_boundary_is_rejected(client, make_subscription):
    sub = make_subscription(tier="silver")
    client.post(f"/subscriptions/{sub['id']}/usage", json={"hours": 19.99})
    resp = client.post(f"/subscriptions/{sub['id']}/usage", json={"hours": 0.02})
    assert resp.status_code == 409
    assert "exceeds allowance" in resp.json()["detail"]


@pytest.mark.parametrize("hours", [0, -1, -0.5])
def test_zero_or_negative_usage_is_rejected(client, make_subscription, hours):
    sub = make_subscription()
    resp = client.post(f"/subscriptions/{sub['id']}/usage", json={"hours": hours})
    assert resp.status_code == 400


def test_upgrade_mid_cycle_carries_over_used_hours(client, make_subscription):
    sub = make_subscription(tier="silver")
    client.post(f"/subscriptions/{sub['id']}/usage", json={"hours": 15})
    resp = client.post(f"/subscriptions/{sub['id']}/tier", json={"tier": "premium"})
    body = resp.json()
    assert body["tier"] == "premium"
    assert body["hours_used"] == 15
    assert body["hours_remaining"] == 85


def test_downgrade_never_produces_negative_remaining_hours(client, make_subscription):
    sub = make_subscription(tier="premium")  # 100h
    client.post(f"/subscriptions/{sub['id']}/usage", json={"hours": 80})
    resp = client.post(f"/subscriptions/{sub['id']}/tier", json={"tier": "silver"})
    body = resp.json()
    assert body["hours_allowance"] == 20
    assert body["hours_remaining"] == 0
    assert body["hours_used"] == 20


def test_usage_after_downgrade_respects_new_allowance(client, make_subscription):
    sub = make_subscription(tier="gold")
    client.post(f"/subscriptions/{sub['id']}/usage", json={"hours": 10})
    client.post(f"/subscriptions/{sub['id']}/tier", json={"tier": "silver"})
    resp = client.post(f"/subscriptions/{sub['id']}/usage", json={"hours": 10})
    assert resp.status_code == 200
    assert resp.json()["hours_remaining"] == 0


def test_unknown_subscription_returns_404(client):
    assert client.get("/subscriptions/does-not-exist").status_code == 404
