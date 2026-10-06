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
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {firstMedia && (
        <div className="aspect-[4/3] bg-gray-100 relative">
          {firstMedia.type === "photo" ? (
            <img src={firstMedia.url} alt="" className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <video src={firstMedia.url} className="w-full h-full object-cover" controls preload="metadata" />
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
            <button onClick={onMemberClick} className="text-sm font-bold text-gray-900 hover:text-blue-600">
              {nickname}
            </button>
          ) : (
            <span className="text-sm font-bold text-gray-900">{nickname}</span>
          )}
          <span className="text-xs text-gray-400">{formatDate(date)}</span>
        </div>
        {note && <p className="text-sm text-gray-600 mt-1">{note}</p>}
      </div>
    </div>
  );
}
