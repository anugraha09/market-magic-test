import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import {
  MARKETS,
  TIER_HOURS,
  catalogFor,
  changeTier,
  consumeHours,
  createSubscription,
  getMarket,
  processPayment,
  type Card,
  type Subscription,
  type Tier,
} from "@/lib/subscription-domain";
import { SUITE, TOTAL_CASES } from "@/lib/suite-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Multi-Market Subscription QA Automation Framework" },
      {
        name: "description",
        content:
          "A pytest + FastAPI test framework for a 28-market audiobook subscription platform: usage boundaries, cross-market pricing, and payment failure handling.",
      },
      { property: "og:title", content: "Multi-Market Subscription QA Automation Framework" },
      {
        property: "og:description",
        content:
          "Test design for subscription streaming: hour-allowance boundaries, per-market pricing regression, and declined-payment access revocation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const TIERS = Object.keys(TIER_HOURS) as Tier[];

function Index() {
  return (
    <main className="mx-auto max-w-6xl px-6 pb-24">
      <Hero />
      <Sandbox />
      <Coverage />
      <Architecture />
      <Footer />
    </main>
  );
}

function Hero() {
  return (
    <header className="rule-grid -mx-6 border-b border-border px-6 pb-16 pt-20">
      <p className="mono-label">QA engineering portfolio · subscription streaming</p>
      <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
        Multi-Market Subscription
        <span className="text-primary"> QA Automation Framework</span>
      </h1>
      <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
        A FastAPI mock of a tiered audiobook subscription domain, and a pytest suite built to
        surface the bug classes a multi-market streaming business actually has to guard against:
        hour-allowance boundaries, per-country pricing and licensing drift, and payment failures
        that must revoke access.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Stat value={`${TOTAL_CASES}`} label="tests passing" tone="pass" />
        <Stat value="3" label="domain suites" />
        <Stat value={`${MARKETS.length}`} label="markets modelled" />
        <Stat value="CI" label="on every push" />
      </div>
    </header>
  );
}

function Stat({ value, label, tone }: { value: string; label: string; tone?: "pass" }) {
  return (
    <div className="panel px-4 py-3">
      <div
        className={`font-mono text-2xl font-semibold ${tone === "pass" ? "text-pass" : "text-foreground"}`}
      >
        {value}
      </div>
      <div className="mono-label mt-1">{label}</div>
    </div>
  );
}

interface LogLine {
  ok: boolean;
  text: string;
}

function Sandbox() {
  const [market, setMarket] = useState("SE");
  const [tier, setTier] = useState<Tier>("silver");
  const [sub, setSub] = useState<Subscription>(() => createSubscription("SE", "silver"));
  const [log, setLog] = useState<LogLine[]>([
    { ok: true, text: "201 — subscription created · SE · silver · 20h allowance" },
  ]);

  const m = getMarket(sub.market);
  const remaining = Math.round((sub.allowance - sub.used) * 100) / 100;
  const pct = Math.min(100, (sub.used / sub.allowance) * 100);

  const push = (ok: boolean, text: string) =>
    setLog((prev) => [{ ok, text }, ...prev].slice(0, 8));

  const reset = (nextMarket = market, nextTier = tier) => {
    setSub(createSubscription(nextMarket, nextTier));
    push(
      true,
      `201 — subscription created · ${nextMarket} · ${nextTier} · ${TIER_HOURS[nextTier]}h allowance`,
    );
  };

  const listen = (hours: number) => {
    const res = consumeHours(sub, hours);
    setSub(res.sub);
    push(res.ok, res.message);
  };

  const swap = (t: Tier) => {
    const res = changeTier(sub, t);
    setSub(res.sub);
    setTier(t);
    push(res.ok, res.message);
  };

  const pay = (card: Card) => {
    const res = processPayment(sub, card);
    setSub(res.sub);
    push(res.ok, res.message);
  };

  return (
    <section className="mt-16">
      <h2 className="text-2xl font-semibold tracking-tight">Run the domain</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        The same rules the pytest suite asserts against, wired to buttons. Push it past a boundary
        or decline a card and watch subscription state react.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="panel p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mono-label">market</span>
            {MARKETS.map((mk) => (
              <Chip
                key={mk.code}
                active={mk.code === sub.market}
                onClick={() => {
                  setMarket(mk.code);
                  reset(mk.code, sub.tier);
                }}
              >
                {mk.code}
              </Chip>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="mono-label">tier</span>
            {TIERS.map((t) => (
              <Chip key={t} active={t === sub.tier} onClick={() => swap(t)}>
                {t} · {TIER_HOURS[t]}h
              </Chip>
            ))}
          </div>

          <div className="mt-6 rounded-md border border-border bg-secondary/50 p-4">
            <div className="flex items-baseline justify-between">
              <span className="mono-label">listening hours</span>
              <span className="font-mono text-sm">
                {sub.used}h / {sub.allowance}h
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full transition-all duration-500 ${
                  remaining === 0 ? "bg-warn" : "bg-accent"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {[0.5, 2, 10, remaining || 1].map((h, i) => (
                <Chip key={i} onClick={() => listen(h)}>
                  listen {h}h
                </Chip>
              ))}
              <Chip onClick={() => listen(0)}>listen 0h</Chip>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="mono-label">charge</span>
            <Chip onClick={() => pay("success")}>valid card</Chip>
            <Chip onClick={() => pay("retry")}>insufficient funds</Chip>
            <Chip onClick={() => pay("declined")}>declined card</Chip>
            <Chip onClick={() => reset(sub.market, sub.tier)}>reset</Chip>
          </div>
        </div>

        <div className="panel flex flex-col p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={sub.active ? "pass" : "fail"}>
              {sub.active ? "access active" : "access revoked"}
            </Badge>
            <Badge tone={sub.paymentState === "declined" ? "fail" : sub.paymentState === "paid" ? "pass" : "warn"}>
              payment: {sub.paymentState}
            </Badge>
            <Badge>
              {(m.prices[sub.tier] ?? 0).toFixed(2)} {m.currency}
            </Badge>
            {m.restricted && <Badge tone="warn">restricted catalog</Badge>}
          </div>

          <div className="mono-label mt-5">response log</div>
          <ul className="mt-2 space-y-1.5 font-mono text-xs leading-relaxed">
            {log.map((line, i) => (
              <li key={i} className={line.ok ? "text-pass" : "text-fail"}>
                <span className="text-muted-foreground">$</span> {line.text}
              </li>
            ))}
          </ul>

          <div className="mono-label mt-6">licensed catalog · {sub.market}</div>
          <ul className="mt-2 grid gap-1 text-sm text-muted-foreground">
            {catalogFor(sub.market).map((b) => (
              <li key={b.id}>· {b.title}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1 font-mono text-xs transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-secondary text-foreground hover:border-primary/60 hover:text-primary"
      }`}
    >
      {children}
    </button>
  );
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: "pass" | "fail" | "warn";
}) {
  const color =
    tone === "pass"
      ? "text-pass border-pass/40"
      : tone === "fail"
        ? "text-fail border-fail/40"
        : tone === "warn"
          ? "text-warn border-warn/40"
          : "text-muted-foreground border-border";
  return (
    <span className={`rounded-full border px-2.5 py-1 font-mono text-[11px] ${color}`}>
      {children}
    </span>
  );
}

function Coverage() {
  const [open, setOpen] = useState<string | null>(SUITE[0]!.file);
  const marketRows = useMemo(() => MARKETS, []);

  return (
    <section className="mt-20">
      <h2 className="text-2xl font-semibold tracking-tight">Test coverage</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        {TOTAL_CASES} parametrised cases across three domain suites. Every one green on the last
        run.
      </p>

      <div className="mt-6 space-y-3">
        {SUITE.map((mod) => {
          const count = mod.cases.reduce((s, c) => s + (c.params?.length ?? 1), 0);
          const isOpen = open === mod.file;
          return (
            <div key={mod.file} className="panel overflow-hidden">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : mod.file)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-secondary/60"
              >
                <div>
                  <div className="font-mono text-sm text-primary">{mod.file}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{mod.blurb}</div>
                </div>
                <span className="shrink-0 font-mono text-xs text-pass">{count} passed</span>
              </button>
              {isOpen && (
                <ul className="border-t border-border px-5 py-4 font-mono text-xs">
                  {mod.cases.map((c) => (
                    <li key={c.name} className="flex flex-wrap items-center gap-2 py-1">
                      <span className="text-pass">PASS</span>
                      <span className="text-foreground">test_{c.name}</span>
                      {c.params?.map((p) => (
                        <span
                          key={p}
                          className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {p}
                        </span>
                      ))}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <div className="panel mt-6 overflow-x-auto">
        <table className="w-full min-w-125 text-left text-sm">
          <thead className="mono-label">
            <tr className="border-b border-border">
              <th className="px-5 py-3 font-normal">market</th>
              <th className="px-5 py-3 font-normal">currency</th>
              {TIERS.map((t) => (
                <th key={t} className="px-5 py-3 font-normal">
                  {t}
                </th>
              ))}
              <th className="px-5 py-3 font-normal">catalog</th>
            </tr>
          </thead>
          <tbody className="font-mono text-xs">
            {marketRows.map((mk) => (
              <tr key={mk.code} className="border-b border-border/60 last:border-0">
                <td className="px-5 py-3 text-foreground">
                  {mk.code} <span className="text-muted-foreground">{mk.name}</span>
                </td>
                <td className="px-5 py-3 text-muted-foreground">{mk.currency}</td>
                {TIERS.map((t) => (
                  <td key={t} className="px-5 py-3">
                    {(mk.prices[t] ?? 0).toFixed(2)}
                  </td>
                ))}
                <td className="px-5 py-3">
                  {catalogFor(mk.code).length} titles
                  {mk.restricted && <span className="ml-2 text-warn">restricted</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Architecture() {
  return (
    <section className="mt-20 grid gap-4 lg:grid-cols-2">
      <div className="panel p-6">
        <h2 className="text-lg font-semibold tracking-tight">Architecture</h2>
        <pre className="mt-4 overflow-x-auto font-mono text-xs leading-relaxed text-muted-foreground">
{`app/
  domain.py     tiers, markets, usage, payments (in-memory)
  main.py       FastAPI surface + OpenAPI docs
tests/
  conftest.py            TestClient + isolated store per test
  test_subscriptions.py  allowances, boundaries, tier changes
  test_payments.py       decline / retry / access revocation
  test_markets.py        cross-market pricing + licensing
.github/workflows/ci.yml  pytest on 3.11 & 3.12, every push/PR`}
        </pre>
      </div>
      <div className="panel p-6">
        <h2 className="text-lg font-semibold tracking-tight">Run it yourself</h2>
        <pre className="mt-4 overflow-x-auto font-mono text-xs leading-relaxed">
<span className="text-muted-foreground"># install dependencies{"\n"}</span>
{"pip install -r requirements.txt\n\n"}
<span className="text-muted-foreground"># run the test suite{"\n"}</span>
{"pytest -v\n\n"}
<span className="text-muted-foreground"># or explore the API live{"\n"}</span>
{"uvicorn app.main:app --reload\n"}
<span className="text-muted-foreground">{"# http://127.0.0.1:8000/docs"}</span>
        </pre>
        <p className="mt-4 text-sm text-muted-foreground">
          Mock service by design: in-memory storage, simulated payment outcomes. The deliverable is
          the test design, not a production clone.
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="mt-20 border-t border-border pt-6">
      <p className="text-sm text-muted-foreground">
        Modelled on the public business model of a multi-market audiobook subscription service —
        tiered listening hours, per-country pricing and licensing, Adyen-style payment outcomes.
        Not affiliated with any of them.
      </p>
    </footer>
  );
}
