# Agentic Social Automation Studio

Source code for a Next.js control center that turns Airtable ideas into OpenAI copy + DALL·E visuals and hands them to Make.com for posting.

## Structure

- `web/` – Next.js application ready for Vercel deployment.

## Quickstart

```
cd web
cp .env.example .env.local   # fill with Airtable/OpenAI/Make credentials
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to explore the dashboard.

Deployment:

```
npm run build
vercel deploy --prod --yes --token $VERCEL_TOKEN --name agentic-aaf807ba
curl https://agentic-aaf807ba.vercel.app
```
