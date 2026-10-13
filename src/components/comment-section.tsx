"use client";

import { useState, useEffect, useRef } from "react";
import Avatar from "@/components/avatar";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  nickname: string;
  userId: string;
  avatarUrl?: string;
}

interface Props {
  workoutId: string;
  currentUserId: string;
  currentNickname?: string;
  currentAvatarUrl?: string;
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
  return new Date(dateStr).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
}

export default function CommentSection({ workoutId, currentUserId, currentNickname, currentAvatarUrl }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  function mapComments(raw: Record<string, unknown>[]): Comment[] {
    return raw.map((c) => ({
      id: c.id as string,
      content: c.content as string,
      created_at: c.created_at as string,
      updated_at: c.updated_at as string,
      nickname: c.nickname as string,
      userId: c.user_id as string,
      avatarUrl: c.avatar_url as string | undefined,
    }));
  }

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/comment?workout_id=${workoutId}`)
      .then((res) => {
        if (!res.ok) throw new Error("failed");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setComments(mapComments(data.comments ?? []));
      })
      .catch(() => {
        if (!cancelled) setError("댓글을 불러오는데 실패했습니다");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [workoutId]);

  useEffect(() => {
    if (!menuOpenId) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpenId]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 3000);
    return () => clearTimeout(t);
  }, [error]);

  async function handleSend() {
    const content = input.trim();
    if (!content || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workout_id: workoutId, content }),
      });
      if (!res.ok) throw new Error("failed");
      const raw = await res.json();
      setComments((prev) => [...prev, {
        id: raw.id,
        content: raw.content,
        created_at: raw.created_at,
        updated_at: raw.updated_at,
        nickname: currentNickname ?? "나",
        userId: currentUserId,
        avatarUrl: currentAvatarUrl,
      }]);
      setInput("");
      inputRef.current?.focus();
    } catch {
      setError("댓글 작성에 실패했습니다");
    }
    setSending(false);
  }

  async function handleEdit(id: string) {
    const content = editContent.trim();
    if (!content || editSaving) return;
    setEditSaving(true);
    setError("");
    try {
      const res = await fetch("/api/comment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment_id: id, content }),
      });
      if (!res.ok) throw new Error("failed");
      setComments((prev) => prev.map((c) => (c.id === id ? { ...c, content: content.trim(), updated_at: new Date().toISOString() } : c)));
      setEditingId(null);
      setEditContent("");
    } catch {
      setError("댓글 수정에 실패했습니다");
    }
    setEditSaving(false);
  }

  async function handleDelete(id: string) {
    setError("");
    try {
      const res = await fetch(`/api/comment?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("failed");
      setComments((prev) => prev.filter((c) => c.id !== id));
      setConfirmDeleteId(null);
    } catch {
      setError("댓글 삭제에 실패했습니다");
    }
  }

  function startEdit(comment: Comment) {
    setEditingId(comment.id);
    setEditContent(comment.content);
    setMenuOpenId(null);
  }

  function startDelete(id: string) {
    setConfirmDeleteId(id);
    setMenuOpenId(null);
  }

  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100 dark:border-gray-800">
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
          {"댓글"} {comments.length > 0 && <span className="text-gray-400 dark:text-gray-500 font-normal">{comments.length}</span>}
        </h3>
      </div>

      <div className="divide-y divide-gray-50 dark:divide-gray-800">
        {loading && (
          <div className="p-6 text-center">
            <span className="text-sm text-gray-400 dark:text-gray-500">{"불러오는 중..."}</span>
          </div>
        )}

        {!loading && comments.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-400 dark:text-gray-500">{"첫 댓글을 남겨보세요"}</p>
          </div>
        )}

        {comments.map((comment) => (
          <div key={comment.id} className="p-4">
            {confirmDeleteId === comment.id ? (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">{"삭제할까요?"}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold min-h-[36px]"
                  >
                    {"삭제"}
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 min-h-[36px]"
                  >
                    {"취소"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2.5">
                <Avatar nickname={comment.nickname} avatarUrl={comment.avatarUrl} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{comment.nickname}</span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">{relativeTime(comment.created_at)}</span>
                    {comment.userId === currentUserId && editingId !== comment.id && (
                      <div className="relative ml-auto" ref={menuOpenId === comment.id ? menuRef : undefined}>
                        <button
                          onClick={() => setMenuOpenId(menuOpenId === comment.id ? null : comment.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          {"⋯"}
                        </button>
                        {menuOpenId === comment.id && (
                          <div className="absolute right-0 top-full mt-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden min-w-[80px]">
                            <button
                              onClick={() => startEdit(comment)}
                              className="w-full px-3 py-2 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 min-h-[36px]"
                            >
                              {"수정"}
                            </button>
                            <button
                              onClick={() => startDelete(comment.id)}
                              className="w-full px-3 py-2 text-left text-xs text-red-500 hover:bg-gray-50 dark:hover:bg-gray-800 min-h-[36px]"
                            >
                              {"삭제"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {editingId === comment.id ? (
                    <div className="mt-1.5 space-y-2">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(comment.id)}
                          disabled={!editContent.trim() || editSaving}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold disabled:opacity-50 min-h-[32px]"
                        >
                          {editSaving ? "저장 중..." : "저장"}
                        </button>
                        <button
                          onClick={() => { setEditingId(null); setEditContent(""); }}
                          className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 min-h-[32px]"
                        >
                          {"취소"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 break-words">{comment.content}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="sticky bottom-0 p-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1a1a]">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) handleSend(); }}
            placeholder={"댓글을 입력하세요..."}
            className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 min-h-[44px]"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50 transition-colors min-h-[44px] min-w-[44px]"
          >
            {sending ? "..." : "전송"}
          </button>
        </div>
        {error && (
          <p className="text-xs text-red-500 dark:text-red-400 mt-1.5">{error}</p>
        )}
      </div>
    </div>
  );
}
