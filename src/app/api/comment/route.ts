import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const workoutId = searchParams.get("workout_id");
  if (!workoutId) return NextResponse.json({ error: { code: "MISSING_WORKOUT_ID", message: "workout_id가 필요합니다" } }, { status: 400 });

  const { data: comments, error } = await supabase
    .from("comment")
    .select("id, workout_id, user_id, content, created_at, updated_at")
    .eq("workout_id", workoutId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: { code: "FETCH_FAILED", message: error.message } }, { status: 500 });

  const userIds = [...new Set((comments ?? []).map((c) => c.user_id))];
  const { data: profiles } = userIds.length > 0
    ? await supabase.from("profiles").select("id, nickname, avatar_r2_key").in("id", userIds)
    : { data: [] };
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const items = (comments ?? []).map((c) => {
    const prof = profileMap.get(c.user_id);
    return {
      id: c.id,
      workout_id: c.workout_id,
      user_id: c.user_id,
      content: c.content,
      nickname: prof?.nickname ?? "알 수 없음",
      avatar_r2_key: prof?.avatar_r2_key ?? null,
      created_at: c.created_at,
      updated_at: c.updated_at,
    };
  });

  return NextResponse.json({ comments: items });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } }, { status: 401 });

  const body = await request.json();
  const { workout_id, content } = body as { workout_id: string; content: string };

  if (!workout_id) return NextResponse.json({ error: { code: "MISSING_WORKOUT_ID", message: "workout_id가 필요합니다" } }, { status: 400 });
  if (!content || !content.trim()) return NextResponse.json({ error: { code: "EMPTY_CONTENT", message: "댓글 내용을 입력해주세요" } }, { status: 400 });

  const { data: comment, error } = await supabase
    .from("comment")
    .insert({ workout_id, user_id: user.id, content: content.trim() })
    .select()
    .single();

  if (error) return NextResponse.json({ error: { code: "CREATE_FAILED", message: error.message } }, { status: 500 });

  revalidatePath("/feed");
  return NextResponse.json(comment, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } }, { status: 401 });

  const body = await request.json();
  const { comment_id, content } = body as { comment_id: string; content: string };

  if (!comment_id) return NextResponse.json({ error: { code: "MISSING_ID", message: "comment_id가 필요합니다" } }, { status: 400 });
  if (!content || !content.trim()) return NextResponse.json({ error: { code: "EMPTY_CONTENT", message: "댓글 내용을 입력해주세요" } }, { status: 400 });

  const { data: comment } = await supabase.from("comment").select("user_id").eq("id", comment_id).single();
  if (!comment) return NextResponse.json({ error: { code: "NOT_FOUND", message: "댓글을 찾을 수 없습니다" } }, { status: 404 });
  if (comment.user_id !== user.id) return NextResponse.json({ error: { code: "FORBIDDEN", message: "본인의 댓글만 수정할 수 있습니다" } }, { status: 403 });

  const { error } = await supabase
    .from("comment")
    .update({ content: content.trim(), updated_at: new Date().toISOString() })
    .eq("id", comment_id);

  if (error) return NextResponse.json({ error: { code: "UPDATE_FAILED", message: error.message } }, { status: 500 });

  revalidatePath("/feed");
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const commentId = searchParams.get("id");
  if (!commentId) return NextResponse.json({ error: { code: "MISSING_ID", message: "id가 필요합니다" } }, { status: 400 });

  const { data: comment } = await supabase.from("comment").select("user_id").eq("id", commentId).single();
  if (!comment) return NextResponse.json({ error: { code: "NOT_FOUND", message: "댓글을 찾을 수 없습니다" } }, { status: 404 });
  if (comment.user_id !== user.id) return NextResponse.json({ error: { code: "FORBIDDEN", message: "본인의 댓글만 삭제할 수 있습니다" } }, { status: 403 });

  const { error } = await supabase.from("comment").delete().eq("id", commentId);
  if (error) return NextResponse.json({ error: { code: "DELETE_FAILED", message: error.message } }, { status: 500 });

  revalidatePath("/feed");
  return NextResponse.json({ success: true });
}
