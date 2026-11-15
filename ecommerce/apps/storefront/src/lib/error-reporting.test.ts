import { describe, expect, it } from "vitest";
import { stackFrames } from "./error-reporting";

describe("stackFrames", () => {
  it("converte o stack do V8 em frames do Sentry, mais antigo primeiro", () => {
    const stack = [
      "Error: boom",
      "    at markOrderPaid (/app/apps/storefront/.next/server/chunk.js:10:5)",
      "    at async POST (/app/apps/storefront/.next/server/route.js:42:7)",
      "    at /app/node_modules/next/dist/server.js:1:2",
    ].join("\n");
    expect(stackFrames(stack)).toEqual([
      { function: undefined, filename: "/app/node_modules/next/dist/server.js", lineno: 1, colno: 2 },
      { function: "async POST", filename: "/app/apps/storefront/.next/server/route.js", lineno: 42, colno: 7 },
      { function: "markOrderPaid", filename: "/app/apps/storefront/.next/server/chunk.js", lineno: 10, colno: 5 },
    ]);
  });

  it("sem stack devolve lista vazia", () => {
    expect(stackFrames(undefined)).toEqual([]);
  });
});
