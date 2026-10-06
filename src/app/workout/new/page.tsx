"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface MediaFile {
  file: File;
  preview: string;
  type: "photo" | "video";
}

export default function NewWorkoutPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newFiles = Array.from(e.target.files ?? []);
    const mediaFiles = newFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      type: (file.type.startsWith("video") ? "video" : "photo") as "photo" | "video",
    }));
    setFiles((prev) => [...prev, ...mediaFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(index: number) {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (files.length === 0) {
      setError("사진을 1장 이상 올려주세요.");
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    const oversized = files.find((f) => f.file.size > maxSize);
    if (oversized) {
      setError(`${oversized.file.name}의 크기가 10MB를 초과합니다.`);
      return;
    }

    setLoading(true);

    try {
      const uploadedMedia: { r2_key: string; type: "photo" | "video"; size_bytes: number }[] = [];

      for (const mediaFile of files) {
        const ext = mediaFile.file.name.split(".").pop() ?? "jpg";
        const res = await fetch("/api/media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentType: mediaFile.file.type, fileExtension: ext }),
        });

        if (!res.ok) throw new Error("업로드 URL 생성 실패");
        const { uploadUrl, key } = await res.json();

        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          body: mediaFile.file,
          headers: { "Content-Type": mediaFile.file.type },
        });

        if (!uploadRes.ok) throw new Error("파일 업로드 실패");

        uploadedMedia.push({
          r2_key: key,
          type: mediaFile.type,
          size_bytes: mediaFile.file.size,
        });
      }

      const res = await fetch("/api/workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, note, media: uploadedMedia }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message ?? "인증 등록 실패");
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다");
      setLoading(false);
    }
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-dvh px-4 py-6 max-w-lg mx-auto">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">🏋️ 운동 인증</h1>
        <Link href="/" className="text-sm text-blue-600 hover:underline">← 대시보드</Link>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">날짜</label>
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 rounded border border-gray-300 text-sm bg-white text-gray-900"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">사진 / 영상</label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
          >
            <p className="text-gray-500 text-sm">탭하여 사진/영상 추가</p>
            <p className="text-gray-400 text-xs mt-1">영상은 10MB 이내</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {files.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {files.map((f, i) => (
              <div key={i} className="relative aspect-square rounded overflow-hidden bg-gray-100">
                {f.type === "photo" ? (
                  <img src={f.preview} alt="" className="w-full h-full object-cover" />
                ) : (
                  <video src={f.preview} className="w-full h-full object-cover" />
                )}
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full text-xs flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">운동 내용 (선택)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="오늘 한 운동을 간단히 메모하세요"
            rows={2}
            className="w-full px-3 py-2 rounded border border-gray-300 text-sm bg-white text-gray-900 resize-none"
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "업로드 중..." : "인증 완료"}
        </button>
      </form>
    </div>
  );
}
