import type { Metadata, Viewport } from "next";
import Script from "next/script";
import type { ReactNode } from "react";

import { ServiceWorkerRegistration } from "../components/ServiceWorkerRegistration";
import { THEME_COLORS, THEME_STORAGE_KEY } from "../lib/theme";
import "./globals.css";

const isReactDevToolingEnabled =
  process.env.NODE_ENV === "development" &&
  process.env["NEXT_PUBLIC_ENABLE_REACT_DEVTOOLS"] === "1";

const themeInitScript = `
(() => {
  const storageKey = ${JSON.stringify(THEME_STORAGE_KEY)};
  const colors = ${JSON.stringify(THEME_COLORS)};
  const root = document.documentElement;
  const prefersLight = () => typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: light)").matches;
  let theme = prefersLight() ? "light" : "dark";
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored === "light" || stored === "dark") theme = stored;
  } catch (_) {}
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  let meta = document.querySelector('meta[name="theme-color"]');
  if (meta === null) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", colors[theme]);
})();
`;

export const metadata: Metadata = {
  applicationName: "Sherly Technical Interview Sprint",
  description:
    "A responsive 42-day technical interview preparation tracker with calendar streaks, checklists, learning links, notes, and a 60-minute focus timer.",
  title: "Sherly's Technical Interview Sprint"
};

export const viewport: Viewport = {
  initialScale: 1,
  themeColor: "#f7f8fc",
  viewportFit: "cover",
  width: "device-width"
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        {isReactDevToolingEnabled ? (
          <>
            <Script
              src="https://unpkg.com/react-grab/dist/index.global.js"
              crossOrigin="anonymous"
              strategy="afterInteractive"
            />
            <Script
              src="https://unpkg.com/react-scan/dist/auto.global.js"
              crossOrigin="anonymous"
              strategy="afterInteractive"
            />
          </>
        ) : null}
      </head>
      <body>
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
