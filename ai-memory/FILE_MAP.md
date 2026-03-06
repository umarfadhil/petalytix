# File Map

> AI development context — not used at runtime.

## Root

```
├── ai-memory/            # AI context files (this folder)
├── repos/                # Git submodules (e.g. ayakasir Android source)
├── src/                  # Application source
├── public/               # Static assets
├── next.config.js        # Next.js configuration
├── tsconfig.json         # TypeScript configuration
├── middleware.ts          # Root middleware (subdomain routing) — NOTE: located in src/
└── package.json
```

## src/ Structure

```
src/
├── app/
│   ├── globals.css                  # All CSS (~1540 lines, no Tailwind)
│   ├── layout.tsx                   # Root layout
│   ├── [locale]/                    # Main site pages (en/id)
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── ayakasir/
│   │   └── [locale]/                # AyaKasir subdomain pages
│   │       ├── layout.tsx
│   │       ├── page.tsx             # Landing page (includes simulator CTA)
│   │       ├── privacy-policy/
│   │       ├── delete-account-request/
│   │       └── simulator/           # Simulator route
│   │           ├── page.tsx         # Server entry point
│   │           ├── SimulatorShell.tsx  # Client wrapper
│   │           └── simulator.css    # All .sim-* scoped CSS
│   └── actions/
│       └── contact.ts               # Contact form server action
├── lib/
│   ├── content.ts                   # Main site i18n copy (EN/ID)
│   ├── ayakasir-content.ts          # AyaKasir i18n copy (EN/ID) + simulator CTA copy
│   ├── site-settings.ts             # MongoDB-backed dynamic settings
│   └── privacy-policy.ts            # Petalytix privacy policy content
├── middleware.ts                     # Subdomain routing middleware
└── components/
    ├── ayakasir/
    │   ├── NavBar.tsx               # AyaKasir nav
    │   ├── Footer.tsx               # AyaKasir footer
    │   ├── DeleteAccountForm.tsx    # Delete account form
    │   └── simulator/               # Simulator components (25 files)
    │       ├── types.ts             # All TS interfaces & state types
    │       ├── constants.ts         # Credentials, formatRupiah, genId
    │       ├── i18n.ts              # Simulator-specific EN/ID copy
    │       ├── context.tsx          # SimulatorProvider + useSimulator
    │       ├── reducer.ts           # All state transitions
    │       ├── PhoneFrame.tsx       # CSS phone mockup wrapper
    │       ├── data/
    │       │   ├── index.ts         # Scenario map
    │       │   ├── restaurant.ts    # Warung Soto Pak Joko
    │       │   ├── retail.ts        # Toko Makmur Jaya
    │       │   ├── multichannel.ts  # Kopi Nusantara
    │       │   └── services.ts      # Barbershop Keren
    │       ├── screens/
    │       │   ├── LoginScreen.tsx
    │       │   ├── ScenarioPickerScreen.tsx
    │       │   ├── PosScreen.tsx
    │       │   ├── DashboardScreen.tsx
    │       │   ├── ProductsScreen.tsx
    │       │   ├── InventoryScreen.tsx
    │       │   └── SettingsScreen.tsx
    │       └── shared/
    │           ├── NavRail.tsx
    │           ├── TopBar.tsx
    │           ├── ReceiptDialog.tsx
    │           └── ConfirmDialog.tsx
    └── ...                          # Main site components
```

## Key Entry Points

| Path | Purpose |
|------|---------|
| `src/middleware.ts` | Subdomain detection and rewriting |
| `src/app/[locale]/page.tsx` | Main site homepage |
| `src/app/ayakasir/[locale]/page.tsx` | AyaKasir landing page |
| `src/app/ayakasir/[locale]/simulator/page.tsx` | App simulator |
| `src/app/actions/contact.ts` | Contact form server action |
| `src/app/ayakasir/actions/delete-account.ts` | Account deletion server action |
