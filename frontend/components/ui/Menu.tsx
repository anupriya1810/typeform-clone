"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export type MenuItem = { label: string; icon?: ReactNode; onClick: () => void; danger?: boolean };

/** Click-to-open popover menu that closes on outside click / Escape. */
export function Menu({ trigger, items, align = "right" }: { trigger: ReactNode; items: MenuItem[]; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="rounded-md p-1.5 text-muted hover:bg-hover"
      >
        {trigger}
      </button>
      {open && (
        <div
          role="menu"
          className={`animate-pop absolute z-30 mt-1 min-w-48 rounded-lg border border-line bg-white py-1 shadow-xl ${align === "right" ? "right-0" : "left-0"}`}
        >
          {items.map((it) => (
            <button
              key={it.label}
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                it.onClick();
              }}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-hover ${it.danger ? "text-[#c41f1f]" : ""}`}
            >
              {it.icon}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
      {label}
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition-colors ${checked ? "bg-ink" : "bg-[#c8c8c8]"}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
      </button>
    </label>
  );
}
