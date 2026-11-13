import { NextResponse } from "next/server";
import { prisma } from "@repo/db";
import { sendAbandonedCartReminder } from "@repo/mail";
import { storeUrl } from "@repo/db/urls";

export const dynamic = "force-dynamic";

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

type Item = { productName: string; variantLabel: string | null; unitPriceInCents: number; quantity: number };

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return !!secret && req.headers.get("authorization") === `Bearer ${secret}`;
}

// F3.4: chamado periodicamente por um agendador externo (cron do host, GitHub Actions
// scheduled, etc. — ver Decisões). Lembra 1h e 24h depois do carrinho abandonado.
export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const now = Date.now();
  const carts = await prisma.abandonedCart.findMany({
    where: { recoveredOrderId: null, unsubscribedAt: null },
    include: { store: true },
  });

  let sent1h = 0;
  let sent24h = 0;
  for (const cart of carts) {
    const ageMs = now - cart.createdAt.getTime();
    const stage = !cart.remindedAt1h && ageMs >= ONE_HOUR_MS ? "1h" : cart.remindedAt1h && !cart.remindedAt24h && ageMs >= ONE_DAY_MS ? "24h" : null;
    if (!stage) continue;

    const items = cart.items as unknown as Item[];
    const recoverUrl = `${storeUrl(cart.store)}/carrinho/recuperar/${cart.token}`;
    const unsubscribeUrl = `${storeUrl(cart.store)}/carrinho/descadastrar/${cart.token}`;
    const ok = await sendAbandonedCartReminder(cart.store, cart.email, items, recoverUrl, unsubscribeUrl);
    if (!ok) continue;

    if (stage === "1h") {
      await prisma.abandonedCart.update({ where: { id: cart.id }, data: { remindedAt1h: new Date() } });
      sent1h++;
    } else {
      await prisma.abandonedCart.update({ where: { id: cart.id }, data: { remindedAt24h: new Date() } });
      sent24h++;
    }
  }

  return NextResponse.json({ sent1h, sent24h });
}
