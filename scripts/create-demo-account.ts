import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

// 영업팀이 프로스펙트에게 공유할 데모 로그인 계정을 만든다. 실행 후
// DEMO_ACCOUNT_PASSWORD는 .env.local에서 지워도 된다 (계정 생성에만 쓰인다).
async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.NEXT_PUBLIC_DEMO_ACCOUNT_EMAIL;
  const password = process.env.DEMO_ACCOUNT_PASSWORD;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }
  if (!email || !password) {
    throw new Error('NEXT_PUBLIC_DEMO_ACCOUNT_EMAIL and DEMO_ACCOUNT_PASSWORD must be set in .env.local');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    if (error.message.toLowerCase().includes('already been registered')) {
      console.log(`이미 존재하는 계정입니다: ${email}`);
      return;
    }
    throw error;
  }

  console.log(`데모 계정 생성 완료: ${data.user.email} (${data.user.id})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
