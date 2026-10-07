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
}

export default function FeedContent({ currentUserId, members, feedItems, seasonStartDate }: Props) {
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<FeedItem | null>(null);
  const router = useRouter();

  const filteredFeed = useMemo(() => {
    if (selectedMember) return feedItems.filter((f) => f.userId === selectedMember || (f.taggedNames && feedItems.some(fi => fi.id === f.id)));
    return feedItems;
  }, [feedItems, selectedMember]);

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
      />
      <FeedView
        items={filtered}
        seasonStartDate={seasonStartDate}
        onCardClick={setDetailItem}
      />
    </div>
  );
}
