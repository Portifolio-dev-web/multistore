// F6.10: captura de erros — sem SENTRY_DSN configurado, só loga estruturado no console (no-op de
// envio, mesmo padrão documentado de admin/src/lib/hosting.ts pra não exigir conta externa em dev).
// Implementação própria do envelope HTTP do Sentry (funciona com Sentry SaaS ou self-hosted
// compatível, ex. GlitchTip) — evita o SDK completo (@sentry/nextjs precisa de um passo de build
// com SENTRY_AUTH_TOKEN pra upload de source maps, que não queremos exigir pra capturar erro).
export function captureError(error: unknown, context: Record<string, unknown> = {}): void {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  console.error(JSON.stringify({ level: "error", message, stack, ...context, ts: new Date().toISOString() }));

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  void sendToSentry(dsn, error, context).catch((err) => console.error("[error-reporting] falha ao enviar pro Sentry", err));
}

/** Linhas "at fn (arquivo:linha:coluna)" do V8 -> frames do Sentry (que espera o mais antigo primeiro). */
export function stackFrames(stack: string | undefined): { function?: string; filename: string; lineno: number; colno: number }[] {
  const frames = [];
  for (const line of stack?.split("\n") ?? []) {
    const m = line.match(/^\s*at (?:(.+?) \()?(.+?):(\d+):(\d+)\)?$/);
    if (m) frames.push({ function: m[1], filename: m[2], lineno: Number(m[3]), colno: Number(m[4]) });
  }
  return frames.reverse();
}

async function sendToSentry(dsn: string, error: unknown, context: Record<string, unknown>): Promise<void> {
  const match = dsn.match(/^https:\/\/(\w+)@([^/]+)\/(\d+)$/);
  if (!match) return;
  const [, publicKey, host, projectId] = match;

  const eventId = crypto.randomUUID().replace(/-/g, "");
  const event = {
    event_id: eventId,
    timestamp: Date.now() / 1000,
    platform: "node",
    level: "error",
    message: error instanceof Error ? error.message : String(error),
    exception:
      error instanceof Error
        ? { values: [{ type: error.name, value: error.message, stacktrace: { frames: stackFrames(error.stack) } }] }
        : undefined,
    tags: context,
  };
  const body = [JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString() }), JSON.stringify({ type: "event" }), JSON.stringify(event)].join(
    "\n",
  );

  await fetch(`https://${host}/api/${projectId}/envelope/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-sentry-envelope", "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${publicKey}` },
    body,
  });
}
