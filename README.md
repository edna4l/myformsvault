# myformsvault

Fresh Next.js baseline for a form product with:

- branded homepage
- dashboard
- public shareable forms
- Prisma-backed local database for leads and submissions
- Supabase browser/server client helpers and session proxy wiring

## Local development

1. Install dependencies:

```bash
npm install
```

2. Create the local database:

```bash
npm run db:setup
```

3. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Supabase client setup

The repo now includes:

- `.env.local` for `NEXT_PUBLIC_SUPABASE_URL` and the publishable key
- browser and server helpers in `utils/supabase/`
- `proxy.ts` to refresh Supabase sessions on requests

This is the client/auth wiring only. The app's form data is still using the local SQLite setup for now.

## Data model

- `Lead`: homepage demo / contact requests
- `Form`: reusable public form configuration
- `FormSubmission`: responses captured from public form pages

## Current database choice

This first pass uses Prisma Client with a local SQLite file for speed while we shape the product. Before the first serious Vercel data deployment, switch the datasource to hosted Postgres and move the same models over.

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

Once you like this baseline, make the first meaningful commit and push it to GitHub. Then we can connect Vercel and upgrade the datasource from local SQLite to hosted Postgres.
