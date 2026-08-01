"""FastAPI mock service: multi-market audiobook/ebook subscriptions."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app import domain
from app.domain import DomainError

app = FastAPI(
    title="Multi-Market Subscription Mock Service",
    description="Mock domain for QA automation: tiers, markets, usage, payments.",
    version="1.0.0",
)


@app.exception_handler(DomainError)
async def domain_error_handler(_request, exc: DomainError):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})


class SubscriptionCreate(BaseModel):
    user_id: str = Field(..., examples=["user-1"])
    market: str = Field(..., examples=["SE"])
    tier: str = Field(..., examples=["gold"])


class UsageRequest(BaseModel):
    hours: float = Field(..., examples=[2.5])


class TierChange(BaseModel):
    tier: str = Field(..., examples=["premium"])


class PaymentRequest(BaseModel):
    card_number: str = Field(..., examples=["4111111111111111"])


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/tiers")
def tiers():
    return {"tiers": domain.TIER_HOURS}


@app.get("/markets")
def markets():
    return {"markets": sorted(domain.MARKETS)}


@app.get("/markets/{code}")
def market_detail(code: str):
    return domain.market_catalog(code)


@app.post("/subscriptions", status_code=201)
def create_subscription(payload: SubscriptionCreate):
    return domain.create_subscription(payload.user_id, payload.market, payload.tier).to_dict()


@app.get("/subscriptions/{sub_id}")
def read_subscription(sub_id: str):
    return domain.get_subscription(sub_id).to_dict()


@app.post("/subscriptions/{sub_id}/usage")
def add_usage(sub_id: str, payload: UsageRequest):
    return domain.consume_hours(sub_id, payload.hours).to_dict()


@app.post("/subscriptions/{sub_id}/tier")
def update_tier(sub_id: str, payload: TierChange):
    return domain.change_tier(sub_id, payload.tier).to_dict()


@app.post("/subscriptions/{sub_id}/payments")
def pay(sub_id: str, payload: PaymentRequest):
    return domain.process_payment(sub_id, payload.card_number)
