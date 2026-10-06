import { createClient } from "@/lib/supabase/server";
import { getUploadUrl } from "@/lib/r2";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } }, { status: 401 });

  const body = await request.json();
  const { contentType, fileExtension } = body;

  if (!contentType || !fileExtension) {
    return NextResponse.json({ error: { code: "MISSING_FIELDS", message: "파일 정보가 필요합니다" } }, { status: 400 });
  }

  const key = `workouts/${user.id}/${randomUUID()}.${fileExtension}`;
  const uploadUrl = await getUploadUrl(key, contentType);

  return NextResponse.json({ uploadUrl, key });
}
