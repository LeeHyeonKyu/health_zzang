"use client";

import { useState } from "react";
import { usePWAInstall } from "@/hooks/use-pwa-install";

export default function PWAInstallSettings() {
  const { isInstalled, isIOSSafari, canInstall, promptInstall, platform } = usePWAInstall();
  const [copied, setCopied] = useState(false);

  function handleCopyUrl() {
    navigator.clipboard.writeText(window.location.origin).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function renderContent() {
    if (isInstalled) {
      return (
        <p className="text-sm text-green-600 dark:text-green-400">
          ✅ 이미 앱으로 사용 중입니다
        </p>
      );
    }

    if (canInstall) {
      return (
        <>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            홈 화면에 추가하면 앱처럼 바로 접근할 수 있어요
          </p>
          <button
            onClick={promptInstall}
            className="w-full py-3 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            앱 설치하기
          </button>
        </>
      );
    }

    if (isIOSSafari) {
      return (
        <>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            홈 화면에 추가하면 앱처럼 바로 접근할 수 있어요
          </p>
          <div className="space-y-2 pl-1">
            <p className="text-sm text-gray-600 dark:text-gray-400 py-1">
              ① 하단의 공유 버튼(□↑)을 탭하세요
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 py-1">
              ② &apos;홈 화면에 추가&apos;를 선택하세요
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 py-1">
              ③ 우측 상단 &apos;추가&apos;를 탭하면 완료!
            </p>
          </div>
        </>
      );
    }

    if (platform === "ios-other") {
      return (
        <>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Safari 브라우저에서 이 페이지를 열면 홈 화면에 추가할 수 있습니다
          </p>
          <button
            onClick={handleCopyUrl}
            className="w-full py-3 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {copied ? "URL 복사됨!" : "URL 복사하기"}
          </button>
        </>
      );
    }

    // desktop
    return (
      <p className="text-sm text-gray-600 dark:text-gray-400">
        모바일 브라우저에서 접속하면 홈 화면에 추가할 수 있어요
      </p>
    );
  }

  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
      <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4">앱 설치</h3>
      {renderContent()}
    </div>
  );
}
