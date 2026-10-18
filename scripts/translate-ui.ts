#!/usr/bin/env -S npx tsx
/**
 * Bootstrap UI translations.
 *
 *   npx tsx scripts/translate-ui.ts                  # smart: missing-only for real translations, full for stubs
 *   npx tsx scripts/translate-ui.ts bn ta te         # restrict to these locales
 *   npx tsx scripts/translate-ui.ts --force es       # overwrite even if file exists (full retranslation)
 *
 * Default behavior:
 *   - File does not exist OR is canonically identical to en.json (i.e. an English stub):
 *       Translate the WHOLE file from scratch.
 *   - File exists and is a real translation:
 *       Compute which leaf keys are present in en.json but missing from the target.
 *       Translate only those keys and DEEP-MERGE them into the existing file.
 *       This preserves hand-translated content while filling in additions.
 *
 *   - --force always retranslates the whole file (overwrites hand translations).
 *
 * Requires ANTHROPIC_API_KEY in env (loaded from .env.local automatically when run
 * via `node --env-file=.env.local` or via `npm run translate-ui`).
 */

import { readFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import {
  DEFAULT_LOCALE,
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  type Locale,
} from '../lib/i18n/config';

const MESSAGES_DIR = join(process.cwd(), 'messages');
const SOURCE_FILE = join(MESSAGES_DIR, `${DEFAULT_LOCALE}.json`);

interface Args {
  force: boolean;
  targets: Locale[];
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const force = argv.includes('--force');
  const targets = argv.filter(a => a !== '--force') as Locale[];
  const valid = targets.filter(t =>
    (SUPPORTED_LOCALES as readonly string[]).includes(t)
  ) as Locale[];
  const bad = targets.filter(t => !(SUPPORTED_LOCALES as readonly string[]).includes(t));
  if (bad.length) {
    console.error(`Unknown locales: ${bad.join(', ')}`);
    console.error(`Supported: ${SUPPORTED_LOCALES.join(', ')}`);
    process.exit(1);
  }
  return {
    force,
    targets: valid.length
      ? valid
      : (SUPPORTED_LOCALES.filter(l => l !== DEFAULT_LOCALE) as Locale[]),
  };
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function translateOne(locale: Locale, sourceJson: string): Promise<string> {
  const langName = LOCALE_LABELS[locale].english;
  const nativeName = LOCALE_LABELS[locale].native;

  const prompt = `Translate the JSON below from English to ${langName} (${nativeName}).

Rules — follow strictly:
1. Output ONLY the resulting JSON. No prose, no markdown fences.
2. Translate every string VALUE. Do NOT translate keys.
3. Preserve ALL ICU MessageFormat placeholders EXACTLY: {variable}, {var, plural, ...}, {var, select, ...} — do not translate or alter them.
4. Preserve plural categories ("zero", "one", "few", "many", "other", "=0", "=1") — use the categories appropriate for ${langName}.
5. Preserve HTML-ish tags like <strong>...</strong> if present.
6. Keep the brand name "Is This Clause Normal?" untranslated.
7. Keep "Sarvam" (a product name) untranslated.
8. Keep technical terms "BYOK", "API", "PDF", "Word" untranslated.
9. Keep "Supabase Auth → Providers" untranslated (it refers to specific UI text).
10. Match the same JSON structure exactly.

Source JSON:
${sourceJson}`;

  const result = await generateText({
    model: anthropic('claude-sonnet-4-6'),
    prompt,
    // Indic scripts tokenize 2-4× heavier than Latin; give plenty of headroom
    // so the JSON doesn't get cut off mid-string.
    maxOutputTokens: 32000,
  });

  if (result.finishReason === 'length') {
    throw new Error(
      `Response truncated at maxOutputTokens. Bump the cap in scripts/translate-ui.ts.`
    );
  }

  // Some models wrap JSON in fences despite instructions; strip if present.
  const cleaned = result.text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  return cleaned;
}

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

function isPlainObject(v: unknown): v is Record<string, Json> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function deepKeys(o: unknown, prefix = ''): Set<string> {
  const out = new Set<string>();
  if (isPlainObject(o)) {
    for (const [k, v] of Object.entries(o)) {
      const path = prefix ? `${prefix}.${k}` : k;
      if (isPlainObject(v)) {
        for (const sub of deepKeys(v, path)) out.add(sub);
      } else {
        out.add(path);
      }
    }
  }
  return out;
}

/** Subset `source` so it contains only the given leaf dot-paths, preserving nesting. */
function pluckByPaths(source: Record<string, Json>, paths: Set<string>): Record<string, Json> {
  const out: Record<string, Json> = {};
  for (const p of paths) {
    const segments = p.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let srcCursor: any = source;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let outCursor: any = out;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (srcCursor == null || !(seg in srcCursor)) break;
      if (i === segments.length - 1) {
        outCursor[seg] = srcCursor[seg];
      } else {
        srcCursor = srcCursor[seg];
        if (!outCursor[seg] || typeof outCursor[seg] !== 'object') outCursor[seg] = {};
        outCursor = outCursor[seg];
      }
    }
  }
  return out;
}

/** Deep-merge b into a; b wins on leaves, plain objects are merged recursively. */
function deepMerge(
  a: Record<string, Json>,
  b: Record<string, Json>
): Record<string, Json> {
  const out: Record<string, Json> = { ...a };
  for (const [k, v] of Object.entries(b)) {
    const existing = out[k];
    if (isPlainObject(v) && isPlainObject(existing)) {
      out[k] = deepMerge(existing, v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

async function translateFull(
  locale: Locale,
  sourceRaw: string,
  sourceKeys: Set<string>,
  outPath: string
): Promise<void> {
  const json = await translateOne(locale, sourceRaw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (parseErr) {
    console.error(`    ✗ JSON parse failed: ${parseErr instanceof Error ? parseErr.message : parseErr}`);
    console.error(`    first 400 chars of model output:\n      ${json.slice(0, 400).replace(/\n/g, '\n      ')}`);
    console.error(`    last 200 chars:\n      ${json.slice(-200).replace(/\n/g, '\n      ')}`);
    throw new Error('parse-failed');
  }
  const targetKeys = deepKeys(parsed);
  const missing = [...sourceKeys].filter(k => !targetKeys.has(k));
  if (missing.length) {
    console.warn(`    ⚠ missing ${missing.length} keys: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '…' : ''}`);
  }
  await writeFile(outPath, JSON.stringify(parsed, null, 2) + '\n', 'utf8');
  console.log(`    ✓ wrote ${outPath}`);
}

async function translateAndMerge(
  locale: Locale,
  sourceObj: Record<string, Json>,
  existingObj: Record<string, Json>,
  missingKeys: Set<string>,
  outPath: string
): Promise<void> {
  const subset = pluckByPaths(sourceObj, missingKeys);
  const subsetJson = JSON.stringify(subset, null, 2);
  console.log(`    merging ${missingKeys.size} new keys (preserving ${deepKeys(existingObj).size} existing)…`);
  const translatedRaw = await translateOne(locale, subsetJson);
  let translatedObj: unknown;
  try {
    translatedObj = JSON.parse(translatedRaw);
  } catch (parseErr) {
    console.error(`    ✗ JSON parse failed: ${parseErr instanceof Error ? parseErr.message : parseErr}`);
    console.error(`    first 400 chars of model output:\n      ${translatedRaw.slice(0, 400).replace(/\n/g, '\n      ')}`);
    throw new Error('parse-failed');
  }
  if (!isPlainObject(translatedObj)) {
    throw new Error('model returned non-object');
  }
  const merged = deepMerge(existingObj, translatedObj);
  await writeFile(outPath, JSON.stringify(merged, null, 2) + '\n', 'utf8');
  console.log(`    ✓ wrote ${outPath}`);
}

async function main() {
  const { force, targets } = parseArgs();

  const sourceRaw = await readFile(SOURCE_FILE, 'utf8');
  const sourceObj = JSON.parse(sourceRaw) as Record<string, Json>;
  const sourceKeys = deepKeys(sourceObj);
  const sourceCanonical = JSON.stringify(sourceObj);

  console.log(`Source: ${SOURCE_FILE} (${sourceKeys.size} keys)`);
  console.log(`Targets: ${targets.join(', ')}${force ? ' (FORCE)' : ''}`);

  for (const locale of targets) {
    const outPath = join(MESSAGES_DIR, `${locale}.json`);
    const exists = await fileExists(outPath);

    if (force || !exists) {
      console.log(`  ${locale}: ${force ? 'force-retranslating' : 'translating (new file)'}…`);
      try {
        await translateFull(locale, sourceRaw, sourceKeys, outPath);
      } catch (err) {
        console.error(`    ✗ failed: ${err instanceof Error ? err.message : err}`);
      }
      continue;
    }

    // Existing file — decide between full retranslation (stub) or merge (real translation).
    const existingRaw = await readFile(outPath, 'utf8');
    let existingObj: Record<string, Json>;
    try {
      const parsed = JSON.parse(existingRaw);
      if (!isPlainObject(parsed)) throw new Error('not an object');
      existingObj = parsed;
    } catch {
      console.log(`  ${locale}: existing file unreadable, retranslating from scratch…`);
      try {
        await translateFull(locale, sourceRaw, sourceKeys, outPath);
      } catch (err) {
        console.error(`    ✗ failed: ${err instanceof Error ? err.message : err}`);
      }
      continue;
    }

    if (JSON.stringify(existingObj) === sourceCanonical) {
      console.log(`  ${locale}: overwriting English stub…`);
      try {
        await translateFull(locale, sourceRaw, sourceKeys, outPath);
      } catch (err) {
        console.error(`    ✗ failed: ${err instanceof Error ? err.message : err}`);
      }
      continue;
    }

    const existingKeys = deepKeys(existingObj);
    const missingKeys = new Set([...sourceKeys].filter(k => !existingKeys.has(k)));
    if (missingKeys.size === 0) {
      console.log(`  ${locale}: up to date — skip`);
      continue;
    }
    console.log(`  ${locale}:`);
    try {
      await translateAndMerge(locale, sourceObj, existingObj, missingKeys, outPath);
    } catch (err) {
      console.error(`    ✗ failed: ${err instanceof Error ? err.message : err}`);
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
