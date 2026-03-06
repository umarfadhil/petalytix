# Code Rules

> AI development context — not used at runtime.

## Styling

- **No Tailwind.** All styles live in `src/app/globals.css` using plain CSS.
- CSS class conventions: `.section`, `.reveal`, `.page-top`, `.eyebrow`, `.title`, `.subtitle`, `.feature-card`, `.button.primary`, `.button.ghost`, `.legal`, `.legal-section`, `.contact-form`, `.form-success`, `.form-error`
- Animations: `.reveal` (fadeIn + translateY), delay classes `.delay-1` through `.delay-4`

## Internationalization

- Always use the `getCopy(locale)` pattern — never hardcode user-facing strings.
- Locale is extracted from the `[locale]` route segment.
- Two locales only: `en` and `id`.

## Server Actions

- Use `useFormState` + `useFormStatus` pattern for form handling.
- Server actions live in `actions/` directories co-located with their route.

## Environment Variables

- SMTP config: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- Recipients: `CONTACT_TO`, `ADMIN_EMAIL`
- Never commit `.env` files.

## AyaKasir Brand

- Primary blue: `#1D72E9`
- Secondary green: `#37A454`
- Logo text uses a CSS gradient of these two colors.

## General

- Prefer editing existing files over creating new ones.
- Keep responses and code concise — no unnecessary abstractions.
- Commit messages: descriptive, with `Co-Authored-By` footer when AI-assisted.
