## Agentic Social Automation Studio

Build, regenerate, approve, and schedule AI-driven social content with Airtable as the single source of truth, OpenAI for copy + creative, and Make.com for posts.

### 1. Environment

- Duplicate `.env.example` into `.env.local`.
- Populate it with valid credentials:
  - Airtable Personal Access Token, Base ID, content table name, and optional custom field keys.
  - OpenAI API key plus optional model overrides.
  - Make.com webhook URL if you want publish callbacks to trigger a scenario.

### 2. Install & Run

```bash
npm install
npm run dev
```

Navigate to [http://localhost:3000](http://localhost:3000) for the live dashboard.

### 3. Core Workflow

- Capture ideas: enter campaign hooks, notes, tone, and platform focus.
- Generate: click **Generate Assets** to create Instagram + Facebook copy and a square DALL·E visual. Regenerate copy or visuals independently at any time.
- Approve: flip the approval toggle to track sign-off and unlock scheduling.
- Schedule: pick a timestamp, push to Make.com, and respect per-platform frequency caps sourced from Airtable.
- Post: the Make.com scenario can call back into `POST /api/ideas/:id/mark-posted` to finalize status after publishing.

### 4. Airtable Contract

The app expects a table with (at minimum) the fields defined in `.env.example`. Customize labels via the corresponding `AIRTABLE_FIELD_*` environment variables. Multi-select `Platforms` should contain values `Instagram` and/or `Facebook`.

### 5. API Surfaces

- `POST /api/ideas` – create a new Airtable record.
- `POST /api/ideas/:id/generate` – produce copy + image and sync to Airtable.
- `POST /api/ideas/:id/regenerate-text` & `/regenerate-image` – selective refreshes.
- `POST /api/ideas/:id/approve` – toggle approval state.
- `POST /api/ideas/:id/publish` – validate frequency limits, schedule, and call Make.com.
- `POST /api/ideas/:id/mark-posted` – mark as published once Make.com succeeds.

These endpoints power the client dashboard and are ready for external automations (Make.com webhooks, cron, etc.).

### 6. Deployment

```
npm run build
vercel deploy --prod --yes --token $VERCEL_TOKEN --name agentic-aaf807ba
```

After deployment, curl the production URL to confirm hydration:

```
curl https://agentic-aaf807ba.vercel.app
```
