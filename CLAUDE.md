# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repository Is

This is a **project planning and AI agent specification repository** for **ShareO** — a circular economy marketplace for local item rental ("Use Mais. Possua Menos." / "Use More. Own Less."). It is managed as an Obsidian vault.

The repository contains no production code yet. It holds:
- `*_Agente_Shareo.md` — Role-based specifications for AI agents (Architect, Full Stack Dev, Product Owner, Designer, QA, DevOps, SEO, Security Analyst, Project Manager)
- `shareo-prototipo-v2.html` — **Active UI prototype** (since 2026-05-29, single-file, self-contained; tipografia dual Inter/Montserrat + Leaflet map, 11 telas completas)
- `shareo-prototipo.html` — Legacy prototype (superseded by v2)
- `icones/` — SVG category icons used in the prototype

## Planned Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS |
| State/Cache | React Query (TanStack Query) |
| Backend | Next.js API Routes, Prisma ORM |
| Database | PostgreSQL via Supabase |
| Auth | NextAuth.js or JWT with rotating refresh tokens |
| Real-time (chat) | Supabase Realtime |
| Maps | Google Maps API or Mapbox |
| Hosting | Vercel (with preview deploys per PR) |
| Testing | Jest + React Testing Library (unit/integration), Playwright (E2E) |

## Architecture Decisions (from agent docs)

**Rendering strategy by page type:**
- **SSG**: Landing page, institutional pages
- **SSR**: Item listings with geo-filters
- **ISR**: Category pages and popular listings
- **CSR**: User dashboard, favorites, in-app chat

**Three-environment setup**: `development` (local + `.env.local`), `staging` (Supabase isolated instance), `production` (manual/approval-gated deploy via Vercel).

**Database**: Always use Prisma migrations — never manual schema changes in production. Migrations must be reviewed by the Architect before applying to staging.

**API domains**: Auth, Items, Bookings, Users, Chat, Admin — all with server-side Zod validation. Sensitive fields (CPF, CNPJ, documents) must never appear in logs or unnecessary API responses.

**Security**: Row Level Security (RLS) in Supabase, rate limiting on auth/document-validation endpoints, LGPD compliance (explicit consent, minimal data, account deletion).

## Architecture Decision Records (ADRs)

All ADRs live in **`docs/adr/`** (kebab-case filenames). The legacy `ADRs/` root folder has been consolidated. Current ADRs:

| # | File | Decision |
|---|---|---|
| 001 | `ADR-001-autenticacao.md` | Auth — NextAuth.js v5 |
| 002 | `ADR-002-mapas.md` | Maps — Mapbox + PostGIS |
| 003 | `ADR-003-chat.md` | Chat — Supabase Realtime |
| 004 | `ADR-004-paleta-cores-definitiva.md` | Design system — paleta oficial (navy #003366 + verde #007B3C) |
| 005 | `ADR-005-criptografia-documentos.md` | CPF/CNPJ encryption |
| 006 | `ADR-006-estrutura-pastas.md` | Folder structure |
| 007 | `ADR-007-rendering-strategy.md` | SSG/SSR/ISR/CSR per page type |
| 008 | `ADR-008-state-management.md` | State — React Query |
| 009 | `ADR-009-rls-nextauth.md` | RLS + NextAuth integration |
| 010 | `ADR-010-upload-imagens.md` | Image upload — Supabase Storage |
| 011 | `ADR-011-tipografia-dual.md` | Tipografia dual — Inter (UI) + Montserrat (branding) |

## Subagents System

The `.claude/Agents/` directory contains 9 Claude Code subagents. Each file has YAML frontmatter (`name`, `description`, `model`, `tools`) that enables automatic invocation. The legacy `*_Agente_Shareo.md` files (PascalCase) are kept as reference — the active subagents are the kebab-case files.

| Subagent file | Role | Model |
|---|---|---|
| `arquiteto-shareo.md` | Architecture decisions, ADRs, rendering strategy | Opus |
| `fullstack-dev-shareo.md` | Feature implementation, API routes, Tailwind, Supabase | Sonnet |
| `designer-shareo.md` | Design system, Tailwind handoff, WCAG specs | Sonnet |
| `devops-shareo.md` | CI/CD, Vercel, monitoring, infrastructure | Sonnet |
| `qa-shareo.md` | Tests (Jest/Playwright/jest-axe), bug reports, Lighthouse | Sonnet |
| `seguranca-shareo.md` | OWASP, LGPD, JWT, RLS, PCI-DSS | Opus |
| `product-owner-shareo.md` | User stories, backlog, roadmap, acceptance criteria | Sonnet |
| `gestor-projeto-shareo.md` | Sprint management, status reports, risk tracking | Sonnet |
| `seo-shareo.md` | Metadata API, JSON-LD, Core Web Vitals, Mobile-First SEO | Sonnet |

**Invocation rules:**
- The `arquiteto-shareo` agent is the authority on structural decisions.
- The `fullstack-dev-shareo` agent implements features — always consult `shareo-prototipo-v2.html` first.
- All agents enforce: LGPD compliance, WCAG 2.1 AA, mobile-first (375px base), tap targets ≥ 44×44px.
- No `"use client"` in layout components — only on interactive leaf nodes (performance rule).

## Design System

- **Colors** (paleta oficial DID v1.0):
  - Navy `#003366` — header, títulos, fundo escuro
  - Verde Escuro `#007B3C` — botões CTA, destaques, ação
  - Verde Claro `#59C686` — badges, ícones, fundos decorativos (**nunca** com texto branco — contraste 2.07:1)
  - Azul Médio `#144D81` — textos e seções intermediárias
  - Branco `#FFFFFF` — fundo e texto sobre escuro
  - Erro `#E74C3C` — feedback de erro
- **Breakpoints**: 375px (mobile), 768px (tablet), 1280px (desktop)
- **Spacing**: 4px grid (4, 8, 12, 16, 24, 32, 48, 64px)
- **Border radius**: 12px cards (`--radius`), 8px inputs, 50% avatars
- **Font (UI)**: Inter, weights 400–700 — corpo de texto, labels, botões, formulários, menus, navegação
- **Font (Branding)**: Montserrat, weights 600–800 — h1–h6, títulos de seção, logo, hero
- **Fallback**: Arial, sans-serif
- **Tailwind config**: `fontFamily.sans = ['Inter']` / `fontFamily.display = ['Montserrat']`
- **Accessibility**: WCAG 2.1 AA (contraste mínimo 4.5:1 — verificar sempre #59C686 sobre branco)

## Quality Targets (for when code is written)

- Minimum 70% test coverage on domain modules (auth, items, bookings, users)
- Core Web Vitals: LCP < 2.5s, CLS < 0.1, INP < 200ms
- CI pipeline must complete in under 10 minutes
- Uptime target: 99.9%

## Roadmap Phases

- **H1 (MVP)**: Auth/profile (CPF/CNPJ), geo-search, item listing, in-app chat, ratings, favorites, admin dashboard
- **H2 (Growth)**: Insurance integration, PJ Premium subscription + analytics, personalized storefronts
- **H3 (Scale)**: In-app payments (Stripe/Pagar.me), PJ inventory sync, React Native mobile app

## Prototype

`shareo-prototipo-v2.html` is the **active** standalone HTML/CSS/JS prototype covering the full MVP UI (adopted 2026-05-29). Open it in a browser to review the intended UX before implementing. Category icons referenced in the prototype live in `icones/`.

`shareo-prototipo.html` is the legacy prototype — kept for historical reference only.
