"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import MemberBadges from "@/components/member-badges";
import FeedView from "@/components/feed-view";
import WorkoutDetail from "@/components/workout-detail";
import type { FeedItem } from "@/lib/workouts";

interface Member {
  id: string;
  nickname: string;
}

interface Props {
  currentUserId: string;
  members: Member[];
  initialItems: FeedItem[];
  initialNextCursor: string | null;
  initialHasMore: boolean;
  seasonStartDate: string;
  avatarMap?: Record<string, string>;
  lastFeedDates?: Record<string, string>;
}

export default function FeedContent({
  currentUserId, members, initialItems, initialNextCursor, initialHasMore,
  seasonStartDate, avatarMap, lastFeedDates,
}: Props) {
  const [items, setItems] = useState<FeedItem[]>(initialItems);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<FeedItem | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const loadMore = useCallback(async () => {
    if (!nextCursor || loading) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ cursor: nextCursor, limit: "20" });
      if (selectedMember) params.set("member", selectedMember);
      const res = await fetch(`/api/feed?${params}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setItems((prev) => [...prev, ...data.items]);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch {
      setError("불러오기에 실패했습니다.");
    }
    setLoading(false);
  }, [nextCursor, loading, selectedMember]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loading && hasMore) {
          loadMore();
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, loadMore]);

  async function handleMemberSelect(id: string | null) {
    setSelectedMember(id);
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "20" });
      if (id) params.set("member", id);
      const res = await fetch(`/api/feed?${params}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setItems(data.items);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch {
      setError("불러오기에 실패했습니다.");
      setItems([]);
      setHasMore(false);
    }
    setLoading(false);
  }

  if (detailItem) {
    return (
      <WorkoutDetail
        item={detailItem}
        isOwner={detailItem.userId === currentUserId}
        members={members}
        onBack={() => { setDetailItem(null); router.refresh(); }}
      />
    );
  }

  const feedAvatarMap: Record<string, string> = { ...avatarMap };
  for (const item of items) {
    const apiAvatar = (item as FeedItem & { avatarUrl?: string }).avatarUrl;
    if (apiAvatar && !feedAvatarMap[item.userId]) {
      feedAvatarMap[item.userId] = apiAvatar;
    }
  }

  return (
    <div>
      <MemberBadges
        members={members}
        currentUserId={currentUserId}
        selected={selectedMember}
        onSelect={handleMemberSelect}
        avatarMap={feedAvatarMap}
        lastFeedDates={lastFeedDates}
      />
      <FeedView
        items={items}
        seasonStartDate={seasonStartDate}
        onCardClick={setDetailItem}
        avatarMap={feedAvatarMap}
      />
      <div ref={sentinelRef} className="py-4 text-center">
        {loading && <span className="text-sm text-gray-400 dark:text-gray-500">불러오는 중...</span>}
        {error && (
          <div>
            <span className="text-sm text-red-500 dark:text-red-400">{error}</span>
            <button onClick={loadMore} className="ml-2 text-sm text-blue-600 dark:text-blue-400 hover:underline">다시 시도</button>
          </div>
        )}
        {!hasMore && !loading && items.length > 0 && (
          <span className="text-xs text-gray-400 dark:text-gray-500">모든 기록을 불러왔습니다</span>
        )}
      </div>
    </div>
  );
}
