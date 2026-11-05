import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "LendLoop — Borrow what you need. Lend what you don’t.",
  description: "A neighborhood tool-lending board. Share a little, build a lot.",
};

async function RequestTimeProviders({ children }: { children: React.ReactNode }) {
  await connection();
  return <Providers>{children}</Providers>;
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={<div className="loading-screen">Getting your toolshed ready…</div>}>
          <RequestTimeProviders>{children}</RequestTimeProviders>
        </Suspense>
      </body>
    </html>
  );
}
