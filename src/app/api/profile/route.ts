import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("id, nickname, crew_id, avatar_r2_key, created_at").eq("id", user.id).single();
  return NextResponse.json(profile);
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } }, { status: 401 });

  const body = await request.json();
  const { nickname, avatar_r2_key } = body as { nickname?: string; avatar_r2_key?: string | null };

  const update: Record<string, unknown> = {};
  if (nickname !== undefined) update.nickname = nickname;
  if (avatar_r2_key !== undefined) update.avatar_r2_key = avatar_r2_key;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: { code: "NO_FIELDS", message: "변경할 항목이 없습니다" } }, { status: 400 });
  }

  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
  if (error) return NextResponse.json({ error: { code: "UPDATE_FAILED", message: error.message } }, { status: 500 });

  return NextResponse.json({ success: true });
}
