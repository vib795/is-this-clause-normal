import { SarvamAIClient } from 'sarvamai';
import { SARVAM_LANGUAGES } from './sarvam-languages';

export { SARVAM_LANGUAGES };

export async function translateToLanguage(
  text: string,
  targetLang: string // e.g. 'hi-IN'
): Promise<string> {
  if (!process.env.SARVAM_API_KEY) return text; // graceful no-op
  if (targetLang === 'en-IN') return text;

  const client = new SarvamAIClient({ apiSubscriptionKey: process.env.SARVAM_API_KEY });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await client.text.translate({
    input: text,
    source_language_code: 'en-IN' as never,
    target_language_code: targetLang as never,
    model: 'sarvam-translate:v1' as never,
    mode: 'formal' as never,
  });
  return result.translated_text;
}

/**
 * Translate many strings in parallel, with bounded concurrency. Per-item
 * failures fall back to the English source so a single bad call never
 * nukes the entire result.
 */
export async function translateBatch(
  strings: string[],
  targetLang: string,
  concurrency = 8
): Promise<string[]> {
  if (!process.env.SARVAM_API_KEY || targetLang === 'en-IN' || strings.length === 0) {
    return [...strings];
  }
  const results: string[] = new Array(strings.length);
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, strings.length) },
    async () => {
      while (true) {
        const i = cursor++;
        if (i >= strings.length) break;
        const src = strings[i];
        if (!src || src.length === 0) {
          results[i] = src;
          continue;
        }
        try {
          results[i] = await translateToLanguage(src, targetLang);
        } catch (err) {
          console.error(`Sarvam translateBatch[${i}] failed, using English:`, err);
          results[i] = src;
        }
      }
    }
  );
  await Promise.all(workers);
  return results;
}
