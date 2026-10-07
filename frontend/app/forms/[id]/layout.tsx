"use client";

import { ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FormContext, type FormCtx } from "@/components/builder/FormContext";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import type { Form } from "@/lib/types";

const TABS = ["create", "workflow", "connect", "share", "results"] as const;

export default function FormLayout({ children }: { children: React.ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  const toast = useToast();
  const [form, setForm] = useState<Form | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState<FormCtx["saving"]>("idle");
  const flushRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    api.getForm(Number(id)).then(setForm).catch(() => setNotFound(true));
  }, [id]);

  if (notFound)
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3">
        <p>Form not found.</p>
        <Link href="/" className="underline">Back to workspace</Link>
      </div>
    );
  if (!form)
    return (
      <div className="flex h-screen items-center justify-center text-muted">
        <Loader2 className="animate-spin" />
      </div>
    );

  const rename = async (title: string) => {
    title = title.trim();
    if (!title || title === form.title) return;
    try {
      const f = await api.updateForm(form.id, { title });
      setForm((cur) => ({ ...cur!, title: f.title }));
      toast("Form renamed");
    } catch {
      toast("Couldn't rename form", "error");
    }
  };

  const togglePublish = async () => {
    try {
      await flushRef.current?.();
      const f = form.status === "published" ? await api.unpublish(form.id) : await api.publish(form.id);
      setForm((cur) => ({ ...cur!, status: f.status, slug: f.slug, published_at: f.published_at }));
      toast(f.status === "published" ? "Your form is live! Share the link to collect responses." : "Form unpublished");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't update form", "error");
    }
  };

  const tab = pathname.split("/").pop();

  return (
    <FormContext.Provider value={{ form, setForm: setForm as FormCtx["setForm"], flushRef, saving, setSaving }}>
      <div className="flex h-screen flex-col bg-[#f4f2ec]">
        <header className="relative flex h-14 shrink-0 items-center gap-3 border-b border-[#d8d3c7] bg-[#fffdf9] px-4">
          <div className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
            <Logo />
            <ChevronRight size={14} className="ml-2 text-muted" />
            <Link href="/" className="hidden text-muted hover:text-ink sm:inline">My workspace</Link>
            <ChevronRight size={14} className="hidden text-muted sm:inline" />
            <input
              key={form.title}
              defaultValue={form.title}
              aria-label="Form title"
              onBlur={(e) => rename(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              className="min-w-0 max-w-64 truncate rounded px-1.5 py-1 font-medium outline-none hover:bg-hover focus:bg-hover"
            />
            <span className="ml-1 hidden text-xs text-muted lg:inline">
              {saving === "saving" ? "Saving…" : saving === "saved" ? "Saved" : saving === "error" ? "Not saved" : ""}
            </span>
          </div>

          <nav className="absolute left-1/2 hidden h-full -translate-x-1/2 md:flex">
            {TABS.map((t) => (
              <Link
                key={t}
                href={`/forms/${form.id}/${t}`}
                className={`flex items-center border-b-2 px-3 text-sm capitalize ${tab === t ? "border-[#e07b4f] font-medium text-[#173f35]" : "border-transparent text-muted hover:text-[#173f35]"}`}
              >
                {t}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline"><StatusBadge status={form.status} /></span>
            <Button variant={form.status === "published" ? "outline" : "primary"} className={form.status === "published" ? "" : "bg-[#e07b4f] hover:bg-[#c9633c]"} onClick={togglePublish}>
              {form.status === "published" ? "Unpublish" : "Publish"}
            </Button>
          </div>
        </header>
        {/* Mobile tab bar */}
        <nav className="flex shrink-0 overflow-x-auto border-b border-[#d8d3c7] bg-[#fffdf9] md:hidden">
          {TABS.map((t) => (
            <Link key={t} href={`/forms/${form.id}/${t}`} className={`border-b-2 px-3 py-2 text-sm capitalize ${tab === t ? "border-[#e07b4f] font-medium text-[#173f35]" : "border-transparent text-muted"}`}>
              {t}
            </Link>
          ))}
        </nav>
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </FormContext.Provider>
  );
}
