"use client";

import { useState } from "react";
import { Check, CircleAlert } from "lucide-react";
import { Toggle } from "@/components/ui/Menu";
import { blankQuestion, hasChoices, QUESTION_TYPES } from "@/lib/questionTypes";
import type { Form, Question, QuestionType, Theme } from "@/lib/types";
import type { Selection } from "./QuestionList";

export const THEMES: { name: string; theme: Required<Omit<Theme, "font">> }[] = [
  { name: "Classic", theme: { background: "#FFFFFF", question: "#191919", answer: "#0445AF" } },
  { name: "Midnight", theme: { background: "#191919", question: "#FFFFFF", answer: "#8AB4F8" } },
  { name: "Forest", theme: { background: "#F1F6F0", question: "#1E3A2B", answer: "#2F7D4F" } },
  { name: "Sunset", theme: { background: "#FFF4EC", question: "#3B1F12", answer: "#C8501A" } },
  { name: "Lavender", theme: { background: "#F5F0FF", question: "#2A1B4A", answer: "#6B3FD1" } },
  { name: "Mono", theme: { background: "#F2F2F2", question: "#000000", answer: "#000000" } },
];

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-xs font-medium text-muted">{label}</span>
    {children}
  </div>
);
const inputCls = "w-full rounded-md border border-line px-2.5 py-1.5 text-sm outline-none focus:border-ink";
const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

