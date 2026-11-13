"use server";

import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@repo/db";
import { requireSession } from "@/lib/session";

const DAILY_LIMIT = 20;

export type AiDescriptionResult =
  | { description: string; seoTitle: string; seoDescription: string }
  | { error: string };

export async function generateProductDescription(input: {
  name: string;
  attributes: string;
}): Promise<AiDescriptionResult> {
  const { storeId } = await requireSession();
  if (!process.env.ANTHROPIC_API_KEY) return { error: "Geração por IA não está configurada nesta loja." };
  if (!input.name.trim()) return { error: "Informe o nome do produto primeiro." };

  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const usedToday = await prisma.aiGeneration.count({ where: { storeId, createdAt: { gte: since } } });
  if (usedToday >= DAILY_LIMIT) return { error: `Limite diário de ${DAILY_LIMIT} gerações por IA atingido. Tente de novo amanhã.` };

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5",
      max_tokens: 1024,
      system:
        'Você escreve textos de produto pra uma loja virtual brasileira. Responda só com um JSON válido, ' +
        'sem nada antes ou depois, no formato {"description":"...","seoTitle":"...","seoDescription":"..."}. ' +
        '"description" é a descrição completa do produto em português do Brasil (2 a 4 frases, tom comercial, sem emojis). ' +
        '"seoTitle" tem até 60 caracteres. "seoDescription" tem até 155 caracteres.',
      messages: [{ role: "user", content: `Produto: ${input.name}\nAtributos: ${input.attributes || "não informados"}` }],
    });

    const block = response.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") return { error: "A IA não devolveu texto." };
    const parsed = JSON.parse(block.text);

    await prisma.aiGeneration.create({ data: { storeId } });

    return {
      description: String(parsed.description ?? ""),
      seoTitle: String(parsed.seoTitle ?? ""),
      seoDescription: String(parsed.seoDescription ?? ""),
    };
  } catch (err) {
    // Regra 7: integração externa não derruba o fluxo principal — o lojista só não ganha o texto.
    console.error("[ai-description]", err);
    return { error: "Falha ao gerar com IA. Tente novamente." };
  }
}
