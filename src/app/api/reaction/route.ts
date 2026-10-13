import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } }, { status: 401 });

  const body = await request.json();
  const { workout_id, emoji } = body as { workout_id: string; emoji: string };

  if (!workout_id) return NextResponse.json({ error: { code: "MISSING_WORKOUT_ID", message: "workout_id가 필요합니다" } }, { status: 400 });
  if (!emoji) return NextResponse.json({ error: { code: "MISSING_EMOJI", message: "이모지가 필요합니다" } }, { status: 400 });

  const { data: existing } = await supabase
    .from("reaction")
    .select("id")
    .eq("workout_id", workout_id)
    .eq("user_id", user.id)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("reaction").delete().eq("id", existing.id);
    if (error) return NextResponse.json({ error: { code: "DELETE_FAILED", message: error.message } }, { status: 500 });

    revalidatePath("/feed");
    return NextResponse.json({ action: "removed", emoji });
  }

  const { error } = await supabase.from("reaction").insert({
    workout_id,
    user_id: user.id,
    emoji,
  });
  if (error) return NextResponse.json({ error: { code: "CREATE_FAILED", message: error.message } }, { status: 500 });

  revalidatePath("/feed");
  return NextResponse.json({ action: "added", emoji }, { status: 201 });
}
