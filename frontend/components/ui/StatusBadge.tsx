export function StatusBadge({ status }: { status: "draft" | "published" }) {
  return status === "published" ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e3f5ea] px-2.5 py-0.5 text-xs font-medium text-[#13703a]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#13a04f]" /> Live
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-hover px-2.5 py-0.5 text-xs font-medium text-muted">
      <span className="h-1.5 w-1.5 rounded-full bg-[#9a9a9a]" /> Draft
    </span>
  );
}
