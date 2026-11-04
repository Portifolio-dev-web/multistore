import { getStripe, requireEnv } from "@/lib/stripe";
import type { CreatePaymentInput, CreatePaymentResult, PaymentProvider, RefundInput } from "./types";

/** Taxa da plataforma em centavos, a partir de PLATFORM_FEE_PERCENT (0 desativa) */
export function calculateApplicationFeeInCents(totalInCents: number, feePercent: number): number {
  if (!Number.isFinite(feePercent) || feePercent <= 0) return 0;
  return Math.round((totalInCents * feePercent) / 100);
}

export const stripeProvider: PaymentProvider = {
  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    if (!input.store.stripeAccountId) {
      return { error: "Esta loja ainda não está pronta para receber pagamentos." };
    }

    const feePercent = Number(process.env.PLATFORM_FEE_PERCENT ?? "0");
    const applicationFeeAmount = calculateApplicationFeeInCents(input.totalInCents, feePercent);

    try {
      const session = await getStripe().checkout.sessions.create({
        mode: "payment",
        client_reference_id: input.orderId,
        metadata: { orderId: input.orderId, storeId: input.store.id },
        customer_email: input.customerEmail,
        // Reserva de estoque é curta: a sessão expira (e devolve o estoque) em 30 minutos
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
        // Cobrança por destino: a cobrança continua na conta da plataforma (mesmo webhook de
        // sempre) e o Stripe repassa o valor pra conta conectada da loja automaticamente.
        payment_intent_data: {
          application_fee_amount: applicationFeeAmount,
          transfer_data: { destination: input.store.stripeAccountId },
        },
        line_items: input.lines.map((l) => ({
          quantity: l.quantity,
          price_data: {
            currency: input.store.currency,
            unit_amount: l.unitPriceInCents,
            product_data: { name: l.name, images: l.images?.slice(0, 1) },
          },
        })),
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
      });

      if (!session.url) return { error: "Não foi possível iniciar o pagamento." };
      return { url: session.url, sessionId: session.id };
    } catch (err) {
      console.error("[payments] erro ao criar sessão Stripe", err);
      return { error: "Falha ao conectar com o Stripe. Tente novamente." };
    }
  },

  async parseWebhook(req: Request) {
    const signature = req.headers.get("stripe-signature");
    if (!signature) throw new Error("Assinatura ausente");
    const payload = await req.text();
    return getStripe().webhooks.constructEvent(payload, signature, requireEnv("STRIPE_WEBHOOK_SECRET"));
  },

  async refund(input: RefundInput): Promise<void> {
    if (!input.stripePaymentIntentId) throw new Error("Pedido sem pagamento associado.");
    await getStripe().refunds.create({
      payment_intent: input.stripePaymentIntentId,
      reverse_transfer: true,
      refund_application_fee: true,
    });
  },
};
