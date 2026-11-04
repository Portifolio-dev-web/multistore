import type Stripe from "stripe";

export type PaymentLine = {
  name: string;
  quantity: number;
  unitPriceInCents: number;
  images?: string[];
};

export type CreatePaymentInput = {
  orderId: string;
  store: { id: string; currency: string; stripeAccountId: string | null };
  customerEmail: string;
  totalInCents: number;
  lines: PaymentLine[];
  successUrl: string;
  cancelUrl: string;
};

export type CreatePaymentResult = { url: string; sessionId: string } | { error: string };

export type RefundInput = {
  stripePaymentIntentId: string | null;
};

/**
 * Contrato comum a qualquer gateway de pagamento. Hoje só o Stripe implementa;
 * isso abre espaço pra um segundo gateway (ex.: Mercado Pago) sem reescrever o checkout.
 */
export type PaymentProvider = {
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  /** Valida a assinatura e devolve o evento já verificado (lança se a assinatura for inválida) */
  parseWebhook(req: Request): Promise<Stripe.Event>;
  /** Usado pelo painel na F1.7 (cancelar/reembolsar) */
  refund(input: RefundInput): Promise<void>;
};
