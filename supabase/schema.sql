-- ─────────────────────────────────────────────────────────────────────────────
-- Is This Clause Normal? — Supabase schema
--
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query → Run).
-- Safe to re-run: every CREATE uses IF NOT EXISTS and policies are dropped
-- before recreation.
--
-- Slice B owns the `scans` table. Slice C will add `byok_keys`.
-- ─────────────────────────────────────────────────────────────────────────────

-- scans: one row per successful contract analysis. Used for:
--   • Signed-in quota counting (SELECT count(*) WHERE user_id = auth.uid())
--   • Server-side history (later — replaces localStorage)
create table if not exists public.scans (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  created_at      timestamptz not null default now(),

  -- Provider used for the scan (anthropic | openai | google | ollama)
  provider        text not null,
  model           text not null,

  -- Headline result fields (for history listing without loading the blob)
  overall_risk    text,
  risk_score      smallint,
  contract_type   text,
  jurisdiction    text,

  -- A short snippet of the contract text for the history row preview
  contract_snippet text,

  -- The full structured AnalysisResult — keeps history self-contained
  result_json     jsonb not null,

  -- True when the scan used the user's BYOK key (doesn't count against quota)
  byok            boolean not null default false
);

create index if not exists scans_user_created_idx on public.scans (user_id, created_at desc);

alter table public.scans enable row level security;

drop policy if exists "scans: read own" on public.scans;
create policy "scans: read own"
  on public.scans for select
  using (auth.uid() = user_id);

drop policy if exists "scans: insert own" on public.scans;
create policy "scans: insert own"
  on public.scans for insert
  with check (auth.uid() = user_id);

drop policy if exists "scans: delete own" on public.scans;
create policy "scans: delete own"
  on public.scans for delete
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Slice D: byok_keys — per-user encrypted API keys for each provider.
--
-- Encryption happens server-side (lib/byok-crypto.ts, AES-256-GCM) using
-- BYOK_ENCRYPTION_KEY from .env.local. The blob stored here is
--    iv_hex:ciphertext_hex:auth_tag_hex
-- and the DB never sees the plaintext key.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.byok_keys (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  -- Ollama is local (no API key needed) — excluded from BYOK.
  provider        text not null check (provider in ('anthropic','openai','google')),

  -- Encrypted "iv:ct:tag" blob — see lib/byok-crypto.ts
  encrypted_key   text not null,

  -- Last-4 preview shown in the UI (e.g. "••••AbCd"). Safe to return to client.
  key_preview     text not null,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (user_id, provider)
);

create index if not exists byok_keys_user_idx on public.byok_keys (user_id);

alter table public.byok_keys enable row level security;

drop policy if exists "byok: read own"   on public.byok_keys;
create policy "byok: read own"
  on public.byok_keys for select
  using (auth.uid() = user_id);

drop policy if exists "byok: insert own" on public.byok_keys;
create policy "byok: insert own"
  on public.byok_keys for insert
  with check (auth.uid() = user_id);

drop policy if exists "byok: update own" on public.byok_keys;
create policy "byok: update own"
  on public.byok_keys for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "byok: delete own" on public.byok_keys;
create policy "byok: delete own"
  on public.byok_keys for delete
  using (auth.uid() = user_id);
