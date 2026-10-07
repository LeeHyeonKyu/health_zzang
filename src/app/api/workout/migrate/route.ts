import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "service_role key 필요" } }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const body = await request.json();
  const { records } = body as {
    records: { nickname: string; date: string; note?: string }[];
  };

  if (!records || records.length === 0) {
    return NextResponse.json({ error: { code: "NO_RECORDS", message: "records 배열이 필요합니다" } }, { status: 400 });
  }

  const { data: profiles } = await supabase.from("profiles").select("id, nickname, crew_id");
  const profileMap = new Map((profiles ?? []).map((p) => [p.nickname, p]));

  const { data: seasons } = await supabase.from("season").select("id, crew_id").eq("is_active", true);
  const seasonMap = new Map((seasons ?? []).map((s) => [s.crew_id, s.id]));

  const results: { nickname: string; date: string; status: string }[] = [];

  for (const record of records) {
    const profile = profileMap.get(record.nickname);
    if (!profile) {
      results.push({ nickname: record.nickname, date: record.date, status: `프로필 없음: ${record.nickname}` });
      continue;
    }

    const seasonId = seasonMap.get(profile.crew_id);
    if (!seasonId) {
      results.push({ nickname: record.nickname, date: record.date, status: "활성 시즌 없음" });
      continue;
    }

    const { data: existing } = await supabase.from("workout").select("id").eq("user_id", profile.id).eq("date", record.date).single();
    if (existing) {
      results.push({ nickname: record.nickname, date: record.date, status: "이미 존재" });
      continue;
    }

    const { error } = await supabase.from("workout").insert({
      user_id: profile.id,
      season_id: seasonId,
      date: record.date,
      note: record.note ?? null,
    });

    results.push({ nickname: record.nickname, date: record.date, status: error ? `오류: ${error.message}` : "추가됨" });
  }

  return NextResponse.json({ results });
}
