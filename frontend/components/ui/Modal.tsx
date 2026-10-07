"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

export function Modal({
  title,
  onClose,
  children,
  width = "max-w-md",
}: {
  title?: string;
  onClose: () => void;
  children: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="animate-fade fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`animate-pop relative w-full ${width} rounded-xl bg-white p-6 shadow-2xl`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 rounded p-1 text-muted hover:bg-hover">
          <X size={18} />
        </button>
        {title && <h2 className="mb-4 pr-8 text-xl font-medium">{title}</h2>}
        {children}
      </div>
    </div>
  );
}

/** Text-input modal used for create + rename. */
export function PromptModal({
  title,
  initial = "",
  confirm,
  onSubmit,
  onClose,
}: {
  title: string;
  initial?: string;
  confirm: string;
  onSubmit: (value: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const v = String(new FormData(e.currentTarget).get("value") ?? "").trim();
          if (v) onSubmit(v);
        }}
      >
        <input
          name="value"
          defaultValue={initial}
          autoFocus
          maxLength={200}
          className="w-full rounded-md border border-line px-3 py-2 outline-none focus:border-ink"
        />
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit">{confirm}</Button>
        </div>
      </form>
    </Modal>
  );
}

export function ConfirmModal({
  title,
  body,
  confirm,
  onConfirm,
  onClose,
}: {
  title: string;
  body: ReactNode;
  confirm: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <div className="text-sm text-muted">{body}</div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm} autoFocus>{confirm}</Button>
      </div>
    </Modal>
  );
}

const VARIANTS = {
  primary: "bg-ink text-white hover:bg-black",
  ghost: "text-ink hover:bg-hover",
  outline: "border border-line bg-white text-ink hover:bg-hover",
  danger: "bg-[#c41f1f] text-white hover:bg-[#a81919]",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof VARIANTS }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
    />
  );
}
