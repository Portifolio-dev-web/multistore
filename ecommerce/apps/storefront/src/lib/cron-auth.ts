import crypto from "node:crypto";

/** `Authorization: Bearer $CRON_SECRET`, comparado em tempo constante. Sem CRON_SECRET, sempre recusa. */
export function isCronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return got.length === expected.length && crypto.timingSafeEqual(got, expected);
}
