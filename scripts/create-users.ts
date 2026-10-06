/**
 * 크루원 계정 사전 생성 스크립트
 *
 * 사용법:
 *   npx tsx scripts/create-users.ts
 *
 * 아래 USERS 배열에 크루원 정보를 입력하세요.
 * 생성된 계정 정보를 카카오톡으로 공유하면 됩니다.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const USERS: { email: string; password: string; nickname: string }[] = [
  // { email: "user1@health.zzang", password: "password123", nickname: "홍길동" },
  // { email: "user2@health.zzang", password: "password123", nickname: "김철수" },
  // 크루원 정보를 여기에 추가하세요
];

async function main() {
  if (USERS.length === 0) {
    console.log("USERS 배열에 크루원 정보를 입력하세요.");
    process.exit(1);
  }

  // default crew ID 가져오기
  const { data: crew, error: crewError } = await supabase
    .from("crew")
    .select("id")
    .eq("name", "Health Zzang")
    .single();

  if (crewError || !crew) {
    console.error("Default crew를 찾을 수 없습니다. schema.sql을 먼저 실행하세요.");
    process.exit(1);
  }

  for (const user of USERS) {
    // Auth 유저 생성
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
      });

    if (authError) {
      console.error(`❌ ${user.nickname} (${user.email}): ${authError.message}`);
      continue;
    }

    // Profile 생성
    const { error: profileError } = await supabase.from("profiles").insert({
      id: authData.user.id,
      nickname: user.nickname,
      crew_id: crew.id,
    });

    if (profileError) {
      console.error(
        `❌ ${user.nickname} profile 생성 실패: ${profileError.message}`
      );
      continue;
    }

    console.log(`✅ ${user.nickname} (${user.email}) — 생성 완료`);
  }

  console.log("\n완료! 위 이메일/비밀번호를 크루원에게 공유하세요.");
}

main();
