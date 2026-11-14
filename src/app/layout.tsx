import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { InlineScript } from "@/components/InlineScript";
import { ThemeToggle, themeScript } from "@/components/ThemeToggle";
import { getCatalog } from "@/lib/content/loader";
import { ProgressProvider } from "@/lib/progress/ProgressProvider";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Stack Quest", template: "%s · Stack Quest" },
  description: "Learn full-stack web development from zero, one short unit at a time.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f4" },
    { media: "(prefers-color-scheme: dark)", color: "#121311" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const catalog = await getCatalog();

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Runs before the page appears, so dark-mode users never see a white flash. */}
        <InlineScript html={themeScript} />
      </head>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2"
        >
          Skip to content
        </a>
        <ProgressProvider catalog={catalog}>
          <header className="border-b border-border bg-surface">
            <nav aria-label="Main" className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-2">
              <Link href="/" className="mr-auto flex min-h-11 items-center gap-2 font-bold">
                <span aria-hidden="true" className="text-xl">
                  🧭
                </span>
                Stack Quest
              </Link>
              <Link href="/glossary" className="inline-flex min-h-11 items-center rounded-full px-3 text-sm hover:bg-surface-2">
                Glossary
              </Link>
              <Link href="/profile" className="inline-flex min-h-11 items-center rounded-full px-3 text-sm hover:bg-surface-2">
                Profile
              </Link>
              <ThemeToggle />
            </nav>
          </header>
          <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
            {children}
          </main>
        </ProgressProvider>
      </body>
    </html>
  );
}
