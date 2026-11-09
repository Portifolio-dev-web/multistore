export type ShippingItem = { weightGrams: number; heightCm: number; widthCm: number; lengthCm: number; quantity: number };

export type ShippingDestination = { zip: string; state: string };

export type ShippingQuote = { id: string; name: string; priceInCents: number; minDays: number; maxDays: number };
