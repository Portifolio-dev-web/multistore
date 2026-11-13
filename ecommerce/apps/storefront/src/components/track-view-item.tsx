"use client";

import { useEffect } from "react";
import { trackViewItem } from "@/lib/analytics-events";

type Props = { id: string; name: string; priceInCents: number; currency: string };

export function TrackViewItem({ id, name, priceInCents, currency }: Props) {
  useEffect(() => {
    trackViewItem({ id, name, priceInCents }, currency);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  return null;
}
