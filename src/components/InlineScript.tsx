"use client";

/**
 * A tiny script that runs while the page is first loading, before anything
 * is shown (pattern from the Next.js guide "Preventing Flash").
 *
 * On the server it's a normal script. In the browser React would otherwise
 * warn about rendering a <script>, so there it's marked as plain text,
 * which never runs twice.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
