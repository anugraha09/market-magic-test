# Multi-Market Subscription QA Automation Framework

A QA automation portfolio project demonstrating the design and implementation of a test framework for a subscription-based audiobook and ebook platform operating across multiple international markets.

Instead of testing a simple CRUD application, this framework focuses on realistic business-critical scenarios found in subscription streaming services: subscription lifecycle management, listening-hour consumption, market-specific pricing, licensing restrictions, and payment state handling.

## Project Goals

The objective is to validate critical user journeys and prevent regression issues in areas such as:

- Subscription creation, activation, and lifecycle management
- Listening-hour tracking with boundary and negative testing
- Mid-cycle subscription upgrades and downgrades
- Multi-market pricing, currency, and catalog validation
- Payment success, decline, and retry workflows
- Subscription access changes triggered by payment state transitions

This project demonstrates how automated testing can protect complex subscription workflows where small business rule errors can directly impact customer experience and revenue.

## Architecture

```text
app/
├── domain.py              # Core business rules
└── main.py                # FastAPI REST API

tests/
├── conftest.py            # Shared fixtures
├── test_subscriptions.py
├── test_payments.py
└── test_markets.py

src/                       # Interactive browser demo

.github/workflows/         # GitHub Actions CI
```

The project separates business logic from the HTTP layer, allowing domain rules to be tested independently while exposing the same functionality through a REST API.

## Test Coverage

The automation suite includes **48 automated API tests** covering critical subscription platform risks, including business rules, boundary conditions, negative scenarios, and state transitions.

| Test Area | Coverage |
|-----------|----------|
| **Subscription Management** | Subscription creation, activation, tier upgrades, and downgrades |
| **Usage Tracking** | Listening-hour deduction, exact-limit consumption, over-usage prevention, and invalid usage handling |
| **Payment Processing** | Successful payments, declined payments, retry scenarios, and payment-driven subscription changes |
| **Subscription State Management** | Access activation/deactivation based on subscription and payment status |
| **Multi-Market Validation** | Market-specific pricing, currencies, and catalog licensing rules |
| **Error Handling & Validation** | Invalid markets, unsupported tiers, invalid requests, and API error responses |

The test suite uses **Pytest parameterization** to execute the same business scenarios across multiple markets, subscription tiers, and payment outcomes. This improves regression coverage while reducing duplicated test code.

## Technologies

| Technology | Purpose |
|------------|---------|
| **Python** | Core language used to implement the subscription domain logic and automation framework |
| **Pytest** | Automated API testing framework used for parameterized, boundary, regression, and payment workflow testing |
| **FastAPI** | Mock REST API used as the system under test for the automation suite |
| **Pydantic** | Data validation and request/response schema enforcement for API endpoints |
| **GitHub Actions** | Continuous Integration pipeline executing the test suite on every push and pull request |
| **TypeScript** | Client-side implementation of the subscription domain model for the interactive demo |
| **TanStack Start** | Frontend framework used to build the interactive demonstration of the subscription workflows |

## Continuous Integration

The project uses **GitHub Actions** as a CI pipeline to automatically validate code changes and detect regressions before merging.

The pipeline runs on every push and pull request and performs:

- Environment setup and dependency installation
- Execution of the complete Pytest automation suite
- Compatibility validation across Python 3.11 and Python 3.12

This ensures that changes to subscription logic, payment workflows, or market rules are automatically verified before being integrated.

## Running Locally

Install dependencies:

```bash
pip install -r requirements.txt
```

Run automated tests:

```bash
pytest -v
```

Start the FastAPI application:

```bash
uvicorn app.main:app --reload
```

Explore the API via Swagger UI at `http://127.0.0.1:8000/docs`.

## Web Demo

The repository includes an interactive web demo built with **TanStack Start** that allows users to explore the subscription workflows visually.

The frontend mirrors the backend subscription rules, providing a simple way to demonstrate:

- Creating subscriptions across different markets and tiers
- Recording listening-hour usage
- Testing subscription upgrades and downgrades
- Simulating payment outcomes
- Observing subscription state changes after payment events

The demo helps non-technical stakeholders understand the business scenarios covered by the automation framework, while keeping the core validation logic aligned with the backend implementation.

## Current Scope

To keep the project focused on QA automation concepts, the framework currently uses:

- **In-memory storage** instead of a production database
- **Simulated payment outcomes** instead of a real payment provider integration
- **Mock market configuration** instead of live pricing and licensing data

The purpose of this project is to demonstrate test automation design, business-rule validation, and regression testing strategies for a subscription platform. It is not intended to be a production-ready replica of a commercial streaming service.

## Future Improvements

Potential extensions to move the framework closer to a production-grade QA environment include:

- **PostgreSQL persistence** for realistic data storage and longer-running test scenarios
- **Payment webhook simulation** to test asynchronous payment state changes
- **Playwright end-to-end automation** for complete customer journey testing
- **Authentication and authorization testing** for user access control scenarios
- **Contract testing** to validate API compatibility between services
- **Concurrency and idempotency testing** for duplicate requests and distributed system behavior
- **Expanded market coverage** with additional pricing, currency, and licensing rules
