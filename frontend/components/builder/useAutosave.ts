"use client";

import { useCallback, useEffect, useRef } from "react";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import type { Form, Question } from "@/lib/types";
import { useForm } from "./FormContext";

type Meta = Partial<Pick<Form, "theme" | "welcome_title" | "welcome_message" | "thank_you_title" | "thank_you_message">>;

const DEBOUNCE_MS = 700;

/**
 * Builder edits are applied to local state immediately and persisted after a short pause.
 * Saves are chained (never concurrent) so a slow request can't land after a newer one —
 * otherwise two in-flight PUTs could each create the same new question.
 */
export function useAutosave() {
  const { form, setForm, flushRef, setSaving } = useForm();
  const toast = useToast();
  const latest = useRef(form);
  const dirtyQuestions = useRef(false);
  const dirtyMeta = useRef<Meta>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chain = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    latest.current = form;
  }, [form]);

  const save = useCallback(async () => {
    const meta = dirtyMeta.current;
    const doQuestions = dirtyQuestions.current;
    dirtyMeta.current = {};
    dirtyQuestions.current = false;
    if (!doQuestions && Object.keys(meta).length === 0) return;

    setSaving("saving");
    const snapshot = latest.current.questions;
    try {
      if (Object.keys(meta).length) await api.updateForm(latest.current.id, meta);
      if (doQuestions) {
        const saved = await api.saveQuestions(latest.current.id, snapshot);
        // Response is in payload order: copy server ids onto the matching client rows by key.
        const ids = new Map(snapshot.map((q, i) => [q.key, saved[i]]));
        setForm((f) => ({
          ...f,
          questions: f.questions.map((q) => {
            const s = ids.get(q.key);
            if (!s) return q;
            const snapChoices = snapshot.find((x) => x.key === q.key)!.choices;
            const choiceIds = new Map(snapChoices.map((c, i) => [c.key, s.choices[i]?.id]));
            return { ...q, id: s.id, choices: q.choices.map((c) => ({ ...c, id: c.id ?? choiceIds.get(c.key) })) };
          }),
        }));
      }
      setSaving("saved");
    } catch (e) {
      // Re-mark as dirty so the next edit (or flush) retries.
      dirtyQuestions.current ||= doQuestions;
      dirtyMeta.current = { ...meta, ...dirtyMeta.current };
      setSaving("error");
      toast(e instanceof Error ? e.message : "Couldn't save changes", "error");
    }
  }, [setForm, setSaving, toast]);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    chain.current = chain.current.then(save);
    return chain.current;
  }, [save]);

  const schedule = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, DEBOUNCE_MS);
  }, [flush]);

  // Flush when leaving the builder tab and let Publish await pending saves.
  useEffect(() => {
    flushRef.current = flush;
    const warn = (e: BeforeUnloadEvent) => {
      if (timer.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      flush();
      flushRef.current = null;
    };
  }, [flush, flushRef]);

  const setQuestions = useCallback(
    (fn: (qs: Question[]) => Question[]) => {
      setForm((f) => ({ ...f, questions: fn(f.questions) }));
      dirtyQuestions.current = true;
      schedule();
    },
    [setForm, schedule],
  );

  const setMeta = useCallback(
    (patch: Meta) => {
      setForm((f) => ({ ...f, ...patch }));
      dirtyMeta.current = { ...dirtyMeta.current, ...patch };
      schedule();
    },
    [setForm, schedule],
  );

  return { setQuestions, setMeta, flush };
}
