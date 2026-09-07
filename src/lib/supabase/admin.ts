import { createClient } from '@supabase/supabase-js';

// 서버 전용 — service-role 키를 쓰므로 Client Component에서 절대 import하지 않는다.
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
