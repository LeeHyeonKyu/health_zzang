"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type Platform = "android" | "ios-safari" | "ios-other" | "desktop";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface PWAInstallState {
  isInstalled: boolean;
  isIOS: boolean;
  isIOSSafari: boolean;
  canInstall: boolean;
  promptInstall: () => void;
  platform: Platform;
}

function detectPlatform(): { isIOS: boolean; isIOSSafari: boolean; platform: Platform } {
  if (typeof window === "undefined") {
    return { isIOS: false, isIOSSafari: false, platform: "desktop" };
  }

  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  if (isIOS) {
    const isIOSSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua);
    return { isIOS, isIOSSafari, platform: isIOSSafari ? "ios-safari" : "ios-other" };
  }

  if (/Android/.test(ua)) {
    return { isIOS: false, isIOSSafari: false, platform: "android" };
  }

  return { isIOS: false, isIOSSafari: false, platform: "desktop" };
}

function checkInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as Record<string, unknown>).standalone === true
  );
}

export function usePWAInstall(): PWAInstallState {
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(checkInstalled);
  const [platformInfo] = useState(detectPlatform);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };

    const onAppInstalled = () => {
      deferredPrompt.current = null;
      setCanInstall(false);
      setIsInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(() => {
    deferredPrompt.current?.prompt();
  }, []);

  return {
    isInstalled,
    isIOS: platformInfo.isIOS,
    isIOSSafari: platformInfo.isIOSSafari,
    canInstall,
    promptInstall,
    platform: platformInfo.platform,
  };
}
