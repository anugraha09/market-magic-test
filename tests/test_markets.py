"""Cross-market regression: pricing, currency and catalog availability."""

import pytest

from app import domain

ALL_MARKETS = sorted(domain.MARKETS)


@pytest.mark.parametrize("market", ALL_MARKETS)
def test_every_market_prices_all_tiers_in_its_own_currency(client, market):
    body = client.get(f"/markets/{market}").json()
    assert set(body["prices"]) == set(domain.TIER_HOURS)
    assert all(p > 0 for p in body["prices"].values())
    assert body["currency"] == domain.MARKETS[market].currency


@pytest.mark.parametrize("market", ALL_MARKETS)
def test_same_signup_flow_works_in_every_market(client, make_subscription, market):
    sub = make_subscription(market=market, tier="gold")
    assert sub["market"] == market
    assert client.post(f"/subscriptions/{sub['id']}/usage", json={"hours": 1}).status_code == 200


@pytest.mark.parametrize("market", ALL_MARKETS)
def test_market_catalog_only_contains_licensed_titles(client, market):
    body = client.get(f"/markets/{market}").json()
    assert body["catalog_size"] > 0
    assert all(market in book["markets"] for book in body["catalog"])


def test_restricted_markets_are_flagged_and_have_smaller_catalogs(client):
    se = client.get("/markets/SE").json()
    ch = client.get("/markets/CH").json()
    assert se["restricted_catalog"] is False
    assert ch["restricted_catalog"] is True
    assert ch["catalog_size"] <= se["catalog_size"]


def test_market_code_is_case_insensitive(client):
    assert client.get("/markets/se").json()["market"] == "SE"


def test_unknown_market_returns_400(client):
    resp = client.get("/markets/ZZ")
    assert resp.status_code == 400
    assert "Unsupported market" in resp.json()["detail"]


def test_pricing_differs_across_markets_for_same_tier(client):
    prices = {m: client.get(f"/markets/{m}").json()["prices"]["gold"] for m in ALL_MARKETS}
    assert len(set(prices.values())) > 1
