# Web App

This is the Next.js application for Sprint Wrap-Up Buddy.

## Commands

Run these from the repo root:

```bash
npm run dev
npm run lint
npm run build
```

## GitHub Auth Setup

Copy the root `.env.example` to `.env.local` and fill in the GitHub OAuth
values.

For local development, set the GitHub OAuth app callback URL to:

```text
http://localhost:3000/api/auth/callback/github
```

## Scope

- chat-first product surface
- source connection flows
- evidence timeline UI
- artifact preview and export
