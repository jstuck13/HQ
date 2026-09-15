# HQ

A personal dashboard: welcome cover (index.html) → today.html → Calendar · Finances · Library · School · Health.

Static pages plus two serverless routes on Vercel. State is one JSON document per page, kept in
Neon Postgres (`documents` table) with localStorage as an offline cache. One user, one passcode.

Local: `npm i -g vercel`, `vercel link`, `vercel env pull`, then `vercel dev`.
