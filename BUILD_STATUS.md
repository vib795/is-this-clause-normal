# Build status

Branch: `feature/apple-redesign` · last updated 2026-05-17 (post-scan i18n + full Sarvam coverage shipped)

Public-launch work split into named slices. Each slice was designed to land independently and be testable on its own.

## ✅ Shipped

### Apple-style UI redesign (pre-quota work)
- Tailwind v4 token system (Apple-inspired): bg/elevated/glass surfaces, severity colors, shadows, ease curves; theme-aware via CSS vars + `prefers-color-scheme`
- Inter + JetBrains Mono via `next/font/google`, wired through `app/layout.tsx`
- Landing: `Hero`, `HeroContractDemo`, `CoverageSection`, `CounterSection`, `ProvidersSection`, `HistoryPanel`
- Scan flow: `ContractInput` (tabs + dropdowns + drop zone), `AnalyzingState` (real progress, see streaming below)
- Results: `AnalysisResults` + `FindingCard` + `CounterAgreementSection`
- `Reveal` component for scroll-triggered fades (IntersectionObserver, respects `prefers-reduced-motion`)
- Site chrome: `SiteHeader` (sticky, hairline-on-scroll), `SiteFooter` (4-col + disclaimer)

### Streaming progress (replaces fake checklist)
- `/api/analyze` converted from `generateText` → `streamText` with SSE
- Event types: `phase`, `progress` (current category from live buffer regex), `section` (findings → missing transition), `tick` (debounced finding/missing counts), `result`, `error`
- `AnalyzingState` rebuilt with three layers of motion: indeterminate barber-pole bar, spinner on active category, live counter chip, adaptive heading
- Honest progress — categories tick green based on what the model actually wrote, not a timer

### Slice A — Anonymous quota
- `lib/quota.ts`: `ANON_FREE_SCANS = 1`, cookie counter `clause_anon_quota` (HttpOnly, 30 days)
- `GET /api/quota` returns current state (`{remaining, total, used, exhausted, signedIn, byok, byok_providers}`)
- `/api/analyze` returns 402 when exhausted, bumps cookie on stream-start success
- `lib/useQuota.ts` hook; `components/site/SiteHeader.tsx` shows colored pill
- `components/scan/QuotaLockout.tsx` replaces ContractInput when locked

### Slice B — Supabase auth + signed-in quota
- `lib/supabase/{client,server,middleware}.ts` — canonical SSR trio
- `proxy.ts` (Next 16 renamed `middleware.ts` → `proxy.ts`) — session refresh on every request
- `app/api/auth/callback/route.ts` — magic-link + OAuth code exchange
- `app/api/auth/signout/route.ts`
- `lib/useAuth.ts` hook
- `components/auth/SignInModal.tsx` — magic link working; Google/GitHub buttons wired
- `supabase/schema.sql` — `scans` table + RLS policies (read/insert/delete own)
- `/api/quota` + `/api/analyze` now branch: signed-in counts scan rows; anon falls back to cookie
- `SIGNED_FREE_SCANS = 2` (2 free scans per signed-in account on top of the 1 anon)
- Scan rows inserted on success for signed-in users (drives quota counting + future DB history)
- `AccountMenu` in header (avatar pill + dropdown with sign out)

### Slice C — OAuth provider wiring
- `signInWithOAuth('google' | 'github')` wired in `SignInModal`
- `/?auth_error=1` callback path → surfaced once in `app/page.tsx` then stripped from URL
- **Provider setup is the user's responsibility:** OAuth client creation in Google Cloud / GitHub + paste creds into Supabase Auth → Providers

### Slice D — BYOK keys + settings page
- `lib/byok-crypto.ts` — AES-256-GCM, per-key random IV, `iv:ct:tag` hex blob
- `BYOK_ENCRYPTION_KEY` env var (32 bytes hex; generated once, rotation breaks all stored keys)
- `byok_keys` table + RLS in `supabase/schema.sql` (re-run safe)
- `app/api/byok/keys/route.ts` — GET (preview only) / POST (upsert encrypt) / DELETE (per provider)
- `lib/providers.ts` `getModel(id, model, apiKeyOverride?)` — BYOK key replaces operator's
- `/api/analyze` looks up BYOK for selected provider → uses it + marks scan `byok=true` → bypasses quota
- `/api/quota` returns `byok_providers: string[]` so UI shows "BYOK active" vs "Limit reached"
- `app/settings/page.tsx` + `components/settings/ByokKeyManager.tsx` — per-provider cards with masked input, show/hide, save/remove
- Settings link in `AccountMenu`; `QuotaLockout`'s BYOK CTA navigates to `/settings`

