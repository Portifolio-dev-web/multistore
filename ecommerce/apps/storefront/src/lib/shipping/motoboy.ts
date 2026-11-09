import { onlyDigits } from "@repo/db/utils";
import type { ShippingQuote } from "./types";

export type GeoPoint = { lat: number; lng: number };

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Distância em linha reta entre dois pontos (fórmula de haversine) */
export function haversineDistanceKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function motoboyPriceInCents(distanceKm: number, pricePerKmInCents: number, minPriceInCents: number | null): number {
  const price = Math.round(distanceKm * pricePerKmInCents);
  return minPriceInCents ? Math.max(price, minPriceInCents) : price;
}

/** CEP -> coordenadas via BrasilAPI (pública, sem token). null se o CEP não tiver localização. */
export async function geocodeZip(zip: string): Promise<GeoPoint | null> {
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${onlyDigits(zip)}`);
    if (!res.ok) return null;
    const data = await res.json();
    const coords = data?.location?.coordinates;
    const lat = Number(coords?.latitude);
    const lng = Number(coords?.longitude);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  } catch {
    return null;
  }
}

export type MotoboyStore = {
  originZip: string | null;
  motoboyEnabled: boolean;
  motoboyPricePerKmInCents: number | null;
  motoboyMinPriceInCents: number | null;
  motoboyMaxDistanceKm: number | null;
};

/** Sem integração: calcula pela distância entre a origem da loja e o CEP de destino */
export async function motoboyQuote(store: MotoboyStore, toZip: string): Promise<ShippingQuote[]> {
  if (!store.motoboyEnabled || !store.originZip || !store.motoboyPricePerKmInCents) return [];

  const [origin, destination] = await Promise.all([geocodeZip(store.originZip), geocodeZip(toZip)]);
  if (!origin || !destination) return [];

  const distanceKm = haversineDistanceKm(origin, destination);
  if (store.motoboyMaxDistanceKm && distanceKm > store.motoboyMaxDistanceKm) return [];

  const priceInCents = motoboyPriceInCents(distanceKm, store.motoboyPricePerKmInCents, store.motoboyMinPriceInCents);
  return [{ id: "motoboy", name: "Motoboy", priceInCents, minDays: 0, maxDays: 0 }];
}
