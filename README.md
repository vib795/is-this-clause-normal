# Is This Clause Normal?
 
A contract red-flag scanner for freelancers and solo founders who don't have a lawyer on speed dial.

You paste in a contract (or upload a PDF, Word doc, or even a screenshot), and it tells you what's unusual, what to push back on, and what replacement language to ask for. It checks against real industry norms — not just vibes.

---

## The problem it solves

You're a freelancer or indie founder. Someone sends you a 6-page contract. You don't have time to read legalese. You don't know if a "12-month non-compete" is standard or absurd. You don't know if "unlimited revisions" is a trap or fine print. You just want to know: **is this clause normal?**

This tool scans the contract across 9 categories, flags the deal-breakers in red, highlights things worth negotiating in yellow, and tells you what's actually fine in green. Each finding includes a plain-English explanation, what industry standard looks like, and specific language you can propose as a fix.

---

## What it looks at

- **Payment & Financial** — kill fees, net-30 vs. net-90, "pay when paid" traps
- **Intellectual Property** — who owns what, does IP transfer without payment, can you keep portfolio rights
- **Restrictions** — non-competes, non-solicitation, how long and how broad
- **Scope & Deliverables** — unlimited revision clauses, vague acceptance criteria
- **Termination & Exit** — notice periods, what happens to work in progress, kill fees
- **Liability & Risk** — whether you're exposed to unlimited indemnification
- **Dispute Resolution** — forced arbitration, jurisdiction, which state's courts
- **Data & Privacy** — AI training usage rights, GDPR/CCPA, what happens to your data after the project
- **Exclusivity** — uncompensated exclusivity clauses, geographic scope, industry-wide bans

It's also jurisdiction-aware. California non-competes are flagged as void under SB 699. EU/UK contracts without a DPA get flagged for GDPR. And it notes what's *missing* — no kill fee clause, no IP ownership definition, no dispute resolution — so you know what to add.

---

## Indian language support

Contracts in Hindi, Tamil, Bengali, Telugu, Kannada, Malayalam, Marathi, Gujarati, Punjabi, Odia, Assamese, or Urdu? Select the language from the dropdown. Claude reads and analyzes the contract natively in that language, and the summary and recommendation are returned in your selected language via [Sarvam AI](https://sarvam.ai). Findings stay in English for legal precision.

---

## Local setup

**Prerequisites:** Node.js 18+, an Anthropic API key.

```bash
git clone https://github.com/yourname/is-this-clause-normal
cd is-this-clause-normal
npm install
```

Create a `.env.local` file:

```bash
ANTHROPIC_API_KEY=sk-ant-...

# Optional: enables Indian language support
SARVAM_API_KEY=...

# Optional: override the default model (defaults to claude-sonnet-4-6)
CLAUDE_MODEL=claude-sonnet-4-6
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Paste in a contract or try one of the built-in examples (bare-bones agreement, California non-compete, AI training clause, 24-month exclusivity trap).

---

## Running with Docker

**Prerequisites:** Docker, an Anthropic API key.

Create a `.env.local` file (same one used for local dev — Docker Compose picks it up automatically):

```bash
ANTHROPIC_API_KEY=sk-ant-...

# Optional: enables Indian language support
SARVAM_API_KEY=...

# Optional: override the default model (defaults to claude-sonnet-4-6)
CLAUDE_MODEL=claude-sonnet-4-6
```

```bash
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000).

To rebuild after code changes:

```bash
docker compose up --build --force-recreate
```

---

## How it works

1. You paste text or upload a file (PDF, Word, RTF, or image)
2. The server extracts the content — PDFs via Claude's native document API, Word docs via mammoth, images via Claude Vision
3. Claude analyzes the contract against a detailed prompt encoding industry norms, jurisdiction-specific rules, and a structured JSON schema
4. If an Indian language is selected, Sarvam AI translates the summary and recommendation back into that language (2 API calls total — no chunking, no consistency problems)
5. Results are shown in the browser and saved to `localStorage` for history (up to 10 scans)

No database. No auth. No payments. Just an API key and a running server.

---

## Stack

- **Next.js 16** (App Router, TypeScript)
- **Claude** (`claude-sonnet-4-6` by default) for contract analysis
- **Sarvam AI** (`sarvam-translate:v1`) for Indian language output translation
- **mammoth** for Word document text extraction
- **Tailwind CSS** for styling
- No database, no auth, no external dependencies beyond the APIs

---

## Not legal advice

This tool does pattern matching against common contract structures and industry norms. It is not a lawyer. It does not understand your specific situation, negotiating leverage, or the full legal context of your jurisdiction. Use it to know what questions to ask — then consult a qualified attorney for anything that actually matters.
