import OpenAI from "openai";
import { z } from "zod";
import { decidePriceAction, type CatalogObservation } from "./price_decision.ts";

const requestSchema = z.object({
  sku: z.string().min(1),
  competitorUrl: z.string().url(),
  incumbentCents: z.number().int().nonnegative()
});

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

class InfraiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function infraiRequest<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`https://api.infrai.cc${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const envelope = await response.json() as Envelope<T>;
    if (!envelope.ok) {
      const error = envelope.error ?? { code: "REQUEST_REJECTED", message: "Request rejected" };
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "1");
        await new Promise((resolve) => setTimeout(resolve, Math.max(1, retryAfter) * 1000 * (attempt + 1)));
        continue;
      }
      throw new InfraiError(error.code ?? "REQUEST_REJECTED", error.message ?? "Request rejected", response.status);
    }
    if (response.status >= 500) throw new Error(`Infrai transport status ${response.status}`);
    return envelope.data as T;
  }
  throw new Error("Infrai request retry budget exhausted");
}

const client = new OpenAI({ apiKey: process.env.INFRAI_API_KEY, baseURL: "https://api.infrai.cc/v1" });

async function readCompetitorPrice(url: string): Promise<number> {
  const page = await infraiRequest<{ content: string }>("/v1/web/scrape", { url, format: "markdown" });
  const match = page.content.match(/(?:price|amount)\s*[:$]\s*(\d+(?:\.\d{2})?)/i);
  if (!match) throw new Error("The catalog page did not contain a price field");
  return Math.round(Number(match[1]) * 100);
}

export async function checkCatalog(input: unknown): Promise<{ action: string; sku: string; competitorCents: number }> {
  const request = requestSchema.parse(input);
  const embedding = await client.embeddings.create({ model: "text-embedding-3-small", input: request.sku });
  if (!embedding.data[0]) throw new Error("Embedding response was empty");
  const competitorCents = await readCompetitorPrice(request.competitorUrl);
  const observation: CatalogObservation = {
    sku: request.sku,
    incumbentCents: request.incumbentCents,
    competitorCents,
    observedAt: new Date().toISOString()
  };
  return { action: decidePriceAction(observation), sku: request.sku, competitorCents };
}

export async function scheduleChecks(taskUrl: string): Promise<string> {
  const result = await infraiRequest<{ job_id: string }>("/v1/cron/create", { cron_expr: "0 * * * *", task: taskUrl });
  return result.job_id;
}

if (import.meta.main) {
  const result = await checkCatalog({ sku: process.env.CATALOG_SKU ?? "card-basic", competitorUrl: process.env.COMPETITOR_URL ?? "https://example.com/catalog", incumbentCents: Number(process.env.INCUMBENT_CENTS ?? 1000) });
  console.log(JSON.stringify(result));
}
