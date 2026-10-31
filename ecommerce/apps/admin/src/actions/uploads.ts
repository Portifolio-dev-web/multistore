"use server";

import { randomUUID } from "node:crypto";
import { requireSession } from "@/lib/session";
import { putPublicObject } from "@/lib/storage";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif", "image/gif": "gif" };

// Assinaturas binárias: não confiamos só no Content-Type enviado pelo navegador
function sniff(bytes: Uint8Array): string | null {
  const hex = Array.from(bytes.subarray(0, 12), (b) => b.toString(16).padStart(2, "0")).join("");
  if (hex.startsWith("ffd8ff")) return "image/jpeg";
  if (hex.startsWith("89504e47")) return "image/png";
  if (hex.startsWith("47494638")) return "image/gif";
  if (hex.startsWith("52494646") && hex.slice(16, 24) === "57454250") return "image/webp";
  if (hex.slice(8, 24) === "6674797061766966") return "image/avif";
  return null;
}

export type UploadResult = { url: string } | { error: string };

export async function uploadProductImage(formData: FormData): Promise<UploadResult> {
  const { storeId } = await requireSession();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Selecione uma imagem." };
  if (file.size > MAX_BYTES) return { error: `"${file.name}" passa de 5 MB.` };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniff(bytes);
  if (!type || !TYPES[type]) return { error: `"${file.name}" não é JPG, PNG, WEBP, AVIF ou GIF.` };

  try {
    const url = await putPublicObject(`stores/${storeId}/products/${randomUUID()}.${TYPES[type]}`, bytes, type);
    return { url };
  } catch (err) {
    console.error("[upload] falha no storage", err);
    return { error: "Falha ao enviar para o armazenamento. Verifique a configuração S3." };
  }
}
