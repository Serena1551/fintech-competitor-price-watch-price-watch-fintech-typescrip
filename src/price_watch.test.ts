import assert from "node:assert/strict";
import { decidePriceAction } from "./price_decision.ts";

const action = decidePriceAction({ sku: "card-basic", incumbentCents: 1200, competitorCents: 1099, observedAt: "2026-10-24T00:00:00Z" });
assert.equal(action, "notify");
assert.equal(decidePriceAction({ sku: "card-basic", incumbentCents: 1200, competitorCents: 1200, observedAt: "2026-10-24T00:00:00Z" }), "record");
console.log("price decision test passed");
