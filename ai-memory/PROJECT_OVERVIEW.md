# Project Overview

> AI development context — not used at runtime.

## What is Petalytix?

Petalytix (petalytix.id) is a portfolio and analytics showcase site built with Next.js 14 App Router and TypeScript.

### Subdomains

- **petalytix.id** — Main marketing/portfolio site
- **ayakasir.petalytix.id** — Landing pages for AyaKasir, an Android POS merchant app

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Pure CSS (`src/app/globals.css`) — no Tailwind |
| Fonts | Oxanium (display), Sora (body) via `next/font` |
| Database | MongoDB (site settings, contact messages) |
| AyaKasir Backend | Supabase |
| Email | Nodemailer (SMTP) |
| Analytics | @vercel/analytics, @vercel/speed-insights |
| Deployment | Vercel |

## Internationalization

- Two locales: `en` (English), `id` (Indonesian)
- Pattern: `[locale]` dynamic route segment + `getCopy(locale)` helper
- Main site copy: `src/lib/content.ts`
- AyaKasir copy: `src/lib/ayakasir-content.ts`

## Subdomain Routing

Middleware (`src/middleware.ts`) intercepts requests:
- `ayakasir.*` hostnames are rewritten to `/ayakasir/[locale]/...`
- Main domain serves from `/[locale]/...`

### App Simulator

- Web-based simulator on ayakasir.petalytix.id mimics the native Android app inside a phone-frame mockup.
- Purely client-side (React state) — no Supabase interaction, no data persistence.
- 4 scenario datasets (restaurant, retail, multi-channel, services) chosen after login.
- Hardcoded credentials: username `ayakasir`, password `cobaduluaja`.
- Files under `src/app/ayakasir/[locale]/simulator/`.