### Slice E — i18n / 16-locale UI (now full surface coverage)
- `next-intl` installed; cookie+header detection (no URL routing)
- `lib/i18n/config.ts` — 16 supported locales:
  - 5 non-Indic: en (default), es, fr, de, pt
  - 11 Indic via Sarvam: hi, bn, ta, te, kn, ml, mr, gu, pa, or, as
  - Urdu intentionally excluded (RTL deferred)
- `lib/i18n/request.ts` — server config; falls back to en.json if locale file unloadable
- `proxy.ts` extended — reads `clause_locale` cookie (preferred) or Accept-Language; persists choice
- `components/i18n/LanguagePicker.tsx` — globe dropdown with native + English names
- All 16 locales have a real JSON file in `messages/` — 5 hand-translated (es/fr/de/pt/hi) for the first ~145 keys, +128 post-scan keys auto-translated and deep-merged on top
- ~272 keys covering full app surface: header, footer, hero, scan input, analyzing state, quota lockout, auth modal, errors, coverage section, counter section, providers section, **plus** results chrome (RiskHero, CountCell, recommendation), FindingCard (severity/category/negotiability + section labels + copy CTA), MissingClauseCard, HistoryPanel (locale-aware date), CounterAgreement section, CounterFallback, Settings page, ByokKeyManager (per-provider help text + all state messages)
- `scripts/translate-ui.ts` — smart merge: missing-key delta for real translations, full translation for stubs/new locales. Canonical JSON detection. 32K maxOutputTokens for Indic scripts. `--force` for full overwrite.
- `npm run translate-ui` — auto-detects what each locale needs and only sends new keys to Claude

