import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { slugify } from "../src/utils";

const prisma = new PrismaClient();

const IMG = {
  bottle:
    "https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?auto=format&fit=crop&w=1200&q=80",
  cup: "https://images.unsplash.com/photo-1573770012830-7cf1777db19c?auto=format&fit=crop&w=1200&q=80",
  camera:
    "https://images.unsplash.com/photo-1545242640-7c9e9cc07d23?auto=format&fit=crop&w=1200&q=80",
};

async function main() {
  const store = await prisma.store.upsert({
    where: { slug: "loja-demo" },
    update: {},
    create: {
      slug: "loja-demo",
      name: "Loja Demo",
      description: "Uma vitrine de exemplo — edite tudo pelo painel do lojista.",
      primaryColor: "#1f3a2e",
      accentColor: "#e8b04b",
    },
  });

  if ((await prisma.product.count({ where: { storeId: store.id } })) === 0) {
    const categoryNames = ["Bem-estar", "Utilidades", "Decoração"];
    const categories: Record<string, string> = {};
    for (const name of categoryNames) {
      const slug = slugify(name);
      const category = await prisma.category.upsert({
        where: { storeId_slug: { storeId: store.id, slug } },
        update: {},
        create: { storeId: store.id, name, slug },
      });
      categories[name] = category.id;
    }

    const products = [
      { name: "Óleo Botânico 100ml", category: "Bem-estar", priceInCents: 8990, compareAtPriceInCents: 11990, stock: 25, images: [IMG.bottle], description: "Óleo vegetal prensado a frio, ideal para pele e cabelos." },
      { name: "Kit Potes Âmbar", category: "Bem-estar", priceInCents: 12900, stock: 8, images: [IMG.bottle], description: "Trio de potes de vidro âmbar com tampa." },
      { name: "Copo Shake 500ml", category: "Utilidades", priceInCents: 3990, stock: 60, images: [IMG.cup], description: "Copo com tampa e canudo, livre de BPA." },
      { name: "Câmera Vintage Decorativa", category: "Decoração", priceInCents: 45900, stock: 3, images: [IMG.camera], description: "Peça decorativa inspirada nas câmeras dos anos 70." },
      { name: "Garrafa Térmica Fosca", category: "Utilidades", priceInCents: 15900, stock: 0, images: [IMG.cup], description: "Mantém a temperatura por até 12 horas." },
      { name: "Vela Aromática Cedro", category: "Decoração", priceInCents: 6990, stock: 14, images: [], description: "Cera vegetal com notas de cedro e âmbar." },
    ];
    for (const { category, stock, ...p } of products) {
      await prisma.product.create({
        data: {
          ...p,
          slug: slugify(p.name),
          storeId: store.id,
          categories: { connect: { id: categories[category] } },
          variants: { create: { stock } },
        },
      });
    }
  }

  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (email && password) {
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, name: "Lojista Demo", storeId: store.id, passwordHash: await bcrypt.hash(password, 12) },
    });
    console.log(`Lojista de exemplo: ${email}`);
  }

  console.log(`Seed concluído — loja "${store.slug}"`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
