# Aria AgentWorks — Workspace

## Overview

pnpm workspace monorepo using TypeScript. Two products:
1. **Intent Engine** — Lead generation tool that scrapes multiple platforms for buying-intent signals, scores them with configurable keywords, and generates outreach responses.
2. **Voice Agent** — Enterprise AI voice agent for medical/dental/business front desks. Twilio telephony + GPT-5-mini intelligence + OpenAI TTS.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec → `lib/api-spec/openapi.yaml`)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + wouter + TanStack Query + shadcn/ui

## Artifacts

| Path | Kind | Description |
|------|------|-------------|
| `artifacts/api-server` | api | Express 5 REST API, port 8080, path `/api` |
| `artifacts/intent-engine` | web | Intent Engine React+Vite frontend, path `/` |
| `artifacts/voice-agent` | web | Voice Agent React+Vite frontend, path `/voice-agent` |

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec (run after any spec change)
- `pnpm --filter @workspace/db run push-force` — push DB schema changes (dev)
- `pnpm --filter @workspace/api-server run build` — build API server

## Database Schema

Tables in `lib/db/src/schema/`:

### Intent Engine
- `saved_leads` — bookmarked leads with `status` (new/contacted/following_up/closed)
- `keywords` — intent keywords with phrase, score (1-10), category, enabled flag

### Voice Agent
- `voice_configs` — single-row business configuration (name, type, greeting, instructions, hours, services, voice, Twilio credentials)
- `voice_calls` — call log with SID, direction, status, duration, outcome, summary
- `voice_messages` — per-call transcript messages (role: user|assistant, content, audioReady flag)

## Voice Agent Architecture

**Call flow**: Twilio inbound → `POST /api/voice/inbound` → greeting → `<Gather>` STT → `POST /api/voice/gather` → GPT-5-mini → OpenAI TTS → `<Play>` audio URL → loop

**Key routes** (`artifacts/api-server/src/routes/voice/`):
- `config.ts` — GET/PUT `/voice/config` (business settings, masks auth token)
- `twilio.ts` — POST `/voice/inbound`, `/voice/gather`, `/voice/outbound-twiml`, `/voice/status`
- `calls.ts` — GET `/voice/calls/stats`, `/voice/calls`, `/voice/calls/:id`, `/voice/tts/:messageId`, POST `/voice/outbound`
- `gpt.ts` — `generateVoiceResponse()` with business context injection

**TTS endpoint**: `GET /api/voice/tts/:messageId` — fetches message, calls OpenAI TTS, returns MP3 for Twilio `<Play>`

**Business templates**: medical, dental, legal, restaurant, salon, general — each has preset greeting and instructions

## Important Patterns

- **Route registration order matters** — specific routes (`/voice/calls/stats`) before parameterized ones (`/voice/calls/:id`)
- **Codegen naming** — request body schemas use `CreateXInput` naming in OpenAPI; Orval generates mutation body Zod schema as `CreateXBody`
- **Scorer cache** — `lib/scorer.ts` caches active keywords for 60s; call `invalidateScorerCache()` after keyword changes
- **Lead cache** — `routes/leads.ts` caches all-source results for 5 min; `POST /leads/refresh` force-invalidates
- **Twilio auth token** — always masked as `••••••••` in API responses; only updated when a new non-masked value is submitted
- **Webhook URL** — dynamically computed from request headers: `${proto}://${host}/api/voice/inbound`

## Voice Agent Setup (for users)

1. Go to **Configure** — pick business type template, fill in name, greeting, instructions
2. Go to **Settings** — enter Twilio Account SID, Auth Token, phone number, enable agent
3. Copy the Webhook URL from Settings → paste into Twilio console as the phone number's Voice webhook (HTTP POST)
4. Use **Outbound** to place outbound AI calls

## Lead Sources (Intent Engine)

| Source | File | Status | Notes |
|--------|------|--------|-------|
| Reddit | `lib/sources/../reddit.ts` | Active (fallback to examples when 403) | Searches r/entrepreneur, r/startups, etc. |
| Hacker News | `lib/sources/hacker-news.ts` | Active (live via Algolia API) | No auth required |
| X / Twitter | `lib/sources/twitter.ts` | Inactive until `TWITTER_BEARER_TOKEN` env var is set | Twitter API v2 |
