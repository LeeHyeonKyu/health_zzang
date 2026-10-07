"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { compressImage } from "@/lib/image-compress";

interface Props {
  currentAvatarUrl: string | null;
  nickname: string;
}

export default function AvatarUpload({ currentAvatarUrl, nickname }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState(currentAvatarUrl);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image")) return;

    setLoading(true);

    try {
      const compressed = await compressImage(file, 512, 0.85);

      const res = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: compressed.type,
          fileExtension: compressed.name.split(".").pop() ?? "jpg",
        }),
      });
      if (!res.ok) throw new Error("URL 생성 실패");
      const { uploadUrl, key } = await res.json();

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: compressed,
        headers: { "Content-Type": compressed.type },
      });
      if (!uploadRes.ok) throw new Error("업로드 실패");

      const patchRes = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_r2_key: key }),
      });
      if (!patchRes.ok) throw new Error("프로필 업데이트 실패");

      setAvatarSrc(URL.createObjectURL(compressed));
      router.refresh();
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemove() {
    setLoading(true);
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_r2_key: null }),
      });
      setAvatarSrc(null);
      router.refresh();
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  const firstChar = nickname.charAt(0);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <div className="w-20 h-20 rounded-full overflow-hidden bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-2xl font-bold text-blue-600 dark:text-blue-300">
          {avatarSrc ? (
            <img src={avatarSrc} alt={nickname} className="w-full h-full object-cover" />
          ) : (
            firstChar
          )}
        </div>
        {loading && (
          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
        >
          사진 변경
        </button>
        {avatarSrc && (
          <>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <button
              onClick={handleRemove}
              disabled={loading}
              className="text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-50"
            >
              삭제
            </button>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
