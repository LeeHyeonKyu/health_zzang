import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Health Zzang",
  description: "운동 크루 인증 & 벌금 집계",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
