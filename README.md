# Petalytix Portfolio

## Changelog

### v1.0.4

- AyaKasir subdomain: New `ayakasir.petalytix.id` with landing page, privacy policy, and account deletion request form.
- Middleware routing: Subdomain detection and rewrite via `middleware.ts`.
- Bilingual pages: All AyaKasir pages support EN/ID locales.
- Responsive forms: Delete account form with properly stacked label+input fields.

### v1.0.3

- Analytics: Vercel Web Analytics enabled via `@vercel/analytics`.

### v1.0.2

- Performance: public pages use ISR with hourly revalidation; portfolio changes trigger immediate refresh.
- Sitemap: `/sitemap.xml` is dynamic with hourly cache and revalidation on portfolio updates.
- Images: responsive `sizes` hints for portfolio cards and galleries.

### v1.0.1

- Initial release.

## Setup

1. Install dependencies:

```
npm install
```

2. Create a `.env.local` file based on `.env.example` and fill in values.

3. Run the dev server:

```
npm run dev
```

## Seed portfolio items

```
npm run seed
```

## Admin

- Login at `/admin` using `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
- Use the `Site settings` tab to update home, about, and contact page content.
- Portfolio detail descriptions preserve line breaks, so new lines in the admin description render as new lines on the public page.

## Environment variables

Core
- `MONGODB_URI`: MongoDB connection string
- `MONGODB_DB`: Optional database name (default: `petalytix`)
- `AUTH_SECRET`: Secret used to sign admin sessions

Admin
- `ADMIN_EMAIL`: Admin login email
- `ADMIN_PASSWORD`: Admin login password

Public
- `NEXT_PUBLIC_SITE_URL`: Base URL for metadata and canonical links

Email (contact form)
- `SMTP_HOST`: SMTP host
- `SMTP_PORT`: SMTP port (number)
- `SMTP_SECURE`: Use TLS (`true` or `false`)
- `SMTP_USER`: SMTP username
- `SMTP_PASS`: SMTP password
- `SMTP_FROM`: From address (defaults to `SMTP_USER` if omitted)
- `CONTACT_TO`: Optional recipient for contact form emails (falls back to `ADMIN_EMAIL` or site settings)

## Deployment (Vercel)

1. Push the repo to GitHub.
2. Create a new project in Vercel and select the repository (framework preset: Next.js).
3. Add the environment variables in Vercel using the keys from `.env.example`.
4. Set `NEXT_PUBLIC_SITE_URL` to your production domain (Vercel domain or custom domain).
5. Deploy.

Optional:
- Run `npm run seed` locally against the production MongoDB to preload portfolio items.
- Enable Web Analytics in the Vercel project settings to start collecting page views.

## Sitemap

- The sitemap is generated at `/sitemap.xml` from `src/app/sitemap.ts`.
- It uses `NEXT_PUBLIC_SITE_URL` as the base domain and includes locale + portfolio detail pages.
- It is cached hourly; portfolio create/update/delete actions revalidate `/sitemap.xml` immediately.

## AyaKasir Subdomain (`ayakasir.petalytix.id`)

### Pages
- **Landing page** (`/en`, `/id`) — AyaKasir app overview with features and Google Play Store link
- **Privacy Policy** (`/en/privacy-policy`, `/id/privacy-policy`) — Google Play Store compliant
- **Delete Account Request** (`/en/delete-account-request`, `/id/delete-account-request`) — Account deletion form

### Implementation
- **Routing:** Middleware-based subdomain detection and rewrite (`middleware.ts`)
- **Structure:** `src/app/ayakasir/[locale]/` with dedicated layout, pages, and actions
- **Content:** `src/lib/ayakasir-content.ts` — all EN/ID copy and privacy policy text
- **Components:** `src/components/ayakasir/` — NavBar, Footer, DeleteAccountForm
- **Email:** Deletion requests sent via existing Nodemailer SMTP config to `CONTACT_TO`
- **Styling:** Responsive design with AyaKasir brand colors (#1D72E9 primary, #37A454 secondary)