### Sarvam — full finding/missing translation
- `lib/sarvam.ts` got `translateBatch(strings, lang, concurrency=8)` — bounded parallel translation with per-item English fallback on failure
- `/api/analyze` now translates: `summary`, `recommendation`, every finding's `title` + `why_risky` + `industry_standard` + `suggested_fix`, every missing clause's `title` + `why_important` + `suggested_language`
- `clause_text` intentionally not translated (verbatim from user's source contract)
- One bad Sarvam call no longer kills the whole result; that field just stays English

## 🟡 Partially done / known gaps in shipped work

- ~~Post-scan UI not translated~~ — **shipped** 2026-05-17
- ~~Sarvam coverage is partial~~ — **shipped** 2026-05-17 (now translates every model-generated field)
- **LLM-output language coupling not wired**: picking Spanish UI doesn't automatically tell the LLM to respond in Spanish. User would have to add `es/fr/de/pt` to ContractInput's language picker and update the analyze prompt to instruct "respond in {language}". ~30 minutes of work.
- **Magic-link email throttle**: Supabase default SMTP (~3/hr). Need real SMTP (Resend, Postmark) for any meaningful traffic.
- **Pre-stream error charges anon**: if analyze starts streaming then errors mid-flight, the anon cookie was already bumped. Acceptable for the cookie-counter model; fixable with a separate `/api/quota/refund` endpoint or by moving anon counting to Upstash (Slice G).
- **BYOK key rotation = irrecoverable**: rotating `BYOK_ENCRYPTION_KEY` makes every stored key undecryptable. No migration path. Document this in ops runbook before going public.
- **Hand-quality review of 15 auto-translations**: Claude translations are good but not native. Worth a pass from a native speaker per locale before public launch — especially legal-adjacent phrasing.

## 🔴 Pending slices

### Slice F — Stripe pay-per-scan credits
- Stripe account + Products setup (your side)
- `stripe_customers` + `credit_ledger` tables + RLS
- Stripe Checkout sessions for credit purchases
- Webhook handler for `checkout.session.completed` + `payment_intent.succeeded`
- Credit balance check in `/api/analyze` (signed-in + no BYOK + quota exhausted → consume 1 credit, fail if zero)
- "Buy credits" CTA in `QuotaLockout` (alternative to BYOK)
- Credit balance chip in header / `/settings`
- Tax handling (Stripe Tax for compliance)

### Slice G — Polish + abuse mitigation
- **Upstash Redis** for anon IP rate-limit (prevents cookie-clearing reset abuse)
- Refund anon scan on stream error (separate ack endpoint)
- RTL support + Urdu locale (CSS `direction: rtl`, bidi fixes for icons/dropdowns)
- LLM-output language coupling for non-Indic non-English locales (see partial gap above)
- Extend Sarvam coverage to full findings JSON (cost-vs-quality decision per slice E gaps)
- DB-backed history (replace localStorage for signed-in users)
- Account deletion (GDPR-style "delete my account + scans")
- E2E test suite (Playwright?)

### Slice H — Microsoft OAuth
- User-noted as wanted, not blocking. Same shape as Google/GitHub.

## 🗝️ External service state

| Service           | Status                          | Notes                                                                                       |
| ----------------- | ------------------------------- | ------------------------------------------------------------------------------------------- |
| Anthropic         | ✅ Configured                    | Default provider                                                                            |
| OpenAI            | Optional                        | Set `OPENAI_API_KEY`                                                                        |
| Google Gemini     | Optional                        | Set `GOOGLE_GENERATIVE_AI_API_KEY`                                                          |
| Ollama (local)    | Optional                        | Set `OLLAMA_BASE_URL`                                                                       |
| Sarvam            | Optional                        | Set `SARVAM_API_KEY` — needed for Indic output translation                                  |
| **Supabase**      | ✅ Project created, schema run   | env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`                            |
| **BYOK crypto**   | ✅ Key generated, in .env.local  | env: `BYOK_ENCRYPTION_KEY` (32 bytes hex) — **DO NOT ROTATE in production without migration** |
| Google OAuth      | 🟡 Setup in progress             | Client created; verify enabled in Supabase Auth → Providers                                 |
| GitHub OAuth      | 🔴 Not started                   | Steps documented in conversation; ~3 min                                                    |
| Microsoft OAuth   | 🔴 Deferred                      |                                                                                             |
| Stripe            | 🔴 Not started                   | Required for Slice F                                                                        |
| Upstash Redis     | 🔴 Not started                   | Required for Slice G anon throttle                                                          |
| SMTP for email    | 🔴 Default Supabase (dev only)   | Switch to Resend/Postmark before public launch (>3 magic links/hr)                          |

## 🧭 File map (high-traffic edits)

```
app/
  page.tsx                       — main page (uses useQuota + useAuth + scan flow)
  layout.tsx                     — NextIntlClientProvider, font setup, <html lang>
  settings/page.tsx              — BYOK key manager (signed-in only)
  api/
    analyze/route.ts             — SSE streaming; quota gate (anon vs signed); BYOK lookup
    quota/route.ts               — GET state (branches on signed-in)
    auth/callback/route.ts       — magic-link + OAuth code exchange
    auth/signout/route.ts
    byok/keys/route.ts           — GET/POST/DELETE per-user encrypted keys
    providers/route.ts           — list providers + capabilities for UI picker
    counter-agreement/           — revised contract drafter + PDF render
    extract/                     — file→text extraction endpoint

components/
  site/{SiteHeader,SiteFooter}.tsx
  landing/{Hero,CoverageSection,CounterSection,ProvidersSection,HistoryPanel,HeroContractDemo}.tsx
  scan/{AnalyzingState,QuotaLockout}.tsx
  auth/SignInModal.tsx
  settings/ByokKeyManager.tsx
  i18n/LanguagePicker.tsx
  ContractInput.tsx
  AnalysisResults.tsx
  FindingCard.tsx
  ui/Reveal.tsx

lib/
  quota.ts                       — Slice A+B+D quota math, cookie helpers
  useQuota.ts, useAuth.ts        — client hooks
  supabase/{client,server,middleware}.ts
  byok-crypto.ts                 — AES-256-GCM
  providers.ts                   — getModel with apiKeyOverride
  i18n/{config,request}.ts       — locale + next-intl wiring
  sarvam-languages.ts, sarvam.ts — Indic translation

proxy.ts                         — Next 16 proxy (session + locale)
messages/{en,es,fr,de,pt,hi,bn,ta,te,kn,ml,mr,gu,pa,or,as}.json
supabase/schema.sql              — re-runnable; idempotent
scripts/translate-ui.ts          — bootstrap script (npm run translate-ui)
```

## Commands cheat-sheet

```bash
npm run dev                          # localhost:3000 (or 3001 if 3000 taken)
npm run build                        # production build
npm run lint
npm run translate-ui                 # translate all stubs to real locales
npm run translate-ui -- ta           # one locale
npm run translate-ui -- --force es   # overwrite even a real translation
```

## Decisions log

- **Magic link** is the only auth path that works on `.env.local` alone — Google + GitHub need OAuth app creation.
- **BYOK > Stripe in priority order**: BYOK has zero variable cost to the operator and ships fully self-contained. Stripe needs separate setup + recurring ops.
- **Sarvam stays for Indic input/output**; LLM-direct translation reserved for non-Indic non-English. Decided after evaluating cost-vs-quality trade-off (Sarvam best on Indic legal terms).
- **URL-based i18n routing skipped**: would require restructuring `app/` to `app/[locale]/`. Cookie+header mode chosen for lower refactor cost; can revisit for SEO later.
- **Urdu excluded from Phase 1**: avoids RTL CSS work; can be added in Slice G.
- **`middleware.ts` renamed to `proxy.ts`**: Next 16 deprecation; export `proxy()` not `middleware()`.
- **Anon cookie counter is honor-system**: bypassable by clearing cookies. Acceptable for free tier; Upstash IP throttle in Slice G makes it stickier without making it watertight.
