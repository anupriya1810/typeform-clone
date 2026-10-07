import Link from "next/link";

// Own wordmark on purpose: Typeform's logo is a trademark, so the UI mimics the layout, not the brand.
export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-1.5 text-[17px] font-semibold tracking-tight text-ink">
      <span className="inline-block h-4 w-2.5 rounded-sm bg-ink" />
      formly
    </Link>
  );
}
