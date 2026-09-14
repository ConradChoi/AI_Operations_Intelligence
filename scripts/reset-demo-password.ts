import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

// 셸/.env 파싱을 거치지 않도록 비밀번호를 코드에 직접 리터럴로 넣어 재설정한다.
const EMAIL = 'demo@ylia.io';
const PASSWORD = '2jhjh0817!';

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: list, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;

  const existing = list.users.find((u) => u.email === EMAIL);
  if (!existing) {
    console.log(`사용자를 찾지 못했습니다: ${EMAIL}`);
    return;
  }

  console.log(`찾음: ${existing.email} (${existing.id}), email_confirmed_at=${existing.email_confirmed_at}`);

  const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
    password: PASSWORD,
    email_confirm: true,
  });
  if (updateError) throw updateError;

  console.log('비밀번호 재설정 완료.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