export function SettingsPanel({
  form,
  selection,
  question,
  onQuestion,
  onMeta,
}: {
  form: Form;
  selection: Selection;
  question?: Question;
  onQuestion: (patch: Partial<Question>) => void;
  onMeta: (patch: Partial<Form>) => void;
}) {
  const [tab, setTab] = useState<"content" | "design">("content");

  return (
    <aside className="builder-panel hidden w-72 shrink-0 flex-col border-l border-[#d8d3c7] lg:flex">
      <div className="flex border-b border-[#d8d3c7]">
        {(["content", "design"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 border-b-2 py-3 text-sm capitalize ${tab === t ? "border-[#e07b4f] font-medium text-[#173f35]" : "border-transparent text-muted"}`}
          >
            {t === "content" ? "Question" : "Design"}
          </button>
        ))}
      </div>
        <FormHealth form={form} />
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
        {tab === "design" ? (
          <DesignSettings theme={form.theme} onChange={(theme) => onMeta({ theme })} />
        ) : selection.kind === "welcome" ? (
          <Toggle
            label="Show welcome screen"
            checked={form.welcome_title != null}
            onChange={(on) => onMeta({ welcome_title: on ? "Hey there 👋" : null, welcome_message: on ? form.welcome_message : null })}
          />
        ) : selection.kind === "ending" ? (
          <p className="text-sm text-muted">Edit the thank you screen&apos;s title and message directly on the canvas.</p>
        ) : question ? (
          <QuestionSettings q={question} onChange={onQuestion} />
        ) : null}
      </div>
    </aside>
  );
}

function FormHealth({ form }: { form: Form }) {
  const checks = [
    { label: "Form title", complete: !!form.title.trim() },
    { label: "At least one question", complete: form.questions.length > 0 },
    { label: "Questions have titles", complete: form.questions.length > 0 && form.questions.every((q) => !!q.title.trim()) },
    { label: "Thank-you screen", complete: !!form.thank_you_title.trim() },
  ];
  const completed = checks.filter((check) => check.complete).length;

  return (
    <div className="border-b border-[#d8d3c7] bg-[#f7f3e9] px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-[#173f35]">Form health</span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{completed}/{checks.length}</span>
      </div>
      <div className="mb-3 h-1 overflow-hidden rounded-full bg-[#e5ded0]">
        <div className="h-full rounded-full bg-[#e07b4f] transition-[width]" style={{ width: `${(completed / checks.length) * 100}%` }} />
      </div>
      <div className="space-y-1.5">
        {checks.map((check) => (
          <div key={check.label} className="flex items-center gap-2 text-xs text-muted">
            {check.complete ? <Check size={13} className="text-[#2f7d4f]" /> : <CircleAlert size={13} className="text-[#c9633c]" />}
            <span>{check.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuestionSettings({ q, onChange }: { q: Question; onChange: (patch: Partial<Question>) => void }) {
  const s = q.settings;
  const setS = (patch: Partial<Question["settings"]>) => onChange({ settings: { ...s, ...patch } });

  const changeType = (type: QuestionType) => {
    const blank = blankQuestion(type);
    onChange({
      type,
      settings: blank.settings,
      // Keep existing choices when switching between choice types.
      choices: hasChoices(type) ? (q.choices.length ? q.choices : blank.choices) : [],
    });
  };

  return (
    <>
      <Field label="Type">
        <select value={q.type} onChange={(e) => changeType(e.target.value as QuestionType)} className={inputCls}>
          {Object.entries(QUESTION_TYPES).map(([t, m]) => (
            <option key={t} value={t}>{m.label}</option>
          ))}
        </select>
      </Field>

      <Toggle label="Required" checked={q.required} onChange={(required) => onChange({ required })} />

      {q.type === "multiple_choice" && (
        <Toggle label="Multiple selection" checked={!!s.allow_multiple} onChange={(allow_multiple) => setS({ allow_multiple })} />
      )}

      {q.type === "rating" && (
        <Field label="Steps">
          <select value={s.steps ?? 5} onChange={(e) => setS({ steps: Number(e.target.value) })} className={inputCls}>
            {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => <option key={n}>{n}</option>)}
          </select>
        </Field>
      )}

      {q.type === "number" && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Min">
            <input type="number" value={s.min ?? ""} onChange={(e) => setS({ min: numOrNull(e.target.value) })} className={inputCls} />
          </Field>
          <Field label="Max">
            <input type="number" value={s.max ?? ""} onChange={(e) => setS({ max: numOrNull(e.target.value) })} className={inputCls} />
          </Field>
        </div>
      )}

      {["short_text", "long_text", "email", "number"].includes(q.type) && (
        <Field label="Placeholder">
          <input value={s.placeholder ?? ""} onChange={(e) => setS({ placeholder: e.target.value || undefined })} className={inputCls} placeholder="Type your answer here..." />
        </Field>
      )}

      <div className="rounded-lg bg-canvas p-3 text-xs text-muted">
        <b className="text-ink">Logic jumps</b> — branching to different questions based on answers is coming soon (Workflow tab).
      </div>
    </>
  );
}

function DesignSettings({ theme, onChange }: { theme: Theme; onChange: (t: Theme) => void }) {
  const t = { ...THEMES[0].theme, ...theme };
  return (
    <>
      <Field label="Themes">
        <div className="grid grid-cols-2 gap-2">
          {THEMES.map(({ name, theme: preset }) => {
            const active = preset.background === t.background && preset.answer === t.answer && preset.question === t.question;
            return (
              <button
                key={name}
                onClick={() => onChange({ ...theme, ...preset })}
                className={`rounded-lg border p-2 text-left ${active ? "border-ink ring-1 ring-ink" : "border-line hover:border-[#bbb]"}`}
                style={{ background: preset.background }}
              >
                <span className="block text-sm" style={{ color: preset.question }}>Question</span>
                <span className="block text-xs" style={{ color: preset.answer }}>Answer</span>
                <span className="mt-1 block h-2 w-8 rounded-sm" style={{ background: preset.answer }} />
                <span className="sr-only">{name}</span>
              </button>
            );
          })}
        </div>
      </Field>
      {(["background", "question", "answer"] as const).map((k) => (
        <label key={k} className="flex items-center justify-between text-sm capitalize">
          {k === "answer" ? "Answers & buttons" : k === "question" ? "Questions" : "Background"}
          <input type="color" value={t[k]} onChange={(e) => onChange({ ...theme, [k]: e.target.value })} className="h-7 w-10 cursor-pointer rounded border border-line" />
        </label>
      ))}
      <Field label="Font">
        <select value={theme.font ?? "sans"} onChange={(e) => onChange({ ...theme, font: e.target.value as Theme["font"] })} className={inputCls}>
          <option value="sans">Inter (sans-serif)</option>
          <option value="serif">Georgia (serif)</option>
          <option value="mono">Monospace</option>
        </select>
      </Field>
    </>
  );
}
