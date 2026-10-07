"use client";

// One input component per question type. Each is used in two modes:
//  - live: respondent is answering (focus, keyboard shortcuts, auto-advance)
//  - edit: builder canvas (inputs inert, choice labels editable inline)
import { Check, ChevronDown, Plus, Star, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { newKey } from "@/lib/api";
import { letter } from "@/lib/questionTypes";
import type { AnswerValue, Choice, Question } from "@/lib/types";

export interface InputProps {
  q: Question;
  value: AnswerValue | undefined;
  onChange: (v: AnswerValue) => void;
  /** Advance. Pass the new value when calling right after onChange (state isn't updated yet). */
  onSubmit: (v?: AnswerValue) => void;
  live: boolean;
  onEdit?: (patch: Partial<Question>) => void;
}

const isTyping = (e: KeyboardEvent) => {
  const el = e.target as HTMLElement;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
};

/** Subscribe to window keydown while `active`. Used for letter/number shortcuts. */
function useKeys(active: boolean, handler: (e: KeyboardEvent) => void) {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => {
    if (!active) return;
    const fn = (e: KeyboardEvent) => {
      if (!isTyping(e) && !e.metaKey && !e.ctrlKey && !e.altKey) ref.current(e);
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [active]);
}

const AUTO_ADVANCE_MS = 500;

// ---------- text-ish ----------

export function TextInput({ q, value, onChange, live }: InputProps) {
  const isNumber = q.type === "number";
  // Keep the raw string so "1." or "-" can be typed; parse on the way out.
  const [raw, setRaw] = useState(value == null ? "" : String(value));
  const placeholder = q.settings.placeholder || (q.type === "email" ? "name@example.com" : "Type your answer here...");
  return (
    <input
      autoFocus={live}
      disabled={!live}
      type={q.type === "email" ? "email" : "text"}
      inputMode={isNumber ? "decimal" : undefined}
      value={raw}
      placeholder={placeholder}
      onChange={(e) => {
        const v = e.target.value;
        setRaw(v);
        onChange(isNumber ? (v.trim() === "" ? null : Number(v)) : v);
      }}
      className="tf-input"
    />
  );
}

export function LongTextInput({ q, value, onChange, live }: InputProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [value]);
  return (
    <div>
      <textarea
        ref={ref}
        autoFocus={live}
        disabled={!live}
        rows={1}
        value={(value as string) ?? ""}
        placeholder={q.settings.placeholder || "Type your answer here..."}
        onChange={(e) => onChange(e.target.value)}
        className="tf-input"
      />
      <p className="tf-answer mt-2 text-xs">
        <b>Shift ⇧ + Enter ↵</b> to make a line break
      </p>
    </div>
  );
}

// ---------- choices ----------

function ChoiceButton({
  label,
  keyHint,
  checked,
  blink,
  onClick,
  children,
}: {
  label: React.ReactNode;
  keyHint: string;
  checked: boolean;
  blink?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div
      role="checkbox"
      aria-checked={checked}
      tabIndex={onClick ? 0 : -1}
      onClick={onClick}
      onKeyDown={(e) => e.key === " " && (e.preventDefault(), onClick?.())}
      className={`tf-choice group cursor-pointer ${blink ? "blink" : ""}`}
    >
      <span className="tf-key">{keyHint}</span>
      <span className="min-w-0 flex-1 break-words">{label}</span>
      {checked && <Check size={18} className="shrink-0" />}
      {children}
    </div>
  );
}

export function MultipleChoiceInput({ q, value, onChange, onSubmit, live, onEdit }: InputProps) {
  const selected = (value as number[] | undefined) ?? [];
  const multi = !!q.settings.allow_multiple;
  const [blinkId, setBlinkId] = useState<number | null>(null);

  const pick = (c: Choice) => {
    if (c.id == null) return;
    if (multi) {
      onChange(selected.includes(c.id) ? selected.filter((x) => x !== c.id) : [...selected, c.id]);
      return;
    }
    const next = [c.id];
    onChange(next);
    setBlinkId(c.id);
    setTimeout(() => onSubmit(next), AUTO_ADVANCE_MS);
  };

  useKeys(live, (e) => {
    const i = e.key.toUpperCase().charCodeAt(0) - 65;
    if (e.key.length === 1 && i >= 0 && i < q.choices.length) pick(q.choices[i]);
  });

  if (!live && onEdit) return <ChoiceEditor q={q} onEdit={onEdit} />;

  return (
    <div className="flex flex-col gap-2 sm:max-w-md">
      {multi && <p className="tf-muted -mt-2 mb-1 text-sm">Choose as many as you like</p>}
      {q.choices.map((c, i) => (
        <ChoiceButton
          key={c.key}
          label={c.label}
          keyHint={letter(i)}
          checked={c.id != null && selected.includes(c.id)}
          blink={blinkId === c.id}
          onClick={live ? () => pick(c) : undefined}
        />
      ))}
    </div>
  );
}

/** Builder-only: inline-editable choice labels, add/remove. */
function ChoiceEditor({ q, onEdit }: { q: Question; onEdit: (patch: Partial<Question>) => void }) {
  const set = (choices: Choice[]) => onEdit({ choices });
  return (
    <div className="flex flex-col gap-2 sm:max-w-md">
      {q.choices.map((c, i) => (
        <ChoiceButton key={c.key} keyHint={letter(i)} checked={false} label={
          <input
            value={c.label}
            aria-label={`Choice ${i + 1}`}
            onChange={(e) => set(q.choices.map((x) => (x.key === c.key ? { ...x, label: e.target.value } : x)))}
            className="w-full bg-transparent outline-none"
          />
        }>
          {q.choices.length > 1 && (
            <button
              aria-label="Remove choice"
              onClick={() => set(q.choices.filter((x) => x.key !== c.key))}
              className="opacity-0 transition-opacity group-hover:opacity-100"
            >
              <X size={16} />
            </button>
          )}
        </ChoiceButton>
      ))}
      <button
        onClick={() => set([...q.choices, { key: newKey(), label: `Choice ${q.choices.length + 1}` }])}
        className="tf-answer flex items-center gap-1 self-start text-sm font-medium underline-offset-2 hover:underline"
      >
        <Plus size={14} /> Add choice
      </button>
    </div>
  );
}

export function YesNoInput({ value, onChange, onSubmit, live }: InputProps) {
  const [blink, setBlink] = useState<boolean | null>(null);
  const pick = (v: boolean) => {
    onChange(v);
    setBlink(v);
    setTimeout(() => onSubmit(v), AUTO_ADVANCE_MS);
  };
  useKeys(live, (e) => {
    if (e.key.toLowerCase() === "y") pick(true);
    if (e.key.toLowerCase() === "n") pick(false);
  });
  return (
    <div className="flex max-w-56 flex-col gap-2">
      {([true, false] as const).map((v) => (
        <ChoiceButton
          key={String(v)}
          label={v ? "Yes" : "No"}
          keyHint={v ? "Y" : "N"}
          checked={value === v}
          blink={blink === v}
          onClick={live ? () => pick(v) : undefined}
        />
      ))}
    </div>
  );
}

export function DropdownInput({ q, value, onChange, onSubmit, live, onEdit }: InputProps) {
  const selected = q.choices.find((c) => c.id != null && (value as number[] | undefined)?.[0] === c.id);
  const [query, setQuery] = useState(selected?.label ?? "");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const matches = q.choices.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()));

  if (!live && onEdit) return <ChoiceEditor q={q} onEdit={onEdit} />;

  const pick = (c: Choice) => {
    if (c.id == null) return;
    setQuery(c.label);
    setOpen(false);
    onChange([c.id]);
    setTimeout(() => onSubmit([c.id!]), 300);
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          autoFocus={live}
          disabled={!live}
          value={query}
          placeholder="Type or select an option"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHi(0);
            if (selected) onChange(null);
          }}
          onKeyDown={(e) => {
            if (!open) return;
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault(); // also tells the runner not to navigate
              setHi((h) => Math.max(0, Math.min(matches.length - 1, h + (e.key === "ArrowDown" ? 1 : -1))));
            } else if (e.key === "Enter" && matches[hi]) {
              e.preventDefault();
              pick(matches[hi]);
            } else if (e.key === "Escape") setOpen(false);
          }}
          role="combobox"
          aria-expanded={open}
          aria-controls={`dd-${q.key}`}
          className="tf-input pr-10"
        />
        <ChevronDown className="tf-answer absolute right-0 top-2" size={28} />
      </div>
      {open && live && (
        <div role="listbox" id={`dd-${q.key}`} className="mt-2 flex max-h-64 flex-col gap-1.5 overflow-y-auto p-0.5">
          {matches.length === 0 && <p className="tf-muted text-sm">No suggestions found</p>}
          {matches.map((c, i) => (
            <div
              key={c.key}
              role="option"
              aria-selected={i === hi}
              aria-checked={selected?.key === c.key}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(c)}
              onMouseEnter={() => setHi(i)}
              className={`tf-choice cursor-pointer ${i === hi ? "!bg-[color-mix(in_srgb,var(--tf-a)_22%,transparent)]" : ""}`}
            >
              {c.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function RatingInput({ q, value, onChange, onSubmit, live }: InputProps) {
  const steps = q.settings.steps ?? 5;
  const [hover, setHover] = useState(0);
  const current = (value as number | undefined) ?? 0;
  const pick = (n: number) => {
    onChange(n);
    setTimeout(() => onSubmit(n), AUTO_ADVANCE_MS);
  };
  useKeys(live, (e) => {
    const n = e.key === "0" ? 10 : Number(e.key);
    if (n >= 1 && n <= steps) pick(n);
  });
  return (
    <div className="flex flex-wrap gap-1 sm:gap-2" onMouseLeave={() => setHover(0)} role="radiogroup">
      {Array.from({ length: steps }, (_, i) => i + 1).map((n) => {
        const on = n <= (hover || current);
        return (
          <button
            key={n}
            role="radio"
            aria-checked={current === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            disabled={!live}
            onMouseEnter={() => live && setHover(n)}
            onClick={() => pick(n)}
            className="tf-answer flex flex-col items-center gap-1 rounded p-1 transition-transform hover:scale-105"
          >
            <Star size={44} strokeWidth={1.25} fill={on ? "currentColor" : "transparent"} />
            <span className="text-sm">{n}</span>
          </button>
        );
      })}
    </div>
  );
}

export const INPUTS: Record<Question["type"], (p: InputProps) => React.ReactNode> = {
  short_text: TextInput,
  email: TextInput,
  number: TextInput,
  long_text: LongTextInput,
  multiple_choice: MultipleChoiceInput,
  dropdown: DropdownInput,
  yes_no: YesNoInput,
  rating: RatingInput,
};
