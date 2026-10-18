import { NextResponse } from 'next/server';
import { listProviders } from '@/lib/providers';

export async function GET() {
  const providers = listProviders();
  return NextResponse.json({
    providers: providers.map(p => ({
      id: p.id,
      label: p.label,
      default_model: p.default_model,
      models: p.models,
      capabilities: p.capabilities,
      configured: p.configured,
    })),
  });
}
