import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/components/logout-button";
import { getWeekStart, formatCurrency } from "@/lib/utils";

export default async function Home() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname, crew_id")
    .eq("id", user.id)
    .single();

  const displayName = profile?.nickname ?? user.email;

  let activeSeason = null;
  let weekData: { userId: string; nickname: string; count: number; penalty: number }[] = [];
  let rule = { target: 0, penaltyPerMiss: 0, rewardPerExtra: 0 };

  if (profile?.crew_id) {
    const { data: season } = await supabase
      .from("season")
      .select("*")
      .eq("crew_id", profile.crew_id)
      .eq("is_active", true)
      .single();

    activeSeason = season;

    if (season) {
      const weekStart = getWeekStart();
      const weekEnd = getWeekEnd(weekStart);

      const [{ data: override }, { data: members }, { data: workouts }] = await Promise.all([
        supabase.from("weekly_rule").select("*").eq("season_id", season.id).eq("week_start", weekStart).single(),
        supabase.from("profiles").select("id, nickname").eq("crew_id", profile.crew_id),
        supabase.from("workout").select("user_id, date").eq("season_id", season.id).gte("date", weekStart).lte("date", weekEnd),
      ]);

      rule = {
        target: override?.target_count ?? season.default_target_count,
        penaltyPerMiss: override?.penalty_per_miss ?? season.default_penalty_per_miss,
        rewardPerExtra: override?.reward_per_extra ?? season.default_reward_per_extra,
      };

      weekData = (members ?? []).map((m) => {
        const count = workouts?.filter((w) => w.user_id === m.id).length ?? 0;
        const missed = Math.max(0, rule.target - count);
        const extra = Math.max(0, count - rule.target);
        const penalty = missed * rule.penaltyPerMiss - extra * rule.rewardPerExtra;
        return { userId: m.id, nickname: m.nickname, count, penalty };
      }).sort((a, b) => b.count - a.count);
    }
  }

  return (
    <div className="min-h-dvh px-4 py-6 max-w-lg mx-auto">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">💪 Health Zzang</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">{displayName}</span>
          <LogoutButton />
        </div>
      </header>

      <nav className="flex gap-2 mb-6">
        <Link href="/workout/new" prefetch={false} className="px-3 py-2 rounded bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">🏋️ 인증하기</Link>
        <Link href="/history" prefetch={false} className="px-3 py-2 rounded bg-gray-100 text-sm hover:bg-gray-200 transition-colors">📝 내 기록</Link>
        <Link href="/season" prefetch={false} className="px-3 py-2 rounded bg-gray-100 text-sm hover:bg-gray-200 transition-colors">📊 시즌</Link>
        <Link href="/settings" prefetch={false} className="px-3 py-2 rounded bg-gray-100 text-sm hover:bg-gray-200 transition-colors">⚙️ 설정</Link>
      </nav>

      <main>
        {!activeSeason ? (
          <div className="bg-gray-100 rounded-lg p-6 text-center text-gray-500">
            <p>현재 진행 중인 시즌이 없습니다.</p>
            <Link href="/settings" prefetch={false} className="text-blue-600 hover:underline text-sm mt-2 inline-block">새 시즌 시작하기</Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800">
              <span className="font-semibold">{activeSeason.name}</span> — 이번 주: {rule.target}회 이상 / 미달 {rule.penaltyPerMiss.toLocaleString()}원
              {rule.rewardPerExtra > 0 && ` / 초과 -${rule.rewardPerExtra.toLocaleString()}원`}
            </div>

            <div className="bg-white border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left py-2 px-3">크루원</th>
                    <th className="text-center py-2 px-3">인증</th>
                    <th className="text-right py-2 px-3">벌금</th>
                  </tr>
                </thead>
                <tbody>
                  {weekData.map((d) => (
                    <tr
                      key={d.userId}
                      className={`border-b last:border-0 ${d.userId === user.id ? "bg-yellow-50" : ""}`}
                    >
                      <td className="py-2 px-3">
                        <Link href={`/members/${d.userId}`} prefetch={false} className="hover:underline">
                          {d.nickname}
                          {d.userId === user.id && " (나)"}
                        </Link>
                      </td>
                      <td className="py-2 px-3 text-center font-mono">
                        {d.count}/{rule.target}
                      </td>
                      <td className={`py-2 px-3 text-right font-mono ${d.penalty > 0 ? "text-red-600" : d.penalty < 0 ? "text-green-600" : "text-gray-400"}`}>
                        {formatCurrency(d.penalty)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart + "T00:00:00");
  d.setDate(d.getDate() + 6);
  return d.toISOString().split("T")[0];
}
