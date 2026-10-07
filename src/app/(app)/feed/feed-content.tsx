"use client";

import { useState, useMemo } from "react";
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
  feedItems: FeedItem[];
  seasonStartDate: string;
  avatarMap?: Record<string, string>;
}

export default function FeedContent({ currentUserId, members, feedItems, seasonStartDate, avatarMap }: Props) {
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<FeedItem | null>(null);
  const router = useRouter();

  const filtered = useMemo(() => {
    if (!selectedMember) return feedItems;
    return feedItems.filter((f) => f.userId === selectedMember);
  }, [feedItems, selectedMember]);

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

  return (
    <div>
      <MemberBadges
        members={members}
        currentUserId={currentUserId}
        selected={selectedMember}
        onSelect={setSelectedMember}
        avatarMap={avatarMap}
      />
      <FeedView
        items={filtered}
        seasonStartDate={seasonStartDate}
        onCardClick={setDetailItem}
        avatarMap={avatarMap}
      />
    </div>
  );
}
