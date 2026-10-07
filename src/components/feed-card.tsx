import { formatDate } from "@/lib/utils";

interface MediaItem {
  r2_key: string;
  type: "photo" | "video";
  url: string;
}

interface Props {
  nickname: string;
  userId: string;
  date: string;
  note: string | null;
  media: MediaItem[];
  onMemberClick?: () => void;
}

export default function FeedCard({ nickname, date, note, media, onMemberClick }: Props) {
  const firstMedia = media[0];

  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
      {firstMedia && (
        <div className={`bg-gray-100 dark:bg-[#111] relative ${firstMedia.type === "photo" ? "aspect-[4/3]" : "aspect-video"}`}>
          {firstMedia.type === "photo" ? (
            <img src={firstMedia.url} alt="" className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <video src={firstMedia.url} className="w-full h-full object-contain bg-black" controls preload="metadata" />
          )}
          {media.length > 1 && (
            <span className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
              +{media.length - 1}
            </span>
          )}
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center justify-between mb-1">
          {onMemberClick ? (
            <button onClick={onMemberClick} className="text-sm font-bold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400">
              {nickname}
            </button>
          ) : (
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{nickname}</span>
          )}
          <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(date)}</span>
        </div>
        {note && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{note}</p>}
      </div>
    </div>
  );
}
