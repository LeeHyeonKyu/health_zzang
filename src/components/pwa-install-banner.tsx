"use client";

import { useState, useSyncExternalStore } from "react";
import { usePWAInstall } from "@/hooks/use-pwa-install";

const DISMISS_KEY = "pwa-banner-dismissed";
const DISMISS_DAYS = 7;

function subscribeToDismiss(callback: () => void) {
  const handler = (e: StorageEvent) => {
    if (e.key === DISMISS_KEY) callback();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

function getDismissSnapshot(): boolean {
  try {
    const val = localStorage.getItem(DISMISS_KEY);
    if (!val) return false;
    return Date.now() - new Date(val).getTime() < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function getServerSnapshot(): boolean {
  return true;
}

function saveDismiss() {
  try {
    localStorage.setItem(DISMISS_KEY, new Date().toISOString());
  } catch {
    // ignore
  }
}

export default function PWAInstallBanner() {
  const { isInstalled, isIOSSafari, canInstall, promptInstall, platform } = usePWAInstall();
  const wasDismissed = useSyncExternalStore(subscribeToDismiss, getDismissSnapshot, getServerSnapshot);
  const [localDismissed, setLocalDismissed] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const shouldShow =
    !isInstalled &&
    !wasDismissed &&
    !localDismissed &&
    (canInstall || platform === "ios-safari" || platform === "ios-other");

  if (!shouldShow) return null;

  const handleDismiss = () => {
    saveDismiss();
    setLocalDismissed(true);
  };

  const handleInstall = () => {
    if (canInstall) {
      promptInstall();
      return;
    }
    if (isIOSSafari) {
      setShowGuide((prev) => !prev);
    }
  };

  return (
    <div className="bg-blue-50 dark:bg-blue-950 border-b border-blue-100 dark:border-blue-900">
      <div className="max-w-screen-sm md:max-w-screen-md mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-blue-800 dark:text-blue-200 flex-1">
            💪 헬스짱을 홈 화면에 추가하세요!
          </p>
          {platform === "ios-other" ? (
            <span className="text-xs text-blue-600 dark:text-blue-400 whitespace-nowrap">
              Safari에서 열어주세요
            </span>
          ) : (
            <button
              onClick={handleInstall}
              className="bg-blue-600 text-white text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              앱 설치
            </button>
          )}
          <button
            onClick={handleDismiss}
            className="text-blue-400 dark:text-blue-500 hover:text-blue-600 transition-colors"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
        {showGuide && isIOSSafari && (
          <div className="mt-2 pt-2 border-t border-blue-100 dark:border-blue-900 space-y-1">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              ① 하단 공유 버튼(□↑)을 탭하세요
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              ② &apos;홈 화면에 추가&apos;를 선택하세요
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
