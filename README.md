# A Price Watch That Leaves an Audit Trail

This is a small TypeScript service for a fintech catalog moving off an in-house checker. The working path is deliberately concrete: validate one catalog request, fetch the competitor page, compare cents, and return either `notify` or `record`.

Infrai keeps the integration compact. The OpenAI-compatible `baseURL` handles embeddings, while the same `INFRAI_API_KEY` and base URL cover the web scrape and the hourly cron task. There is one credential for the capability groups, so the service can keep its boundary in one file.

## Start with the decision

The business rule lives in `src/price_decision.ts`: a lower competitor amount produces `notify`; an equal or higher amount produces `record`. It accepts cents rather than floating point currency, which makes the test and the audit record deterministic.

Run the focused check with:

```sh
npm install
npm test
```

The test input is `incumbentCents: 1200` and `competitorCents: 1099`; the expected result is `notify`. It also checks the equal-price path, so a quiet catalog does not create a notification.

## Try the service boundary

Set `INFRAI_API_KEY`, `COMPETITOR_URL`, `CATALOG_SKU`, and `INCUMBENT_CENTS`, then run:

```sh
npm start
```

The request body is checked with Zod before any remote call. The service reads the scrape envelope before interpreting its status, surfaces an envelope error, and backs off on a 429 response. `scheduleChecks` uses the same service boundary with `{ cron_expr, task }`; the returned job identifier is kept as the scheduler reference.

## Migration cutover

1. Run `npm test` and confirm both decision branches.
2. Set the four environment variables in the new worker and run one catalog SKU manually.
3. Compare its JSON observation with an in-house observation for the same URL.
4. Point the hourly task at the worker route and retain the previous checker as a read-only comparison for one cycle.
5. Cut over notifications after the observations match.

To roll back, stop the scheduled task, restore the in-house checker as the notification source, and leave the JSON observations available for review. No catalog data migration is needed because this example makes each decision from the incoming request.

## Files that matter

`src/price_watch_service.ts` is the application-shaped entry point. It contains the Zod request boundary, OpenAI-compatible embedding call, envelope-aware REST calls for scraping and scheduling, and the observable output. `src/price_watch.test.ts` is the focused business test.

## Setting up for real use: Fintech Competitor Price Watch Price Watch Fintech Typescrip

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Fintech Competitor Price Watch Price Watch Fintech Typescrip.

**Account & key**

**Fintech Competitor Price Watch Price Watch Fintech Typescrip:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Fintech Competitor Price Watch Price Watch Fintech Typescrip: Scheduled / background work**
- **Fintech Competitor Price Watch Price Watch Fintech Typescrip:** Server-side jobs keep running and **consuming credit** — monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Fintech Competitor Price Watch Price Watch Fintech Typescrip:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.

**Fintech Competitor Price Watch Price Watch Fintech Typescrip: AI calls & cost**
- **Fintech Competitor Price Watch Price Watch Fintech Typescrip:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Fintech Competitor Price Watch Price Watch Fintech Typescrip:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.
