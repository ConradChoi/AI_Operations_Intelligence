import { NextResponse } from 'next/server';

// 임시 진단용 — 값은 노출하지 않고 존재 여부/길이만 확인한다. 확인 후 즉시 제거할 것.
export async function GET() {
  return NextResponse.json({
    hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    serviceRoleKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length ?? 0,
    hasSiteUrl: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? null,
    hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
  });
}
