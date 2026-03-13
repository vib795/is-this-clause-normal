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
