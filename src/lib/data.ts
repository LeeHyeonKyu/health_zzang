import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});

export const getProfile = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, nickname, crew_id")
    .eq("id", userId)
    .single();
  return data;
});

export const getActiveSeason = cache(async (crewId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("season")
    .select("*")
    .eq("crew_id", crewId)
    .eq("is_active", true)
    .single();
  return data;
});

export const getCrewMembers = cache(async (crewId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, nickname")
    .eq("crew_id", crewId);
  return data ?? [];
});
