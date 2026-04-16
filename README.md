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
   ```bash
   supabase functions deploy submit-post
   supabase functions deploy submit-update
   supabase functions deploy sheet-sync   # optional — syncs to Google Sheets
   ```

### 3. Set up Cloudinary

1. Create a free account at [cloudinary.com](https://cloudinary.com).
2. Create an **unsigned upload preset** in Settings → Upload.
3. Note your cloud name — update `src/cloudinary.ts` with your cloud name.
4. Set `CLOUDINARY_CLOUD_NAME` and `CLOUDINARY_UPLOAD_PRESET` in your Supabase Edge Function secrets.

### 4. Configure environment

```bash
cp .env.example .env
```

Fill in your Supabase project URL and anon key:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

### 5. Run locally

```bash
npm run dev
```

---

## Customizing for your community

| What to change | Where |
|---|---|
| School name and home coordinates | `src/App.tsx` (header text), `src/components/GlobeView.tsx` (`SCHOOL` constant) |
| Globe starting view | `GlobeView.tsx` — `globe.pointOfView(...)` in the init `useEffect` |
| Nav links | `src/App.tsx` — `LIEN_KET` array |
| Field labels / Vietnamese strings | `src/components/SubmitForm.tsx`, `UpdateForm.tsx` |
| Open/close submissions | `src/App.tsx` — `SUBMISSIONS_OPEN` flag |
| Caption word limit | `src/components/SubmitForm.tsx` — `MAX_WORDS` |

---

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

## License

MIT
