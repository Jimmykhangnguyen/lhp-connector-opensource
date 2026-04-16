# Alumni Network Connector

A full-stack web app for alumni communities to map where members live, share updates, and stay connected. Built for the Pétrus Ký – Lê Hồng Phong alumni network, but designed to be forked and adapted for any school or community.

**Live example:** [lhp-network.vercel.app](https://lhp-network.vercel.app)

---

## What it does

- **Interactive 3D globe** — visualizes where alumni live with animated connection arcs from the home school. Supports zoom-based clustering, a density/city mode, and click-to-focus on individual profiles.
- **Gallery** — filterable grid of alumni cards (by class, graduation year, city, country) synchronized with the globe.
- **Submit form** — lets alumni add themselves with name, class, graduation year, location (via OpenStreetMap autocomplete), photo, caption, and social links.
- **Update form** — lets existing members update their location, caption, photo, or socials without re-submitting.

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Database | Supabase (Postgres + Edge Functions) |
| Images | Cloudinary (upload + thumbnail transforms) |
| Globe | [react-globe.gl](https://github.com/vasturiano/react-globe.gl) + Supercluster |
| Location search | Nominatim (OpenStreetMap) — no API key needed |
| Deployment | Vercel |

---

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/your-username/alumni-network-connector
cd alumni-network-connector
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run `supabase_setup.sql` to create the `posts` table and RLS policies.
3. Deploy the Edge Functions:

   If you have the Supabase CLI installed (`brew install supabase/tap/supabase`):
   ```bash
   supabase login
   supabase link --project-ref your-project-id
   supabase functions deploy submit-post
   supabase functions deploy submit-update
   supabase functions deploy sheet-sync   # optional — syncs to Google Sheets
   ```

   Or without installing anything, use `npx`:
   ```bash
   npx supabase login
   npx supabase link --project-ref your-project-id
   npx supabase functions deploy submit-post
   npx supabase functions deploy submit-update
   npx supabase functions deploy sheet-sync   # optional
   ```

   Your project ID is in the Supabase dashboard under **Project Settings → General**.

### 3. Set up Cloudinary

1. Create a free account at [cloudinary.com](https://cloudinary.com).
2. Create an **unsigned upload preset** in Settings → Upload.
3. Note your cloud name — update `src/cloudinary.ts` with your cloud name.
4. Set the following in **Supabase Dashboard → Project Settings → Edge Functions → Secrets**:
   - `CLOUDINARY_CLOUD_NAME` — your cloud name
   - `CLOUDINARY_API_KEY` — from Cloudinary dashboard
   - `CLOUDINARY_API_SECRET` — from Cloudinary dashboard
   - `DEFAULT_IMAGE_URL` — a fallback Cloudinary image URL used when a member submits without a photo

### 4. Set up Upstash Redis (rate limiting)

The submission forms are rate-limited via [Upstash](https://upstash.com) Redis. Without this configured, the Edge Functions will reject all requests.

1. Create a free account at [upstash.com](https://upstash.com).
2. Create a new Redis database.
3. Add the following to **Supabase Dashboard → Project Settings → Edge Functions → Secrets**:
   - `UPSTASH_REDIS_REST_URL` — from the Upstash database page
   - `UPSTASH_REDIS_REST_TOKEN` — from the Upstash database page

### 5. Configure environment

```bash
cp .env.example .env
```

Fill in your Supabase project URL and anon key:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

### 6. Run locally

```bash
npm run dev
```

## Project structure

```
src/
  App.tsx                    # Root: routing, data fetching, nav
  types.ts                   # TypeScript interfaces (Post, Filters, etc.)
  supabase.ts                # Supabase client
  cloudinary.ts              # Image thumbnail URL helper
  social.ts                  # Social URL validation, word count
  components/
    Gallery.tsx              # Globe + filter bar + paginated card grid
    GlobeView.tsx            # 3D globe with arcs, clusters, density mode
    FilterBar.tsx            # Multi-select filters (class, year, city, country)
    PostCard.tsx             # Individual alumni card
    SubmitForm.tsx           # New member submission form
    UpdateForm.tsx           # Existing member update form
    LocationAutocomplete.tsx # OSM Nominatim location search
    SocialInputs.tsx         # LinkedIn / Facebook / Instagram inputs
    SocialLinks.tsx          # Social icon link renderer
supabase/
  functions/
    submit-post/             # Edge function: validates + stores new submissions
    submit-update/           # Edge function: handles profile updates
    sheet-sync/              # Edge function: mirrors posts to Google Sheets
supabase_setup.sql           # Run once in Supabase SQL editor
```

---

## Deployment

The frontend deploys to Vercel with zero config — connect the repo and add your `.env` variables in the Vercel dashboard. Edge Functions run on Supabase's infrastructure.

---

## Contributing

Contributions are welcome! If you've adapted this for your own community and built something useful, feel free to open a PR.

- **Bug fixes and improvements** — open a PR against `master`
- **New features** — open an issue first to discuss before building
- **Questions** — use GitHub Discussions or open an issue

Please keep PRs focused — one change per PR makes review much easier.

---

## License

MIT
