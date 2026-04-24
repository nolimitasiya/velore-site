"use client";

import { useEffect } from "react";

type Props = {
  diaryPostId: string;
  delayMs?: number;
};

function getSessionKey(diaryPostId: string) {
  return `vc_diary_sent_${diaryPostId}`;
}

export default function DiaryReadTracker({
  diaryPostId,
  delayMs = 15000,
}: Props) {
  useEffect(() => {
    if (!diaryPostId) return;
    if (typeof window === "undefined") return;

    const sessionKey = getSessionKey(diaryPostId);

    if (window.sessionStorage.getItem(sessionKey) === "1") {
      return;
    }

    let sent = false;
    let visibleSince: number | null =
      document.visibilityState === "visible" ? Date.now() : null;
    let accumulatedVisibleMs = 0;

    async function sendRead() {
      if (sent) return;
      if (window.sessionStorage.getItem(sessionKey) === "1") return;

      try {
        const res = await fetch("/api/diary/read", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            diaryPostId,
            sourcePage: "diary_post",
          }),
        });

        const json = await res.json().catch(() => null);

        if (res.ok) {
          window.sessionStorage.setItem(sessionKey, "1");
          sent = true;
        }

        console.log("[DiaryReadTracker]", {
          diaryPostId,
          ok: res.ok,
          status: res.status,
          json,
        });
      } catch (error) {
        console.error("[DiaryReadTracker] failed", error);
      }
    }

    function checkAndSendIfNeeded() {
      if (sent) return;
      if (window.sessionStorage.getItem(sessionKey) === "1") return;

      let totalVisible = accumulatedVisibleMs;

      if (visibleSince !== null) {
        totalVisible += Date.now() - visibleSince;
      }

      if (totalVisible >= delayMs) {
        void sendRead();
      }
    }

    const interval = window.setInterval(checkAndSendIfNeeded, 1000);

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        visibleSince = Date.now();
      } else {
        if (visibleSince !== null) {
          accumulatedVisibleMs += Date.now() - visibleSince;
          visibleSince = null;
        }
      }

      checkAndSendIfNeeded();
    }

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);

      if (visibleSince !== null) {
        accumulatedVisibleMs += Date.now() - visibleSince;
        visibleSince = null;
      }
    };
  }, [diaryPostId, delayMs]);

  return null;
}