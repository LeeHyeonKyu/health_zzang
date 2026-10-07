import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";

let ffmpeg: FFmpeg | null = null;
let progressCallback: ((ratio: number) => void) | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg && ffmpeg.loaded) return ffmpeg;

  ffmpeg = new FFmpeg();

  ffmpeg.on("progress", ({ progress }) => {
    if (progressCallback) {
      progressCallback(Math.max(0, Math.min(progress, 1)));
    }
  });

  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm";
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });

  return ffmpeg;
}

export interface CompressResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  skipped: boolean;
}

const SKIP_THRESHOLD = 5 * 1024 * 1024;

export async function compressVideo(
  file: File,
  onProgress?: (ratio: number) => void
): Promise<CompressResult> {
  const originalSize = file.size;

  if (originalSize <= SKIP_THRESHOLD) {
    return { file, originalSize, compressedSize: originalSize, skipped: true };
  }

  try {
    progressCallback = onProgress ?? null;
    const ff = await getFFmpeg();

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "mp4";
    const inputName = `input.${ext}`;
    const outputName = "output.mp4";

    await ff.writeFile(inputName, await fetchFile(file));

    await ff.exec([
      "-i", inputName,
      "-vf", "scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease",
      "-c:v", "libx264",
      "-preset", "fast",
      "-b:v", "1M",
      "-c:a", "aac",
      "-b:a", "128k",
      "-movflags", "+faststart",
      "-y",
      outputName,
    ]);

    const data = await ff.readFile(outputName);
    const blob = new Blob([new Uint8Array(data as Uint8Array)], { type: "video/mp4" });
    const compressedFile = new File(
      [blob],
      file.name.replace(/\.\w+$/, ".mp4"),
      { type: "video/mp4" }
    );

    await ff.deleteFile(inputName).catch(() => {});
    await ff.deleteFile(outputName).catch(() => {});

    progressCallback = null;

    if (compressedFile.size >= originalSize) {
      return { file, originalSize, compressedSize: originalSize, skipped: true };
    }

    return {
      file: compressedFile,
      originalSize,
      compressedSize: compressedFile.size,
      skipped: false,
    };
  } catch (error) {
    console.error("Video compression failed:", error);
    progressCallback = null;
    return { file, originalSize, compressedSize: originalSize, skipped: true };
  }
}
