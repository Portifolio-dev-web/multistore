import { cache } from "react";
import { prisma } from "@repo/db";

export const getStoreBySlug = cache((slug: string) => prisma.store.findUnique({ where: { slug } }));
