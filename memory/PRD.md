# PRD — Vitrine Commerce (white-label e-commerce MVP)

## Problem statement (original, PT-BR)
Build an MVP of a generic, white-label e-commerce platform with Next.js (App Router), Tailwind, Prisma and PostgreSQL, split into two apps (monorepo): a Storefront (product showcase with filters, a client-side cart using Zustand, Stripe Checkout Sessions) and an Admin dashboard (protected routes; product CRUD, orders, store visual settings). It also needs a secure Stripe webhook for checkout.session.completed that sets the order to "Pago", plus docker-compose (Postgres + both apps) and an .env.example with DATABASE_URL, STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET. Server Actions and TypeScript throughout.

## User choices
- Delivery: full Next.js code to run in the user's own Docker (no Emergent live preview)
- Admin login: email + password
- Multiple stores per installation
- Currency: BRL

## Architecture
- /app/ecommerce: Turborepo (yarn workspaces)
  - packages/db: Prisma schema (Store, User, Product, Order, OrderItem, OrderStatus enum), client singleton, pure utils (`@repo/db/utils`), seed
  - apps/storefront (port 3000): /, /[store], /[store]/products/[id], /[store]/cart, /[store]/checkout/success|cancel, /api/webhooks/stripe; Server Action createCheckoutSession
  - apps/admin (port 3001): /login, /register, overview, /products CRUD, /orders (+detail), /settings; bcrypt + jose JWT cookie + middleware
  - Dockerfile (ARG APP), docker-compose (postgres, migrate, storefront, admin, optional stripe-cli profile)

## Implemented (2026-06)
- All of the above; typecheck and `next build` pass for both apps
- Smoke-tested against a real local Postgres: seed, filters (category/stock/search/price/sort), signed webhook → PAID + one-time stock decrement (idempotent), invalid signature → 400, admin login, product create, settings change reflected in storefront, cart + checkout error handling
- NOT tested: a real Stripe Checkout redirect (needs the user's STRIPE_SECRET_KEY)

## Backlog
- P1: versioned Prisma migrations; image upload to object storage; order fulfilment statuses (shipped/delivered)
- P2: subdomain/custom-domain store routing; customer order-confirmation email; Redis-backed login rate limit; shipping options in Checkout
