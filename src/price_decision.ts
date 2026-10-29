export type CatalogObservation = {
  sku: string;
  incumbentCents: number;
  competitorCents: number;
  observedAt: string;
};

export type PriceAction = "notify" | "record";

export function decidePriceAction(observation: CatalogObservation): PriceAction {
  return observation.competitorCents < observation.incumbentCents ? "notify" : "record";
}
