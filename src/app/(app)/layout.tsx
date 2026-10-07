import { redirect } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/components/logout-button";
import { getUser, getProfile } from "@/lib/data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login");

  const profile = await getProfile(user.id);
  const displayName = profile?.nickname ?? user.email;

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-screen-sm md:max-w-screen-md mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/records" prefetch={false} className="text-lg font-bold tracking-tight text-gray-900">💪 Health Zzang</Link>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">{displayName}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-screen-sm md:max-w-screen-md mx-auto px-4 py-5 pb-20">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-10 bg-white border-t border-gray-200">
        <div className="max-w-screen-sm md:max-w-screen-md mx-auto px-2 py-1.5">
          <div className="grid grid-cols-5 gap-1 items-end">
            <NavItem href="/records" icon="📋" label="기록" />
            <NavItem href="/penalty" icon="💰" label="벌금" />
            <CenterNavItem href="/workout/new" />
            <NavItem href="/stats" icon="📊" label="통계" />
            <NavItem href="/settings" icon="⚙️" label="설정" />
          </div>
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

function CenterNavItem({ href }: { href: string }) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="flex flex-col items-center gap-0.5 -mt-3"
    >
      <span className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 text-white text-2xl shadow-lg hover:bg-blue-700 transition-colors">
        +
      </span>
      <span className="text-[10px] font-medium text-blue-600">인증</span>
    </Link>
  );
}
