"use client";

import { AlertTriangle, ArrowRight, Check } from "lucide-react";
import { useEffect, useRef } from "react";
import type { AnswerValue, Question } from "@/lib/types";
import { INPUTS } from "./inputs";

/**
 * A single question screen. Rendered by the respondent runner (live) AND the builder
 * canvas (edit) so the live preview is literally the same component respondents see.
 */
export function QuestionView({
  q,
  number,
  value,
  error,
  onChange,
  onSubmit,
  isLast = false,
  live = true,
  onEdit,
}: {
  q: Question;
  number: number;
  value?: AnswerValue;
  error?: string | null;
  onChange?: (v: AnswerValue) => void;
  onSubmit?: (v?: AnswerValue) => void;
  isLast?: boolean;
  live?: boolean;
  onEdit?: (patch: Partial<Question>) => void;
}) {
  const Input = INPUTS[q.type];
  const editing = !live && !!onEdit;
  // Choice-like types auto-advance; Typeform still shows OK for multi-select.
  const showOk = !["yes_no", "rating", "dropdown"].includes(q.type) && !(q.type === "multiple_choice" && !q.settings.allow_multiple);

  return (
    <div className="relative w-full max-w-[720px]">
      <div className="tf-answer absolute -left-10 top-1 hidden items-center gap-1 text-base sm:flex">
        {number} <ArrowRight size={14} />
      </div>

      {editing ? (
        <>
          <AutoTextarea
            value={q.title}
            placeholder="Your question here. Recall information with @"
            onChange={(title) => onEdit({ title })}
            className="text-2xl leading-snug"
          />
          <AutoTextarea
            value={q.description ?? ""}
            placeholder="Description (optional)"
            onChange={(d) => onEdit({ description: d || null })}
            className="tf-muted mt-2 text-lg"
          />
        </>
      ) : (
        <>
          <h2 className="text-2xl leading-snug whitespace-pre-wrap">
            {q.title || "..."}
            {q.required && <span aria-label="required"> *</span>}
          </h2>
          {q.description && <p className="tf-muted mt-2 text-lg whitespace-pre-wrap">{q.description}</p>}
        </>
      )}

      <div className="mt-8">
        <Input
          q={q}
          value={value}
          onChange={onChange ?? (() => {})}
          onSubmit={onSubmit ?? (() => {})}
          live={live}
          onEdit={onEdit}
        />
      </div>

      <div className="mt-6 flex min-h-11 items-center gap-3">
        {error ? (
          <span role="alert" className="tf-error">
            <AlertTriangle size={14} /> {error}
          </span>
        ) : (
          showOk && (
            <>
              <button onClick={() => live && onSubmit?.()} className="tf-btn">
                {isLast ? "Submit" : <>OK <Check size={18} strokeWidth={3} /></>}
              </button>
              {q.type !== "long_text" && (
                <span className="tf-muted hidden text-xs sm:inline">
                  press <b>Enter ↵</b>
                </span>
              )}
            </>
          )
        )}
      </div>
    </div>
  );
}

function AutoTextarea({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`block w-full resize-none bg-transparent outline-none placeholder:text-current placeholder:opacity-30 ${className}`}
    />
  );
}
