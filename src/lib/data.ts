import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

function timed<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  return fn().then((result) => {
    const dur = Math.round(performance.now() - start);
    if (dur > 200) {
      console.warn(`[SLOW QUERY] ${name}: ${dur}ms`);
    }
    return result;
  });
}

export const getUser = cache(async () => {
  return timed("getUser", async () => {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  });
});

export const getProfile = cache(async (userId: string) => {
  return timed("getProfile", async () => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("id, nickname, crew_id")
      .eq("id", userId)
      .single();
    return data;
  });
});

export const getActiveSeason = cache(async (crewId: string) => {
  return timed("getActiveSeason", async () => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("season")
      .select("*")
      .eq("crew_id", crewId)
      .eq("is_active", true)
      .single();
    return data;
  });
});

export const getCrewMembers = cache(async (crewId: string) => {
  return timed("getCrewMembers", async () => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("id, nickname")
      .eq("crew_id", crewId);
    return data ?? [];
  });
});
