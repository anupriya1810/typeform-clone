"use client";

import { createContext, useContext } from "react";
import type { Form } from "@/lib/types";

/**
 * Shared by every tab under /forms/[id]: the header (title, publish) and the tab pages
 * read and update the same loaded form, so we fetch it once in the layout.
 */
export interface FormCtx {
  form: Form;
  setForm: (f: Form | ((f: Form) => Form)) => void;
  /** Builder registers its pending-save flush so Publish never races autosave. */
  flushRef: { current: (() => Promise<void>) | null };
  saving: "idle" | "saving" | "saved" | "error";
  setSaving: (s: FormCtx["saving"]) => void;
}

export const FormContext = createContext<FormCtx | null>(null);

export function useForm() {
  const ctx = useContext(FormContext);
  if (!ctx) throw new Error("useForm must be used under /forms/[id]");
  return ctx;
}
