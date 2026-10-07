"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FormRunner, type SubmitFn } from "@/components/renderer/FormRunner";
import { ApiError, api } from "@/lib/api";
import type { PublicForm } from "@/lib/types";

export default function PublicFormPage() {
  const { slug } = useParams<{ slug: string }>();
  const [form, setForm] = useState<PublicForm | null>(null);
  const [missing, setMissing] = useState(false);
  const responseId = useRef<number | null>(null);

  useEffect(() => {
    api
      .publicForm(slug)
      .then((f) => {
        setForm(f);
        document.title = f.title;
        // Fire-and-forget: records the visit for completion-rate stats.
        api.start(slug).then((r) => (responseId.current = r.response_id)).catch(() => {});
      })
      .catch(() => setMissing(true));
  }, [slug]);

  const submit: SubmitFn = async (answers) => {
    if (!form) return;
    const byId: Record<number, (typeof answers)[string]> = {};
    for (const q of form.questions) if (q.key in answers) byId[q.id!] = answers[q.key];
    try {
      await api.submit(slug, responseId.current, byId);
    } catch (e) {
      // Server validation errors come back keyed by question id; the runner wants keys.
      const errs = e instanceof ApiError && e.status === 422 ? (e.detail as { errors?: Record<string, string> }).errors : null;
      if (!errs) throw e;
      throw Object.fromEntries(form.questions.filter((q) => errs[String(q.id)]).map((q) => [q.key, errs[String(q.id)]]));
    }
  };

  if (missing)
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 px-6 text-center">
        <h1 className="text-2xl">This typeform is now closed</h1>
        <p className="text-muted">It isn&apos;t accepting new responses, or the link is wrong.</p>
      </div>
    );
  if (!form) return <div className="h-screen bg-white" />;
  return (
    <div className="h-dvh">
      <FormRunner form={form} onSubmit={submit} />
    </div>
  );
}
