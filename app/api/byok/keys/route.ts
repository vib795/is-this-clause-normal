import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encryptApiKey, keyPreview } from '@/lib/byok-crypto';

const BYOK_PROVIDERS = ['anthropic', 'openai', 'google'] as const;
type ByokProvider = (typeof BYOK_PROVIDERS)[number];

function isByokProvider(s: unknown): s is ByokProvider {
  return typeof s === 'string' && (BYOK_PROVIDERS as readonly string[]).includes(s);
}

/**
 * GET /api/byok/keys → list of the caller's saved keys (preview only, never
 * the plaintext). RLS makes this self-enforcing — even a tampered token
 * can only return rows for the authenticated user.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('byok_keys')
    .select('provider, key_preview, updated_at')
    .order('updated_at', { ascending: false });
  if (error) {
    console.error('byok GET failed', error);
    return NextResponse.json({ error: 'Could not load keys.' }, { status: 500 });
  }

  return NextResponse.json({ keys: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } });
}

/**
 * POST /api/byok/keys
 * body: { provider: 'anthropic' | 'openai' | 'google', api_key: string }
 *
 * Encrypts the key with BYOK_ENCRYPTION_KEY and upserts. One row per
 * (user, provider) — re-posting overwrites the existing key.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { provider?: string; api_key?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!isByokProvider(body.provider)) {
    return NextResponse.json(
      { error: `Provider must be one of: ${BYOK_PROVIDERS.join(', ')}.` },
      { status: 400 }
    );
  }
  const apiKey = (body.api_key ?? '').trim();
  if (!apiKey) {
    return NextResponse.json({ error: 'api_key is required.' }, { status: 400 });
  }
  if (apiKey.length > 500) {
    return NextResponse.json({ error: 'api_key is too long.' }, { status: 400 });
  }

  let encrypted: string;
  try {
    encrypted = encryptApiKey(apiKey);
  } catch (err) {
    console.error('byok encrypt failed', err);
    return NextResponse.json(
      { error: 'Server is missing BYOK_ENCRYPTION_KEY — contact the operator.' },
      { status: 500 }
    );
  }

  const { error } = await supabase.from('byok_keys').upsert(
    {
      user_id: user.id,
      provider: body.provider,
      encrypted_key: encrypted,
      key_preview: keyPreview(apiKey),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,provider' }
  );

  if (error) {
    console.error('byok upsert failed', error);
    return NextResponse.json({ error: 'Could not save key.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/byok/keys?provider=anthropic
 * Removes the key for the given provider (or 404 if none).
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const provider = request.nextUrl.searchParams.get('provider');
  if (!isByokProvider(provider)) {
    return NextResponse.json(
      { error: `provider query param must be one of: ${BYOK_PROVIDERS.join(', ')}.` },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from('byok_keys')
    .delete()
    .eq('user_id', user.id)
    .eq('provider', provider);

  if (error) {
    console.error('byok delete failed', error);
    return NextResponse.json({ error: 'Could not delete key.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
