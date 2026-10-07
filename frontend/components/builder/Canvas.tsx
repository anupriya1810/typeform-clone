"use client";

import { Eye, Monitor, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";
import { FormRunner, themeStyle } from "@/components/renderer/FormRunner";
import { QuestionView } from "@/components/renderer/QuestionView";
import type { Form, Question } from "@/lib/types";
import type { Selection } from "./QuestionList";

/** Live preview: the selected screen rendered with the real respondent components, editable in place. */
export function Canvas({
  form,
  selection,
  onQuestion,
  onMeta,
  flush,
}: {
  form: Form;
  selection: Selection;
  onQuestion: (key: string, patch: Partial<Question>) => void;
  onMeta: (patch: Partial<Form>) => void;
  /** Save first so new choices have server ids the preview can select. */
  flush: () => Promise<void>;
}) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [preview, setPreview] = useState(false);
  const index = selection.kind === "question" ? form.questions.findIndex((q) => q.key === selection.key) : -1;
  const q = form.questions[index];
  const font = form.theme.font === "serif" ? "font-serif" : form.theme.font === "mono" ? "font-mono" : "";

  let body: React.ReactNode = <p className="tf-muted">Add your first question to get started.</p>;
  if (selection.kind === "welcome") {
    body =
      form.welcome_title == null ? (
        <p className="tf-muted text-center">Welcome screen is off. Turn it on in the panel on the right.</p>
      ) : (
        <ScreenEditor
          title={form.welcome_title}
          message={form.welcome_message ?? ""}
          onTitle={(welcome_title) => onMeta({ welcome_title })}
          onMessage={(m) => onMeta({ welcome_message: m || null })}
          button="Start"
        />
      );
  } else if (selection.kind === "ending") {
    body = (
      <ScreenEditor
        title={form.thank_you_title}
        message={form.thank_you_message}
        onTitle={(thank_you_title) => onMeta({ thank_you_title })}
        onMessage={(thank_you_message) => onMeta({ thank_you_message })}
      />
    );
  } else if (q) {
    body = <QuestionView key={q.key} q={q} number={index + 1} live={false} onEdit={(patch) => onQuestion(q.key, patch)} />;
  }

  return (
    <section className="builder-canvas flex min-w-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-1 px-5 pt-4">
        <div>
          <p className="builder-label">Live canvas</p>
          <p className="mt-1 hidden text-xs text-muted sm:block">Shape the experience as your audience will see it.</p>
        </div>
        <div className="flex items-center gap-1">
        <button aria-label="Desktop preview" onClick={() => setDevice("desktop")} className={`rounded p-1.5 ${device === "desktop" ? "bg-white shadow-sm" : "text-muted"}`}>
          <Monitor size={16} />
        </button>
        <button aria-label="Mobile preview" onClick={() => setDevice("mobile")} className={`rounded p-1.5 ${device === "mobile" ? "bg-white shadow-sm" : "text-muted"}`}>
          <Smartphone size={16} />
        </button>
        <button
          onClick={() => flush().then(() => setPreview(true))}
          disabled={!form.questions.length}
          className="ml-2 flex items-center gap-1.5 rounded-md border border-line bg-white px-3 py-1.5 text-sm hover:bg-hover disabled:opacity-50"
        >
          <Eye size={15} /> Preview
        </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center p-4 md:p-6">
        <div
          style={themeStyle(form.theme)}
          className={`tf-root flex h-full max-h-[640px] w-full items-center justify-center overflow-y-auto rounded-2xl border border-white/70 shadow-[0_18px_50px_rgb(38_38_39_/_0.12)] transition-[max-width] ${font} ${device === "mobile" ? "max-w-[375px] px-6" : "max-w-[960px] px-8 md:px-20"}`}
        >
          <div className="w-full py-10">{body}</div>
        </div>
      </div>

      {preview && <PreviewOverlay form={form} onClose={() => setPreview(false)} />}
    </section>
  );
}

function ScreenEditor({
  title,
  message,
  onTitle,
  onMessage,
  button,
}: {
  title: string;
  message: string;
  onTitle: (v: string) => void;
  onMessage: (v: string) => void;
  button?: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <input value={title} onChange={(e) => onTitle(e.target.value)} placeholder="Title" className="w-full bg-transparent text-center text-3xl outline-none" />
      <input value={message} onChange={(e) => onMessage(e.target.value)} placeholder="Description (optional)" className="tf-muted mt-3 w-full bg-transparent text-center text-lg outline-none" />
      {button && <span className="tf-btn mt-8">{button}</span>}
    </div>
  );
}

function PreviewOverlay({ form, onClose }: { form: Form; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="animate-fade fixed inset-0 z-50 flex flex-col bg-black/60 p-4 sm:p-8">
      <div className="mb-3 flex items-center justify-between text-white">
        <span className="text-sm">Preview — responses aren&apos;t saved</span>
        <button onClick={onClose} aria-label="Close preview" className="rounded-full bg-white/10 p-2 hover:bg-white/20">
          <X size={18} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl">
        <FormRunner form={form} onSubmit={async () => {}} />
      </div>
    </div>
  );
}
