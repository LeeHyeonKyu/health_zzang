import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/components/logout-button";
import { getWeekStart, formatCurrency } from "@/lib/utils";

export default async function Home() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: allSeasons }] = await Promise.all([
    supabase.from("profiles").select("nickname, crew_id").eq("id", user.id).single(),
    supabase.from("season").select("*").eq("is_active", true),
  ]);

  const displayName = profile?.nickname ?? user.email;

  let activeSeason = null;
  let weekData: { userId: string; nickname: string; count: number; penalty: number }[] = [];
  let rule = { target: 0, penaltyPerMiss: 0, rewardPerExtra: 0 };

  if (profile?.crew_id) {
    activeSeason = allSeasons?.find((s) => s.crew_id === profile.crew_id) ?? null;

    if (activeSeason) {
      const weekStart = getWeekStart();
      const weekEnd = getWeekEnd(weekStart);

      const [{ data: override }, { data: members }, { data: workouts }] = await Promise.all([
        supabase.from("weekly_rule").select("*").eq("season_id", activeSeason.id).eq("week_start", weekStart).single(),
        supabase.from("profiles").select("id, nickname").eq("crew_id", profile.crew_id),
        supabase.from("workout").select("user_id, date").eq("season_id", activeSeason.id).gte("date", weekStart).lte("date", weekEnd),
      ]);

      rule = {
        target: override?.target_count ?? activeSeason.default_target_count,
        penaltyPerMiss: override?.penalty_per_miss ?? activeSeason.default_penalty_per_miss,
        rewardPerExtra: override?.reward_per_extra ?? activeSeason.default_reward_per_extra,
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
      <header className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
        <h1 className="text-2xl font-bold tracking-tight">💪 Health Zzang</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-600">{displayName}</span>
          <LogoutButton />
        </div>
      </header>

      <nav className="grid grid-cols-4 gap-2 mb-6">
        <Link href="/workout/new" prefetch={false} className="flex items-center justify-center px-2 py-2.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors">인증하기</Link>
        <Link href="/history" prefetch={false} className="flex items-center justify-center px-2 py-2.5 rounded-lg bg-white border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">내 기록</Link>
        <Link href="/season" prefetch={false} className="flex items-center justify-center px-2 py-2.5 rounded-lg bg-white border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">시즌</Link>
        <Link href="/settings" prefetch={false} className="flex items-center justify-center px-2 py-2.5 rounded-lg bg-white border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">설정</Link>
      </nav>

      <main>
        {!activeSeason ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100">
            <p className="text-gray-500 text-base">현재 진행 중인 시즌이 없습니다.</p>
            <Link href="/settings" prefetch={false} className="text-blue-600 hover:underline text-sm mt-3 inline-block font-medium">새 시즌 시작하기 →</Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-800">
              <p className="font-bold text-base mb-1">{activeSeason.name}</p>
              <p>이번 주 목표: <span className="font-semibold">{rule.target}회</span> · 미달 <span className="font-semibold">{rule.penaltyPerMiss.toLocaleString()}원</span>/회
              {rule.rewardPerExtra > 0 && <> · 초과 <span className="font-semibold text-green-700">-{rule.rewardPerExtra.toLocaleString()}원</span>/회</>}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">크루원</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">인증</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">벌금</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {weekData.map((d) => (
                    <tr
                      key={d.userId}
                      className={`${d.userId === user.id ? "bg-yellow-50" : "hover:bg-gray-50"} transition-colors`}
                    >
                      <td className="py-3 px-4">
                        <Link href={`/members/${d.userId}`} prefetch={false} className="text-sm font-medium text-gray-900 hover:text-blue-600 hover:underline">
                          {d.nickname}
                          {d.userId === user.id && <span className="text-xs text-gray-400 ml-1">(나)</span>}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-sm font-mono font-semibold ${d.count >= rule.target ? "text-green-600" : "text-gray-900"}`}>
                          {d.count}<span className="text-gray-400">/{rule.target}</span>
                        </span>
                      </td>
                      <td className={`py-3 px-4 text-right text-sm font-mono font-semibold ${d.penalty > 0 ? "text-red-600" : d.penalty < 0 ? "text-green-600" : "text-gray-400"}`}>
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
