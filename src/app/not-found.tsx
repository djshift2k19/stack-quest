import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-12 text-center">
      <p className="text-5xl" aria-hidden="true">
        🧭
      </p>
      <h1 className="mt-4 text-2xl font-bold">We couldn&apos;t find that page</h1>
      <p className="mt-2 text-muted">
        This is called a <strong>404 error</strong>: the web address doesn&apos;t match any page. It may have a typo, or
        the lesson may have moved.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex min-h-11 items-center rounded-full bg-accent px-5 font-semibold text-accent-contrast"
      >
        Back to the dashboard
      </Link>
    </div>
  );
}
