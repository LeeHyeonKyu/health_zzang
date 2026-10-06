import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { getWorkoutsWithMedia } from "@/lib/workouts";
import MemberContent from "./member-content";

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: memberId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: memberProfile } = await supabase
    .from("profiles")
    .select("id, nickname, crew_id")
    .eq("id", memberId)
    .single();

  if (!memberProfile) notFound();

  const { data: myProfile } = await supabase.from("profiles").select("crew_id").eq("id", user.id).single();
  if (!myProfile || myProfile.crew_id !== memberProfile.crew_id) notFound();

  const { data: seasons } = await supabase
    .from("season")
    .select("id, name, is_active")
    .eq("crew_id", memberProfile.crew_id)
    .order("start_date", { ascending: false });

  const activeSeason = seasons?.find((s) => s.is_active);
  const selectedSeasonId = activeSeason?.id;

  const workouts = selectedSeasonId
    ? await getWorkoutsWithMedia(supabase, memberId, selectedSeasonId)
    : [];

  const isMe = memberId === user.id;

  return (
    <MemberContent
      nickname={memberProfile.nickname}
      isMe={isMe}
      workouts={workouts}
    />
  );
}
