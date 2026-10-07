import { formatDate } from "@/lib/utils";

interface MediaItem {
  r2_key: string;
  type: "photo" | "video";
  url: string;
}

interface Props {
  date: string;
  note: string | null;
  media: MediaItem[];
}

export default function WorkoutCard({ date, note, media }: Props) {
  return (
    <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
      {media.length > 0 && (
        <div className={`grid gap-1 ${media.length === 1 ? "grid-cols-1" : media.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
          {media.map((m) => (
            <a key={m.r2_key} href={m.url} target="_blank" rel="noopener noreferrer" className={`block bg-gray-100 dark:bg-[#111] ${m.type === "photo" ? "aspect-square" : "aspect-video"}`}>
              {m.type === "photo" ? (
                <img src={m.url} alt="" className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <video src={m.url} className="w-full h-full object-contain bg-black" controls preload="metadata" />
              )}
            </a>
          ))}
        </div>
      )}
      <div className="p-3">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{formatDate(date)}</p>
        {note && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{note}</p>}
      </div>
    </div>
  );
}
