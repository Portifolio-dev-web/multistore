import { NextResponse } from "next/server";
import { prisma } from "@repo/db";
import { sendReviewRequest } from "@repo/mail";
import { storeUrl } from "@repo/db/urls";
import { signReviewToken } from "@/lib/review-token";

export const dynamic = "force-dynamic";

const DAYS_AFTER_DELIVERY = Number(process.env.REVIEW_REQUEST_DAYS_AFTER_DELIVERY || "7");

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return !!secret && req.headers.get("authorization") === `Bearer ${secret}`;
}

// F3.6: mesmo mecanismo de agendamento externo do /api/cron/abandoned-carts (ver Decisões)
export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const threshold = new Date(Date.now() - DAYS_AFTER_DELIVERY * 24 * 60 * 60 * 1000);
  const orders = await prisma.order.findMany({
    where: { status: "PAID", fulfillmentStatus: "DELIVERED", deliveredAt: { lte: threshold }, reviewRequestSentAt: null, customerEmail: { not: null } },
    include: { store: true, items: true },
  });

  let sent = 0;
  for (const order of orders) {
    const firstItem = order.items.find((i) => i.productId);
    if (!firstItem?.productId) continue; // sem produto de catálogo associado, não tem onde linkar a avaliação
    const product = await prisma.product.findUnique({ where: { id: firstItem.productId }, select: { slug: true } });
    if (!product) continue;

    const token = signReviewToken(order.id, firstItem.productId);
    const reviewUrl = `${storeUrl(order.store)}/produtos/${product.slug}?order=${order.id}&token=${token}`;
    const ok = await sendReviewRequest(order.store, order.customerEmail!, String(order.number), firstItem.productName, reviewUrl);
    if (ok) {
      await prisma.order.update({ where: { id: order.id }, data: { reviewRequestSentAt: new Date() } });
      sent++;
    }
  }

  return NextResponse.json({ sent });
}
