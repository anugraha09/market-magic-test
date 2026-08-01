import pytest
from fastapi.testclient import TestClient

from app import domain
from app.main import app


@pytest.fixture(autouse=True)
def clean_store():
    domain.store.reset()
    yield
    domain.store.reset()


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def make_subscription(client):
    def _make(market="SE", tier="gold", user_id="user-1"):
        resp = client.post(
            "/subscriptions", json={"user_id": user_id, "market": market, "tier": tier}
        )
        assert resp.status_code == 201, resp.text
        return resp.json()

    return _make
