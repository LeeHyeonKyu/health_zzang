const COLORS = [
  "bg-red-400", "bg-blue-400", "bg-green-400", "bg-yellow-400",
  "bg-purple-400", "bg-pink-400", "bg-indigo-400", "bg-teal-400",
  "bg-orange-400", "bg-cyan-400", "bg-emerald-400", "bg-rose-400",
];

function getColor(name: string): string {
  let hash = 0;
  for (const c of name) hash = ((hash << 5) - hash + c.charCodeAt(0)) | 0;
  return COLORS[Math.abs(hash) % COLORS.length];
}

const SIZES = {
  sm: "w-6 h-6 text-[10px]",
  md: "w-8 h-8 text-xs",
  lg: "w-16 h-16 text-xl",
};

interface Props {
  nickname: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function Avatar({ nickname, avatarUrl, size = "md", className = "" }: Props) {
  const sizeClass = SIZES[size];

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={nickname}
        loading="lazy"
        className={`${sizeClass} rounded-full object-cover flex-none ${className}`}
      />
    );
  }

  return (
    <span className={`${sizeClass} rounded-full flex items-center justify-center font-bold text-white flex-none ${getColor(nickname)} ${className}`}>
      {nickname.charAt(0)}
    </span>
  );
}
