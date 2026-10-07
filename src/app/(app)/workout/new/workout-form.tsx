"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface MediaFile {
  file: File;
  preview: string;
  type: "photo" | "video";
}

interface Props {
  crewMembers: { id: string; nickname: string }[];
}

const MAX_FILE_SIZE = 20 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

async function compressImage(file: File, maxWidth = 1920, quality = 0.8): Promise<File> {
  if (file.size <= 1024 * 1024) return file;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            resolve(file);
            return;
          }
          resolve(new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }));
        },
        "image/jpeg",
        quality
      );
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

export default function WorkoutForm({ crewMembers }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [taggedIds, setTaggedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [compressing, setCompressing] = useState(false);
  const [compressProgress, setCompressProgress] = useState(0);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newFiles = Array.from(e.target.files ?? []);
    const accepted: MediaFile[] = [];
    let compressed = false;

    const infoMessages: string[] = [];

    for (const file of newFiles) {
      let processedFile = file;
      const isImage = file.type.startsWith("image");
      const isVideo = file.type.startsWith("video");

      if (isImage && file.size > 1024 * 1024) {
        processedFile = await compressImage(file);
        if (processedFile.size < file.size) compressed = true;
      }

      if (isVideo && file.size > 5 * 1024 * 1024) {
        setCompressing(true);
        setCompressProgress(0);
        setError("");
        try {
          const { compressVideo } = await import("@/lib/video-compress");
          const result = await compressVideo(file, setCompressProgress);
          processedFile = result.file;
          if (!result.skipped) {
            infoMessages.push(`영상 압축: ${formatFileSize(result.originalSize)} → ${formatFileSize(result.compressedSize)}`);
          }
        } catch {
          // Compression failed, use original
        }
        setCompressing(false);
      }

      if (processedFile.size > MAX_FILE_SIZE) {
        setError(`파일이 20MB를 초과합니다 (${formatFileSize(processedFile.size)}). 촬영 설정에서 해상도를 낮춰주세요.`);
        continue;
      }

      accepted.push({
        file: processedFile,
        preview: URL.createObjectURL(processedFile),
        type: isImage ? "photo" : "video",
      });
    }

    if (compressed) infoMessages.push("이미지 자동 압축됨");
    if (infoMessages.length > 0) {
      setInfo(infoMessages.join(" · "));
      setTimeout(() => setInfo(""), 5000);
    }

    setFiles((prev) => [...prev, ...accepted]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(index: number) {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
    setError("");
  }

  function toggleTag(id: string) {
    setTaggedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (files.length === 0) {
      setError("사진을 1장 이상 올려주세요.");
      return;
    }

    setLoading(true);

    try {
      const uploadedMedia: { r2_key: string; type: "photo" | "video"; size_bytes: number }[] = [];

      for (let i = 0; i < files.length; i++) {
        const mediaFile = files[i];
        setUploadProgress(`업로드 중 (${i + 1}/${files.length})...`);

        const ext = mediaFile.file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const res = await fetch("/api/media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentType: mediaFile.file.type, fileExtension: ext }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error?.message ?? "업로드 URL 생성에 실패했습니다");
        }

        const { uploadUrl, key } = await res.json();

        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          body: mediaFile.file,
          headers: { "Content-Type": mediaFile.file.type },
        });

        if (!uploadRes.ok) {
          throw new Error(`파일 업로드에 실패했습니다 (${uploadRes.status}). 다시 시도해주세요.`);
        }

        uploadedMedia.push({ r2_key: key, type: mediaFile.type, size_bytes: mediaFile.file.size });
      }

      setUploadProgress("저장 중...");

      const res = await fetch("/api/workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          note,
          media: uploadedMedia,
          tagged_with: taggedIds.length > 0 ? taggedIds : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message ?? "인증 등록에 실패했습니다");
      }

      router.push("/records");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다. 다시 시도해주세요.");
      setLoading(false);
      setUploadProgress("");
    }
  }

  const today = new Date().toISOString().split("T")[0];
  const totalBytes = files.reduce((sum, f) => sum + f.file.size, 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">날짜</label>
        <input
          type="date"
          value={date}
          max={today}
          onChange={(e) => setDate(e.target.value)}
          className="input-base"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">사진 / 영상</label>
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
        >
          <p className="text-gray-500 dark:text-gray-400 text-sm">탭하여 사진/영상 추가</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">이미지·영상 자동 압축</p>
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
        <>
          <div className="grid grid-cols-3 gap-2">
            {files.map((f, i) => (
              <div key={i} className={`relative rounded overflow-hidden bg-gray-100 dark:bg-gray-800 ${f.type === "photo" ? "aspect-square" : "aspect-video"}`}>
                {f.type === "photo" ? (
                  <img src={f.preview} alt="" className="w-full h-full object-cover" />
                ) : (
                  <video src={f.preview} className="w-full h-full object-contain bg-black" />
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1 py-0.5 text-center">
                  {f.type === "video" ? "🎬 " : ""}{formatFileSize(f.file.size)}
                </div>
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
          <p className="text-xs text-gray-400 dark:text-gray-500">총 {formatFileSize(totalBytes)}</p>
        </>
      )}

      {compressing && (
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-100 dark:border-blue-900 rounded-lg p-3">
          <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">영상 압축 중... {Math.round(compressProgress * 100)}%</p>
          <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${Math.round(compressProgress * 100)}%` }}
            />
          </div>
        </div>
      )}

      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">운동 내용 (선택)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="오늘 한 운동을 간단히 메모하세요"
          rows={2}
          className="input-base resize-none"
        />
      </div>

      {crewMembers.length > 0 && (
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">함께 운동한 크루원 (선택)</label>
          <div className="flex flex-wrap gap-2">
            {crewMembers.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleTag(m.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  taggedIds.includes(m.id)
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {taggedIds.includes(m.id) ? "✓ " : ""}{m.nickname}
              </button>
            ))}
          </div>
          {taggedIds.length > 0 && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              {taggedIds.length}명에게도 이 날짜의 운동 기록이 자동 추가됩니다
            </p>
          )}
        </div>
      )}

      {info && <p className="text-green-600 dark:text-green-400 text-sm">{info}</p>}
      {error && <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? uploadProgress || "처리 중..." : "인증 완료"}
      </button>
    </form>
  );
}
