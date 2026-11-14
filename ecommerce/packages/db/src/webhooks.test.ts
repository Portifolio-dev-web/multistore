import { describe, expect, it } from "vitest";
import { isSafeWebhookUrl } from "./webhooks";

describe("isSafeWebhookUrl", () => {
  it("recusa loopback", async () => {
    expect(await isSafeWebhookUrl("http://127.0.0.1/hook")).toBe(false);
    expect(await isSafeWebhookUrl("http://localhost/hook")).toBe(false);
  });

  it("recusa metadata de nuvem (169.254.169.254)", async () => {
    expect(await isSafeWebhookUrl("http://169.254.169.254/latest/meta-data/")).toBe(false);
  });

  it("recusa faixas privadas (10.x, 172.16-31.x, 192.168.x)", async () => {
    expect(await isSafeWebhookUrl("http://10.0.0.5/hook")).toBe(false);
    expect(await isSafeWebhookUrl("http://172.17.0.2/hook")).toBe(false);
    expect(await isSafeWebhookUrl("http://192.168.1.1/hook")).toBe(false);
  });

  it("recusa IPv6 loopback e link-local", async () => {
    expect(await isSafeWebhookUrl("http://[::1]/hook")).toBe(false);
    expect(await isSafeWebhookUrl("http://[fe80::1]/hook")).toBe(false);
  });

  it("recusa esquema diferente de http(s)", async () => {
    expect(await isSafeWebhookUrl("ftp://93.184.216.34/hook")).toBe(false);
    expect(await isSafeWebhookUrl("file:///etc/passwd")).toBe(false);
  });

  it("recusa URL malformada", async () => {
    expect(await isSafeWebhookUrl("not a url")).toBe(false);
  });

  it("aceita host público (IP literal fora de faixa privada)", async () => {
    expect(await isSafeWebhookUrl("https://93.184.216.34/hook")).toBe(true);
  });
});
