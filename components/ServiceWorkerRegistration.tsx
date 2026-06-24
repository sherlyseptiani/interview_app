"use client";

import { useEffect } from "react";

const CACHE_PREFIX = "sherly-interview-sprint-";

function isLocalhost(): boolean {
  return ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
}

async function clearAppServiceWorkerState(): Promise<void> {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations
      .filter((registration) => registration.scope === `${window.location.origin}/`)
      .map((registration) => registration.unregister())
  );

  if ("caches" in window) {
    const cacheKeys = await window.caches.keys();
    await Promise.all(cacheKeys.filter((key) => key.startsWith(CACHE_PREFIX)).map((key) => window.caches.delete(key)));
  }
}

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof navigator === "undefined" ||
      !("serviceWorker" in navigator) ||
      !window.location.protocol.startsWith("http")
    ) {
      return;
    }

    if (process.env.NODE_ENV !== "production" || isLocalhost()) {
      void clearAppServiceWorkerState();
      return;
    }

    void navigator.serviceWorker.register("/sw.js");
  }, []);

  return null;
}
