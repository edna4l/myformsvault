# myformsvault

Fresh Next.js baseline for a form product with:

- branded homepage
- dashboard
- public shareable forms
- Prisma-backed PostgreSQL data for leads and submissions
- Supabase browser/server client helpers and session proxy wiring

## Local development

1. Install dependencies:

```bash
npm install
```

2. Add your Supabase connection strings and public key to `.env.local`.

This app expects:

- `DATABASE_URL` for the pooled runtime connection
- `DIRECT_URL` for Prisma CLI schema changes
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. Push the schema to your `myformsvault` schema in Supabase:

```bash
npm run db:setup
```

4. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Supabase client setup

The repo now includes:

- `.env.local` for the Supabase URL, public key, and Postgres connection strings
- browser and server helpers in `utils/supabase/`
- `proxy.ts` to refresh Supabase sessions on requests

Supabase handles the auth/client layer, while Prisma talks to the same Supabase Postgres database for app data.

## Data model

- `Lead`: homepage demo / contact requests
- `Form`: reusable public form configuration
- `FormSubmission`: responses captured from public form pages

## Current database choice

The app now uses Supabase Postgres. Prisma stores the app tables inside a dedicated `myformsvault` database schema so it can share a Supabase project without colliding with tables from your other app.

## Vercel settings

- Framework Preset: `Next.js`
- Root Directory: `.` or blank

## Useful routes

- `/` homepage
- `/dashboard` dashboard overview
- `/dashboard/forms/new` create a new public form
- `/dashboard/forms/[id]` inspect one form and recent submissions
- `/f/[slug]` public form page

## Next step

Keep your Vercel environment variables in sync with `.env.local`, then deploy from GitHub as usual.
