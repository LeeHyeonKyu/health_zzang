import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/components/logout-button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname")
    .eq("id", user.id)
    .single();

  const displayName = profile?.nickname ?? user.email;

  return (
    <div className="min-h-dvh flex flex-col max-w-lg mx-auto">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/" prefetch={false} className="text-lg font-bold tracking-tight text-gray-900">💪 Health Zzang</Link>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">{displayName}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-4">
        {children}
      </main>

      <nav className="sticky bottom-0 z-10 bg-white border-t border-gray-200 px-2 py-2 safe-area-bottom">
        <div className="grid grid-cols-5 gap-1">
          <NavItem href="/" icon="🏠" label="홈" />
          <NavItem href="/workout/new" icon="💪" label="인증" />
          <NavItem href="/history" icon="📝" label="내 기록" />
          <NavItem href="/season" icon="📊" label="시즌" />
          <NavItem href="/settings" icon="⚙️" label="설정" />
        </div>
      </nav>
    </div>
  );
}

function NavItem({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="flex flex-col items-center gap-0.5 py-1 text-gray-500 hover:text-blue-600 transition-colors"
    >
      <span className="text-lg leading-none">{icon}</span>
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}
