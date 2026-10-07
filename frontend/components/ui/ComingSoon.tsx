import type { LucideIcon } from "lucide-react";

export function ComingSoon({ items }: { items: { icon: LucideIcon; title: string; body: string }[] }) {
  return (
    <div className="h-full overflow-y-auto bg-canvas p-6 md:p-10">
      <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
        {items.map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-xl border border-line bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-hover"><Icon size={20} /></span>
              <span className="rounded-full bg-[#fff1c9] px-2.5 py-0.5 text-xs font-medium text-[#7a5b00]">Coming soon</span>
            </div>
            <h2 className="font-medium">{title}</h2>
            <p className="mt-1 text-sm text-muted">{body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
