"use client";

import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { isEmpty, validate } from "@/lib/validate";
import type { AnswerValue, PublicForm, Question } from "@/lib/types";
import { QuestionView } from "./QuestionView";

type Answers = Record<string, AnswerValue>; // keyed by question.key
/** Resolves on success; rejects with { [questionKey]: message } on server-side validation errors. */
export type SubmitFn = (answers: Answers) => Promise<void>;

const WELCOME = -1;
const EXIT_MS = 250;

export function themeStyle(theme: PublicForm["theme"]) {
  return {
    "--tf-bg": theme.background,
    "--tf-q": theme.question,
    "--tf-a": theme.answer,
  } as React.CSSProperties;
}

/**
 * The one-question-at-a-time experience. Owns navigation, transitions, keyboard,
 * client validation and submission; delegates the actual question UI to QuestionView.
 */
export function FormRunner({ form, onSubmit, className = "" }: { form: PublicForm; onSubmit: SubmitFn; className?: string }) {
  const qs = form.questions;
  const done = qs.length; // index of the thank-you screen
  const [index, setIndex] = useState(form.welcome_title ? WELCOME : 0);
  const [answers, setAnswers] = useState<Answers>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [anim, setAnim] = useState<{ phase: "enter" | "exit"; dir: "next" | "prev" }>({ phase: "enter", dir: "next" });
  const [submitting, setSubmitting] = useState(false);
  const busy = useRef(false);

  const go = useCallback((to: number, dir: "next" | "prev") => {
    if (busy.current) return;
    busy.current = true;
    setAnim({ phase: "exit", dir });
    setTimeout(() => {
      setIndex(to);
      setAnim({ phase: "enter", dir });
      busy.current = false;
    }, EXIT_MS);
  }, []);

  const submit = useCallback(
    async (all: Answers) => {
      setSubmitting(true);
      try {
        await onSubmit(all);
        go(done, "next");
      } catch (e) {
        if (e && typeof e === "object" && !(e instanceof Error)) {
          const errs = e as Record<string, string>;
          setErrors(errs);
          const first = qs.findIndex((q) => errs[q.key]);
          if (first >= 0) go(first, "prev");
        } else {
          setErrors({ [qs[qs.length - 1].key]: "Couldn't submit — check your connection and try again" });
        }
      } finally {
        setSubmitting(false);
      }
    },
    [onSubmit, go, done, qs],
  );

  /** Validate the current question (optionally with a just-picked value) and move forward. */
  const next = useCallback(
    (override?: AnswerValue) => {
      if (busy.current || submitting) return;
      if (index === WELCOME) return go(0, "next");
      if (index >= done) return;
      const q = qs[index];
      const value = override !== undefined ? override : answers[q.key];
      const err = validate(q, value);
      setErrors((e) => ({ ...e, [q.key]: err ?? "" }));
      if (err) return;
      if (index < done - 1) return go(index + 1, "next");

      // Last question: make sure nothing earlier was skipped, then submit.
      const all = { ...answers, [q.key]: value ?? null };
      const firstBad = qs.findIndex((x) => validate(x, all[x.key]));
      if (firstBad >= 0) {
        setErrors((e) => ({ ...e, [qs[firstBad].key]: validate(qs[firstBad], all[qs[firstBad].key])! }));
        return go(firstBad, "prev");
      }
      submit(all);
    },
    [index, done, qs, answers, go, submit, submitting],
  );

  const prev = useCallback(() => {
    const first = form.welcome_title ? WELCOME : 0;
    if (index > first && index < done) go(index - 1, "prev");
  }, [index, done, go, form.welcome_title]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return;
      const inTextarea = (e.target as HTMLElement).tagName === "TEXTAREA";
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        next();
      } else if (!inTextarea && e.key === "ArrowDown") {
        e.preventDefault();
        next();
      } else if (!inTextarea && e.key === "ArrowUp") {
        e.preventDefault();
        prev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  const answered = qs.filter((q) => !isEmpty(answers[q.key])).length;
  const progress = index >= done ? 1 : qs.length ? answered / qs.length : 0;
  const animClass = `tf-${anim.phase}-${anim.dir}`;
  const font = form.theme.font === "serif" ? "font-serif" : form.theme.font === "mono" ? "font-mono" : "";

  let screen: React.ReactNode;
  if (index === WELCOME) {
    screen = (
      <div className="max-w-[720px] text-center">
        <h1 className="text-3xl leading-snug sm:text-4xl">{form.welcome_title}</h1>
        {form.welcome_message && <p className="tf-muted mt-4 text-xl">{form.welcome_message}</p>}
        <div className="mt-8 flex items-center justify-center gap-3">
          <button className="tf-btn" onClick={() => next()}>Start</button>
          <span className="tf-muted text-xs">press <b>Enter ↵</b></span>
        </div>
      </div>
    );
  } else if (index >= done) {
    screen = (
      <div className="max-w-[720px] text-center">
        <h1 className="text-3xl leading-snug sm:text-4xl">{form.thank_you_title}</h1>
        {form.thank_you_message && <p className="tf-muted mt-4 text-xl">{form.thank_you_message}</p>}
        <Link href="/" className="tf-btn mt-10">Create your own form</Link>
      </div>
    );
  } else {
    const q: Question = qs[index];
    screen = (
      <QuestionView
        key={q.key}
        q={q}
        number={index + 1}
        value={answers[q.key]}
        error={errors[q.key] || null}
        isLast={index === done - 1}
        onChange={(v) => {
          setAnswers((a) => ({ ...a, [q.key]: v }));
          if (errors[q.key]) setErrors((e) => ({ ...e, [q.key]: "" }));
        }}
        onSubmit={next}
      />
    );
  }

  return (
    <div style={themeStyle(form.theme)} className={`tf-root relative flex h-full w-full flex-col overflow-hidden ${font} ${className}`}>
      <div className="absolute inset-x-0 top-0 z-10 h-1 bg-[color-mix(in_srgb,var(--tf-a)_20%,transparent)]" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full bg-[var(--tf-a)] transition-[width] duration-500" style={{ width: `${progress * 100}%` }} />
      </div>

      <div className="flex flex-1 items-center justify-center overflow-y-auto px-6 py-20 sm:px-16">
        <div key={index} className={`flex w-full justify-center ${animClass}`}>
          {screen}
        </div>
      </div>

      {submitting && (
        <div className="tf-answer absolute inset-0 z-20 flex items-center justify-center bg-[color-mix(in_srgb,var(--tf-bg)_60%,transparent)]">
          <Loader2 className="animate-spin" size={36} />
        </div>
      )}

      {index >= 0 && index < done && (
        <div className="absolute bottom-4 right-4 flex items-center gap-2">
          <div className="flex overflow-hidden rounded">
            <button aria-label="Previous question" onClick={prev} disabled={index === 0} className="tf-btn !rounded-none !px-2 disabled:opacity-50">
              <ChevronUp size={22} />
            </button>
            <button aria-label="Next question" onClick={() => next()} className="tf-btn !rounded-none border-l border-[color-mix(in_srgb,var(--tf-bg)_30%,transparent)] !px-2">
              <ChevronDown size={22} />
            </button>
          </div>
          <span className="tf-btn !px-3 !py-2 !text-xs !font-medium">Made with formly</span>
        </div>
      )}
    </div>
  );
}
