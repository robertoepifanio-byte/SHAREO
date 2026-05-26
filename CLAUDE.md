# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repository Is

This is a **project planning and AI agent specification repository** for **ShareO** — a circular economy marketplace for local item rental ("Use Mais. Possua Menos." / "Use More. Own Less."). It is managed as an Obsidian vault.

The repository contains no production code yet. It holds:
- `*_Agente_Shareo.md` — Role-based specifications for AI agents (Architect, Full Stack Dev, Product Owner, Designer, QA, DevOps, SEO, Security Analyst, Project Manager)
- `shareo-prototipo.html` — Interactive UI prototype (single-file, self-contained)
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
- The `fullstack-dev-shareo` agent implements features — always consult `shareo-prototipo.html` first.
- All agents enforce: LGPD compliance, WCAG 2.1 AA, mobile-first (375px base), tap targets ≥ 44×44px.
- No `"use client"` in layout components — only on interactive leaf nodes (performance rule).

## Design System

- **Colors**: Navy `#0D1B2A`, Orange `#F97316`, Green `#22C55E`, Off-white `#F8FAFC`
- **Breakpoints**: 375px (mobile), 768px (tablet), 1280px (desktop)
- **Spacing**: 4px grid (4, 8, 12, 16, 24, 32, 48, 64px)
- **Border radius**: 8px cards, 6px inputs, 50% avatars
- **Font**: Inter, weights 400–800, sizes 12–48px
- **Accessibility**: WCAG 2.1 AA (minimum 4.5:1 contrast ratio)

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

`shareo-prototipo.html` is a standalone HTML/CSS/JS prototype covering the full MVP UI. Open it in a browser to review the intended UX before implementing. Category icons referenced in the prototype live in `icones/`.
